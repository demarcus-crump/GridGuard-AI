
import React from 'react';
import { Button } from '../Common/Button';

interface SystemManifestModalProps {
   isOpen: boolean;
   onClose: () => void;
}

export const SystemManifestModal: React.FC<SystemManifestModalProps> = ({ isOpen, onClose }) => {
   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
         <div className="bg-[#0D1117] border border-[var(--border-default)] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="p-6 border-b border-[var(--border-muted)] bg-[var(--bg-secondary)] flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">System Manifest</h2>
                     <span className="bg-[var(--status-info-muted)] border border-[var(--status-info)] text-[var(--status-info)] text-[10px] px-2 py-0.5 rounded uppercase font-mono">
                        v3.0.0
                     </span>
                     <span className="bg-[var(--bg-tertiary)] border border-[var(--border-muted)] text-[var(--text-secondary)] text-[10px] px-2 py-0.5 rounded uppercase font-mono">
                        UNCLASSIFIED // PROTOTYPE
                     </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
                     GridGuard AI is a High-Fidelity Decision Support System (DSS) aligned with <strong>NIST AI RMF 1.0</strong>. It augments human operators, not replaces them.
                  </p>
               </div>
               <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
               </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-primary)]">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* WHAT IT IS */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 pb-2 border-b border-[var(--status-normal)]">
                        <div className="w-2 h-2 bg-[var(--status-normal)] rounded-full"></div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Operational Capabilities (IS)</h3>
                     </div>

                     <ul className="space-y-4">
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--text-primary)] text-sm">Decision Support System (DSS)</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Aggregates complex telemetry (Weather, Load, Market) into actionable strategies for human review.</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--text-primary)] text-sm">Physics-Informed AI</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Chain-of-Thought reasoning rooted in thermodynamics and grid physics (60Hz stability).</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--text-primary)] text-sm">NIST AI RMF 1.0 Compliance</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">91% aligned with GOVERN, MAP, MEASURE, MANAGE functions. Includes bias testing, drift detection, and hallucination checking.</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--text-primary)] text-sm">Agentic Orchestrator</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Multi-agent swarm with role-based analysis (Meteorologist → Load Forecaster → Dispatcher).</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--text-primary)] text-sm">Cyber Resilience Training</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">SCADA, DDoS, and Ransomware attack simulations for operator readiness.</p>
                           </div>
                        </li>
                     </ul>
                  </div>

                  {/* WHAT IT IS NOT */}
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 pb-2 border-b border-[var(--status-critical)]">
                        <div className="w-2 h-2 bg-[var(--status-critical)] rounded-full"></div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">System Boundaries (IS NOT)</h3>
                     </div>

                     <ul className="space-y-4">
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--status-critical)] text-sm">NOT a SCADA Actuator</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Does not have direct kinetic control over breakers, transformers, or generation units.</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--status-critical)] text-sm">NOT a "Black Box" Oracle</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Requires reasoning (CoT) and citations for every recommendation. Hallucinations are flagged.</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--status-critical)] text-sm">NOT Autonomous (Level 5)</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Requires "Human-in-the-Loop" (HITL) for all critical dispatch commands.</p>
                           </div>
                        </li>
                        <li className="flex gap-3">
                           <div className="mt-1 min-w-[4px] h-[4px] bg-[var(--text-secondary)] rounded-full"></div>
                           <div>
                              <strong className="text-[var(--status-critical)] text-sm">NOT Biased by Demographics</strong>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Load shedding based on criticality (hospitals first), not zip code. Bias testing: 90%+ pass rate.</p>
                           </div>
                        </li>
                     </ul>
                  </div>

               </div>

               {/* Compliance Footer */}
               <div className="mt-6 pt-4 border-t border-[var(--border-muted)] grid grid-cols-4 gap-4 text-center">
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                     <div className="text-xs text-[var(--text-muted)]">GOVERN</div>
                     <div className="text-lg font-bold text-[var(--status-normal)]">90%</div>
                  </div>
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                     <div className="text-xs text-[var(--text-muted)]">MAP</div>
                     <div className="text-lg font-bold text-[var(--status-normal)]">85%</div>
                  </div>
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                     <div className="text-xs text-[var(--text-muted)]">MEASURE</div>
                     <div className="text-lg font-bold text-[var(--status-normal)]">95%</div>
                  </div>
                  <div className="p-2 bg-[var(--bg-tertiary)] rounded">
                     <div className="text-xs text-[var(--text-muted)]">MANAGE</div>
                     <div className="text-lg font-bold text-[var(--status-normal)]">95%</div>
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-muted)] bg-[var(--bg-tertiary)] flex justify-between items-center">
               <div className="text-[10px] font-mono text-[var(--text-muted)]">
                  ID: MANIFEST-2025-V3 | NIST AI RMF 1.0 | NERC CIP
               </div>
               <Button variant="primary" onClick={onClose}>
                  Acknowledge & Close
               </Button>
            </div>

         </div>
      </div>
   );
};
