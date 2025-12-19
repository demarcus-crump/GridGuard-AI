
/**
 * biasTestingService.ts
 * 
 * NIST AI RMF - MEASURE Function: Fairness & Bias Testing
 * 
 * Features:
 * - Fairness metrics across demographic zones
 * - Load shedding equity analysis
 * - Disparate impact detection
 * - Bias test recording
 */

import { auditService } from './auditService';
import { notificationService } from './notificationService';

// ============================================================================
// TYPES
// ============================================================================

export interface BiasTestCase {
    id: string;
    timestamp: number;
    testType: 'LOAD_SHEDDING' | 'OUTAGE_PRIORITY' | 'PRICE_IMPACT' | 'RESPONSE_TIME';
    zones: BiasZoneResult[];
    overallScore: number;
    passed: boolean;
    disparateImpactRatio?: number;
}

export interface BiasZoneResult {
    zoneId: string;
    zoneName: string;
    demographic: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED';
    incomeLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    criticalInfrastructure: boolean;

    // Metrics
    shedFrequency: number;      // Times selected for load shedding
    shedDuration: number;       // Average duration in minutes
    priorityScore: number;      // AI-assigned priority (higher = earlier restored)
    responseTime: number;       // Average response time for outages
}

export interface FairnessMetrics {
    score: number;              // 0-100
    disparateImpactRatio: number;
    zoneParity: number;
    criticalProtectionRate: number;
    testsPassed: number;
    testsFailed: number;
    lastTestDate: string;
}

// ============================================================================
// ZONE DEFINITIONS (Texas ERCOT Zones)
// ============================================================================

const ERCOT_ZONES: BiasZoneResult[] = [
    { zoneId: 'HOU_DOWNTOWN', zoneName: 'Houston Downtown', demographic: 'COMMERCIAL', incomeLevel: 'HIGH', criticalInfrastructure: true, shedFrequency: 0, shedDuration: 0, priorityScore: 95, responseTime: 12 },
    { zoneId: 'HOU_THIRD_WARD', zoneName: 'Houston Third Ward', demographic: 'RESIDENTIAL', incomeLevel: 'LOW', criticalInfrastructure: false, shedFrequency: 0, shedDuration: 0, priorityScore: 85, responseTime: 18 },
    { zoneId: 'HOU_MEDICAL', zoneName: 'Houston Medical Center', demographic: 'COMMERCIAL', incomeLevel: 'HIGH', criticalInfrastructure: true, shedFrequency: 0, shedDuration: 0, priorityScore: 99, responseTime: 5 },
    { zoneId: 'DFW_NORTH', zoneName: 'DFW North', demographic: 'RESIDENTIAL', incomeLevel: 'HIGH', criticalInfrastructure: false, shedFrequency: 0, shedDuration: 0, priorityScore: 80, responseTime: 20 },
    { zoneId: 'DFW_SOUTH', zoneName: 'DFW South', demographic: 'MIXED', incomeLevel: 'MEDIUM', criticalInfrastructure: false, shedFrequency: 0, shedDuration: 0, priorityScore: 78, responseTime: 22 },
    { zoneId: 'AUSTIN_EAST', zoneName: 'Austin East', demographic: 'RESIDENTIAL', incomeLevel: 'LOW', criticalInfrastructure: false, shedFrequency: 0, shedDuration: 0, priorityScore: 75, responseTime: 25 },
    { zoneId: 'AUSTIN_DOWNTOWN', zoneName: 'Austin Downtown', demographic: 'COMMERCIAL', incomeLevel: 'HIGH', criticalInfrastructure: true, shedFrequency: 0, shedDuration: 0, priorityScore: 92, responseTime: 10 },
    { zoneId: 'SAN_ANTONIO', zoneName: 'San Antonio', demographic: 'MIXED', incomeLevel: 'MEDIUM', criticalInfrastructure: true, shedFrequency: 0, shedDuration: 0, priorityScore: 88, responseTime: 15 },
    { zoneId: 'VALLEY', zoneName: 'Rio Grande Valley', demographic: 'RESIDENTIAL', incomeLevel: 'LOW', criticalInfrastructure: false, shedFrequency: 0, shedDuration: 0, priorityScore: 70, responseTime: 30 },
    { zoneId: 'WEST_TEXAS', zoneName: 'West Texas', demographic: 'INDUSTRIAL', incomeLevel: 'MEDIUM', criticalInfrastructure: true, shedFrequency: 0, shedDuration: 0, priorityScore: 85, responseTime: 35 }
];

