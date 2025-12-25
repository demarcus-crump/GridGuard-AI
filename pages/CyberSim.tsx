
import React, { useState, useEffect } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { cyberSimService, AttackScenario, SimulationState, LiveThreatEvent } from '../services/cyberSimService';

// ============================================================================
// TYPES
// ============================================================================

type CyberMode = 'LIVE' | 'TRAINING';

// ============================================================================
// COMPONENT
// ============================================================================

export const CyberSim: React.FC = () => {
    // Mode State - LIVE MONITOR or TRAINING SIM
    const [mode, setMode] = useState<CyberMode>('LIVE');

    // Training Mode State
    const [scenarios] = useState<AttackScenario[]>(cyberSimService.getScenarios());
    const [simState, setSimState] = useState<SimulationState>(cyberSimService.getState());
    const [selectedScenario, setSelectedScenario] = useState<AttackScenario | null>(null);

    // Live Monitor State
    const [liveThreats, setLiveThreats] = useState<LiveThreatEvent[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // Subscribe to training simulation state
    useEffect(() => {
        const unsubscribe = cyberSimService.subscribe((state) => {
            setSimState(state);
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to live threats when in LIVE mode
    useEffect(() => {
        if (mode === 'LIVE' && isMonitoring) {
            const unsubscribe = cyberSimService.subscribeToLiveThreats((threat) => {
                setLiveThreats(prev => [threat, ...prev].slice(0, 50)); // Keep last 50 threats
            });
            return () => unsubscribe();
        }
    }, [mode, isMonitoring]);

    // Training handlers
    const handleStart = (scenarioId: string) => {
        cyberSimService.startSimulation(scenarioId);
    };

    const handleStop = () => {
        cyberSimService.stopSimulation();
    };

    const handleDecision = (optionId: string) => {
        cyberSimService.makeDecision(optionId);
    };

    const currentPhase = simState.scenario?.phases[simState.currentPhaseIndex];
    const progressPercent = simState.scenario
        ? (simState.elapsedTime / simState.scenario.duration) * 100
        : 0;

    return (
        <div className="space-y-6">
            {/* HEADER with Mode Toggle */}
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Cyber Defense Center</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {mode === 'LIVE' ? 'Real-time Agent Swarm Monitoring' : 'NERC CIP Compliance Training'}
                    </p>
                </div>

                {/* Mode Toggle Segmented Control */}
                <div className="flex items-center gap-4">
                    <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-1 border border-[var(--border-default)]">
                        <button
                            onClick={() => { setMode('LIVE'); setIsMonitoring(true); }}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${mode === 'LIVE'
                                    ? 'bg-[var(--status-normal)] text-white shadow-md'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${mode === 'LIVE' ? 'bg-white animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                            LIVE MONITOR
                        </button>
                        <button
                            onClick={() => setMode('TRAINING')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${mode === 'TRAINING'
                                    ? 'bg-[var(--status-info)] text-white shadow-md'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            TRAINING SIM
                        </button>
                    </div>

                    {/* Training Mode Score (only when simulation is running) */}
                    {mode === 'TRAINING' && simState.isRunning && (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-[var(--text-muted)] uppercase">Score</div>
                                <div className={`text-2xl font-bold font-mono ${simState.score >= 70 ? 'text-[var(--status-normal)]' :
                                    simState.score >= 40 ? 'text-[var(--status-warning)]' :
                                        'text-[var(--status-critical)]'
                                    }`}>{simState.score}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-[var(--text-muted)] uppercase">Time</div>
                                <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                                    {Math.floor(simState.elapsedTime / 60)}:{String(simState.elapsedTime % 60).padStart(2, '0')}
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={handleStop}>
                                ABORT
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            {/* ================================================================ */}
            {/* LIVE MONITOR MODE */}
            {/* ================================================================ */}
            {mode === 'LIVE' && (
                <div className="space-y-6 animate-in fade-in">
                    {/* Monitoring Status Bar */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-default)]">
                        <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${isMonitoring ? 'bg-[var(--status-normal)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                            <span className="font-mono text-sm text-[var(--text-primary)]">
                                {isMonitoring ? '📡 MONITORING AGENT SWARM...' : 'MONITOR OFFLINE'}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-[var(--text-muted)]">
                                Threats detected: <span className="font-mono font-bold text-[var(--text-primary)]">{liveThreats.length}</span>
                            </span>
                            <Button
                                variant={isMonitoring ? 'secondary' : 'primary'}
                                size="sm"
                                onClick={() => setIsMonitoring(!isMonitoring)}
                            >
                                {isMonitoring ? 'PAUSE' : 'START MONITORING'}
                            </Button>
                            {liveThreats.length > 0 && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setLiveThreats([])}
                                >
                                    CLEAR LOG
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* HONEST EMPTY STATE - Green Shield when secure */}
                    {liveThreats.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center py-16">
                            <div className="w-24 h-24 rounded-full bg-[var(--status-normal-muted)] flex items-center justify-center mb-6">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--status-normal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-[var(--status-normal)] mb-2">SYSTEM SECURE</h3>
                            <p className="text-[var(--text-secondary)] text-center max-w-md">
                                No active anomalies detected by Agent Swarm.
                                {isMonitoring ? ' Continuously monitoring for threats...' : ' Start monitoring to begin threat detection.'}
                            </p>
                        </Card>
                    ) : (
                        /* LIVE THREAT FEED */
                        <Card title="Active Threat Feed" action={
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                                Last update: {liveThreats[0]?.timestamp.toLocaleTimeString()}
                            </span>
                        }>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {liveThreats.map((threat) => (
                                    <div
                                        key={threat.id}
                                        className={`p-4 rounded-lg border-l-4 animate-in slide-in-from-left ${threat.severity === 'critical'
                                                ? 'bg-[var(--status-critical-muted)] border-[var(--status-critical)]'
                                                : threat.severity === 'high'
                                                    ? 'bg-[var(--status-warning-muted)] border-[var(--status-warning)]'
                                                    : 'bg-[var(--status-info-muted)] border-[var(--status-info)]'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${threat.severity === 'critical'
                                                            ? 'bg-[var(--status-critical)] text-white'
                                                            : threat.severity === 'high'
                                                                ? 'bg-[var(--status-warning)] text-black'
                                                                : 'bg-[var(--status-info)] text-white'
                                                        }`}>
                                                        {threat.severity}
                                                    </span>
                                                    <span className="text-xs font-mono text-[var(--text-muted)]">
                                                        Source: {threat.source}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-[var(--text-primary)] mb-1">{threat.name}</h4>
                                                {threat.rawLog?.analysis && (
                                                    <p className="text-sm text-[var(--text-secondary)]">{threat.rawLog.analysis}</p>
                                                )}
                                                {threat.rawLog?.recommendation && (
                                                    <p className="text-xs text-[var(--status-info)] mt-1">
                                                        Recommendation: {threat.rawLog.recommendation}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono text-[var(--text-muted)]">
                                                    {threat.timestamp.toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Info Banner */}
                    <Card className="bg-[var(--bg-tertiary)] border-[var(--border-muted)]">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-[var(--status-normal-muted)] flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-normal)" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4" />
                                    <path d="M12 8h.01" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-[var(--text-primary)] mb-1">Live Threat Intelligence</h4>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    This feed displays real-time alerts from the Agent Orchestrator. CRITICAL and WARNING
                                    level events from Weather, Load, Grid, and Market agents are elevated to threat status.
                                    No simulated scenarios — only actual AI detections.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* ================================================================ */}
            {/* TRAINING SIMULATION MODE */}
            {/* ================================================================ */}
            {mode === 'TRAINING' && (
                <>
                    {/* SIMULATION ACTIVE */}
                    {simState.isRunning && simState.scenario && currentPhase && (
                        <div className="space-y-4 animate-in fade-in">
                            {/* Progress Bar */}
                            <div className="bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[var(--status-critical)] via-[var(--status-warning)] to-[var(--status-normal)] transition-all duration-1000"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            {/* Current Phase */}
                            <Card className="border-2 border-[var(--status-critical)] animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-[var(--status-critical)] flex items-center justify-center text-white font-bold">
                                        {simState.currentPhaseIndex + 1}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[var(--status-critical)]">{currentPhase.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)]">{currentPhase.description}</p>
                                    </div>
                                </div>

                                {/* Active Effects */}
                                {currentPhase.effects.length > 0 && (
                                    <div className="mb-4 p-3 bg-[var(--status-critical-muted)] rounded border border-[var(--status-critical)]">
                                        <div className="text-xs font-bold text-[var(--status-critical)] uppercase mb-2">Active Threats</div>
                                        <div className="space-y-1">
                                            {currentPhase.effects.map((effect, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm">
                                                    <div className="w-2 h-2 rounded-full bg-[var(--status-critical)] animate-ping" />
                                                    <span className="text-[var(--text-primary)]">{effect.target}</span>
                                                    <span className="text-[var(--text-muted)]">— {effect.type.replace(/_/g, ' ')}</span>
                                                    <span className="text-[var(--status-critical)] font-mono">{effect.severity}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Decision Point */}
                                {currentPhase.decisionPoint && (
                                    <div className="p-4 bg-[var(--bg-primary)] rounded border border-[var(--status-warning)]">
                                        <div className="text-xs font-bold text-[var(--status-warning)] uppercase mb-2 flex items-center gap-2">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Decision Required ({currentPhase.decisionPoint.timeLimitSec}s)
                                        </div>
                                        <p className="text-[var(--text-primary)] mb-4">{currentPhase.decisionPoint.prompt}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {currentPhase.decisionPoint.options.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => handleDecision(option.id)}
                                                    className="p-3 text-left bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded hover:border-[var(--status-info)] hover:bg-[var(--bg-hover)] transition-all"
                                                >
                                                    <div className="font-semibold text-[var(--text-primary)]">{option.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Decisions Made */}
                            {simState.decisions.length > 0 && (
                                <Card title="Decision Log">
                                    <div className="space-y-2">
                                        {simState.decisions.map((decision, i) => (
                                            <div key={i} className={`flex items-center gap-3 p-2 rounded ${decision.wasCorrect ? 'bg-[var(--status-normal-muted)]' : 'bg-[var(--status-critical-muted)]'
                                                }`}>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${decision.wasCorrect ? 'bg-[var(--status-normal)]' : 'bg-[var(--status-critical)]'
                                                    } text-white text-xs`}>
                                                    {decision.wasCorrect ? '✓' : '✗'}
                                                </div>
                                                <span className="text-sm text-[var(--text-primary)]">Phase: {decision.phaseId}</span>
                                                <span className="text-xs text-[var(--text-muted)]">Response: {decision.responseTime.toFixed(1)}s</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* SCENARIO SELECTION */}
                    {!simState.isRunning && (
                        <>
                            {/* Scenario Preview */}
                            {selectedScenario && (
                                <Card className="border-2 border-[var(--status-info)]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedScenario.name}</h3>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">{selectedScenario.description}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${selectedScenario.difficulty === 'TRAINING' ? 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]' :
                                            selectedScenario.difficulty === 'INTERMEDIATE' ? 'bg-[var(--status-info-muted)] text-[var(--status-info)]' :
                                                selectedScenario.difficulty === 'ADVANCED' ? 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]' :
                                                    'bg-[var(--status-critical-muted)] text-[var(--status-critical)]'
                                            }`}>
                                            {selectedScenario.difficulty}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded">
                                            <div className="text-2xl font-bold text-[var(--text-primary)]">{selectedScenario.phases.length}</div>
                                            <div className="text-xs text-[var(--text-muted)] uppercase">Phases</div>
                                        </div>
                                        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded">
                                            <div className="text-2xl font-bold text-[var(--text-primary)]">{Math.floor(selectedScenario.duration / 60)}:{String(selectedScenario.duration % 60).padStart(2, '0')}</div>
                                            <div className="text-xs text-[var(--text-muted)] uppercase">Duration</div>
                                        </div>
                                        <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded">
                                            <div className="text-2xl font-bold text-[var(--text-primary)]">{selectedScenario.phases.filter(p => p.decisionPoint).length}</div>
                                            <div className="text-xs text-[var(--text-muted)] uppercase">Decisions</div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Attack Timeline</div>
                                        <div className="flex gap-1">
                                            {selectedScenario.phases.map((phase, i) => (
                                                <div
                                                    key={i}
                                                    className="flex-1 h-2 rounded bg-[var(--bg-tertiary)] relative group"
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                        {phase.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button variant="primary" className="w-full" onClick={() => handleStart(selectedScenario.id)}>
                                        INITIATE SIMULATION
                                    </Button>
                                </Card>
                            )}

                            {/* Scenario Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {scenarios.map(scenario => (
                                    <button
                                        key={scenario.id}
                                        onClick={() => setSelectedScenario(scenario)}
                                        className={`text-left p-4 rounded-lg border-2 transition-all ${selectedScenario?.id === scenario.id
                                            ? 'border-[var(--status-info)] bg-[var(--bg-active)]'
                                            : 'border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-emphasis)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`w-3 h-3 rounded-full ${scenario.type === 'SCADA_COMPROMISE' ? 'bg-[var(--status-critical)]' :
                                                scenario.type === 'DDOS' ? 'bg-[var(--status-warning)]' :
                                                    scenario.type === 'RANSOMWARE' ? 'bg-purple-500' :
                                                        'bg-[var(--status-info)]'
                                                }`} />
                                            <span className="text-xs font-mono text-[var(--text-muted)]">{scenario.type}</span>
                                        </div>
                                        <h4 className="font-bold text-[var(--text-primary)] mb-1">{scenario.name}</h4>
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{scenario.description}</p>
                                        <div className="flex gap-2 mt-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${scenario.difficulty === 'TRAINING' ? 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]' :
                                                scenario.difficulty === 'INTERMEDIATE' ? 'bg-[var(--status-info-muted)] text-[var(--status-info)]' :
                                                    scenario.difficulty === 'ADVANCED' ? 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]' :
                                                        'bg-[var(--status-critical-muted)] text-[var(--status-critical)]'
                                                }`}>
                                                {scenario.difficulty}
                                            </span>
                                            <span className="text-[10px] text-[var(--text-muted)]">{Math.floor(scenario.duration / 60)}m</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Training Info */}
                            <Card className="bg-[var(--bg-tertiary)] border-[var(--border-muted)]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-[var(--status-info-muted)] flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-info)" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[var(--text-primary)] mb-1">NERC CIP-008-6 Compliance Training</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            These simulations are designed to meet NERC Critical Infrastructure Protection requirements for
                                            incident response testing. All sessions are logged to the audit trail for compliance documentation.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
