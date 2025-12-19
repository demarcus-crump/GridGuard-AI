
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { genAiService } from '../../services/genAiService';
import { auditService } from '../../services/auditService';
import { knowledgeService } from '../../services/knowledgeService';
import { notificationService } from '../../services/notificationService';

interface ModelCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'RISK' | 'CONTROLS' | 'CONSTITUTION'>('RISK');
  const [safetyState, setSafetyState] = useState(genAiService.safetyState);
  const [knowledgeItems, setKnowledgeItems] = useState(knowledgeService.getKnowledgeBase());

  useEffect(() => {
    if (isOpen) {
        // Sync state when opening
        setSafetyState({ ...genAiService.safetyState });
        setKnowledgeItems(knowledgeService.getKnowledgeBase());
    }
  }, [isOpen]);

  const toggleSwitch = (key: keyof typeof genAiService.safetyState, label: string) => {
    const newState = genAiService.toggleKillSwitch(key);
    setSafetyState(prev => ({ ...prev, [key]: newState }));
    
    if (newState) {
        notificationService.info("System Override", `${label} Enabled.`);
    } else {
        notificationService.warning("System Override", `${label} Disabled. Manual control engaged.`);
    }
  };

  const handleDownloadNist = () => {
      const artifact = auditService.generateNistArtifact();
      const blob = new Blob([artifact], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NIST_AI_RMF_ARTIFACT_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notificationService.success("Compliance Export", "NIST AI RMF 1.0 Artifact generated successfully.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-muted)] flex justify-between items-center bg-[var(--bg-tertiary)] shrink-0">
          <div>
            <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-[var(--text-primary)]">Governance & Control Console</h2>
               <span className="bg-[var(--status-info)] text-[var(--text-inverse)] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">NIST AI RMF 1.0</span>
               <span className="bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase">EO 14110</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">SECURE ADMIN TERMINAL // ID: SYS-ADMIN-01</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-muted)] bg-[var(--bg-primary)]">
            <button 
                onClick={() => setActiveTab('RISK')}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'RISK' ? 'border-[var(--status-info)] text-[var(--text-primary)] bg-[var(--bg-secondary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                Risk & Provenance (Map/Measure)
            </button>
            <button 
                onClick={() => setActiveTab('CONTROLS')}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'CONTROLS' ? 'border-[var(--status-critical)] text-[var(--text-primary)] bg-[var(--bg-secondary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                Safety Interlocks (Kill Switches)
            </button>
            <button 
                onClick={() => setActiveTab('CONSTITUTION')}
                className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'CONSTITUTION' ? 'border-[var(--status-normal)] text-[var(--text-primary)] bg-[var(--bg-secondary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
                Constitution & Audit (Govern)
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-[var(--bg-secondary)]">
          
          {/* TAB 1: RISK & PROVENANCE (NIST: MAP & MEASURE) */}
          {activeTab === 'RISK' && (
             <div className="space-y-6 animate-in fade-in">
                
                {/* TEVV SCORECARD */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase flex items-center gap-2 border-b border-[var(--border-muted)] pb-2">
                        <span className="text-[var(--status-info)]">1. TEVV Scorecard</span> 
                        <span className="text-[var(--text-secondary)] text-xs font-normal normal-case ml-auto">Test, Evaluation, Verification, Validation</span>
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: "Robustness", score: "99.2%", grade: "A", color: "text-[var(--status-normal)]" },
                            { label: "Fairness", score: "PASS", grade: "N/A", color: "text-[var(--status-info)]" },
                            { label: "Interpretability", score: "HIGH", grade: "CoT", color: "text-[var(--status-normal)]" },
                            { label: "Privacy", score: "100%", grade: "A+", color: "text-[var(--status-normal)]" },
                        ].map((metric, i) => (
                            <div key={i} className="bg-[var(--bg-primary)] p-4 rounded border border-[var(--border-default)] flex flex-col items-center justify-center text-center shadow-sm">
                                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{metric.label}</div>
                                <div className={`text-2xl font-bold font-mono ${metric.color}`}>{metric.score}</div>
                                <div className="text-[9px] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded mt-2 border border-[var(--border-muted)]">{metric.grade}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DATA PROVENANCE MAP */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase flex items-center gap-2 border-b border-[var(--border-muted)] pb-2">
                        <span className="text-[var(--status-warning)]">2. Data Lineage (Map)</span> 
                        <span className="text-[var(--text-secondary)] text-xs font-normal normal-case ml-auto">Traceability & Source</span>
                    </h3>
                    <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded p-4">
                        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-4 font-mono">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> TRUSTED SOURCE</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> RAG INJECTION</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full"></div> INFERENCE ENGINE</span>
                        </div>
                        <div className="relative h-32 w-full border border-dashed border-[var(--border-muted)] rounded bg-[var(--bg-tertiary)] flex items-center justify-around">
                            {/* Source Nodes */}
                            <div className="flex flex-col gap-2">
                                <div className="px-3 py-1 bg-blue-900/30 border border-blue-500 text-blue-400 text-[10px] rounded">GridStatus.io API</div>
                                <div className="px-3 py-1 bg-blue-900/30 border border-blue-500 text-blue-400 text-[10px] rounded">NWS Weather</div>
                            </div>
                            <div className="w-12 h-px bg-[var(--border-emphasis)]"></div>
                            {/* RAG Node */}
                            <div className="flex flex-col items-center">
                                <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-500 text-yellow-400 text-[10px] rounded font-bold mb-1">Knowledge Base</div>
                                <span className="text-[8px] text-[var(--text-muted)]">{knowledgeItems.length} Docs Active</span>
                            </div>
                            <div className="w-12 h-px bg-[var(--border-emphasis)]"></div>
                            {/* Model Node */}
                            <div className="px-4 py-3 bg-purple-900/30 border border-purple-500 text-purple-400 text-xs rounded font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                Gemini 3 Pro
                            </div>
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* TAB 2: OVERRIDE CONTROLS (Safety Switches) */}
          {activeTab === 'CONTROLS' && (
             <div className="space-y-6 animate-in fade-in">
                <div className="p-4 bg-[var(--status-critical-muted)] border border-[var(--status-critical)] rounded flex items-center gap-3">
                   <div className="p-2 bg-[var(--status-critical)] text-white rounded-full">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                   </div>
                   <div>
                      <h4 className="text-sm font-bold text-[var(--status-critical)]">EMERGENCY INTERVENTION</h4>
                      <p className="text-xs text-[var(--text-primary)]">Disabling these systems will revert grid management to manual legacy protocols.</p>
                   </div>
                </div>

                <div className="space-y-4">
                   {/* SWITCH 1: AI ACTUATION */}
                   <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded">
                      <div>
                         <h4 className="text-sm font-bold text-[var(--text-primary)]">AI Actuation Layer</h4>
                         <p className="text-xs text-[var(--text-secondary)] mt-1">Allows the LLM to generate responses and suggestions.</p>
                      </div>
                      <button 
                        onClick={() => toggleSwitch('aiActuationEnabled', 'AI Actuation')}
                        className={`w-14 h-7 rounded-full p-1 transition-colors ${safetyState.aiActuationEnabled ? 'bg-[var(--status-normal)]' : 'bg-[var(--border-default)]'}`}
                      >
                         <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${safetyState.aiActuationEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                      </button>
                   </div>

                   {/* SWITCH 2: TOOL SANDBOX */}
                   <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded">
                      <div>
                         <h4 className="text-sm font-bold text-[var(--text-primary)]">Agent Sandbox</h4>
                         <p className="text-xs text-[var(--text-secondary)] mt-1">Allows AI to execute external tools (e.g. get_metrics, dispatch).</p>
                      </div>
                      <button 
                        onClick={() => toggleSwitch('externalToolsEnabled', 'Agent Sandbox')}
                        className={`w-14 h-7 rounded-full p-1 transition-colors ${safetyState.externalToolsEnabled ? 'bg-[var(--status-normal)]' : 'bg-[var(--border-default)]'}`}
                      >
                         <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${safetyState.externalToolsEnabled ? 'translate-x-7' : 'translate-x-0'}`}></div>
                      </button>
                   </div>

                   {/* SWITCH 3: SAFE MODE (Fail Safe) */}
                   <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded">
                      <div>
                         <h4 className="text-sm font-bold text-[var(--text-primary)]">Safe Mode (Heuristic Only)</h4>
                         <p className="text-xs text-[var(--text-secondary)] mt-1">Bypasses LLM entirely. Uses rigid code-based logic only.</p>
                      </div>
                      <button 
                        onClick={() => toggleSwitch('safeMode', 'Safe Mode')}
                        className={`w-14 h-7 rounded-full p-1 transition-colors ${safetyState.safeMode ? 'bg-[var(--status-critical)]' : 'bg-[var(--border-default)]'}`}
                      >
                         <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${safetyState.safeMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                      </button>
                   </div>
                </div>
             </div>
          )}

          {/* TAB 3: CONSTITUTION (Transparency) */}
          {activeTab === 'CONSTITUTION' && (
             <div className="space-y-6 animate-in fade-in h-full flex flex-col">
                <div className="p-4 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Federal Audit Log</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Export current session data for NIST AI RMF 1.0 compliance review.</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleDownloadNist}>
                        EXPORT ARTIFACT (JSON)
                    </Button>
                </div>

                <div className="flex-1 flex flex-col mt-2">
                   <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase mb-2">System Instruction (Prompt)</h3>
                   <div className="flex-1 bg-black p-4 rounded border border-[var(--border-muted)] overflow-y-auto font-mono text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                      {genAiService.SYSTEM_INSTRUCTION}
                   </div>
                </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-muted)] flex justify-between items-center bg-[var(--bg-tertiary)] shrink-0">
          <div className="text-[10px] text-[var(--text-muted)]">
            Reference: <a href="https://ai.gov/nist-ai-rmf/" target="_blank" className="text-[var(--text-link)] hover:underline">ai.gov/nist-ai-rmf</a>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close Console
          </Button>
        </div>
      </div>
    </div>
  );
};
