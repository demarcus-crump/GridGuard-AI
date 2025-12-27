/**
 * dataStorageService.ts
 * 
 * Persistent time-series data storage using IndexedDB.
 * Stores ERCOT grid data for ML training and forecasting.
 * 
 * Features:
 * - Stores load, generation, fuel mix, prices, weather
 * - Automatic deduplication by timestamp
 * - Efficient range queries for ML training
 * - ~500MB client-side storage capacity
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DataPoint {
    timestamp: string; // ISO 8601 format
    dataType: 'load' | 'generation' | 'frequency' | 'fuel_mix' | 'price' | 'weather';
    value: number | Record<string, number>;
    unit?: string;
    metadata?: Record<string, any>;
}

export interface StorageStats {
    totalPoints: number;
    oldestTimestamp: string | null;
    newestTimestamp: string | null;
    dataTypes: Record<string, number>;
    sizeEstimateKB: number;
}

// ============================================================================
// INDEXEDDB DATABASE
// ============================================================================

const DB_NAME = 'gridguard-timeseries';
const DB_VERSION = 1;
const STORE_NAME = 'datapoints';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[DATA_STORAGE] Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Create object store with composite key (dataType + timestamp)
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: ['dataType', 'timestamp'] });

                // Indexes for efficient queries
                store.createIndex('by_type', 'dataType', { unique: false });
                store.createIndex('by_timestamp', 'timestamp', { unique: false });
                store.createIndex('by_type_time', ['dataType', 'timestamp'], { unique: true });
            }
        };

        request.onsuccess = () => {
            console.log('[DATA_STORAGE] IndexedDB initialized successfully');
            resolve(request.result);
        };
    });

    return dbPromise;
};

// ============================================================================
// DATA STORAGE SERVICE
// ============================================================================

export const dataStorageService = {
    /**
     * Store a single data point
     */
    async storeDataPoint(dataPoint: DataPoint): Promise<void> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            // put() will update if exists (deduplication by composite key)
            const request = store.put(dataPoint);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Store multiple data points (batch insert)
     */
    async storeDataPoints(dataPoints: DataPoint[]): Promise<number> {
        if (dataPoints.length === 0) return 0;

        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            let count = 0;

            dataPoints.forEach(dp => {
                const request = store.put(dp);
                request.onsuccess = () => count++;
            });

            tx.oncomplete = () => {
                console.log(`[DATA_STORAGE] Stored ${count} data points`);
                resolve(count);
            };
            tx.onerror = () => reject(tx.error);
        });
    },

    /**
     * Get data points within a date range for a specific type
     */
    async getHistoricalRange(
        dataType: DataPoint['dataType'],
        startDate: string,
        endDate: string
    ): Promise<DataPoint[]> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('by_type_time');

            // IDBKeyRange for composite index
            const range = IDBKeyRange.bound(
                [dataType, startDate],
                [dataType, endDate]
            );

            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get the latest N data points for a specific type
     */
    async getLatestN(dataType: DataPoint['dataType'], count: number): Promise<DataPoint[]> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('by_type_time');

            const results: DataPoint[] = [];

            // Open cursor in reverse order (newest first)
            const range = IDBKeyRange.bound([dataType, ''], [dataType, '\uffff']);
            const request = index.openCursor(range, 'prev');

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor && results.length < count) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all data points for a specific type
     */
    async getAllByType(dataType: DataPoint['dataType']): Promise<DataPoint[]> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('by_type');

            const request = index.getAll(IDBKeyRange.only(dataType));

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get storage statistics
     */
    async getStats(): Promise<StorageStats> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);

            const stats: StorageStats = {
                totalPoints: 0,
                oldestTimestamp: null,
                newestTimestamp: null,
                dataTypes: {},
                sizeEstimateKB: 0
            };

            const countRequest = store.count();
            countRequest.onsuccess = () => {
                stats.totalPoints = countRequest.result;
            };

            // Get all to compute stats (could be optimized with cursors for large datasets)
            const allRequest = store.getAll();
            allRequest.onsuccess = () => {
                const all = allRequest.result || [];

                if (all.length > 0) {
                    // Find oldest/newest
                    const timestamps = all.map(d => d.timestamp).sort();
                    stats.oldestTimestamp = timestamps[0];
                    stats.newestTimestamp = timestamps[timestamps.length - 1];

                    // Count by type
                    all.forEach(d => {
                        stats.dataTypes[d.dataType] = (stats.dataTypes[d.dataType] || 0) + 1;
                    });

                    // Rough size estimate
                    stats.sizeEstimateKB = Math.round(JSON.stringify(all).length / 1024);
                }

                resolve(stats);
            };
            allRequest.onerror = () => reject(allRequest.error);
        });
    },

    /**
     * Clear all data (use with caution!)
     */
    async clearAll(): Promise<void> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[DATA_STORAGE] All data cleared');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete data older than a specific date
     */
    async deleteOlderThan(cutoffDate: string): Promise<number> {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('by_timestamp');

            const range = IDBKeyRange.upperBound(cutoffDate);
            let count = 0;

            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    cursor.delete();
                    count++;
                    cursor.continue();
                } else {
                    console.log(`[DATA_STORAGE] Deleted ${count} old data points`);
                    resolve(count);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
};

// Export for console debugging
(window as any).dataStorageService = dataStorageService;

export default dataStorageService;