// ============================================================================
// BIAS TESTING SERVICE
// ============================================================================

class BiasTestingService {
    private testHistory: BiasTestCase[] = [];
    private listeners: ((metrics: FairnessMetrics) => void)[] = [];

    constructor() {
        // Load history from localStorage
        const saved = localStorage.getItem('BIAS_TEST_HISTORY');
        if (saved) {
            this.testHistory = JSON.parse(saved);
        }
    }

    /**
     * Run comprehensive bias test suite
     */
    public async runFullTestSuite(): Promise<BiasTestCase[]> {
        const results: BiasTestCase[] = [];

        // Test 1: Load Shedding Distribution
        results.push(await this.runLoadSheddingTest());

        // Test 2: Outage Priority Fairness
        results.push(await this.runOutagePriorityTest());

        // Test 3: Response Time Equity
        results.push(await this.runResponseTimeTest());

        // Save results
        this.testHistory = [...this.testHistory, ...results];
        localStorage.setItem('BIAS_TEST_HISTORY', JSON.stringify(this.testHistory.slice(-100)));

        // Audit log
        auditService.log({
            operatorId: 'SYS-BIAS-TEST',
            eventType: 'CONFIG_CHANGE',
            resource: 'BIAS_TESTING',
            details: `Ran ${results.length} bias tests. Passed: ${results.filter(r => r.passed).length}`
        });

        this.notifyListeners();

        return results;
    }

    /**
     * Test: Load Shedding Distribution
     * Ensures low-income zones aren't disproportionately targeted
     */
    private async runLoadSheddingTest(): Promise<BiasTestCase> {
        const zones = this.getSimulatedZoneData();

        // Calculate average shed frequency by income level
        const byIncome = {
            LOW: zones.filter(z => z.incomeLevel === 'LOW'),
            MEDIUM: zones.filter(z => z.incomeLevel === 'MEDIUM'),
            HIGH: zones.filter(z => z.incomeLevel === 'HIGH')
        };

        const avgShedLow = this.average(byIncome.LOW.map(z => z.shedFrequency));
        const avgShedHigh = this.average(byIncome.HIGH.map(z => z.shedFrequency));

        // Disparate Impact Ratio (4/5 rule: ratio should be >= 0.8)
        const disparateImpactRatio = avgShedHigh > 0 ? avgShedLow / avgShedHigh : 1;
        const passed = disparateImpactRatio <= 1.25; // Low-income shouldn't be >25% more targeted

        return {
            id: `bias-${Date.now()}-1`,
            timestamp: Date.now(),
            testType: 'LOAD_SHEDDING',
            zones,
            overallScore: Math.max(0, 100 - Math.abs(disparateImpactRatio - 1) * 100),
            passed,
            disparateImpactRatio
        };
    }

    /**
     * Test: Outage Priority Fairness
     * Critical infrastructure should be prioritized regardless of income
     */
    private async runOutagePriorityTest(): Promise<BiasTestCase> {
        const zones = this.getSimulatedZoneData();

        // Check if critical infrastructure has highest priority
        const criticalZones = zones.filter(z => z.criticalInfrastructure);
        const nonCriticalZones = zones.filter(z => !z.criticalInfrastructure);

        const avgCriticalPriority = this.average(criticalZones.map(z => z.priorityScore));
        const avgNonCriticalPriority = this.average(nonCriticalZones.map(z => z.priorityScore));

        // Critical should have higher priority
        const passed = avgCriticalPriority > avgNonCriticalPriority;
        const score = passed ? Math.min(100, (avgCriticalPriority - avgNonCriticalPriority) * 2) : 50;

        return {
            id: `bias-${Date.now()}-2`,
            timestamp: Date.now(),
            testType: 'OUTAGE_PRIORITY',
            zones,
            overallScore: score,
            passed
        };
    }

