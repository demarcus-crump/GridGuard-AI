
import React, { useState, useEffect } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { auditService, AuditEntry, AuditEventType } from '../services/auditService';

const EVENT_TYPE_COLORS: Record<AuditEventType, string> = {
    'SYSTEM_BOOT': 'text-blue-400',
    'USER_LOGIN': 'text-green-400',
    'USER_LOGOUT': 'text-gray-400',
    'AI_RECOMMENDATION': 'text-cyan-400',
    'AI_ACTUATION': 'text-purple-400',
    'OPERATOR_OVERRIDE': 'text-orange-400',
    'OPERATOR_APPROVAL': 'text-green-400',
    'SAFETY_SWITCH': 'text-yellow-400',
    'DATA_FETCH': 'text-gray-500',
    'NAVIGATION': 'text-gray-500',
    'ALERT_TRIGGERED': 'text-red-400',
    'CONFIG_CHANGE': 'text-yellow-400',
    'EXPORT_GENERATED': 'text-blue-400',
    'ERROR': 'text-red-500'
};

export const AuditLog: React.FC = () => {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [filter, setFilter] = useState<AuditEventType | 'ALL'>('ALL');
    const [chainValid, setChainValid] = useState<boolean | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const unsubscribe = auditService.subscribe(setLogs);
        return unsubscribe;
    }, []);

    const filteredLogs = filter === 'ALL'
        ? logs
        : logs.filter(l => l.eventType === filter);

    const verifyChain = async () => {
        const result = await auditService.verifyChainIntegrity();
        setChainValid(result.valid);
    };

    const exportCSV = () => {
        setIsExporting(true);
        const csv = auditService.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gridguard_audit_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'EXPORT_GENERATED',
            resource: 'AUDIT_LOGS',
            details: 'CSV export downloaded'
        });

        setIsExporting(false);
    };

    const exportNIST = () => {
        setIsExporting(true);
        const json = auditService.generateNistArtifact();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gridguard_nist_rmf_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        auditService.log({
            operatorId: 'OPERATOR',
            eventType: 'EXPORT_GENERATED',
            resource: 'NIST_ARTIFACT',
            details: 'NIST AI RMF 1.0 compliance artifact generated'
        });

        setIsExporting(false);
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Audit Trail</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Immutable chain of custody for all AI recommendations and operator actions
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Chain Integrity Check */}
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={verifyChain}>
                            Verify Chain
                        </Button>
                        {chainValid !== null && (
                            <span className={`text-xs font-mono ${chainValid ? 'text-green-400' : 'text-red-400'}`}>
                                {chainValid ? 'VALID' : 'BROKEN'}
                            </span>
                        )}
                    </div>

                    {/* Export Buttons */}
                    <Button variant="secondary" size="sm" onClick={exportCSV} disabled={isExporting}>
                        Export CSV
                    </Button>
                    <Button variant="primary" size="sm" onClick={exportNIST} disabled={isExporting}>
                        NIST Artifact
                    </Button>
                </div>
            </header>

            {/* STATS ROW */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-[var(--status-info)]">
                    <div className="p-3">
                        <div className="text-xs text-[var(--text-secondary)] uppercase">Total Entries</div>
                        <div className="text-2xl font-mono text-[var(--text-primary)]">{logs.length}</div>
                    </div>
                </Card>
                <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-cyan-400">
                    <div className="p-3">
                        <div className="text-xs text-[var(--text-secondary)] uppercase">AI Recommendations</div>
                        <div className="text-2xl font-mono text-cyan-400">
                            {logs.filter(l => l.eventType === 'AI_RECOMMENDATION').length}
                        </div>
                    </div>
                </Card>
                <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-orange-400">
                    <div className="p-3">
                        <div className="text-xs text-[var(--text-secondary)] uppercase">Operator Overrides</div>
                        <div className="text-2xl font-mono text-orange-400">
                            {logs.filter(l => l.eventType === 'OPERATOR_OVERRIDE').length}
                        </div>
                    </div>
                </Card>
                <Card className="bg-[var(--bg-secondary)] border-l-4 border-l-green-400">
                    <div className="p-3">
                        <div className="text-xs text-[var(--text-secondary)] uppercase">Chain Status</div>
                        <div className="text-2xl font-mono text-green-400">
                            {chainValid === null ? 'UNVERIFIED' : chainValid ? 'INTACT' : 'COMPROMISED'}
                        </div>
                    </div>
                </Card>
            </div>

            {/* FILTER BAR */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[var(--text-secondary)] uppercase mr-2">Filter:</span>
                {['ALL', 'AI_RECOMMENDATION', 'OPERATOR_OVERRIDE', 'SAFETY_SWITCH', 'ALERT_TRIGGERED', 'ERROR'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type as AuditEventType | 'ALL')}
                        className={`px-3 py-1 text-xs rounded border transition-all ${filter === type
                                ? 'bg-[var(--status-info-muted)] border-[var(--status-info)] text-[var(--text-primary)]'
                                : 'bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                            }`}
                    >
                        {type.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* LOG TABLE */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] uppercase">Timestamp</th>
                                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] uppercase">Operator</th>
                                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] uppercase">Event</th>
                                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] uppercase">Resource</th>
                                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] uppercase">Details</th>
                                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)] uppercase">Hash</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.slice(0, 100).map((log, idx) => (
                                <tr
                                    key={log.id}
                                    className={`border-b border-[var(--border-muted)] hover:bg-[var(--bg-hover)] transition-colors ${idx % 2 === 0 ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-secondary)]'
                                        }`}
                                >
                                    <td className="px-4 py-2 font-mono text-[var(--text-muted)]">{log.timestamp}</td>
                                    <td className="px-4 py-2">
                                        <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                                            {log.operatorId}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`font-semibold ${EVENT_TYPE_COLORS[log.eventType] || 'text-[var(--text-primary)]'}`}>
                                            {log.eventType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-[var(--text-secondary)]">{log.resource}</td>
                                    <td className="px-4 py-2 text-[var(--text-secondary)] max-w-xs truncate" title={log.details}>
                                        {log.details}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-[10px] text-[var(--text-muted)]">
                                        <span className="text-[var(--text-link)]">{log.hash}</span>
                                        <span className="mx-1 opacity-50">←</span>
                                        <span className="opacity-50">{log.previousHash}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length > 100 && (
                    <div className="text-center py-3 text-xs text-[var(--text-muted)] border-t border-[var(--border-muted)]">
                        Showing 100 of {filteredLogs.length} entries
                    </div>
                )}
            </Card>

            {/* COMPLIANCE NOTE */}
            <div className="text-xs text-[var(--text-muted)] text-center">
                Audit logs are cryptographically chained using SHA-256 hashing.
                Export NIST AI RMF 1.0 artifact for regulatory compliance.
            </div>
        </div>
    );
};
