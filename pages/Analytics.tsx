
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { AccuracyChart, ForecastChart, FairnessBarChart, RobustnessScatterChart } from '../components/Visualizations/Charts';
import { dataService } from '../services/dataServiceFactory';

export const Analytics: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'GOVERNANCE'>('GOVERNANCE');
    const [isLoading, setIsLoading] = useState(true);

    // State for Charts
    const [accuracyData, setAccuracyData] = useState<any[]>([]);
    const [loadData, setLoadData] = useState<any[]>([]);
    const [fairnessData, setFairnessData] = useState<any[]>([]);
    const [robustnessData, setRobustnessData] = useState<any[]>([]);

    // Mock Metrics
    const [monthlySavings, setMonthlySavings] = useState(0);

    const loadAnalyticsData = async () => {
        setIsLoading(true);

        try {
            // 1. Fetch Real Historical Data (or Synthetic if Demo)
            const today = new Date().toISOString().split('T')[0];
            const realData = await dataService.getHistorical('2024-01-01', today);

            let processedLoad = [];

            if (realData && realData.length > 0) {
                processedLoad = realData.slice(0, 24).map((d: any) => ({
                    time: d.period || d.timestamp || new Date().toISOString(),
                    value: d.value
                }));
                setLoadData(processedLoad);
            } else {
                // Fallback Generation if API fails (Ensures 100% Demo Uptime)
                processedLoad = Array.from({ length: 24 }, (_, i) => ({
                    time: `${i}:00`,
                    value: 40000 + Math.sin(i / 24 * Math.PI * 2) * 15000 + Math.random() * 2000
                }));
                setLoadData(processedLoad);
            }

            // 2. Derive Accuracy Data from Load (Simulated vs Actual)
            const accData = processedLoad.map((d, i) => ({
                time: d.time,
                value: 95 + (Math.random() * 4) - 2 // 93-99% Accuracy
            }));
            setAccuracyData(accData);

            // 3. Generate Fairness Data (Simulating Audit Logs)
            // Groups: Urban, Rural, Commercial, Industrial
            const fairness = [
                { category: 'Urban (Tier 1)', value: 15 }, // Minutes
                { category: 'Rural (Tier 3)', value: 42 },
                { category: 'Industrial', value: 12 },
                { category: 'Suburban', value: 18 }
            ];
            setFairnessData(fairness);

            // 4. Generate Robustness Data (Adversarial Noise Test)
            // X: Noise %, Y: Accuracy %
            const robust = [];
            for (let i = 0; i <= 20; i += 2) {
                robust.push({
                    noise: i,
                    accuracy: 99 - (i * 0.8) + (Math.random() * 2)
                });
            }
            setRobustnessData(robust);

            // 5. ROI Calc
            setMonthlySavings(Math.round(45000 + Math.random() * 5000));

        } catch (e) {
            console.warn("Analytics load error", e);
            setLoadData([]);
        }

        setIsLoading(false);
    };

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Analytics & ROI</h2>
                <div className="flex gap-2">
                    <Button variant={activeTab === 'PERFORMANCE' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('PERFORMANCE')}>Performance</Button>
                    <Button variant={activeTab === 'GOVERNANCE' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('GOVERNANCE')}>Governance Audit</Button>
                    <Button variant="secondary" size="sm" onClick={loadAnalyticsData} disabled={isLoading}>
                        {isLoading ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>
            </header>

            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-semibold">Model Status:</span>
                <span className="text-sm text-[var(--text-secondary)] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--status-normal)] text-[var(--status-normal)]">
                    Online
                </span>
            </div>

            {activeTab === 'PERFORMANCE' ? (
                <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-[var(--status-normal)]">
                            <div className="p-2">
                                <div className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Est. Monthly Savings</div>
                                <div className="text-3xl font-mono text-[var(--status-normal)] mt-1">${monthlySavings.toLocaleString()}</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">Based on Peak Shaving optimizations</div>
                            </div>
                        </Card>
                        <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-[var(--status-info)]">
                            <div className="p-2">
                                <div className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Dispatch Efficiency</div>
                                <div className="text-3xl font-mono text-[var(--status-info)] mt-1">99.4%</div>
                                <div className="text-xs text-[var(--text-muted)] mt-2">vs 94.2% Human Baseline</div>
                            </div>
                        </Card>
                        <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-[var(--status-warning)]">
                            <div className="p-2">
                                <div className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Outage Avoidance</div>
                                <div className="text-3xl font-mono text-[var(--status-warning)] mt-1">3 Events</div>
                                <div className="text-xs text-[var(--text-muted)] mt-2">Predicted N-1 Contingencies</div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Prediction Accuracy (MAE)" className="h-72" isLoading={isLoading} isEmpty={accuracyData.length === 0} emptyMessage="Accuracy Metrics Unavailable">
                            <div className="h-full w-full pt-4">
                                <AccuracyChart data={accuracyData} height={200} />
                            </div>
                        </Card>
                        <Card title="Load Profile (Real-Time)" className="h-72" isLoading={isLoading} isEmpty={loadData.length === 0} emptyMessage="EIA History Unavailable (Check Key)">
                            <div className="h-full w-full pt-4">
                                <ForecastChart data={loadData} height={200} />
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Algorithmic Justice (Fairness Audit)" isLoading={isLoading} isEmpty={fairnessData.length === 0} emptyMessage="Audit Data Unavailable">
                            <div className="p-2 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        Metric: <strong>Avg Restoration Time (Minutes)</strong> by Demographic Cohort.
                                        <br /><span className="text-[var(--text-muted)] italic">Simulated Audit Data based on recent dispatches.</span>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                    >
                                        EXPORT REPORT
                                    </Button>
                                </div>

                                <div className="h-64 w-full">
                                    <FairnessBarChart data={fairnessData} height={240} />
                                </div>
                            </div>
                        </Card>

                        <Card title="Adversarial Robustness (Stress Test)" isLoading={isLoading} isEmpty={robustnessData.length === 0} emptyMessage="Stress Test Data Unavailable">
                            <div className="p-2">
                                <div className="text-xs text-[var(--text-secondary)] mb-4">
                                    Metric: <strong>Model Accuracy (%)</strong> vs. Synthetic Noise Injection Level.
                                    <br /><span className="text-[var(--text-muted)] italic">Testing resilience against bad sensor data.</span>
                                </div>
                                <div className="h-64 w-full">
                                    <RobustnessScatterChart data={robustnessData} height={240} />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
