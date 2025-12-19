
/**
 * syncService.ts
 * 
 * Multi-User Command Center Synchronization
 * 
 * Features:
 * - Real-time state synchronization
 * - Operator presence tracking
 * - Shared camera view mode
 * - Role-based permissions
 * - Cursor/pointer sharing
 */

import { auditService } from './auditService';
import { notificationService } from './notificationService';

// ============================================================================
// TYPES
// ============================================================================

export interface Operator {
    id: string;
    name: string;
    role: 'VIEWER' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN';
    color: string;
    isActive: boolean;
    lastSeen: number;
    currentView?: string;
    cursor?: { x: number; y: number; onMap: boolean };
}

export interface SyncMessage {
    type: 'PRESENCE' | 'CAMERA' | 'CURSOR' | 'STATE' | 'CHAT' | 'ALERT';
    senderId: string;
    timestamp: number;
    payload: any;
}

export interface RoomState {
    roomId: string;
    operators: Operator[];
    sharedCameraEnabled: boolean;
    leadOperatorId: string | null;
    lastStateUpdate: number;
}

// ============================================================================
// SYNC SERVICE (WebSocket-Ready Architecture)
// ============================================================================

class SyncService {
    private currentOperator: Operator | null = null;
    private roomState: RoomState | null = null;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isConnected = false;

    private listeners: {
        presence: ((operators: Operator[]) => void)[];
        camera: ((cameraState: any) => void)[];
        cursor: ((operator: Operator) => void)[];
        state: ((state: any) => void)[];
    } = {
            presence: [],
            camera: [],
            cursor: [],
            state: []
        };

    // Colors for operator cursors
    private readonly OPERATOR_COLORS = [
        '#22c55e', // green
        '#3b82f6', // blue
        '#f59e0b', // amber
        '#ec4899', // pink
        '#8b5cf6', // violet
        '#f97316', // orange
        '#14b8a6', // teal
        '#ef4444'  // red
    ];

    /**
     * Initialize current operator
     */
    public initOperator(name: string, role: Operator['role'] = 'OPERATOR'): Operator {
        const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const colorIndex = Math.floor(Math.random() * this.OPERATOR_COLORS.length);

        this.currentOperator = {
            id,
            name,
            role,
            color: this.OPERATOR_COLORS[colorIndex],
            isActive: true,
            lastSeen: Date.now()
        };

        auditService.log({
            operatorId: id,
            eventType: 'USER_LOGIN',
            resource: 'SYNC_SERVICE',
            details: `Operator ${name} initialized with role ${role}`
        });

        return this.currentOperator;
    }

    /**
     * Connect to sync room
     * In a real implementation, this would connect to WebSocket server
     */
    public async connectToRoom(roomId: string): Promise<boolean> {
        if (!this.currentOperator) {
            console.warn('[SYNC] Must initialize operator first');
            return false;
        }

        // Initialize room state (simulated - would be from server)
        this.roomState = {
            roomId,
            operators: [this.currentOperator],
            sharedCameraEnabled: false,
            leadOperatorId: null,
            lastStateUpdate: Date.now()
        };

        this.isConnected = true;

        // In production: this would be WebSocket connection
        // this.ws = new WebSocket(`wss://sync.gridguard.ai/room/${roomId}`);
        // this.setupWebSocketHandlers();

        console.log(`[SYNC] Connected to room: ${roomId}`);
        notificationService.success('Room Connected', `Joined command center: ${roomId}`);

        // Simulate other operators joining for demo
        this.simulateOtherOperators();

        return true;
    }

