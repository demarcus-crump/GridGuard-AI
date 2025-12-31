import React, { useEffect, useState } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { GridMap } from '../components/Visualizations/GridMap';
import { MetricDisplay } from '../components/Common/MetricDisplay';
import { GridStatus, RiskTier, CongestionZone } from '../types';
import { StatusIndicator } from '../components/Common/StatusIndicator';
import { ModelCard } from '../components/Common/ModelCard';
import { ForecastChart, FuelMixDonut, ReservesGauge, PriceTrendChart } from '../components/Visualizations/Charts';
import { SettingsModal } from '../components/Layout/SettingsModal';
import { notificationService } from '../services/notificationService';
import { useGrid } from '../context/GridContext';
import { dataService } from '../services/dataServiceFactory';
import { Tooltip } from '../components/Common/Tooltip';
import { predictiveService, CorridorRisk, PredictiveAlert } from '../services/predictiveService';
import { getDispatchRecommendations, executeDispatch, SCEDAnalysisResult, DispatchDecision } from '../services/scedService';
import ValueMetrics from '../components/Dashboard/ValueMetrics';

// --- SUB-COMPONENTS FOR CONTROL ROOM ---

const RiskTierBadge: React.FC<{ tier: RiskTier }> = ({ tier }) => {
    const config = {
        [RiskTier.GREEN]: { label: 'TIER 3: AUTO-PILOT', color: 'bg-[var(--status-normal)]', text: 'AI AUTHORIZED', border: 'border-[var(--status-normal-emphasis)]' },
        [RiskTier.YELLOW]: { label: 'TIER 2: HUMAN REVIEW', color: 'bg-[var(--status-warning)]', text: 'HITL REQUIRED', border: 'border-[var(--status-warning-emphasis)]' },
        [RiskTier.RED]: { label: 'TIER 1: MANUAL ONLY', color: 'bg-[var(--status-critical)]', text: 'AI LOCKED', border: 'border-[var(--status-critical-emphasis)]' }
    };
    const c = config[tier];

    return (
        <Tooltip width="w-80" content={
            <div className="space-y-2">
                <div className="font-bold text-[var(--status-info)] border-b border-[var(--border-muted)] pb-1 mb-1">BLUF: Rules of Engagement (ROE)</div>
                <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--status-normal)] font-bold">GREEN:</span>
                    <span className="text-[var(--text-secondary)]">AI has autonomy for non-kinetic actions (Dispatch &lt;100MW). Variance &lt;2%.</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--status-warning)] font-bold">YELLOW:</span>
                    <span className="text-[var(--text-secondary)]">Human-in-the-Loop (HITL) required for all commands. Variance &gt;2%.</span>
                </div>
                <div className="flex gap-2 text-[10px]">
                    <span className="text-[var(--status-critical)] font-bold">RED:</span>
                    <span className="text-[var(--text-secondary)]">Emergency State. AI Actuation physically locked. Manual control only.</span>
                </div>
            </div>
        }>
            <div className={`flex items-center border ${c.border} rounded overflow-hidden cursor-help`}>
                <div className={`${c.color} px-2 py-1 text-[10px] font-bold text-[var(--text-inverse)] uppercase tracking-wider`}>
                    {c.label}
                </div>
                <div className="bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] font-mono font-bold text-[var(--text-secondary)]">
                    {c.text}
                </div>
            </div>
        </Tooltip>
    );
};

const GridClock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <div className="flex flex-col items-end leading-none">
            <span className="text-lg font-mono font-bold text-[var(--text-primary)]">
                {time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' })}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                SYSTEM TIME (UTC)
            </span>
        </div>
    );
};

