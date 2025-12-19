
import React, { useState, useEffect } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { biasTestingService, FairnessMetrics, BiasTestCase } from '../services/biasTestingService';
import { modelMonitorService, DriftMetrics, ModelPerformance, HallucinationCheck } from '../services/modelMonitorService';
import { notificationService } from '../services/notificationService';

export const Governance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'FAIRNESS' | 'MONITORING' | 'HALLUCINATIONS'>('FAIRNESS');

    // Fairness State
    const [fairnessMetrics, setFairnessMetrics] = useState<FairnessMetrics | null>(null);
    const [testHistory, setTestHistory] = useState<BiasTestCase[]>([]);
    const [isRunningTest, setIsRunningTest] = useState(false);

    // Monitoring State
    const [driftMetrics, setDriftMetrics] = useState<DriftMetrics | null>(null);
    const [performance, setPerformance] = useState<ModelPerformance | null>(null);

    // Hallucination State
    const [hallucinationHistory, setHallucinationHistory] = useState<HallucinationCheck[]>([]);

    useEffect(() => {
        // Subscribe to services
        const unsubBias = biasTestingService.subscribe(setFairnessMetrics);
        const unsubDrift = modelMonitorService.subscribe(setDriftMetrics);

        // Load initial data
        setTestHistory(biasTestingService.getTestHistory());
        setPerformance(modelMonitorService.getPerformance());
        setHallucinationHistory(modelMonitorService.getHallucinationHistory());

        return () => {
            unsubBias();
            unsubDrift();
        };
    }, []);

    const runBiasTests = async () => {
        setIsRunningTest(true);
        try {
            await biasTestingService.runFullTestSuite();
            setTestHistory(biasTestingService.getTestHistory());
            notificationService.success('Tests Complete', 'Bias test suite finished');
        } finally {
            setIsRunningTest(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Governance Dashboard</h2>
                    <p className="text-sm text-[var(--text-secondary)]">NIST AI RMF 1.0 Compliance Monitoring</p>
                </div>
                <div className="flex gap-2">
                    <Button variant={activeTab === 'FAIRNESS' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('FAIRNESS')}>
                        Fairness
                    </Button>
                    <Button variant={activeTab === 'MONITORING' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('MONITORING')}>
                        Model Health
                    </Button>
                    <Button variant={activeTab === 'HALLUCINATIONS' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('HALLUCINATIONS')}>
                        Fact Checking
                    </Button>
                </div>
            </header>

            {/* FAIRNESS TAB */}
            {activeTab === 'FAIRNESS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Score Card */}
                    <Card title="Fairness Score">
                        {fairnessMetrics && (
                            <div className="text-center py-4">
                                <div className={`text-6xl font-bold ${fairnessMetrics.score >= 80 ? 'text-[var(--status-normal)]' :
                                        fairnessMetrics.score >= 60 ? 'text-[var(--status-warning)]' :
                                            'text-[var(--status-critical)]'
                                    }`}>
                                    {fairnessMetrics.score}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] uppercase mt-2">Overall Score</div>

                                <div className="grid grid-cols-2 gap-4 mt-6 text-xs">
                                    <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                                        <div className="text-[var(--text-muted)]">Disparate Impact</div>
                                        <div className={`font-bold text-lg ${fairnessMetrics.disparateImpactRatio <= 1.25 ? 'text-[var(--status-normal)]' : 'text-[var(--status-warning)]'}`}>
                                            {fairnessMetrics.disparateImpactRatio}x
                                        </div>
                                    </div>
                                    <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                                        <div className="text-[var(--text-muted)]">Zone Parity</div>
                                        <div className="font-bold text-lg text-[var(--text-primary)]">{fairnessMetrics.zoneParity}%</div>
                                    </div>
                                </div>

                                <div className="mt-4 text-xs text-[var(--text-secondary)]">
                                    Tests: <span className="text-[var(--status-normal)]">{fairnessMetrics.testsPassed} passed</span> / <span className="text-[var(--status-critical)]">{fairnessMetrics.testsFailed} failed</span>
                                </div>

                                <Button variant="primary" className="mt-4 w-full" onClick={runBiasTests} disabled={isRunningTest}>
                                    {isRunningTest ? 'Running Tests...' : 'Run Bias Test Suite'}
                                </Button>
                            </div>
                        )}
                    </Card>

                    {/* Test History */}
                    <Card title="Test History" className="lg:col-span-2">
                        {testHistory.length > 0 ? (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {testHistory.slice(0, 10).map(test => (
                                    <div key={test.id} className={`p-3 rounded border ${test.passed ? 'border-[var(--status-normal)] bg-[var(--status-normal-muted)]' : 'border-[var(--status-critical)] bg-[var(--status-critical-muted)]'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)] text-sm">{test.testType.replace('_', ' ')}</div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    {new Date(test.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${test.passed ? 'bg-[var(--status-normal)] text-white' : 'bg-[var(--status-critical)] text-white'}`}>
                                                {test.passed ? 'PASSED' : 'FAILED'}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-xs">
                                            <span className="text-[var(--text-secondary)]">Score: </span>
                                            <span className="font-mono text-[var(--text-primary)]">{Math.round(test.overallScore)}</span>
                                            {test.disparateImpactRatio && (
                                                <>
                                                    <span className="text-[var(--text-secondary)] ml-3">DI Ratio: </span>
                                                    <span className="font-mono text-[var(--text-primary)]">{test.disparateImpactRatio.toFixed(2)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                <div className="text-sm font-semibold">No tests run yet</div>
                                <div className="text-xs mt-1">Click "Run Bias Test Suite" to begin</div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* MONITORING TAB */}
            {activeTab === 'MONITORING' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Drift Detection */}
                    <Card title="Model Drift Detection">
                        {driftMetrics && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className={`text-5xl font-bold ${driftMetrics.alertLevel === 'NORMAL' ? 'text-[var(--status-normal)]' :
                                            driftMetrics.alertLevel === 'WARNING' ? 'text-[var(--status-warning)]' :
                                                'text-[var(--status-critical)]'
                                        }`}>
                                        {Math.round(driftMetrics.score)}
                                    </div>
                                    <div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded ${driftMetrics.alertLevel === 'NORMAL' ? 'bg-[var(--status-normal)]' :
                                                driftMetrics.alertLevel === 'WARNING' ? 'bg-[var(--status-warning)]' :
                                                    'bg-[var(--status-critical)]'
                                            } text-white`}>
                                            {driftMetrics.alertLevel}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">Trend: {driftMetrics.trend}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                                        <div className="text-[var(--text-muted)]">MAPE</div>
                                        <div className="font-mono font-bold text-[var(--text-primary)]">{driftMetrics.mape}%</div>
                                    </div>
                                    <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                                        <div className="text-[var(--text-muted)]">Last Update</div>
                                        <div className="font-mono text-[var(--text-primary)] truncate">{driftMetrics.lastUpdate}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Performance */}
                    <Card title="Model Performance">
                        {performance && (
                            <div className="space-y-3">
                                {[
                                    { label: 'Accuracy', value: performance.accuracy, max: 100 },
                                    { label: 'Precision', value: performance.precision, max: 100 },
                                    { label: 'Recall', value: performance.recall, max: 100 },
                                    { label: 'F1 Score', value: performance.f1Score, max: 100 }
                                ].map(metric => (
                                    <div key={metric.label}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-[var(--text-secondary)]">{metric.label}</span>
                                            <span className="font-mono text-[var(--text-primary)]">{Math.round(metric.value)}%</span>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${metric.value >= 80 ? 'bg-[var(--status-normal)]' : metric.value >= 60 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-critical)]'}`}
                                                style={{ width: `${metric.value}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-[var(--border-muted)] text-xs text-[var(--text-secondary)]">
                                    Total Predictions: {performance.totalPredictions}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* HALLUCINATIONS TAB */}
            {activeTab === 'HALLUCINATIONS' && (
                <Card title="Hallucination Detection History">
                    {hallucinationHistory.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {hallucinationHistory.map(check => (
                                <div key={check.id} className={`p-3 rounded border ${check.verdict === 'VALID' ? 'border-[var(--status-normal)] bg-[var(--status-normal-muted)]' :
                                        check.verdict === 'SUSPICIOUS' ? 'border-[var(--status-warning)] bg-[var(--status-warning-muted)]' :
                                            'border-[var(--status-critical)] bg-[var(--status-critical-muted)]'
                                    }`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-[var(--text-muted)]">{new Date(check.timestamp).toLocaleString()}</div>
                                            <div className="text-sm text-[var(--text-primary)] truncate mt-1">{check.output}</div>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ml-2 ${check.verdict === 'VALID' ? 'bg-[var(--status-normal)]' :
                                                check.verdict === 'SUSPICIOUS' ? 'bg-[var(--status-warning)]' :
                                                    'bg-[var(--status-critical)]'
                                            } text-white`}>
                                            {check.verdict}
                                        </span>
                                    </div>
                                    {check.flaggedPhrases.length > 0 && (
                                        <div className="mt-2 text-xs text-[var(--status-critical)]">
                                            Flagged: {check.flaggedPhrases.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            <div className="text-sm font-semibold">No checks recorded</div>
                            <div className="text-xs mt-1">AI outputs are automatically checked for hallucinations</div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};