    /**
     * Disconnect from room
     */
    public disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.currentOperator && this.roomState) {
            auditService.log({
                operatorId: this.currentOperator.id,
                eventType: 'USER_LOGOUT',
                resource: 'SYNC_SERVICE',
                details: `Disconnected from room ${this.roomState.roomId}`
            });
        }

        this.isConnected = false;
        this.roomState = null;
        this.notifyPresence();
    }

    /**
     * Update cursor position
     */
    public updateCursor(x: number, y: number, onMap: boolean = false) {
        if (!this.currentOperator || !this.isConnected) return;

        this.currentOperator.cursor = { x, y, onMap };
        this.currentOperator.lastSeen = Date.now();

        // In production: broadcast via WebSocket
        // this.send({ type: 'CURSOR', senderId: this.currentOperator.id, payload: { x, y, onMap } });
    }

    /**
     * Broadcast camera change
     */
    public broadcastCamera(cameraState: any) {
        if (!this.currentOperator || !this.isConnected) return;

        // Only lead operator can broadcast camera in shared mode
        if (this.roomState?.sharedCameraEnabled &&
            this.roomState.leadOperatorId !== this.currentOperator.id) {
            return;
        }

        // In production: broadcast via WebSocket
        // this.send({ type: 'CAMERA', senderId: this.currentOperator.id, payload: cameraState });

        this.listeners.camera.forEach(l => l(cameraState));
    }

    /**
     * Enable shared camera mode
     */
    public enableSharedCamera() {
        if (!this.roomState || !this.currentOperator) return;

        this.roomState.sharedCameraEnabled = true;
        this.roomState.leadOperatorId = this.currentOperator.id;

        notificationService.info('Shared View Active', 'You are now the lead. Others will follow your camera.');

        auditService.log({
            operatorId: this.currentOperator.id,
            eventType: 'CONFIG_CHANGE',
            resource: 'SYNC_SERVICE',
            details: 'Enabled shared camera mode'
        });
    }

    /**
     * Disable shared camera mode
     */
    public disableSharedCamera() {
        if (!this.roomState) return;

        this.roomState.sharedCameraEnabled = false;
        this.roomState.leadOperatorId = null;

        notificationService.info('Independent View', 'Shared camera mode disabled.');
    }

    /**
     * Get current operators
     */
    public getOperators(): Operator[] {
        return this.roomState?.operators || [];
    }

    /**
     * Get room state
     */
    public getRoomState(): RoomState | null {
        return this.roomState;
    }

    /**
     * Check if connected
     */
    public isConnectedToRoom(): boolean {
        return this.isConnected;
    }

    /**
     * Subscribe to presence updates
     */
    public subscribePresence(listener: (operators: Operator[]) => void): () => void {
        this.listeners.presence.push(listener);
        listener(this.roomState?.operators || []);
        return () => {
            this.listeners.presence = this.listeners.presence.filter(l => l !== listener);
        };
    }

    /**
     * Subscribe to camera updates
     */
    public subscribeCamera(listener: (cameraState: any) => void): () => void {
        this.listeners.camera.push(listener);
        return () => {
            this.listeners.camera = this.listeners.camera.filter(l => l !== listener);
        };
    }

    /**
     * Subscribe to cursor updates
     */
    public subscribeCursor(listener: (operator: Operator) => void): () => void {
        this.listeners.cursor.push(listener);
        return () => {
            this.listeners.cursor = this.listeners.cursor.filter(l => l !== listener);
        };
    }

    private notifyPresence() {
        this.listeners.presence.forEach(l => l(this.roomState?.operators || []));
    }

    /**
     * Simulate other operators for demo
     */
    private simulateOtherOperators() {
        if (!this.roomState) return;

        // Add simulated operators after a delay
        setTimeout(() => {
            if (!this.roomState) return;

            const simOperator: Operator = {
                id: 'sim-op-1',
                name: 'Sarah Chen',
                role: 'SUPERVISOR',
                color: this.OPERATOR_COLORS[1],
                isActive: true,
                lastSeen: Date.now(),
                currentView: 'Dashboard'
            };

            this.roomState.operators.push(simOperator);
            this.notifyPresence();

            notificationService.info('Operator Joined', `${simOperator.name} (${simOperator.role}) joined the room`);
        }, 3000);

        setTimeout(() => {
            if (!this.roomState) return;

            const simOperator2: Operator = {
                id: 'sim-op-2',
                name: 'Mike Rodriguez',
                role: 'OPERATOR',
                color: this.OPERATOR_COLORS[2],
                isActive: true,
                lastSeen: Date.now(),
                currentView: 'Grid Recon'
            };

            this.roomState.operators.push(simOperator2);
            this.notifyPresence();

            notificationService.info('Operator Joined', `${simOperator2.name} (${simOperator2.role}) joined the room`);
        }, 7000);
    }

    /**
     * WebSocket setup (for production)
     */
    private setupWebSocketHandlers() {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.sendPresence();
        };

        this.ws.onmessage = (event) => {
            try {
                const message: SyncMessage = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (e) { }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.attemptReconnect();
        };

        this.ws.onerror = () => {
            this.isConnected = false;
        };
    }

    private handleMessage(message: SyncMessage) {
        switch (message.type) {
            case 'PRESENCE':
                // Update operators list
                break;
            case 'CAMERA':
                if (this.roomState?.sharedCameraEnabled &&
                    message.senderId === this.roomState.leadOperatorId) {
                    this.listeners.camera.forEach(l => l(message.payload));
                }
                break;
            case 'CURSOR':
                // Update other operator's cursor
                break;
        }
    }

    private sendPresence() {
        if (!this.currentOperator) return;

        // this.send({ type: 'PRESENCE', senderId: this.currentOperator.id, payload: this.currentOperator });
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

        this.reconnectAttempts++;
        setTimeout(() => {
            if (this.roomState) {
                this.connectToRoom(this.roomState.roomId);
            }
        }, 2000 * this.reconnectAttempts);
    }
}

export const syncService = new SyncService();
