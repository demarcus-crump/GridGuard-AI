/**
 * dataIngestionService.ts
 * 
 * Data ingestion service for collecting ERCOT grid data.
 * Handles both historical backfill and continuous live polling.
 * 
 * Features:
 * - Backfill historical data from APIs
 * - Continuous live data polling with configurable interval
 * - Progress callbacks for UI feedback
 * - Automatic storage to IndexedDB
 */

import { dataStorageService, DataPoint } from './dataStorageService';
import { dataService } from './dataServiceFactory';

// ============================================================================
// TYPES
// ============================================================================

export interface IngestionProgress {
    phase: 'idle' | 'backfill' | 'live';
    current: number;
    total: number;
    message: string;
    lastUpdated: string;
}

export interface IngestionConfig {
    pollIntervalMs: number;
    enableLoad: boolean;
    enableGeneration: boolean;
    enableFuelMix: boolean;
    enableFrequency: boolean;
    enablePrices: boolean;
    enableWeather: boolean;
}

type ProgressCallback = (progress: IngestionProgress) => void;

// ============================================================================
// DATA INGESTION SERVICE
// ============================================================================

class DataIngestionService {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning: boolean = false;
    private config: IngestionConfig = {
        pollIntervalMs: 30000, // 30 seconds default
        enableLoad: true,
        enableGeneration: true,
        enableFuelMix: true,
        enableFrequency: true,
        enablePrices: true,
        enableWeather: true
    };
    private progressCallback: ProgressCallback | null = null;
    private progress: IngestionProgress = {
        phase: 'idle',
        current: 0,
        total: 0,
        message: 'Ready',
        lastUpdated: new Date().toISOString()
    };

    /**
     * Set progress callback for UI updates
     */
    setProgressCallback(callback: ProgressCallback | null): void {
        this.progressCallback = callback;
    }

    /**
     * Update and emit progress
     */
    private updateProgress(updates: Partial<IngestionProgress>): void {
        this.progress = {
            ...this.progress,
            ...updates,
            lastUpdated: new Date().toISOString()
        };
        this.progressCallback?.(this.progress);
    }

    /**
     * Configure ingestion settings
     */
    configure(config: Partial<IngestionConfig>): void {
        this.config = { ...this.config, ...config };
        console.log('[INGESTION] Configuration updated:', this.config);
    }

    /**
     * Collect current data point from all enabled sources
     */
    private async collectCurrentData(): Promise<DataPoint[]> {
        const now = new Date().toISOString();
        const dataPoints: DataPoint[] = [];

        try {
            // Load
            if (this.config.enableLoad) {
                const load = await dataService.getCurrentLoad();
                if (load) {
                    dataPoints.push({
                        timestamp: now,
                        dataType: 'load',
                        value: load.value,
                        unit: load.unit
                    });
                }
            }

            // Generation
            if (this.config.enableGeneration) {
                const gen = await dataService.getGeneration();
                if (gen) {
                    dataPoints.push({
                        timestamp: now,
                        dataType: 'generation',
                        value: gen.value,
                        unit: gen.unit
                    });
                }
            }

            // Frequency
            if (this.config.enableFrequency) {
                const freq = await dataService.getGridFrequency();
                if (freq !== null) {
                    dataPoints.push({
                        timestamp: now,
                        dataType: 'frequency',
                        value: freq,
                        unit: 'Hz'
                    });
                }
            }

            // Fuel Mix
            if (this.config.enableFuelMix) {
                const mix = await dataService.getFuelMix();
                if (mix) {
                    dataPoints.push({
                        timestamp: now,
                        dataType: 'fuel_mix',
                        value: mix as Record<string, number>
                    });
                }
            }

            // Prices (take first/current)
            if (this.config.enablePrices) {
                const prices = await dataService.getMarketPrices();
                if (prices && prices.length > 0) {
                    dataPoints.push({
                        timestamp: now,
                        dataType: 'price',
                        value: prices[0].value,
                        unit: '$/MWh',
                        metadata: { hub: prices[0].hub }
                    });
                }
            }

            // Weather (take Houston as representative)
            if (this.config.enableWeather) {
                const weather = await dataService.getRegionalStatus();
                if (weather && weather.length > 0) {
                    const houston = weather.find(w => w.region === 'houston') || weather[0];
                    dataPoints.push({
                        timestamp: now,
                        dataType: 'weather',
                        value: houston.temp,
                        unit: houston.unit,
                        metadata: { region: houston.region, conditions: houston.conditions }
                    });
                }
            }

        } catch (error) {
            console.error('[INGESTION] Error collecting data:', error);
        }

        return dataPoints;
    }