const DispatchRow: React.FC<{
    resource: string;
    action: 'RAMP UP' | 'RAMP DOWN' | 'DISCHARGE' | 'CURTAIL';
    amount: number;
    price: number;
    reason: string;
    onExecute: () => void;
}> = ({ resource, action, amount, price, reason, onExecute }) => {
    const isPositive = action === 'RAMP UP' || action === 'DISCHARGE';
    return (
        <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded hover:border-[var(--border-emphasis)] transition-all group">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded flex flex-col items-center justify-center min-w-[60px] ${isPositive ? 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]' : 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]'}`}>
                    <span className="text-[10px] font-bold">{action}</span>
                    <span className="text-sm font-mono font-bold">{amount}MW</span>
                </div>
                <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{resource}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-1">
                        <span className="text-[var(--text-link)]">{reason}</span>
                        <span className="opacity-50">•</span>
                        <span>LMP: ${price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={onExecute}>
                EXECUTE
            </Button>
        </div>
    );
};

const CongestionBar: React.FC<{ source: string; target: string; loadPct: number; spread: number }> = ({ source, target, loadPct, spread }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[10px] uppercase font-mono tracking-wider">
            <span className="text-[var(--text-secondary)]">{source} <span className="text-[var(--text-muted)]">→</span> {target}</span>
            <span className={spread > 50 ? "text-[var(--status-critical)] font-bold" : "text-[var(--text-primary)]"}>
                Spread: ${spread.toFixed(2)}
            </span>
        </div>
        <div className="h-2 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
                className={`h-full transition-all duration-1000 ${loadPct > 90 ? 'bg-[var(--status-critical)]' : loadPct > 75 ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-normal)]'}`}
                style={{ width: `${loadPct}%` }}
            />
        </div>
    </div>
);

export const Dashboard: React.FC = () => {
    // Access Global Grid State
    const {
        status,
        riskTier,
        loadMetric,
        genMetric,
        frequency,
        weatherData,
        lastUpdated,
        isLoading,
        isDemoMode,
        connectionStatus
    } = useGrid();

    // Local State for specific dashboard widgets
    const [isModelCardOpen, setIsModelCardOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Secondary Data (Not Critical Path)
    const [fuelMix, setFuelMix] = useState<Record<string, number> | null>(null);
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [priceTrendData, setPriceTrendData] = useState<any[]>([]);
    const [queueData, setQueueData] = useState<any>(null);
    const [solarData, setSolarData] = useState<any>(null);
    const [congestionData, setCongestionData] = useState<CongestionZone[]>([]);

    // SCED Analysis State (AI-powered dispatch recommendations)
    const [scedAnalysis, setScedAnalysis] = useState<SCEDAnalysisResult | null>(null);
    const [scedLoading, setScedLoading] = useState(false);

    // Predictive Alerts State
    const [corridorRisks, setCorridorRisks] = useState<CorridorRisk[]>([]);
    const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);

    // Fetch secondary data on mount or when load changes
    useEffect(() => {
        const fetchSecondary = async () => {
            // We only fetch these if we have a valid load metric to base them on
            const mix = await dataService.getFuelMix();
            setFuelMix(mix);

            const solar = await dataService.getSolarData();
            setSolarData(solar);

            const queue = await dataService.getInterconnectionQueue();
            setQueueData(queue);

            // Fetch congestion data from service (will be empty until real API connected)
            const congestion = await dataService.getCongestionData();
            setCongestionData(congestion);

            const forecast = await dataService.getForecast(loadMetric ? Number(loadMetric.value) : undefined);
            if (forecast) setForecastData(forecast);

            const prices = await dataService.getMarketPrices();
            if (prices && prices.length > 0) {
                setPriceTrendData(prices);

                // Run SCED AI Analysis (replaces hardcoded if/else logic)
                const currentPrice = prices[prices.length - 1].value;
                const currentLoad = loadMetric ? Number(loadMetric.value) : 55000;

                setScedLoading(true);
                try {
                    const analysis = await getDispatchRecommendations({
                        currentLoadMW: currentLoad,
                        currentPricePerMWh: currentPrice,
                        prevPricePerMWh: prices.length > 1 ? prices[prices.length - 2].value : currentPrice
                    });
                    setScedAnalysis(analysis);
                } catch (e) {
                    console.warn('[SCED] Analysis failed:', e);
                } finally {
                    setScedLoading(false);
                }
            }
        };
        fetchSecondary();
    }, [loadMetric]);

    // Subscribe to Predictive Service
    useEffect(() => {
        predictiveService.start(30000); // 30 second analysis interval
        const unsubscribe = predictiveService.subscribe((risks, alerts) => {
            setCorridorRisks(risks);
            setPredictiveAlerts(alerts);
        });
        return () => {
            unsubscribe();
            predictiveService.stop();
        };
    }, []);

    const handleScedExecute = async (decision: DispatchDecision) => {
        await executeDispatch(decision);
        notificationService.success(
            'SCED Command Sent',
            `${decision.action} ${decision.targetMW}MW on ${decision.resource} routed to DNP3 gateway.`
        );
        // Remove executed decision from the list
        if (scedAnalysis) {
            setScedAnalysis({
                ...scedAnalysis,
                decisions: scedAnalysis.decisions.filter(d => d.id !== decision.id)
            });
        }
    };

    const fuelMixChartData = fuelMix
        ? Object.entries(fuelMix).map(([name, value]) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value)
        : [];

    const reserveValue = (genMetric?.value && loadMetric?.value) ? Math.max(0, Number(genMetric.value) - Number(loadMetric.value)) : 0;

    return (
        <div className="space-y-4 relative">

            {/* HEADER */}
            <header className="flex justify-between items-end pb-2 border-b border-[var(--border-muted)] mb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Real-Time Operations</h2>
                        <RiskTierBadge tier={riskTier} />
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] font-mono flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-normal)]'} animate-pulse`}></span>
                        DATA REFRESHED: {lastUpdated} {isDemoMode && <span className="text-[var(--status-info)] font-bold ml-2">// SIMULATION MODE</span>}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <GridClock />
                    <div className="h-8 w-px bg-[var(--border-muted)]"></div>
                    <button onClick={() => setIsModelCardOpen(true)} className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-link)] underline decoration-dotted underline-offset-4">
                        AI GOVERNANCE
                    </button>
                </div>
            </header>

            {/* SYSTEM STATUS BAR */}
            <div className={`bg-[var(--bg-secondary)] border rounded-lg px-4 py-2 flex items-center justify-between shadow-sm transition-colors duration-500 ${status === GridStatus.CRITICAL ? 'border-[var(--status-critical)]' :
                status === GridStatus.OFFLINE ? 'border-[var(--border-default)] opacity-80' :
                    'border-[var(--border-default)]'
                }`}>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">System Status</span>
                        <StatusIndicator status={status} />
                    </div>
                    {/* ENHANCED FREQUENCY MONITOR (The Heartbeat) */}
                    <div className="hidden sm:flex items-center gap-3 pl-6 border-l border-[var(--border-muted)]">
                        <Tooltip content={
                            <div>
                                <div className="font-bold text-[var(--status-info)] mb-1">BLUF: Kinetic Grid Stability</div>
                                <div className="text-[var(--text-secondary)]">Resistance to frequency change provided by rotating mass (Turbines).</div>
                                <ul className="mt-1 space-y-0.5 text-[var(--text-muted)]">
                                    <li>• Target: 60.00 Hz</li>
                                    <li>• Trip Limit: &lt;59.40 Hz</li>
                                </ul>
                            </div>
                        }>
                            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider border-b border-dotted border-[var(--text-muted)] cursor-help">Inertia</span>
                        </Tooltip>

                        {frequency !== null ? (
                            <div className="flex items-center gap-2">
                                <span className={`text-xl font-mono font-bold ${frequency < 59.95 || frequency > 60.05 ? 'text-[var(--status-critical)] animate-pulse' : 'text-[var(--status-normal)]'}`}>
                                    {frequency.toFixed(3)}
                                </span>
                                <div className="flex flex-col text-[8px] font-mono leading-none text-[var(--text-muted)]">
                                    <span>Hz</span>
                                    <span>Target: 60.0</span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-sm font-mono text-[var(--text-muted)]">--</span>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <span className={`text-xs font-mono uppercase ${connectionStatus === 'DISCONNECTED' ? 'text-[var(--status-critical)]' : connectionStatus === 'SIMULATION' ? 'text-[var(--status-info)]' : 'text-[var(--status-normal)]'}`}>
                        {connectionStatus}
                    </span>
                    {solarData && (
                        <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-[var(--text-secondary)] border-r border-[var(--border-muted)] pr-4">
                            <span title="Sunrise" className="flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line></svg>
                                {solarData.sunrise}
                            </span>
                        </div>
                    )}
                    <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                        SOURCE: {isDemoMode ? "SYNTHETIC TWIN" : (loadMetric ? "GRIDSTATUS.IO" : "OPEN DATA")}
                    </div>
                </div>
            </div>

            {/* TOP ROW: Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="col-span-1 min-h-[160px] flex flex-col justify-center" isEmpty={reserveValue === 0} emptyMessage="Waiting for Data..." onConfigure={() => setIsSettingsOpen(true)}>
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Grid Conditions</div>
                        {reserveValue > 0 && (
                            <div className={`text-[9px] font-bold border px-1 rounded ${reserveValue > 3000 ? 'text-[var(--status-normal)] border-[var(--status-normal)]' : 'text-[var(--status-warning)] border-[var(--status-warning)]'}`}>
                                {reserveValue > 3000 ? 'NORMAL' : 'LOW RESERVES'}
                            </div>
                        )}
                    </div>
                    {reserveValue > 0 && <ReservesGauge data={[{ value: reserveValue }]} height={120} label="Operating Reserves" />}
                </Card>

                <Card isLoading={isLoading} className="col-span-1 min-h-[160px]">
                    {loadMetric ? (
                        <div className="flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">System Load</span>
                                <span className="text-[10px] text-[var(--status-normal)] font-mono border border-[var(--status-normal)] px-1 rounded">LIVE</span>
                            </div>
                            <div>
                                <div className="text-3xl font-mono font-bold text-[var(--text-primary)]">{(Number(loadMetric.value) / 1000).toFixed(1)}k</div>
                                <div className="text-sm text-[var(--text-secondary)]">MW</div>
                            </div>
                            <div className="pt-2 border-t border-[var(--border-muted)] text-[10px] text-[var(--text-secondary)] font-mono flex justify-between">
                                <span>Forecast (+1h)</span>
                                <span className="text-[var(--text-primary)]">{(Number(loadMetric.value) * 1.02 / 1000).toFixed(1)}k MW</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-center px-4">
                            <p className="text-xs font-semibold mb-2">Connect to ERCOT</p>
                            <Button variant="secondary" size="sm" onClick={() => setIsSettingsOpen(true)}>Enter API Key</Button>
                        </div>
                    )}
                </Card>

                <Card isLoading={isLoading} className="col-span-1 md:col-span-2 min-h-[160px]">
                    {fuelMixChartData.length > 0 ? (
                        <div className="flex h-full">
                            <div className="flex-1 flex flex-col justify-between">
                                <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-2 flex justify-between">
                                    <span>Resource Stack</span>
                                    {queueData && (
                                        <span className="text-[9px] text-[var(--text-muted)] tracking-wider">
                                            PENDING QUEUE: <span className="text-[var(--text-primary)] font-bold">{queueData.totalGW} GW</span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <FuelMixDonut data={fuelMixChartData} height={120} />
                                </div>
                            </div>
                            <div className="w-1/3 border-l border-[var(--border-muted)] pl-3 flex flex-col justify-center gap-1.5 overflow-y-auto max-h-[140px]">
                                {fuelMixChartData.slice(0, 5).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-[10px]">
                                        <span className="text-[var(--text-secondary)] uppercase truncate w-16" title={item.name}>{item.name}</span>
                                        <span className="font-mono font-bold text-[var(--text-primary)]">{(Number(item.value) / 1000).toFixed(1)}k</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-center">
                            <p className="text-xs mb-2">Real-Time Fuel Mix Unavailable</p>
                            {isDemoMode ? <span>(Simulation Paused)</span> : <Button variant="secondary" size="sm" onClick={() => setIsSettingsOpen(true)}>Connect GridStatus API</Button>}
                        </div>
                    )}
                </Card>
            </div>

            {/* MIDDLE ROW: Map & Control */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 h-[550px]">
                    <Card title="Nodal Thermal Map (NWS Real-Time)" className="h-full p-0 overflow-hidden">
                        <GridMap gridStatus={status} data={weatherData} />
                    </Card>
                </div>

                {/* CONTROL STACK */}
                <div className="lg:col-span-1 flex flex-col gap-4 h-[550px]">

                    {/* VALUE METRICS */}
                    <ValueMetrics />

                    {/* SCED OPTIMIZER */}
                    <Card
                        title={
                            <Tooltip width="w-64" content={
                                <div>
                                    <div className="font-bold text-[var(--status-info)] mb-1">BLUF: Economic Dispatch</div>
                                    <div className="text-[var(--text-secondary)]">Security-Constrained Economic Dispatch engine. AI analyzes market conditions to optimize generation costs.</div>
                                </div>
                            }>
                                <span className="border-b border-dotted border-[var(--text-muted)] cursor-help">SCED Dispatch (Optimizer)</span>
                            </Tooltip>
                        }
                        className="border-l-4 border-l-[var(--status-info)] flex-1 min-h-0 flex flex-col"
                    >
                        <div className="flex flex-col flex-1 min-h-0">
                            {/* Analysis Status Header */}
                            <div className="text-[10px] text-[var(--text-muted)] mb-3 bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--border-muted)] flex justify-between items-center">
                                <span>AI Engine: {scedAnalysis?.marketCondition || 'ANALYZING'}</span>
                                {scedAnalysis && (
                                    <span className="text-[var(--text-link)]">
                                        {scedAnalysis.analysisTimeMs}ms
                                    </span>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                {scedLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-xs">
                                        <div className="animate-pulse mb-2 text-[var(--status-info)]">◉ Analyzing Market Conditions...</div>
                                        <div className="text-[10px]">Running optimization model</div>
                                    </div>
                                ) : scedAnalysis && scedAnalysis.decisions.length > 0 ? (
                                    scedAnalysis.decisions.map(decision => (
                                        <div key={decision.id} className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg p-3 space-y-2">
                                            {/* Decision Header */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-xs font-bold text-[var(--text-primary)]">{decision.resource}</div>
                                                    <div className={`text-[10px] font-mono ${decision.action === 'DEPLOY' ? 'text-[var(--status-normal)]' :
                                                            decision.action === 'CURTAIL' ? 'text-[var(--status-warning)]' :
                                                                decision.action === 'CHARGE' ? 'text-[var(--status-info)]' :
                                                                    decision.action === 'RAMP_UP' ? 'text-[var(--status-critical)]' :
                                                                        'text-[var(--text-secondary)]'
                                                        }`}>
                                                        {decision.action} {decision.targetMW}MW
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-[var(--text-muted)]">Confidence</div>
                                                    <div className={`text-sm font-mono font-bold ${decision.confidence > 0.8 ? 'text-[var(--status-normal)]' :
                                                            decision.confidence > 0.6 ? 'text-[var(--status-warning)]' :
                                                                'text-[var(--text-secondary)]'
                                                        }`}>
                                                        {(decision.confidence * 100).toFixed(0)}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reasoning */}
                                            <div className="border-t border-[var(--border-muted)] pt-2">
                                                <div className="text-[10px] text-[var(--text-muted)] mb-1">Why:</div>
                                                <ul className="text-[10px] text-[var(--text-secondary)] space-y-0.5">
                                                    {decision.reasoning.slice(0, 2).map((reason, i) => (
                                                        <li key={i} className="flex items-start gap-1">
                                                            <span className="text-[var(--status-info)]">→</span>
                                                            {reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Execute Button */}
                                            {decision.action !== 'HOLD' && (
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleScedExecute(decision)}
                                                    className="w-full mt-2"
                                                >
                                                    EXECUTE {decision.action}
                                                </Button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-xs">
                                        <div className="animate-pulse mb-2 text-[var(--status-normal)]">● System Optimized</div>
                                        No Pending Actions
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card
                        title={
                            <Tooltip width="w-64" content={
                                <div>
                                    <div className="font-bold text-[var(--status-info)] mb-1">BLUF: Transmission Constraints</div>
                                    <div className="text-[var(--text-secondary)]">Percent of thermal limit utilized on key corridors. &gt;90% usage triggers expensive re-dispatch logic.</div>
                                </div>
                            }>
                                <span className="border-b border-dotted border-[var(--text-muted)] cursor-help">Congestion Monitor</span>
                            </Tooltip>
                        }
                        className="flex-1 min-h-0 flex flex-col"
                        isEmpty={congestionData.length === 0}
                        emptyTitle="No Active Congestion Events"
                        emptyMessage="Real-time congestion data unavailable. Connect ERCOT API for production monitoring."
                        onConfigure={() => setIsSettingsOpen(true)}
                    >
                        <div className="flex-1 overflow-y-auto space-y-4 pt-2 pr-1">
                            {congestionData.map((zone) => (
                                <CongestionBar
                                    key={zone.id}
                                    source={zone.name.split(' → ')[0] || zone.name}
                                    target={zone.name.split(' → ')[1] || ''}
                                    loadPct={zone.loadPct}
                                    spread={zone.spread}
                                />
                            ))}
                        </div>
                    </Card>

                    {/* PREDICTIVE ALERTS */}
                    <Card
                        title={
                            <Tooltip width="w-64" content={
                                <div>
                                    <div className="font-bold text-[var(--status-info)] mb-1">BLUF: N-1 Contingency Analysis</div>
                                    <div className="text-[var(--text-secondary)]">AI-driven prediction of corridor-level outage risks based on load, temperature, weather, and historical patterns.</div>
                                </div>
                            }>
                                <span className="border-b border-dotted border-[var(--text-muted)] cursor-help">Predictive Alerts (AI)</span>
                            </Tooltip>
                        }
                        className="flex-1 min-h-0 flex flex-col border-l-4 border-l-[var(--status-warning)]"
                    >
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {corridorRisks.length > 0 ? corridorRisks.map((risk, i) => (
                                <div key={i} className={`flex items-center justify-between p-2 rounded border ${risk.riskLevel === 'CRITICAL' ? 'bg-[var(--status-critical-muted)] border-[var(--status-critical)]' :
                                    risk.riskLevel === 'HIGH' ? 'bg-[var(--status-warning-muted)] border-[var(--status-warning)]' :
                                        risk.riskLevel === 'MODERATE' ? 'bg-[var(--bg-tertiary)] border-[var(--border-default)]' :
                                            'bg-[var(--bg-tertiary)] border-[var(--border-muted)]'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${risk.riskLevel === 'CRITICAL' ? 'bg-[var(--status-critical)] animate-pulse' :
                                            risk.riskLevel === 'HIGH' ? 'bg-[var(--status-warning)]' :
                                                risk.riskLevel === 'MODERATE' ? 'bg-[var(--status-info)]' :
                                                    'bg-[var(--status-normal)]'
                                            }`} />
                                        <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]">
                                            {risk.corridorName.replace(' Corridor', '')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-mono font-bold ${risk.riskLevel === 'CRITICAL' ? 'text-[var(--status-critical)]' :
                                            risk.riskLevel === 'HIGH' ? 'text-[var(--status-warning)]' :
                                                'text-[var(--text-secondary)]'
                                            }`}>
                                            {risk.riskScore}%
                                        </span>
                                        <span className={`text-[9px] font-bold px-1 rounded ${risk.riskLevel === 'CRITICAL' ? 'bg-[var(--status-critical)] text-white' :
                                            risk.riskLevel === 'HIGH' ? 'bg-[var(--status-warning)] text-black' :
                                                'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                                            }`}>
                                            {risk.riskLevel}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-xs">
                                    <span className="text-[var(--status-normal)]">● </span> All corridors nominal
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card
                    title={
                        <Tooltip width="w-64" content={
                            <div>
                                <div className="font-bold text-[var(--status-info)] mb-1">BLUF: Net Load Forecast</div>
                                <div className="text-[var(--text-secondary)]">Total Demand minus Renewable Generation (Wind/Solar). The "Duck Curve" shape determines the ramp requirements for thermal plants.</div>
                            </div>
                        }>
                            <span className="border-b border-dotted border-[var(--text-muted)] cursor-help">Load Forecast (Net)</span>
                        </Tooltip>
                    }
                    isEmpty={forecastData.length === 0} isLoading={isLoading} emptyMessage="Forecast requires Load Data." onConfigure={() => setIsSettingsOpen(true)}>
                    <div className="h-64 w-full pt-4">
                        <ForecastChart data={forecastData} height={240} />
                    </div>
                </Card>
                <Card
                    title={
                        <Tooltip width="w-64" content={
                            <div>
                                <div className="font-bold text-[var(--status-info)] mb-1">BLUF: LMP Trends</div>
                                <div className="text-[var(--text-secondary)]">Locational Marginal Pricing ($/MWh). Measures the cost to serve the next MW of load at a specific node. High LMP indicates congestion.</div>
                            </div>
                        }>
                            <span className="border-b border-dotted border-[var(--text-muted)] cursor-help">Market Trends (LMP $/MWh)</span>
                        </Tooltip>
                    }
                    isEmpty={priceTrendData.length === 0} isLoading={isLoading} emptyMessage="Pricing Data Unavailable." onConfigure={() => setIsSettingsOpen(true)}>
                    <div className="h-64 w-full pt-4">
                        <PriceTrendChart data={priceTrendData} height={240} />
                    </div>
                </Card>
            </div>

            <ModelCard isOpen={isModelCardOpen} onClose={() => setIsModelCardOpen(false)} />
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};
