
/**
 * dataImportService.ts
 * 
 * Bulk CSV Import for Historical Grid Data
 * 
 * Features:
 * - Parse CSV with configurable column mapping
 * - Validate data schema
 * - Store in IndexedDB for persistence
 * - Auto-detect data types
 * - Progress tracking
 */

import { notificationService } from './notificationService';
import { auditService } from './auditService';

// ============================================================================
// TYPES
// ============================================================================

export interface ColumnMapping {
    timestamp: string;
    load?: string;
    generation?: string;
    frequency?: string;
    price?: string;
    wind?: string;
    solar?: string;
    temperature?: string;
    [key: string]: string | undefined;
}

export interface ImportedDataPoint {
    timestamp: number;
    isoTime: string;
    load?: number;
    generation?: number;
    frequency?: number;
    price?: number;
    wind?: number;
    solar?: number;
    temperature?: number;
    metadata: Record<string, any>;
}

export interface ImportResult {
    success: boolean;
    totalRows: number;
    importedRows: number;
    errors: string[];
    datasetId: string;
}

export interface ImportedDataset {
    id: string;
    name: string;
    importedAt: number;
    rowCount: number;
    columns: string[];
    timeRange: { start: string; end: string };
    data: ImportedDataPoint[];
}

export interface ImportProgress {
    phase: 'PARSING' | 'VALIDATING' | 'STORING' | 'COMPLETE' | 'ERROR';
    current: number;
    total: number;
    message: string;
}

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'GridGuardDatasets';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

function openDatasetDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('importedAt', 'importedAt', { unique: false });
            }
        };
    });
}

// ============================================================================
// DATA IMPORT SERVICE
// ============================================================================

class DataImportService {
    private progressListeners: ((progress: ImportProgress) => void)[] = [];
    private cachedDatasets: ImportedDataset[] = [];

