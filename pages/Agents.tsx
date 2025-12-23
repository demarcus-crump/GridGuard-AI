
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { AgentNetwork } from '../components/Visualizations/AgentNetwork';
import { AGENT_LIST } from '../constants';
import { StatusIndicator } from '../components/Common/StatusIndicator';
import { GridStatus } from '../types';
import { agentOrchestrator, OrchestratorStatus, AgentLog } from '../services/agentOrchestrator';

// Sub-component for Logs
const MCPLogView: React.FC<{ logs: AgentLog[]; status: OrchestratorStatus; onSelect: (log: AgentLog) => void; selectedLog: AgentLog | null }> = ({ logs, status, onSelect, selectedLog }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Dynamic Header based on Orchestrator Status
  const getHeaderContent = () => {
    switch (status) {
        case 'BACKOFF_429':
            return {
                text: '[RATE LIMITED - COOLING DOWN]',
                color: 'text-[var(--status-warning)]',
                dot: 'bg-[var(--status-warning)]'
            };
        case 'RUNNING':
            return {
                text: '[LIVE ORCHESTRATION]',
                color: 'text-[var(--status-normal)]',
                dot: 'bg-[var(--status-normal)]'
            };
        case 'ERROR':
            return {
                text: '[SYSTEM FAULT]',
                color: 'text-[var(--status-critical)]',
                dot: 'bg-[var(--status-critical)]'
            };
        default:
            return {
                text: '[IDLE]',
                color: 'text-[var(--text-muted)]',
                dot: 'bg-[var(--text-muted)]'
            };
    }
  };

  const header = getHeaderContent();

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] rounded border border-[var(--border-muted)] overflow-hidden font-mono text-xs">
      <div className="px-3 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-muted)] flex justify-between items-center">
        <div className="flex items-center gap-2">
           <span className="text-[var(--text-secondary)] uppercase font-semibold">Swarm Uplink</span>
           <span className={`animate-pulse ${header.color} text-[10px] tracking-wide`}>{header.text}</span>
        </div>
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-full ${status === 'ERROR' ? 'animate-ping' : ''} bg-[var(--status-critical)]`}></div>
          <div className={`w-2 h-2 rounded-full ${status === 'BACKOFF_429' ? 'animate-ping' : ''} bg-[var(--status-warning)]`}></div>
          <div className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'animate-pulse' : ''} bg-[var(--status-normal)]`}></div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] opacity-50">
                <span className="animate-pulse">WAITING FOR ORCHESTRATOR...</span>
            </div>
        ) : (
            logs.map((log, index) => {
            let colorClass = "text-[var(--text-secondary)]";
            if (log.type === 'CRITICAL') colorClass = "text-[var(--status-critical)]";
            if (log.type === 'WARNING') colorClass = "text-[var(--status-warning)]";
            if (log.type === 'SUCCESS') colorClass = "text-[var(--status-normal)]";
            if (log.type === 'INFO') colorClass = "text-[var(--text-link)]";
            if (log.type === 'SYSTEM') colorClass = "text-[var(--text-muted)] text-[10px] opacity-60";

            const isSelected = selectedLog === log;

            return (
                <div 
                  key={index} 
                  onClick={() => log.type !== 'SYSTEM' && onSelect(log)}
                  className={`${colorClass} whitespace-nowrap cursor-pointer hover:bg-[var(--bg-hover)] px-1 -mx-1 rounded ${isSelected ? 'bg-[var(--bg-tertiary)] font-bold' : ''} ${log.type === 'SYSTEM' ? 'cursor-default pointer-events-none' : ''}`}
                >
                  <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                  <span>{log.source} -&gt; {log.target}: {log.message}</span>
                </div>
            );
            })
        )}
        {status === 'RUNNING' && logs.length > 0 && <div className="animate-pulse text-[var(--status-info)]">_</div>}
      </div>
    </div>
  );
};

