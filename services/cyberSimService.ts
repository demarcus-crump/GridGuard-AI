
/**
 * cyberSimService.ts
 * 
 * Cyber Attack Simulation Mode
 * 
 * Features:
 * - Pre-defined attack scenarios (SCADA compromise, DDoS, insider threat)
 * - Cascading failure simulation
 * - Operator training with decision points
 * - Performance scoring
 * - NERC CIP compliance training
 */

import { notificationService } from './notificationService';
import { auditService } from './auditService';

// ============================================================================
// TYPES
// ============================================================================

export interface AttackScenario {
    id: string;
    name: string;
    description: string;
    type: 'SCADA_COMPROMISE' | 'DDOS' | 'INSIDER_THREAT' | 'RANSOMWARE' | 'SUPPLY_CHAIN';
    difficulty: 'TRAINING' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    duration: number; // seconds
    phases: AttackPhase[];
}

export interface AttackPhase {
    id: string;
    name: string;
    description: string;
    durationSec: number;
    effects: AttackEffect[];
    decisionPoint?: DecisionPoint;
}

export interface AttackEffect {
    type: 'ASSET_OFFLINE' | 'FREQUENCY_DROP' | 'LOAD_SPIKE' | 'COMMS_DEGRADED' | 'DATA_CORRUPTED';
    target: string;
    severity: number; // 0-100
    visualEffect: 'FLASH_RED' | 'FLICKER' | 'FADE_OUT' | 'PULSE_ORANGE';
}

export interface DecisionPoint {
    prompt: string;
    options: Array<{
        id: string;
        label: string;
        isCorrect: boolean;
        consequence: string;
        scoreImpact: number;
    }>;
    timeLimitSec: number;
}

export interface SimulationState {
    isRunning: boolean;
    scenario: AttackScenario | null;
    currentPhaseIndex: number;
    elapsedTime: number;
    score: number;
    decisions: Array<{
        phaseId: string;
        choiceId: string;
        wasCorrect: boolean;
        responseTime: number;
    }>;
    affectedAssets: string[];
}

// ============================================================================
// PRE-DEFINED SCENARIOS
// ============================================================================

