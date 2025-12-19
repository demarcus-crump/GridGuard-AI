
/**
 * incidentRecorder.ts
 * 
 * "Flight Recorder" for Grid Events
 * 
 * Features:
 * - Continuous state snapshots during incidents
 * - IndexedDB persistence for durability
 * - Playback with timeline scrubbing
 * - Export for post-incident analysis
 */

import { auditService } from './auditService';

// ============================================================================
// TYPES
// ============================================================================

export interface GridSnapshot {
    id: string;
    timestamp: number;
    isoTime: string;

    // Grid State
    load: number;
    generation: number;
    frequency: number;
    reserves: number;

    // Weather
    maxTemp: number;
    conditions: string;

    // Alerts
    activeAlerts: string[];

    // Agent Intelligence
    agentLogs: Array<{
        agent: string;
        message: string;
        type: string;
    }>;
}

export interface IncidentRecording {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    snapshots: GridSnapshot[];
    metadata: {
        peakLoad: number;
        minFrequency: number;
        alertCount: number;
        severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
    };
}

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'GridGuardRecordings';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

function openRecordingDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('startTime', 'startTime', { unique: false });
            }
        };
    });
}

// ============================================================================
// INCIDENT RECORDER
// ============================================================================

class IncidentRecorder {
    private isRecording = false;
    private currentRecording: IncidentRecording | null = null;
    private snapshotInterval: number | null = null;
    private listeners: ((recording: IncidentRecording | null) => void)[] = [];

    // Snapshot frequency during recording (every 5 seconds)
    private readonly SNAPSHOT_INTERVAL_MS = 5000;

    /**
     * Start recording an incident
     */
    public startRecording(name?: string): string {
        if (this.isRecording) {
            console.warn('[RECORDER] Already recording');
            return this.currentRecording?.id || '';
        }

        const recordingId = `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        this.currentRecording = {
            id: recordingId,
            name: name || `Incident ${new Date().toLocaleString()}`,
            startTime: Date.now(),
            snapshots: [],
            metadata: {
                peakLoad: 0,
                minFrequency: 60.0,
                alertCount: 0,
                severity: 'MINOR'
            }
        };

        this.isRecording = true;

        // Take immediate first snapshot
        this.captureSnapshot();

        // Start continuous snapshots
        this.snapshotInterval = window.setInterval(() => {
            this.captureSnapshot();
        }, this.SNAPSHOT_INTERVAL_MS);

        // Log to audit
        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'NAVIGATION',
            resource: 'INCIDENT_RECORDER',
            details: `Started recording: ${this.currentRecording.name}`
        });

        this.notifyListeners();
        console.log(`[RECORDER] Started: ${recordingId}`);

        return recordingId;
    }

    /**
     * Stop recording and save
     */
    public async stopRecording(): Promise<IncidentRecording | null> {
        if (!this.isRecording || !this.currentRecording) {
            return null;
        }

        // Stop snapshots
        if (this.snapshotInterval) {
            clearInterval(this.snapshotInterval);
            this.snapshotInterval = null;
        }

        // Finalize recording
        this.currentRecording.endTime = Date.now();
        this.currentRecording.duration = this.currentRecording.endTime - this.currentRecording.startTime;

        // Calculate severity based on metadata
        this.calculateSeverity();

        // Persist to IndexedDB
        try {
            const db = await openRecordingDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(this.currentRecording);
            console.log(`[RECORDER] Saved: ${this.currentRecording.id}`);
        } catch (e) {
            console.warn('[RECORDER] Failed to persist:', e);
        }

        // Log to audit
        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'NAVIGATION',
            resource: 'INCIDENT_RECORDER',
            details: `Stopped recording: ${this.currentRecording.name}, Duration: ${Math.round((this.currentRecording.duration || 0) / 1000)}s, Severity: ${this.currentRecording.metadata.severity}`
        });

        const finalRecording = { ...this.currentRecording };

        this.isRecording = false;
        this.currentRecording = null;
        this.notifyListeners();

        return finalRecording;
    }

    /**
     * Capture current grid state as snapshot
     */
    private async captureSnapshot() {
        if (!this.currentRecording) return;

        // Get current state from various sources
        // In a real implementation, this would pull from GridContext
        const snapshot: GridSnapshot = {
            id: `snap-${Date.now()}`,
            timestamp: Date.now(),
            isoTime: new Date().toISOString(),

            // Simulated data (would connect to real context)
            load: 55000 + Math.random() * 5000,
            generation: 56000 + Math.random() * 4000,
            frequency: 59.95 + Math.random() * 0.1,
            reserves: 3000 + Math.random() * 2000,

            maxTemp: 85 + Math.random() * 20,
            conditions: 'Clear',

            activeAlerts: [],
            agentLogs: []
        };

        // Update metadata
        this.currentRecording.snapshots.push(snapshot);
        if (snapshot.load > this.currentRecording.metadata.peakLoad) {
            this.currentRecording.metadata.peakLoad = snapshot.load;
        }
        if (snapshot.frequency < this.currentRecording.metadata.minFrequency) {
            this.currentRecording.metadata.minFrequency = snapshot.frequency;
        }

        this.notifyListeners();
    }

    /**
     * Calculate incident severity
     */
    private calculateSeverity() {
        if (!this.currentRecording) return;

        const { peakLoad, minFrequency, alertCount } = this.currentRecording.metadata;

        if (minFrequency < 59.5 || alertCount > 10) {
            this.currentRecording.metadata.severity = 'CRITICAL';
        } else if (minFrequency < 59.9 || peakLoad > 70000) {
            this.currentRecording.metadata.severity = 'MAJOR';
        } else if (alertCount > 3 || peakLoad > 65000) {
            this.currentRecording.metadata.severity = 'MODERATE';
        } else {
            this.currentRecording.metadata.severity = 'MINOR';
        }
    }

    /**
     * Get recording status
     */
    public getStatus(): { isRecording: boolean; current: IncidentRecording | null } {
        return {
            isRecording: this.isRecording,
            current: this.currentRecording
        };
    }

    /**
     * List all saved recordings
     */
    public async listRecordings(): Promise<IncidentRecording[]> {
        try {
            const db = await openRecordingDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.index('startTime').getAll();
                request.onsuccess = () => resolve(request.result.reverse());
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.warn('[RECORDER] Failed to list:', e);
            return [];
        }
    }

    /**
     * Load a specific recording for playback
     */
    public async loadRecording(id: string): Promise<IncidentRecording | null> {
        try {
            const db = await openRecordingDB();
            const tx = db.transaction(STORE_NAME, 'readonly');

            return new Promise((resolve, reject) => {
                const request = tx.objectStore(STORE_NAME).get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Delete a recording
     */
    public async deleteRecording(id: string): Promise<void> {
        try {
            const db = await openRecordingDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
        } catch (e) {
            console.warn('[RECORDER] Failed to delete:', e);
        }
    }

    /**
     * Subscribe to recording updates
     */
    public subscribe(listener: (recording: IncidentRecording | null) => void): () => void {
        this.listeners.push(listener);
        listener(this.currentRecording);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.currentRecording));
    }

    /**
     * Export recording as JSON
     */
    public exportAsJSON(recording: IncidentRecording): string {
        return JSON.stringify({
            export: {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                system: 'GridGuard AI'
            },
            recording
        }, null, 2);
    }
}

export const incidentRecorder = new IncidentRecorder();
