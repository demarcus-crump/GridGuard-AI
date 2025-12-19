
/**
 * offlineService.ts
 * 
 * Offline/Air-Gapped Mode Support
 * 
 * Features:
 * - Online/offline detection
 * - IndexedDB data caching
 * - Sync queue for reconnection
 * - Service worker registration
 * - Fallback data provision
 */

import { notificationService } from './notificationService';
import { auditService } from './auditService';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedData {
    key: string;
    data: any;
    timestamp: number;
    ttl: number; // Time to live in ms
}

export interface SyncQueueItem {
    id: string;
    action: string;
    payload: any;
    timestamp: number;
    retries: number;
}

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'AIR_GAPPED';

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'GridGuardOffline';
const DB_VERSION = 1;
const CACHE_STORE = 'dataCache';
const QUEUE_STORE = 'syncQueue';

function openOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(CACHE_STORE)) {
                const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
                cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                queueStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// ============================================================================
// OFFLINE SERVICE
// ============================================================================

class OfflineService {
    private status: ConnectionStatus = 'ONLINE';
    private isAirGapped = false;
    private listeners: ((status: ConnectionStatus) => void)[] = [];
    private syncQueue: SyncQueueItem[] = [];

    constructor() {
        this.initialize();
    }

    private async initialize() {
        // Check for air-gapped mode flag
        this.isAirGapped = localStorage.getItem('AIR_GAPPED_MODE') === 'true';

        if (this.isAirGapped) {
            this.status = 'AIR_GAPPED';
            console.log('[OFFLINE] Air-gapped mode active');
        } else {
            // Set up online/offline listeners
            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());

            // Initial status check
            this.status = navigator.onLine ? 'ONLINE' : 'OFFLINE';
        }

        // Load pending sync queue
        await this.loadSyncQueue();

        // Register service worker if available
        this.registerServiceWorker();
    }

    /**
     * Register service worker for caching
     */
    private async registerServiceWorker() {
        if ('serviceWorker' in navigator && !this.isAirGapped) {
            try {
                // Check if service worker file exists
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('[OFFLINE] Service worker registered:', registration.scope);
            } catch (e) {
                console.log('[OFFLINE] Service worker not available (expected in dev mode)');
            }
        }
    }

    /**
     * Handle going online
     */
    private handleOnline() {
        if (this.isAirGapped) return;

        this.status = 'ONLINE';
        this.notifyListeners();

        notificationService.success('Connection Restored', 'System back online, syncing data...');

        auditService.log({
            operatorId: 'SYSTEM',
            eventType: 'SYSTEM_BOOT',
            resource: 'NETWORK',
            details: 'Connection restored'
        });

        // Process sync queue
        this.processSyncQueue();
    }

    /**
     * Handle going offline
     */
    private handleOffline() {
        if (this.isAirGapped) return;

        this.status = 'OFFLINE';
        this.notifyListeners();

        notificationService.warning('Connection Lost', 'Operating in offline mode, using cached data');

        auditService.log({
            operatorId: 'SYSTEM',
            eventType: 'ALERT_TRIGGERED',
            resource: 'NETWORK',
            details: 'Connection lost - offline mode active'
        });
    }

    /**
     * Get current status
     */
    public getStatus(): ConnectionStatus {
        return this.status;
    }

    /**
     * Check if offline
     */
    public isOffline(): boolean {
        return this.status === 'OFFLINE' || this.status === 'AIR_GAPPED';
    }

    /**
     * Enable air-gapped mode
     */
    public enableAirGappedMode() {
        localStorage.setItem('AIR_GAPPED_MODE', 'true');
        this.isAirGapped = true;
        this.status = 'AIR_GAPPED';
        this.notifyListeners();

        notificationService.info('Air-Gapped Mode', 'System now operating in isolated mode');

        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'CONFIG_CHANGE',
            resource: 'SECURITY',
            details: 'Air-gapped mode enabled'
        });
    }

    /**
     * Disable air-gapped mode
     */
    public disableAirGappedMode() {
        localStorage.removeItem('AIR_GAPPED_MODE');
        this.isAirGapped = false;
        this.status = navigator.onLine ? 'ONLINE' : 'OFFLINE';
        this.notifyListeners();

        notificationService.info('Air-Gapped Mode Disabled', 'Network connectivity enabled');
    }

    /**
     * Cache data for offline use
     */
    public async cacheData(key: string, data: any, ttlMs: number = 3600000): Promise<void> {
        try {
            const db = await openOfflineDB();
            const tx = db.transaction(CACHE_STORE, 'readwrite');

            const cached: CachedData = {
                key,
                data,
                timestamp: Date.now(),
                ttl: ttlMs
            };

            tx.objectStore(CACHE_STORE).put(cached);
        } catch (e) {
            console.warn('[OFFLINE] Failed to cache data:', e);
        }
    }

    /**
     * Get cached data
     */
    public async getCachedData(key: string): Promise<any | null> {
        try {
            const db = await openOfflineDB();
            const tx = db.transaction(CACHE_STORE, 'readonly');

            return new Promise((resolve) => {
                const request = tx.objectStore(CACHE_STORE).get(key);

                request.onsuccess = () => {
                    const cached = request.result as CachedData | undefined;

                    if (!cached) {
                        resolve(null);
                        return;
                    }

                    // Check if expired
                    if (Date.now() - cached.timestamp > cached.ttl) {
                        this.deleteCachedData(key);
                        resolve(null);
                        return;
                    }

                    resolve(cached.data);
                };

                request.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Delete cached data
     */
    public async deleteCachedData(key: string): Promise<void> {
        try {
            const db = await openOfflineDB();
            const tx = db.transaction(CACHE_STORE, 'readwrite');
            tx.objectStore(CACHE_STORE).delete(key);
        } catch (e) { }
    }

    /**
     * Add action to sync queue
     */
    public async queueForSync(action: string, payload: any): Promise<string> {
        const item: SyncQueueItem = {
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            action,
            payload,
            timestamp: Date.now(),
            retries: 0
        };

        this.syncQueue.push(item);

        try {
            const db = await openOfflineDB();
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            tx.objectStore(QUEUE_STORE).put(item);
        } catch (e) { }

        return item.id;
    }

    /**
     * Load sync queue from IndexedDB
     */
    private async loadSyncQueue() {
        try {
            const db = await openOfflineDB();
            const tx = db.transaction(QUEUE_STORE, 'readonly');

            const request = tx.objectStore(QUEUE_STORE).getAll();
            request.onsuccess = () => {
                this.syncQueue = request.result || [];
            };
        } catch (e) { }
    }

    /**
     * Process sync queue when back online
     */
    private async processSyncQueue() {
        if (this.syncQueue.length === 0) return;

        console.log(`[OFFLINE] Processing ${this.syncQueue.length} queued items`);

        // In a real implementation, this would send queued actions to the server
        for (const item of this.syncQueue) {
            console.log(`[OFFLINE] Would sync: ${item.action}`);
        }

        // Clear queue after processing
        this.syncQueue = [];

        try {
            const db = await openOfflineDB();
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            tx.objectStore(QUEUE_STORE).clear();
        } catch (e) { }
    }

    /**
     * Subscribe to status changes
     */
    public subscribe(listener: (status: ConnectionStatus) => void): () => void {
        this.listeners.push(listener);
        listener(this.status);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.status));
    }

    /**
     * Clear all offline data
     */
    public async clearAllData(): Promise<void> {
        try {
            const db = await openOfflineDB();
            const tx = db.transaction([CACHE_STORE, QUEUE_STORE], 'readwrite');
            tx.objectStore(CACHE_STORE).clear();
            tx.objectStore(QUEUE_STORE).clear();
            this.syncQueue = [];
        } catch (e) { }
    }
}

export const offlineService = new OfflineService();
