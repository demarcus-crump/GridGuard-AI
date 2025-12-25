
import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { dataService } from '../services/dataServiceFactory';
import { genAiService } from '../services/genAiService';
import { knowledgeService } from '../services/knowledgeService';
import { HistoricalComparisonChart } from '../components/Visualizations/Charts';
import { notificationService } from '../services/notificationService';
import { incidentRecorder, IncidentRecording } from '../services/incidentRecorder';

const PlayIcons = {
    Prev: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
        </svg>
    ),
    Play: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    ),
    Pause: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
    ),
    Next: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
    ),
    Restart: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"></path>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
    )
};

const ReportRenderer: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    return (
        <div className="space-y-2 font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto pr-2">
            {lines.map((line, idx) => {
                if (line.includes('BLUF:')) return <div key={idx} className="bg-[var(--bg-tertiary)] border-l-4 border-[var(--status-critical)] p-2 my-2 rounded-r font-bold text-[var(--status-critical)]">{line}</div>;
                if (line.startsWith('##')) return <h3 key={idx} className="text-[var(--text-link)] font-bold mt-4 border-b border-[var(--border-muted)] uppercase">{line.replace(/#/g, '')}</h3>;
                return <div key={idx} className="text-[var(--text-secondary)]">{line}</div>;
            })}
        </div>
    );
};

export const Historical: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PLAYBACK' | 'DATASET' | 'RECORDINGS'>('PLAYBACK');

    // Data State
    const [fullData, setFullData] = useState<any[] | null>(null); // The complete dataset
    const [displayedData, setDisplayedData] = useState<any[] | null>(null); // What is currently shown (for animation)
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [currentCase, setCurrentCase] = useState<string>("None");

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const playbackSpeed = 100; // Faster speed for better UX
    const timerRef = useRef<number | null>(null);

    const [datasetSize, setDatasetSize] = useState(100);
    const [generatedJson, setGeneratedJson] = useState<string>('');
    const [exportFormat, setExportFormat] = useState<'JSONL' | 'TIMESERIES'>('JSONL');

    // Incident Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [currentRecording, setCurrentRecording] = useState<IncidentRecording | null>(null);
    const [savedRecordings, setSavedRecordings] = useState<IncidentRecording[]>([]);
    const [selectedRecording, setSelectedRecording] = useState<IncidentRecording | null>(null);

    useEffect(() => {
        // Auto-load demo data if in demo mode and no case selected
        const isDemo = localStorage.getItem('DEMO_MODE') === 'true';
        if (isDemo && currentCase === "None") {
            loadCaseStudy("Synthetic Stress Test (Demo)", "2025-01-01T00", "2025-01-03T00");
        }

        // Subscribe to incident recorder
        const unsubscribe = incidentRecorder.subscribe((recording) => {
            setCurrentRecording(recording);
            setIsRecording(!!recording);
        });

        // Load saved recordings
        incidentRecorder.listRecordings().then(setSavedRecordings);

        return () => unsubscribe();
    }, []);

    // Load Case Study
    const loadCaseStudy = async (caseName: string, start: string, end: string) => {
        setLoading(true);
        setAiAnalysis(null);
        setCurrentCase(caseName);
        stopPlayback();

        try {
            const response = await dataService.getHistorical(start, end);
            if (response && response.length > 0) {
                const transformed = response.map((d: any) => ({
                    time: new Date(d.period).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
                    value: d.value,
                    value2: d.value2 // Secondary line (Demand vs Load) for Uri simulation
                }));
                setFullData(transformed);
                setDisplayedData(transformed); // Show full data initially
                setPlaybackIndex(transformed.length - 1); // Set cursor to end
                notificationService.success("Case Loaded", `${caseName} data mounted to timeline.`);
            } else {
                notificationService.warning("No Data", "EIA API Key required to load historical event data.");
            }
        } catch (e) {
            console.warn("History Load Error", e);
        } finally {
            setLoading(false);
        }
    };

    // --- PLAYBACK ENGINE ---
    const startPlayback = () => {
        if (!fullData || fullData.length === 0) return;

        // If at end, restart
        if (playbackIndex >= fullData.length - 1) {
            setPlaybackIndex(0);
            setDisplayedData([fullData[0]]);
        }

        setIsPlaying(true);
    };

    const stopPlayback = () => {
        setIsPlaying(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => {
        if (isPlaying && fullData) {
            timerRef.current = window.setInterval(() => {
                setPlaybackIndex(prev => {
                    const next = prev + 1;
                    if (next >= fullData.length) {
                        stopPlayback();
                        return fullData.length - 1;
                    }
                    return next;
                });
            }, playbackSpeed);
        } else {
            stopPlayback();
        }
        return () => stopPlayback();
    }, [isPlaying, fullData]);

    // Sync Data with Playback Index
    useEffect(() => {
        if (fullData && playbackIndex >= 0) {
            setDisplayedData(fullData.slice(0, playbackIndex + 1));
        }
    }, [playbackIndex, fullData]);


    const runAiAnalysis = async () => {
        if (!fullData) return;
        setAnalyzing(true);

        // If simulated Uri data, hint the AI
        let context = "";
        if (currentCase.includes("Uri")) context = "CONTEXT: This is the Winter Storm Uri event (Feb 2021). The drop in 'value' represents Load Shedding (Blackouts). 'value2' is the estimated Demand.";

        const result = await genAiService.analyzeTimeSeries(fullData);
        setAiAnalysis(result);
        setAnalyzing(false);
    };

    // --- DATASET GENERATOR LOGIC ---
    const generateTrainingData = () => {
        setLoading(true);

        // Simulating "Scraping" Process
        setTimeout(() => {
            const rows = [];
            const baseLoad = 45000;

            for (let i = 0; i < datasetSize; i++) {
                // Generate synthetic variance for training set creation
                const hour = i % 24;
                const temp = 70 + Math.sin(i * 0.1) * 20 + (Math.random() * 5); // Temp F
                const load = baseLoad + (temp * 100) + (hour * 500) + (Math.random() * 2000);
                const wind = 5000 + Math.cos(i * 0.2) * 4000;
                const status = load > 65000 ? "WARNING" : "NORMAL";

                if (exportFormat === 'JSONL') {
                    // LLM Fine-Tuning Format (Chat)
                    const prompt = `Timestamp: T-${i}h. Load: ${Math.round(load)}MW. Temp: ${Math.round(temp)}F. Wind: ${Math.round(wind)}MW.`;
                    const response = `System Status: ${status}. Recommendation: ${status === 'WARNING' ? 'Deploy Reserves' : 'Maintain Monitor'}. Confidence: 99%.`;

                    const jsonlRow = {
                        messages: [
                            { role: "system", content: "You are an expert ERCOT grid operator assistant." },
                            { role: "user", content: prompt },
                            { role: "model", content: response }
                        ]
                    };
                    rows.push(JSON.stringify(jsonlRow));
                } else {
                    // Time Series Format (LSTM/Forecasting)
                    rows.push(JSON.stringify({
                        timestamp: new Date(Date.now() - (datasetSize - i) * 3600000).toISOString(),
                        features: { load: Math.round(load), temp: Math.round(temp), wind: Math.round(wind) },
                        target_label: status === 'WARNING' ? 1 : 0
                    }, null, 2));
                }
            }

            const finalOutput = exportFormat === 'JSONL' ? rows.join('\n') : `[\n${rows.join(',\n')}\n]`;
            setGeneratedJson(finalOutput);
            setLoading(false);
            notificationService.success("Dataset Compiled", `${datasetSize} records generated in ${exportFormat} format.`);
        }, 1200);
    };

    const downloadData = () => {
        const blob = new Blob([generatedJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ercot_training_data_${new Date().toISOString()}.${exportFormat === 'JSONL' ? 'jsonl' : 'json'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const injectToKnowledgeBase = async () => {
        if (!generatedJson) return;
        const blob = new Blob([generatedJson], { type: 'text/plain' });
        const file = new File([blob], `synthetic_training_set_${new Date().getTime()}.jsonl`, { type: 'text/plain' });

        await knowledgeService.ingestFile(file);
        notificationService.success("Neural Inject Complete", "Synthetic data mounted to active context window.");
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <header className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Historical & Training Data</h2>
                <div className="flex gap-2">
                    <Button variant={activeTab === 'PLAYBACK' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('PLAYBACK')}>Event Playback</Button>
                    <Button variant={activeTab === 'RECORDINGS' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('RECORDINGS')}>Incident Recordings</Button>
                    <Button variant={activeTab === 'DATASET' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('DATASET')}>ML Dataset Builder</Button>
                </div>
            </header>

            {/* INCIDENT RECORDER CONTROLS */}
            <div className="flex items-center gap-4 p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border-default)]">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-[var(--status-critical)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                        {isRecording ? 'RECORDING' : 'IDLE'}
                    </span>
                </div>
                {isRecording && currentRecording && (
                    <div className="text-xs text-[var(--text-secondary)] font-mono">
                        Duration: {Math.round((Date.now() - currentRecording.startTime) / 1000)}s |
                        Snapshots: {currentRecording.snapshots.length}
                    </div>
                )}
                <div className="flex-1" />
                {!isRecording ? (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                            const name = `Incident ${new Date().toLocaleString()}`;
                            incidentRecorder.startRecording(name);
                            notificationService.info('Recording Started', 'Flight recorder active');
                        }}
                    >
                        START RECORDING
                    </Button>
                ) : (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="border-[var(--status-critical)] text-[var(--status-critical)]"
                        onClick={async () => {
                            const recording = await incidentRecorder.stopRecording();
                            if (recording) {
                                setSavedRecordings(prev => [recording, ...prev]);
                                notificationService.success('Recording Saved', `${recording.name} - ${Math.round((recording.duration || 0) / 1000)}s`);
                            }
                        }}
                    >
                        STOP RECORDING
                    </Button>
                )}
            </div>

            {activeTab === 'DATASET' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {/* LEFT: Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card title="Data Harvester Config">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Data Source</label>
                                    <select className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-3 py-2 text-sm text-[var(--text-primary)]">
                                        <option>Synthetic ERCOT Generator (Local)</option>
                                        <option disabled>EIA Historical API (Key Required)</option>
                                        <option disabled>GridStatus.io Archive (Key Required)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Output Format</label>
                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                        <button
                                            onClick={() => setExportFormat('JSONL')}
                                            className={`px-3 py-2 rounded text-xs font-mono border transition-colors ${exportFormat === 'JSONL' ? 'bg-[var(--status-info-muted)] border-[var(--status-info)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-muted)]'}`}
                                        >
                                            JSONL (LLM)
                                        </button>
                                        <button
                                            onClick={() => setExportFormat('TIMESERIES')}
                                            className={`px-3 py-2 rounded text-xs font-mono border transition-colors ${exportFormat === 'TIMESERIES' ? 'bg-[var(--status-info-muted)] border-[var(--status-info)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-muted)]'}`}
                                        >
                                            TIME-SERIES
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                        {exportFormat === 'JSONL' ? 'Best for Fine-Tuning Gemini/GPT models.' : 'Best for LSTM, XGBoost, or Prophet models.'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Sample Size (Rows)</label>
                                    <input
                                        type="number"
                                        value={datasetSize}
                                        onChange={(e) => setDatasetSize(Number(e.target.value))}
                                        className="w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-3 py-2 text-sm text-[var(--text-primary)] font-mono"
                                    />
                                </div>

                                <Button variant="primary" className="w-full" onClick={generateTrainingData} disabled={loading}>
                                    {loading ? "HARVESTING..." : "COMPILE DATASET"}
                                </Button>
                            </div>
                        </Card>

                        <Card title="Stats">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-muted)] text-center">
                                    <div className="text-[var(--text-muted)] text-[10px] uppercase">Records</div>
                                    <div className="text-xl font-mono text-[var(--text-primary)]">{generatedJson ? datasetSize : 0}</div>
                                </div>
                                <div className="p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-muted)] text-center">
                                    <div className="text-[var(--text-muted)] text-[10px] uppercase">Est. Size</div>
                                    <div className="text-xl font-mono text-[var(--text-primary)]">{generatedJson ? (generatedJson.length / 1024).toFixed(1) : 0} KB</div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: Preview & Download */}
                    <div className="lg:col-span-2 h-[500px]">
                        <Card title="Dataset Preview (Raw JSON)" className="h-full" action={
                            <div className="flex gap-2">
                                <Button size="sm" variant="primary" onClick={injectToKnowledgeBase} disabled={!generatedJson}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M12 5v14M5 12h14"></path></svg>
                                    Mount to Active Context
                                </Button>
                                <Button size="sm" variant="secondary" onClick={downloadData} disabled={!generatedJson}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Download
                                </Button>
                            </div>
                        }>
                            <div className="h-full w-full bg-[var(--bg-primary)] rounded border border-[var(--border-muted)] p-4 overflow-auto font-mono text-xs text-[var(--text-secondary)]">
                                {generatedJson ? (
                                    <pre className="whitespace-pre-wrap break-all">{generatedJson.substring(0, 2000)} {generatedJson.length > 2000 && '...'}</pre>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] opacity-50">
                                        <span>No Data Compiled</span>
                                        <span className="text-[10px] mt-2">Configure parameters and click "Compile Dataset"</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            ) : activeTab === 'RECORDINGS' ? (
                /* RECORDINGS TAB */
                <div className="space-y-4 animate-in fade-in">
                    <Card title="Incident Recordings Archive">
                        {savedRecordings.length > 0 ? (
                            <div className="space-y-2">
                                {savedRecordings.map((recording) => (
                                    <div
                                        key={recording.id}
                                        className={`p-4 rounded border transition-all cursor-pointer ${selectedRecording?.id === recording.id
                                            ? 'bg-[var(--status-info-muted)] border-[var(--status-info)]'
                                            : 'bg-[var(--bg-tertiary)] border-[var(--border-default)] hover:border-[var(--border-emphasis)]'
                                            }`}
                                        onClick={() => setSelectedRecording(recording)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)]">{recording.name}</div>
                                                <div className="text-xs text-[var(--text-muted)] font-mono">
                                                    {new Date(recording.startTime).toLocaleString()}
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${recording.metadata.severity === 'CRITICAL' ? 'bg-[var(--status-critical)] text-white' :
                                                recording.metadata.severity === 'MAJOR' ? 'bg-[var(--status-warning)] text-black' :
                                                    recording.metadata.severity === 'MODERATE' ? 'bg-[var(--status-info)] text-white' :
                                                        'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                                }`}>
                                                {recording.metadata.severity}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-xs text-[var(--text-secondary)]">
                                            <div>
                                                <div className="text-[var(--text-muted)] uppercase text-[9px]">Duration</div>
                                                <div className="font-mono">{Math.round((recording.duration || 0) / 1000)}s</div>
                                            </div>
                                            <div>
                                                <div className="text-[var(--text-muted)] uppercase text-[9px]">Snapshots</div>
                                                <div className="font-mono">{recording.snapshots.length}</div>
                                            </div>
                                            <div>
                                                <div className="text-[var(--text-muted)] uppercase text-[9px]">Peak Load</div>
                                                <div className="font-mono">{Math.round(recording.metadata.peakLoad / 1000)}k MW</div>
                                            </div>
                                            <div>
                                                <div className="text-[var(--text-muted)] uppercase text-[9px]">Min Freq</div>
                                                <div className="font-mono">{recording.metadata.minFrequency.toFixed(2)} Hz</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="flex-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const json = incidentRecorder.exportAsJSON(recording);
                                                    const blob = new Blob([json], { type: 'application/json' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `incident_${recording.id}.json`;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                }}
                                            >
                                                EXPORT
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="text-[var(--status-critical)]"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await incidentRecorder.deleteRecording(recording.id);
                                                    setSavedRecordings(prev => prev.filter(r => r.id !== recording.id));
                                                    if (selectedRecording?.id === recording.id) {
                                                        setSelectedRecording(null);
                                                    }
                                                    notificationService.info('Recording Deleted', recording.name);
                                                }}
                                            >
                                                DELETE
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-50">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <line x1="12" y1="2" x2="12" y2="5"></line>
                                    <line x1="12" y1="19" x2="12" y2="22"></line>
                                </svg>
                                <div className="text-sm font-semibold">No Recordings</div>
                                <div className="text-xs mt-1">Start a recording to capture grid state snapshots</div>
                            </div>
                        )}
                    </Card>

                    {/* Selected Recording Detail */}
                    {selectedRecording && (
                        <Card title={`Timeline: ${selectedRecording.name}`}>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {selectedRecording.snapshots.map((snapshot, i) => (
                                    <div key={snapshot.id} className="flex items-center gap-3 p-2 bg-[var(--bg-tertiary)] rounded text-xs">
                                        <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center font-mono font-bold text-[var(--text-secondary)]">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-mono text-[var(--text-muted)]">
                                                {new Date(snapshot.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 text-right">
                                            <div>
                                                <div className="text-[var(--text-muted)]">Load</div>
                                                <div className="font-mono text-[var(--text-primary)]">{Math.round(snapshot.load / 1000)}k</div>
                                            </div>
                                            <div>
                                                <div className="text-[var(--text-muted)]">Freq</div>
                                                <div className="font-mono text-[var(--text-primary)]">{snapshot.frequency.toFixed(2)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[var(--text-muted)]">Temp</div>
                                                <div className="font-mono text-[var(--text-primary)]">{Math.round(snapshot.maxTemp)}°F</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            ) : (
                /* PLAYBACK TAB */
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">
                    {/* LEFT: CASE LIBRARY */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card title="Case Study Library">
                            <div className="space-y-2">
                                <p className="text-xs text-[var(--text-secondary)] mb-2">Select a historical event to load into the AI Forensics Engine.</p>

                                <button
                                    onClick={() => loadCaseStudy("Synthetic Stress Test (Demo)", "2025-01-01T00", "2025-01-03T00")}
                                    className={`w-full text-left p-3 rounded border transition-colors ${currentCase === "Synthetic Stress Test (Demo)" ? 'bg-[var(--status-info-muted)] border-[var(--status-info)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm">Synthetic Stress Test</span>
                                        <span className="text-[9px] font-mono border px-1 rounded bg-[var(--bg-secondary)] border-[var(--status-info)] text-[var(--status-info)]">DEMO READY</span>
                                    </div>
                                    <div className="text-[10px] opacity-80">Guaranteed Offline Playback.</div>
                                </button>

                                <button
                                    onClick={() => loadCaseStudy("Winter Storm Uri", "2021-02-13T00", "2021-02-16T00")}
                                    className={`w-full text-left p-3 rounded border transition-colors ${currentCase === "Winter Storm Uri" ? 'bg-[var(--status-critical-muted)] border-[var(--status-critical)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm">Winter Storm Uri</span>
                                        <span className="text-[9px] font-mono border px-1 rounded bg-[var(--bg-secondary)]">FEB 2021</span>
                                    </div>
                                    <div className="text-[10px] opacity-80">Grid Collapse / Load Shedding event.</div>
                                </button>

                                <button
                                    onClick={() => loadCaseStudy("Summer Heat Dome", "2023-06-25T00", "2023-06-28T00")}
                                    className={`w-full text-left p-3 rounded border transition-colors ${currentCase === "Summer Heat Dome" ? 'bg-[var(--status-warning-muted)] border-[var(--status-warning)] text-[var(--text-primary)]' : 'bg-[var(--bg-primary)] border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm">Summer Heat Dome</span>
                                        <span className="text-[9px] font-mono border px-1 rounded bg-[var(--bg-secondary)]">JUN 2023</span>
                                    </div>
                                    <div className="text-[10px] opacity-80">Peak Demand Stress Test.</div>
                                </button>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: VISUALIZATION */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] p-4 rounded-lg flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="w-10 px-0 flex items-center justify-center"
                                    onClick={() => {
                                        stopPlayback();
                                        setPlaybackIndex(0);
                                    }}
                                    title="Restart"
                                >
                                    {PlayIcons.Restart}
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex items-center gap-2"
                                    onClick={isPlaying ? stopPlayback : startPlayback}
                                    disabled={!fullData}
                                >
                                    {isPlaying ? PlayIcons.Pause : PlayIcons.Play}
                                    <span>{isPlaying ? "Pause" : "Play Event"}</span>
                                </Button>
                                <div className="h-8 w-px bg-[var(--border-muted)] mx-2"></div>
                                <span className="flex items-center text-sm font-mono text-[var(--text-muted)]">Speed: 10x</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-[var(--text-secondary)] font-mono text-sm">
                                    {fullData ? `Active Case: ${currentCase}` : "Select a Case Study"}
                                </div>
                                {fullData && (
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={runAiAnalysis}
                                        disabled={analyzing || !!aiAnalysis}
                                        className="animate-in fade-in"
                                    >
                                        {analyzing ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                                GENERATING POST-MORTEM...
                                            </span>
                                        ) : "RUN AI POST-MORTEM"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Card
                            title="Timeline Playback (Load vs Capacity)"
                            className="h-80"
                            isEmpty={!displayedData}
                            isLoading={loading}
                            emptyMessage="Select a Case Study from the Library"
                        >
                            {displayedData && (
                                <div className="h-full w-full pt-4 pr-4">
                                    <HistoricalComparisonChart
                                        data={displayedData}
                                        height={260}
                                        title1="Actual Load (Supply)"
                                        title2={currentCase.includes('Uri') || currentCase.includes('Synthetic') ? "Estimated Demand (Gap)" : "Forecast"}
                                    />
                                </div>
                            )}
                        </Card>

                        <div className="grid grid-cols-1 gap-6">
                            {/* AI ANALYSIS CARD */}
                            <Card
                                title={`AI Forensics: ${currentCase}`}
                                className="h-96"
                                isEmpty={!fullData}
                                emptyMessage="Load Data to Run Analysis"
                                isLoading={analyzing}
                            >
                                {aiAnalysis ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-muted)]">
                                            <div className="w-2 h-2 bg-[var(--status-info)] rounded-full"></div>
                                            <span className="text-xs font-mono text-[var(--text-secondary)]">GENERATED BY GEMINI 3 PRO</span>
                                        </div>
                                        <ReportRenderer text={aiAnalysis} />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        {fullData ? (
                                            <p className="text-sm text-[var(--text-muted)]">Click "Run AI Post-Mortem" to generate forensic report.</p>
                                        ) : (
                                            <span className="text-sm text-[var(--text-muted)]">Waiting for case selection...</span>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