    /**
     * Parse CSV string to rows
     */
    private parseCSV(csvContent: string): { headers: string[]; rows: string[][] } {
        const lines = csvContent.trim().split('\n');
        if (lines.length === 0) return { headers: [], rows: [] };

        // Parse header
        const headers = this.parseCSVLine(lines[0]);

        // Parse data rows
        const rows: string[][] = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                rows.push(this.parseCSVLine(lines[i]));
            }
        }

        return { headers, rows };
    }

    /**
     * Parse a single CSV line handling quotes
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    }

    /**
     * Auto-detect column types
     */
    public detectColumns(headers: string[]): Partial<ColumnMapping> {
        const mapping: Partial<ColumnMapping> = {};

        headers.forEach(header => {
            const h = header.toLowerCase();

            if (h.includes('time') || h.includes('date') || h.includes('period')) {
                mapping.timestamp = header;
            } else if (h.includes('load') || h.includes('demand')) {
                mapping.load = header;
            } else if (h.includes('gen') || h.includes('supply')) {
                mapping.generation = header;
            } else if (h.includes('freq')) {
                mapping.frequency = header;
            } else if (h.includes('price') || h.includes('lmp') || h.includes('spp')) {
                mapping.price = header;
            } else if (h.includes('wind')) {
                mapping.wind = header;
            } else if (h.includes('solar') || h.includes('pv')) {
                mapping.solar = header;
            } else if (h.includes('temp')) {
                mapping.temperature = header;
            }
        });

        return mapping;
    }

    /**
     * Import CSV file
     */
    public async importCSV(
        file: File,
        mapping: ColumnMapping,
        datasetName?: string
    ): Promise<ImportResult> {
        const errors: string[] = [];
        const datasetId = `ds-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        try {
            // Phase 1: Parsing
            this.notifyProgress({ phase: 'PARSING', current: 0, total: 100, message: 'Reading file...' });

            const content = await file.text();
            const { headers, rows } = this.parseCSV(content);

            if (rows.length === 0) {
                return { success: false, totalRows: 0, importedRows: 0, errors: ['No data rows found'], datasetId };
            }

            this.notifyProgress({ phase: 'PARSING', current: 100, total: 100, message: `Parsed ${rows.length} rows` });

            // Phase 2: Validating & Transforming
            this.notifyProgress({ phase: 'VALIDATING', current: 0, total: rows.length, message: 'Validating data...' });

            const data: ImportedDataPoint[] = [];
            const headerIndex: Record<string, number> = {};
            headers.forEach((h, i) => headerIndex[h] = i);

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                try {
                    // Parse timestamp
                    const tsIdx = headerIndex[mapping.timestamp];
                    const tsValue = row[tsIdx];
                    const timestamp = this.parseTimestamp(tsValue);

                    if (!timestamp) {
                        errors.push(`Row ${i + 2}: Invalid timestamp "${tsValue}"`);
                        continue;
                    }

                    // Parse numeric fields
                    const dataPoint: ImportedDataPoint = {
                        timestamp,
                        isoTime: new Date(timestamp).toISOString(),
                        metadata: {}
                    };

                    if (mapping.load && headerIndex[mapping.load] !== undefined) {
                        dataPoint.load = this.parseNumber(row[headerIndex[mapping.load]]);
                    }
                    if (mapping.generation && headerIndex[mapping.generation] !== undefined) {
                        dataPoint.generation = this.parseNumber(row[headerIndex[mapping.generation]]);
                    }
                    if (mapping.frequency && headerIndex[mapping.frequency] !== undefined) {
                        dataPoint.frequency = this.parseNumber(row[headerIndex[mapping.frequency]]);
                    }
                    if (mapping.price && headerIndex[mapping.price] !== undefined) {
                        dataPoint.price = this.parseNumber(row[headerIndex[mapping.price]]);
                    }
                    if (mapping.wind && headerIndex[mapping.wind] !== undefined) {
                        dataPoint.wind = this.parseNumber(row[headerIndex[mapping.wind]]);
                    }
                    if (mapping.solar && headerIndex[mapping.solar] !== undefined) {
                        dataPoint.solar = this.parseNumber(row[headerIndex[mapping.solar]]);
                    }
                    if (mapping.temperature && headerIndex[mapping.temperature] !== undefined) {
                        dataPoint.temperature = this.parseNumber(row[headerIndex[mapping.temperature]]);
                    }

                    data.push(dataPoint);

                } catch (e) {
                    errors.push(`Row ${i + 2}: Parse error`);
                }

                // Update progress every 100 rows
                if (i % 100 === 0) {
                    this.notifyProgress({ phase: 'VALIDATING', current: i, total: rows.length, message: `Validating row ${i}...` });
                }
            }

            this.notifyProgress({ phase: 'VALIDATING', current: rows.length, total: rows.length, message: `Validated ${data.length} rows` });

            if (data.length === 0) {
                return { success: false, totalRows: rows.length, importedRows: 0, errors, datasetId };
            }

            // Sort by timestamp
            data.sort((a, b) => a.timestamp - b.timestamp);

            // Phase 3: Storing
            this.notifyProgress({ phase: 'STORING', current: 0, total: 1, message: 'Saving to database...' });

            const dataset: ImportedDataset = {
                id: datasetId,
                name: datasetName || file.name.replace(/\.csv$/i, ''),
                importedAt: Date.now(),
                rowCount: data.length,
                columns: Object.keys(mapping).filter(k => mapping[k]),
                timeRange: {
                    start: data[0].isoTime,
                    end: data[data.length - 1].isoTime
                },
                data
            };

            await this.saveDataset(dataset);

            this.notifyProgress({ phase: 'COMPLETE', current: 1, total: 1, message: 'Import complete!' });

            // Audit log
            auditService.log({
                operatorId: 'OPERATOR',
                eventType: 'CONFIG_CHANGE',
                resource: 'HISTORICAL_DATA',
                details: `Imported ${data.length} rows from ${file.name}`
            });

            notificationService.success('Import Complete', `${data.length} data points imported`);

            return {
                success: true,
                totalRows: rows.length,
                importedRows: data.length,
                errors: errors.slice(0, 10), // Limit errors shown
                datasetId
            };

        } catch (e: any) {
            this.notifyProgress({ phase: 'ERROR', current: 0, total: 0, message: e.message });
            return { success: false, totalRows: 0, importedRows: 0, errors: [e.message], datasetId };
        }
    }

    /**
     * Parse timestamp from various formats
     */
    private parseTimestamp(value: string): number | null {
        if (!value) return null;

        // Try ISO format first
        let date = new Date(value);
        if (!isNaN(date.getTime())) return date.getTime();

        // Try common formats
        const formats = [
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/, // ISO
            /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/, // MM/DD/YYYY HH:MM
            /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/, // YYYYMMDDHHMI
        ];

        // Try Unix timestamp
        const num = Number(value);
        if (!isNaN(num)) {
            if (num > 1e12) return num; // Milliseconds
            if (num > 1e9) return num * 1000; // Seconds
        }

        return null;
    }

    /**
     * Parse number from string
     */
    private parseNumber(value: string): number | undefined {
        if (!value || value.trim() === '') return undefined;
        const cleaned = value.replace(/[,$]/g, '');
        const num = Number(cleaned);
        return isNaN(num) ? undefined : num;
    }

    /**
     * Save dataset to IndexedDB
     */
    private async saveDataset(dataset: ImportedDataset): Promise<void> {
        const db = await openDatasetDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(dataset);

        // Update cache
        this.cachedDatasets = this.cachedDatasets.filter(d => d.id !== dataset.id);
        this.cachedDatasets.push(dataset);
    }

    /**
     * List all datasets
     */
    public async listDatasets(): Promise<Omit<ImportedDataset, 'data'>[]> {
        try {
            const db = await openDatasetDB();
            const tx = db.transaction(STORE_NAME, 'readonly');

            return new Promise((resolve, reject) => {
                const request = tx.objectStore(STORE_NAME).getAll();
                request.onsuccess = () => {
                    const datasets = request.result.map(d => ({
                        id: d.id,
                        name: d.name,
                        importedAt: d.importedAt,
                        rowCount: d.rowCount,
                        columns: d.columns,
                        timeRange: d.timeRange
                    }));
                    resolve(datasets.sort((a, b) => b.importedAt - a.importedAt));
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Get dataset by ID
     */
    public async getDataset(id: string): Promise<ImportedDataset | null> {
        try {
            const db = await openDatasetDB();
            const tx = db.transaction(STORE_NAME, 'readonly');

            return new Promise((resolve) => {
                const request = tx.objectStore(STORE_NAME).get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Delete dataset
     */
    public async deleteDataset(id: string): Promise<void> {
        try {
            const db = await openDatasetDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
            this.cachedDatasets = this.cachedDatasets.filter(d => d.id !== id);
            notificationService.info('Dataset Deleted', 'Historical data removed');
        } catch (e) { }
    }

    /**
     * Subscribe to progress updates
     */
    public subscribeProgress(listener: (progress: ImportProgress) => void): () => void {
        this.progressListeners.push(listener);
        return () => {
            this.progressListeners = this.progressListeners.filter(l => l !== listener);
        };
    }

    private notifyProgress(progress: ImportProgress) {
        this.progressListeners.forEach(l => l(progress));
    }
}

export const dataImportService = new DataImportService();