const SCENARIOS: AttackScenario[] = [
    {
        id: 'scada-1',
        name: 'SCADA Protocol Exploit',
        description: 'Adversary exploits DNP3 vulnerability to send malicious commands to remote substations.',
        type: 'SCADA_COMPROMISE',
        difficulty: 'INTERMEDIATE',
        duration: 180,
        phases: [
            {
                id: 'phase-1',
                name: 'Initial Compromise',
                description: 'Attacker gains foothold in HMI workstation',
                durationSec: 30,
                effects: [
                    { type: 'DATA_CORRUPTED', target: 'Substation A Telemetry', severity: 20, visualEffect: 'FLICKER' }
                ]
            },
            {
                id: 'phase-2',
                name: 'Lateral Movement',
                description: 'Attacker pivots to control servers',
                durationSec: 45,
                effects: [
                    { type: 'COMMS_DEGRADED', target: 'ICCP Link', severity: 50, visualEffect: 'PULSE_ORANGE' }
                ],
                decisionPoint: {
                    prompt: 'Anomalous traffic detected on control network. What action do you take?',
                    options: [
                        { id: 'isolate', label: 'Isolate affected segment', isCorrect: true, consequence: 'Attack contained, minimal impact', scoreImpact: 25 },
                        { id: 'monitor', label: 'Continue monitoring', isCorrect: false, consequence: 'Attack spreads to additional systems', scoreImpact: -15 },
                        { id: 'reboot', label: 'Reboot control servers', isCorrect: false, consequence: 'Temporary blindness, attack persists', scoreImpact: -10 }
                    ],
                    timeLimitSec: 30
                }
            },
            {
                id: 'phase-3',
                name: 'Malicious Commands',
                description: 'Attacker sends trip commands to breakers',
                durationSec: 30,
                effects: [
                    { type: 'ASSET_OFFLINE', target: 'West Corridor Breaker 7', severity: 90, visualEffect: 'FLASH_RED' },
                    { type: 'FREQUENCY_DROP', target: 'System', severity: 40, visualEffect: 'PULSE_ORANGE' }
                ],
                decisionPoint: {
                    prompt: 'Multiple breakers tripping unexpectedly. Emergency response?',
                    options: [
                        { id: 'manual', label: 'Switch to manual control mode', isCorrect: true, consequence: 'Operators regain control', scoreImpact: 30 },
                        { id: 'automated', label: 'Trust automated restoration', isCorrect: false, consequence: 'Attacker exploits restoration sequence', scoreImpact: -25 },
                        { id: 'shed', label: 'Immediate controlled load shed', isCorrect: true, consequence: 'Frequency stabilized quickly', scoreImpact: 20 }
                    ],
                    timeLimitSec: 20
                }
            },
            {
                id: 'phase-4',
                name: 'Post-Incident',
                description: 'Attack contained, assess damage',
                durationSec: 45,
                effects: []
            }
        ]
    },
    {
        id: 'ddos-1',
        name: 'Distributed Denial of Service',
        description: 'Massive DDoS attack targeting energy management system interfaces.',
        type: 'DDOS',
        difficulty: 'TRAINING',
        duration: 120,
        phases: [
            {
                id: 'ddos-p1',
                name: 'Traffic Spike',
                description: 'Unusual network traffic volume detected',
                durationSec: 20,
                effects: [
                    { type: 'COMMS_DEGRADED', target: 'EMS Gateway', severity: 60, visualEffect: 'PULSE_ORANGE' }
                ],
                decisionPoint: {
                    prompt: 'Network latency spiking, web interfaces unresponsive. Action?',
                    options: [
                        { id: 'filter', label: 'Activate DDoS mitigation filters', isCorrect: true, consequence: 'Attack mitigated', scoreImpact: 30 },
                        { id: 'wait', label: 'Wait for ISP intervention', isCorrect: false, consequence: 'Extended outage', scoreImpact: -15 }
                    ],
                    timeLimitSec: 25
                }
            },
            {
                id: 'ddos-p2',
                name: 'Saturation',
                description: 'Bandwidth completely consumed',
                durationSec: 40,
                effects: [
                    { type: 'COMMS_DEGRADED', target: 'All External Links', severity: 95, visualEffect: 'FADE_OUT' }
                ]
            },
            {
                id: 'ddos-p3',
                name: 'Recovery',
                description: 'Mitigation active, restoring services',
                durationSec: 40,
                effects: []
            }
        ]
    },
    {
        id: 'ransomware-1',
        name: 'Ransomware Incident',
        description: 'Ransomware encrypts control system historian and engineering workstations.',
        type: 'RANSOMWARE',
        difficulty: 'ADVANCED',
        duration: 240,
        phases: [
            {
                id: 'rw-p1',
                name: 'Initial Infection',
                description: 'Phishing email delivers payload',
                durationSec: 30,
                effects: [
                    { type: 'DATA_CORRUPTED', target: 'Engineering Workstation', severity: 30, visualEffect: 'FLICKER' }
                ]
            },
            {
                id: 'rw-p2',
                name: 'Encryption Spreads',
                description: 'Ransomware propagates across network',
                durationSec: 60,
                effects: [
                    { type: 'ASSET_OFFLINE', target: 'Historian Database', severity: 80, visualEffect: 'FADE_OUT' },
                    { type: 'DATA_CORRUPTED', target: 'Backup Systems', severity: 70, visualEffect: 'FLASH_RED' }
                ],
                decisionPoint: {
                    prompt: 'Ransomware detected encrypting critical systems. Immediate action?',
                    options: [
                        { id: 'disconnect', label: 'Disconnect infected systems from network', isCorrect: true, consequence: 'Spread contained', scoreImpact: 35 },
                        { id: 'shutdown', label: 'Full system shutdown', isCorrect: false, consequence: 'Loss of visibility, extended outage', scoreImpact: -20 },
                        { id: 'pay', label: 'Consider ransom payment', isCorrect: false, consequence: 'No guarantee of recovery, legal issues', scoreImpact: -40 }
                    ],
                    timeLimitSec: 30
                }
            },
            {
                id: 'rw-p3',
                name: 'Restoration',
                description: 'Activating incident response plan',
                durationSec: 90,
                effects: []
            }
        ]
    }
];

// ============================================================================
// CYBER SIMULATION SERVICE
// ============================================================================

class CyberSimService {
    private state: SimulationState = {
        isRunning: false,
        scenario: null,
        currentPhaseIndex: 0,
        elapsedTime: 0,
        score: 100,
        decisions: [],
        affectedAssets: []
    };

    private phaseTimer: number | null = null;
    private tickTimer: number | null = null;
    private phaseStartTime: number = 0;
    private listeners: ((state: SimulationState) => void)[] = [];

    /**
     * Get available scenarios
     */
    public getScenarios(): AttackScenario[] {
        return SCENARIOS;
    }

    /**
     * Get current state
     */
    public getState(): SimulationState {
        return { ...this.state };
    }

    /**
     * Start a simulation
     */
    public startSimulation(scenarioId: string): boolean {
        const scenario = SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) {
            console.warn('[CYBER SIM] Scenario not found:', scenarioId);
            return false;
        }

