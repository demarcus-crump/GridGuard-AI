
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { researchAgent, ResearchPaper } from '../services/researchAgent';
import { dataImportService, ImportedDataset, ImportProgress, ColumnMapping } from '../services/dataImportService';
import { vectorStore } from '../services/vectorStore';
import { fineTuningService } from '../services/fineTuningService';
import { notificationService } from '../services/notificationService';

export const Research: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'PAPERS' | 'IMPORT' | 'TRAINING'>('PAPERS');

    // Research Papers State
    const [papers, setPapers] = useState<ResearchPaper[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const sources = researchAgent.getSources();

    // Data Import State
    const [datasets, setDatasets] = useState<Omit<ImportedDataset, 'data'>[]>([]);
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
    const [detectedColumns, setDetectedColumns] = useState<Partial<ColumnMapping>>({});
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ timestamp: '' });
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Vector Store State
    const [vectorStats, setVectorStats] = useState({ documentCount: 0, chunkCount: 0 });

    // Training Data State
    const [trainingStats, setTrainingStats] = useState<any>(null);

    // Load initial data
    useEffect(() => {
        setPapers(researchAgent.getAllCuratedPapers());
        loadDatasets();
        loadVectorStats();
        loadTrainingStats();
    }, []);

    useEffect(() => {
        const unsubscribe = dataImportService.subscribeProgress(setImportProgress);
        return () => unsubscribe();
    }, []);

    const loadDatasets = async () => {
        const list = await dataImportService.listDatasets();
        setDatasets(list);
    };

    const loadVectorStats = async () => {
        const stats = await vectorStore.getStats();
        setVectorStats(stats);
    };

    const loadTrainingStats = async () => {
        const stats = await fineTuningService.getStats();
        setTrainingStats(stats);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setPapers(researchAgent.getAllCuratedPapers());
            return;
        }
        const results = await researchAgent.searchByTopic({ topic: searchQuery });
        setPapers(results);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const content = await file.text();
        const lines = content.split('\n');
        if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            setCsvHeaders(headers);
            const detected = dataImportService.detectColumns(headers);
            setDetectedColumns(detected);
            setColumnMapping({ ...detected, timestamp: detected.timestamp || headers[0] } as ColumnMapping);
            setPendingFile(file);
        }
    };

    const handleImport = async () => {
        if (!pendingFile || !columnMapping.timestamp) return;

        const result = await dataImportService.importCSV(pendingFile, columnMapping);
        if (result.success) {
            await loadDatasets();
            setPendingFile(null);
            setCsvHeaders([]);
            setDetectedColumns({});
        }
    };

    const handleExportTraining = async () => {
        await fineTuningService.downloadDataset();
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Research & Data Intelligence</h2>
                    <p className="text-sm text-[var(--text-secondary)]">Discover papers, import data, and train models</p>
                </div>
                <div className="flex gap-2">
                    <Button variant={activeTab === 'PAPERS' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('PAPERS')}>
                        White Papers
                    </Button>
                    <Button variant={activeTab === 'IMPORT' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('IMPORT')}>
                        Data Import
                    </Button>
                    <Button variant={activeTab === 'TRAINING' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('TRAINING')}>
                        Training Data
                    </Button>
                </div>
            </header>

            {/* PAPERS TAB */}
            {activeTab === 'PAPERS' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sources */}
                    <div className="space-y-4">
                        <Card title="Knowledge Sources">
                            <div className="space-y-2">
                                <button
                                    onClick={() => { setSelectedSource(null); setPapers(researchAgent.getAllCuratedPapers()); }}
                                    className={`w-full text-left p-2 rounded text-xs ${!selectedSource ? 'bg-[var(--status-info-muted)] border-[var(--status-info)]' : 'bg-[var(--bg-tertiary)]'} border transition-colors`}
                                >
                                    All Sources ({researchAgent.getAllCuratedPapers().length})
                                </button>
                                {sources.map(source => (
                                    <button
                                        key={source.key}
                                        onClick={() => { setSelectedSource(source.key); setPapers(researchAgent.getPapersBySource(source.key)); }}
                                        className={`w-full text-left p-2 rounded text-xs border transition-colors ${selectedSource === source.key ? 'bg-[var(--status-info-muted)] border-[var(--status-info)]' : 'bg-[var(--bg-tertiary)] border-[var(--border-default)]'}`}
                                    >
                                        <div className="font-bold text-[var(--text-primary)]">{source.key}</div>
                                        <div className="text-[var(--text-muted)] truncate">{source.name}</div>
                                        <div className="text-[var(--text-secondary)] mt-1">{source.paperCount} papers</div>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <Card title="Vector Store">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-secondary)]">Documents</span>
                                    <span className="font-mono font-bold text-[var(--text-primary)]">{vectorStats.documentCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-secondary)]">Chunks</span>
                                    <span className="font-mono font-bold text-[var(--text-primary)]">{vectorStats.chunkCount}</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Search & Results */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search papers... (e.g., 'cybersecurity', 'N-1 contingency')"
                                className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                            <Button variant="primary" onClick={handleSearch}>Search</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {papers.map(paper => (
                                <Card key={paper.id} className={paper.isImported ? 'border-[var(--status-normal)]' : ''}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${paper.category === 'STANDARD' ? 'bg-blue-500/20 text-blue-400' :
                                                paper.category === 'PROCEDURE' ? 'bg-purple-500/20 text-purple-400' :
                                                    paper.category === 'REGULATION' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {paper.category}
                                        </span>
                                        {paper.isImported && (
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[var(--status-normal-muted)] text-[var(--status-normal)]">
                                                IMPORTED
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-[var(--text-primary)] text-sm mb-1">{paper.title}</h4>
                                    <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{paper.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-[var(--text-muted)]">{paper.source}</span>
                                        <div className="flex gap-2">
                                            <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--text-link)] hover:underline">
                                                View →
                                            </a>
                                            {!paper.isImported && (
                                                <button
                                                    onClick={() => researchAgent.importPaper(paper).then(() => setPapers([...papers]))}
                                                    className="text-xs text-[var(--status-info)] hover:underline"
                                                >
                                                    Import
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* IMPORT TAB */}
            {activeTab === 'IMPORT' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload */}
                    <Card title="Import CSV Data">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {!pendingFile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--status-info)] transition-colors"
                            >
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" className="mx-auto mb-4">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <div className="text-[var(--text-primary)] font-semibold">Drop CSV file or click to browse</div>
                                <div className="text-xs text-[var(--text-muted)] mt-1">Supports: timestamp, load, generation, frequency, price, wind, solar</div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-[var(--bg-tertiary)] rounded border border-[var(--border-default)]">
                                    <div className="font-bold text-[var(--text-primary)]">{pendingFile.name}</div>
                                    <div className="text-xs text-[var(--text-muted)]">{csvHeaders.length} columns detected</div>
                                </div>

                                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase">Column Mapping</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {['timestamp', 'load', 'generation', 'frequency', 'price', 'wind', 'solar', 'temperature'].map(field => (
                                        <div key={field}>
                                            <label className="text-[10px] text-[var(--text-muted)] uppercase">{field}</label>
                                            <select
                                                value={columnMapping[field as keyof ColumnMapping] || ''}
                                                onChange={(e) => setColumnMapping({ ...columnMapping, [field]: e.target.value })}
                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
                                            >
                                                <option value="">-- Select --</option>
                                                {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                {importProgress && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--text-secondary)]">{importProgress.phase}</span>
                                            <span className="text-[var(--text-primary)]">{importProgress.message}</span>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--status-info)] transition-all duration-300"
                                                style={{ width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => { setPendingFile(null); setCsvHeaders([]); }}>Cancel</Button>
                                    <Button variant="primary" onClick={handleImport} disabled={!columnMapping.timestamp}>
                                        Import Data
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Datasets */}
                    <Card title="Imported Datasets">
                        {datasets.length > 0 ? (
                            <div className="space-y-2">
                                {datasets.map(ds => (
                                    <div key={ds.id} className="p-3 bg-[var(--bg-tertiary)] rounded border border-[var(--border-default)]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)]">{ds.name}</div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    {ds.rowCount.toLocaleString()} rows | {ds.columns.join(', ')}
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-1">
                                                    {ds.timeRange.start} → {ds.timeRange.end}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => dataImportService.deleteDataset(ds.id).then(loadDatasets)}
                                                className="text-xs text-[var(--status-critical)] hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                <div className="text-sm font-semibold">No datasets imported</div>
                                <div className="text-xs mt-1">Upload a CSV file to get started</div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* TRAINING TAB */}
            {activeTab === 'TRAINING' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Training Data Statistics" className="lg:col-span-2">
                        {trainingStats ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded">
                                        <div className="text-2xl font-bold text-[var(--text-primary)]">{trainingStats.total}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Total Examples</div>
                                    </div>
                                    <div className="text-center p-3 bg-[var(--status-normal-muted)] rounded">
                                        <div className="text-2xl font-bold text-[var(--status-normal)]">{trainingStats.positive}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Positive</div>
                                    </div>
                                    <div className="text-center p-3 bg-[var(--status-critical-muted)] rounded">
                                        <div className="text-2xl font-bold text-[var(--status-critical)]">{trainingStats.negative}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Negative</div>
                                    </div>
                                    <div className="text-center p-3 bg-[var(--status-warning-muted)] rounded">
                                        <div className="text-2xl font-bold text-[var(--status-warning)]">{trainingStats.flagged}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase">Flagged</div>
                                    </div>
                                </div>

                                {trainingStats.topTopics?.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Top Topics</div>
                                        <div className="flex flex-wrap gap-2">
                                            {trainingStats.topTopics.map((t: any) => (
                                                <span key={t.topic} className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-primary)]">
                                                    {t.topic} ({t.count})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-[var(--border-muted)]">
                                    <p className="text-xs text-[var(--text-secondary)] mb-3">
                                        Training examples are collected automatically from chat interactions. Rate responses (👍/👎) to improve quality.
                                        Export data in Gemini fine-tuning format.
                                    </p>
                                    <Button variant="primary" onClick={handleExportTraining}>
                                        Export for Fine-Tuning (JSONL)
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                Loading training statistics...
                            </div>
                        )}
                    </Card>

                    <Card title="How It Works">
                        <div className="space-y-4 text-xs text-[var(--text-secondary)]">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--status-info-muted)] flex items-center justify-center text-[var(--status-info)] font-bold">1</div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">Use the Chat</div>
                                    <div>Every conversation is automatically recorded</div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--status-info-muted)] flex items-center justify-center text-[var(--status-info)] font-bold">2</div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">Rate Responses</div>
                                    <div>👍 for good responses, 👎 for bad ones</div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--status-info-muted)] flex items-center justify-center text-[var(--status-info)] font-bold">3</div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">Export JSONL</div>
                                    <div>Download in Gemini fine-tuning format</div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[var(--status-info-muted)] flex items-center justify-center text-[var(--status-info)] font-bold">4</div>
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">Fine-Tune Model</div>
                                    <div>Upload to Google AI Studio to train</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