// Insight Panel Component (Unchanged)
const InsightPanel: React.FC<{ log: AgentLog | null }> = ({ log }) => {
    if (!log) return (
        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-6 border border-[var(--border-muted)] border-dashed rounded bg-[var(--bg-secondary)]/50">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-50"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            <p className="text-sm">Select a log entry to view<br/>Strategic Analysis & Financial Impact</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <div className="text-6xl font-bold font-mono">{log.source}</div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-mono bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border-muted)] text-[var(--text-secondary)]">
                        {log.timestamp}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.type === 'CRITICAL' ? 'bg-[var(--status-critical)] text-white' : 'bg-[var(--status-info)] text-white'}`}>
                        {log.type}
                    </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    Executive Summary
                </h3>
                
                <div className="prose prose-sm text-[var(--text-secondary)] max-w-none mb-6 leading-relaxed border-l-2 border-[var(--status-info)] pl-4">
                    {log.analysis || "No deep analysis available for this node."}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-tertiary)] p-3 rounded border border-[var(--border-default)]">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Strategic Recommendation</div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                            {log.recommendation || "N/A"}
                        </div>
                    </div>
                    <div className="bg-[var(--bg-tertiary)] p-3 rounded border border-[var(--border-default)]">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Projected Impact</div>
                        <div className="text-sm font-mono font-bold text-[var(--status-normal)]">
                            {log.financial_impact || "Calculating..."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Agents: React.FC = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrchestratorStatus>('IDLE');
  const [selectedLog, setSelectedLog] = useState<AgentLog | null>(null);

  useEffect(() => {
    // 1. Subscribe to Status
    const unsubStatus = agentOrchestrator.subscribeStatus(setStatus);
    
    // 2. Subscribe to Logs
    const unsubLogs = agentOrchestrator.subscribeLogs((newLogs) => {
        setLogs(newLogs);
        
        // Visual: If a new log came in, highlight the agent
        const lastLog = newLogs[newLogs.length - 1];
        if (lastLog && lastLog.type !== 'SYSTEM') {
            setActiveAgentId(lastLog.source);
            setTimeout(() => {
               if (activeAgentId === lastLog.source) setActiveAgentId(lastLog.target);
            }, 600);
            
            // Clear highlighting after a bit
            setTimeout(() => {
               setActiveAgentId(null);
            }, 1500);
        }
    });

    return () => {
        unsubStatus();
        unsubLogs();
    };
  }, []);

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <header className="flex justify-between items-center mb-2 shrink-0">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Autonomous Agent Swarm</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Filter</Button>
          <Button variant="secondary" size="sm">Refresh</Button>
        </div>
      </header>

      {/* STATUS BAR */}
      <div className="flex justify-start items-center border p-4 rounded-lg transition-colors duration-500 shrink-0 mb-4 bg-[var(--bg-secondary)] border-[var(--border-default)]">
        <div className="flex gap-6 text-sm w-full">
           <div className="flex items-center gap-2">
             <span className="text-[var(--text-secondary)] uppercase tracking-wider text-xs">Active Agents</span>
             <span className="font-mono font-bold text-[var(--text-primary)]">{AGENT_LIST.length} Nodes</span>
           </div>
           <div className="w-px h-4 bg-[var(--border-muted)]"></div>
           <div className="flex items-center gap-2">
             <span className="text-[var(--text-secondary)] uppercase tracking-wider text-xs">Orchestrator</span>
             <span className={`font-mono font-bold ${status === 'BACKOFF_429' ? 'text-[var(--status-warning)]' : 'text-[var(--text-primary)]'}`}>
                {status === 'BACKOFF_429' ? 'RATE LIMIT - PAUSED' : 'OPTIMAL'}
             </span>
           </div>
           <div className="w-px h-4 bg-[var(--border-muted)]"></div>
           <div className="flex items-center gap-2 ml-auto">
             <span className="text-[var(--text-secondary)] uppercase tracking-wider text-xs">Workflow</span>
             <span className="font-mono font-bold text-[var(--text-link)]">WA → LF → GS → OP</span>
           </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT: NETWORK VISUALIZATION */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <Card title="Topology" className="flex-1">
              <AgentNetwork activeAgent={activeAgentId} />
           </Card>
           <Card title="Terminal Feed" className="h-[250px]">
             <MCPLogView 
                logs={logs} 
                status={status} 
                onSelect={setSelectedLog} 
                selectedLog={selectedLog}
             />
           </Card>
        </div>

        {/* RIGHT: STRATEGIC INSIGHT (The "McKinsey" View) */}
        <div className="lg:col-span-8 h-full">
           <Card title="Strategic Analysis & Reasoning Engine" className="h-full">
             <InsightPanel log={selectedLog || (logs.length > 0 ? logs.filter(l => l.type !== 'SYSTEM')[logs.filter(l => l.type !== 'SYSTEM').length-1] : null)} />
           </Card>
        </div>
      </div>
    </div>
  );
};