        if (this.state.isRunning) {
            this.stopSimulation();
        }

        this.state = {
            isRunning: true,
            scenario,
            currentPhaseIndex: 0,
            elapsedTime: 0,
            score: 100,
            decisions: [],
            affectedAssets: []
        };

        // Log to audit
        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'NAVIGATION',
            resource: 'CYBER_SIMULATION',
            details: `Started simulation: ${scenario.name}`
        });

        notificationService.warning('Simulation Active', `${scenario.name} - Training Mode Engaged`);

        // Start first phase
        this.startPhase(0);

        // Start tick timer for elapsed time
        this.tickTimer = window.setInterval(() => {
            this.state.elapsedTime++;
            this.notifyListeners();
        }, 1000);

        this.notifyListeners();
        return true;
    }

    /**
     * Start a specific phase
     */
    private startPhase(phaseIndex: number) {
        if (!this.state.scenario || phaseIndex >= this.state.scenario.phases.length) {
            this.completeSimulation();
            return;
        }

        this.state.currentPhaseIndex = phaseIndex;
        const phase = this.state.scenario.phases[phaseIndex];
        this.phaseStartTime = Date.now();

        console.log(`[CYBER SIM] Phase ${phaseIndex + 1}: ${phase.name}`);
        notificationService.info(`Phase ${phaseIndex + 1}`, phase.name);

        // Apply effects
        phase.effects.forEach(effect => {
            this.state.affectedAssets.push(effect.target);

            // Dispatch visual effect event
            window.dispatchEvent(new CustomEvent('gridguard-cyber-effect', {
                detail: { effect }
            }));
        });

        // Set timer for next phase
        this.phaseTimer = window.setTimeout(() => {
            // If there was a decision point and no decision made, penalize
            if (phase.decisionPoint && !this.state.decisions.find(d => d.phaseId === phase.id)) {
                this.state.score -= 20;
                this.state.decisions.push({
                    phaseId: phase.id,
                    choiceId: 'TIMEOUT',
                    wasCorrect: false,
                    responseTime: phase.decisionPoint.timeLimitSec
                });
            }

            this.startPhase(phaseIndex + 1);
        }, phase.durationSec * 1000);

        this.notifyListeners();
    }

    /**
     * Handle operator decision
     */
    public makeDecision(optionId: string): boolean {
        if (!this.state.isRunning || !this.state.scenario) return false;

        const phase = this.state.scenario.phases[this.state.currentPhaseIndex];
        if (!phase.decisionPoint) return false;

        const option = phase.decisionPoint.options.find(o => o.id === optionId);
        if (!option) return false;

        const responseTime = (Date.now() - this.phaseStartTime) / 1000;

        this.state.decisions.push({
            phaseId: phase.id,
            choiceId: optionId,
            wasCorrect: option.isCorrect,
            responseTime
        });

        this.state.score += option.scoreImpact;
        this.state.score = Math.max(0, Math.min(100, this.state.score));

        // Log to audit
        auditService.log({
            operatorId: 'OPERATOR',
            eventType: option.isCorrect ? 'OPERATOR_APPROVAL' : 'OPERATOR_OVERRIDE',
            resource: 'CYBER_SIMULATION',
            details: `Decision: ${option.label} - ${option.isCorrect ? 'CORRECT' : 'INCORRECT'}`
        });

        if (option.isCorrect) {
            notificationService.success('Correct Response', option.consequence);
        } else {
            notificationService.error('Suboptimal Response', option.consequence);
        }

        this.notifyListeners();
        return option.isCorrect;
    }

    /**
     * Complete simulation
     */
    private completeSimulation() {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }

        const finalScore = this.state.score;
        const correctDecisions = this.state.decisions.filter(d => d.wasCorrect).length;
        const totalDecisions = this.state.decisions.length;

        // Log completion
        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'NAVIGATION',
            resource: 'CYBER_SIMULATION',
            details: `Completed: ${this.state.scenario?.name}. Score: ${finalScore}/100, Decisions: ${correctDecisions}/${totalDecisions}`
        });

        notificationService.success(
            'Simulation Complete',
            `Final Score: ${finalScore}/100 (${correctDecisions}/${totalDecisions} correct decisions)`
        );

        this.state.isRunning = false;
        this.notifyListeners();
    }

    /**
     * Stop simulation
     */
    public stopSimulation() {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }

        this.state.isRunning = false;
        this.notifyListeners();
    }

    /**
     * Subscribe to state updates
     */
    public subscribe(listener: (state: SimulationState) => void): () => void {
        this.listeners.push(listener);
        listener(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.state));
    }
}

export const cyberSimService = new CyberSimService();