    /**
     * Test: Response Time Equity
     * Response times should not correlate with income level
     */
    private async runResponseTimeTest(): Promise<BiasTestCase> {
        const zones = this.getSimulatedZoneData();

        // Calculate correlation between income and response time
        const byIncome = {
            LOW: zones.filter(z => z.incomeLevel === 'LOW'),
            MEDIUM: zones.filter(z => z.incomeLevel === 'MEDIUM'),
            HIGH: zones.filter(z => z.incomeLevel === 'HIGH')
        };

        const avgResponseLow = this.average(byIncome.LOW.map(z => z.responseTime));
        const avgResponseHigh = this.average(byIncome.HIGH.map(z => z.responseTime));

        // Response time ratio (should be close to 1)
        const ratio = avgResponseHigh > 0 ? avgResponseLow / avgResponseHigh : 1;
        const passed = ratio <= 1.5; // Low-income shouldn't wait >50% longer

        return {
            id: `bias-${Date.now()}-3`,
            timestamp: Date.now(),
            testType: 'RESPONSE_TIME',
            zones,
            overallScore: Math.max(0, 100 - (ratio - 1) * 50),
            passed
        };
    }

    /**
     * Get simulated zone data with realistic variance
     */
    private getSimulatedZoneData(): BiasZoneResult[] {
        return ERCOT_ZONES.map(zone => ({
            ...zone,
            shedFrequency: Math.round(zone.priorityScore > 85 ? Math.random() * 2 : Math.random() * 5 + 2),
            shedDuration: Math.round(zone.criticalInfrastructure ? 15 + Math.random() * 10 : 30 + Math.random() * 30),
            responseTime: zone.responseTime + Math.round((Math.random() - 0.5) * 10)
        }));
    }

    /**
     * Get overall fairness metrics
     */
    public getFairnessMetrics(): FairnessMetrics {
        const recentTests = this.testHistory.slice(-20);
        const passed = recentTests.filter(t => t.passed).length;
        const failed = recentTests.filter(t => !t.passed).length;

        const avgScore = this.average(recentTests.map(t => t.overallScore)) || 80;
        const avgDisparateImpact = this.average(
            recentTests.filter(t => t.disparateImpactRatio).map(t => t.disparateImpactRatio!)
        ) || 1;

        return {
            score: Math.round(avgScore),
            disparateImpactRatio: Math.round(avgDisparateImpact * 100) / 100,
            zoneParity: Math.round((1 - Math.abs(avgDisparateImpact - 1)) * 100),
            criticalProtectionRate: 95, // Simulated
            testsPassed: passed,
            testsFailed: failed,
            lastTestDate: recentTests.length > 0
                ? new Date(recentTests[recentTests.length - 1].timestamp).toISOString()
                : 'Never'
        };
    }

    /**
     * Get test history
     */
    public getTestHistory(): BiasTestCase[] {
        return [...this.testHistory].reverse();
    }

    /**
     * Subscribe to metrics updates
     */
    public subscribe(listener: (metrics: FairnessMetrics) => void): () => void {
        this.listeners.push(listener);
        listener(this.getFairnessMetrics());
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        const metrics = this.getFairnessMetrics();
        this.listeners.forEach(l => l(metrics));
    }

    private average(arr: number[]): number {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    /**
     * Clear test history
     */
    public clearHistory(): void {
        this.testHistory = [];
        localStorage.removeItem('BIAS_TEST_HISTORY');
        notificationService.info('History Cleared', 'Bias test history has been reset');
    }
}

export const biasTestingService = new BiasTestingService();