    /**
     * Start continuous live data ingestion
     */
    async startLiveIngestion(intervalMs?: number): Promise<void> {
        if (this.isRunning) {
            console.warn('[INGESTION] Already running');
            return;
        }

        const interval = intervalMs || this.config.pollIntervalMs;
        this.isRunning = true;
        this.updateProgress({ phase: 'live', message: 'Starting live ingestion...' });

        console.log(`[INGESTION] Starting live ingestion with ${interval}ms interval`);

        // Immediate first collection
        await this.pollOnce();

        // Schedule continuous polling
        this.intervalId = setInterval(async () => {
            await this.pollOnce();
        }, interval);
    }

    /**
     * Single poll cycle
     */
    private async pollOnce(): Promise<void> {
        try {
            const dataPoints = await this.collectCurrentData();
            if (dataPoints.length > 0) {
                await dataStorageService.storeDataPoints(dataPoints);
                this.updateProgress({
                    current: this.progress.current + dataPoints.length,
                    message: `Collected ${dataPoints.length} data points`
                });
            }
        } catch (error) {
            console.error('[INGESTION] Poll error:', error);
            this.updateProgress({ message: `Error: ${error}` });
        }
    }

    /**
     * Stop live data ingestion
     */
    stopLiveIngestion(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.updateProgress({ phase: 'idle', message: 'Stopped' });
        console.log('[INGESTION] Stopped live ingestion');
    }

    /**
     * Backfill historical data for a date range
     * Note: Depends on API support for historical queries
     */
    async backfillHistory(
        startDate: string,
        endDate: string,
        granularityHours: number = 1
    ): Promise<number> {
        this.updateProgress({
            phase: 'backfill',
            current: 0,
            total: 0,
            message: `Starting backfill from ${startDate} to ${endDate}...`
        });

        console.log(`[INGESTION] Backfilling from ${startDate} to ${endDate}`);

        try {
            // Get historical data from EIA/GridStatus
            const historical = await dataService.getHistorical(startDate, endDate);

            if (!historical || !Array.isArray(historical.data)) {
                // API might not support historical queries yet
                // Generate synthetic data for demo purposes
                console.log('[INGESTION] No historical API data, generating demo backfill');
                return await this.generateDemoBackfill(startDate, endDate, granularityHours);
            }

            // Process real historical data
            const dataPoints: DataPoint[] = historical.data.map((d: any) => ({
                timestamp: d.timestamp || d.date,
                dataType: 'load' as const,
                value: d.load || d.value,
                unit: 'MW'
            }));

            const stored = await dataStorageService.storeDataPoints(dataPoints);

            this.updateProgress({
                phase: 'idle',
                current: stored,
                total: stored,
                message: `Backfill complete: ${stored} data points`
            });

            return stored;
        } catch (error) {
            console.error('[INGESTION] Backfill error:', error);
            this.updateProgress({ phase: 'idle', message: `Backfill error: ${error}` });
            return 0;
        }
    }

    /**
     * Generate demo backfill data for testing
     */
    private async generateDemoBackfill(
        startDate: string,
        endDate: string,
        granularityHours: number
    ): Promise<number> {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dataPoints: DataPoint[] = [];

        // Typical load profile by hour
        const LOAD_PROFILE = [
            42000, 40000, 38500, 37500, 37000, 38000,
            42000, 48000, 52000, 54000, 56000, 58000,
            60000, 62000, 64000, 66000, 68000, 70000,
            68000, 64000, 58000, 52000, 48000, 45000
        ];

        let current = new Date(start);
        let count = 0;
        const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        while (current <= end) {
            const hour = current.getHours();
            const baseLoad = LOAD_PROFILE[hour];
            const noise = (Math.random() - 0.5) * 0.04 * baseLoad; // ±2% noise

            dataPoints.push({
                timestamp: current.toISOString(),
                dataType: 'load',
                value: Math.round(baseLoad + noise),
                unit: 'MW',
                metadata: { synthetic: true }
            });

            // Also add generation (slightly higher than load)
            dataPoints.push({
                timestamp: current.toISOString(),
                dataType: 'generation',
                value: Math.round((baseLoad + noise) * 1.03),
                unit: 'MW',
                metadata: { synthetic: true }
            });

            current = new Date(current.getTime() + granularityHours * 60 * 60 * 1000);
            count++;

            // Progress update every 100 points
            if (count % 100 === 0) {
                this.updateProgress({
                    current: count * 2,
                    total: Math.round(totalHours / granularityHours) * 2,
                    message: `Generating synthetic data: ${count} hours processed`
                });
            }
        }

        const stored = await dataStorageService.storeDataPoints(dataPoints);

        this.updateProgress({
            phase: 'idle',
            current: stored,
            total: stored,
            message: `Demo backfill complete: ${stored} synthetic data points`
        });

        return stored;
    }

    /**
     * Get current ingestion status
     */
    getStatus(): { isRunning: boolean; progress: IngestionProgress; config: IngestionConfig } {
        return {
            isRunning: this.isRunning,
            progress: this.progress,
            config: this.config
        };
    }
}

// Singleton instance
export const dataIngestionService = new DataIngestionService();

// Export for console debugging
(window as any).dataIngestionService = dataIngestionService;

export default dataIngestionService;
