
import React, { useState, useEffect } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { genAiService } from '../services/genAiService';
import { auditService, AuditEntry } from '../services/auditService';

export const Reports: React.FC = () => {
   const activeTabState = useState<'BUILDER' | 'AUDIT'>('BUILDER');
   const activeTab = activeTabState[0];
   const setActiveTab = activeTabState[1];

   const [reportType, setReportType] = useState("Daily Summary");
   const [dateRange, setDateRange] = useState("Last 24 Hours");
   const [isGenerating, setIsGenerating] = useState(false);
   const [generationStep, setGenerationStep] = useState<string>("");
   const [generatedReport, setGeneratedReport] = useState<string | null>(null);
   const [logs, setLogs] = useState<AuditEntry[]>([]);

   // Refresh logs when tab opens
   useEffect(() => {
      if (activeTab === 'AUDIT') {
         setLogs(auditService.getLogs());
      }
   }, [activeTab]);

   const handleGenerate = async () => {
      setIsGenerating(true);
      setGeneratedReport(null);

      setGenerationStep("Analyzing Grid Telemetry & Open Data...");

      // Real call
      const text = await genAiService.generateReport({ type: reportType, range: dateRange });

      setIsGenerating(false);
      setGeneratedReport(text);
   };

   const resetView = () => {
      setGeneratedReport(null);
   };

   return (
      <div className="space-y-6">
         {/* HEADER: Reports [New Report] [Audit Log] */}
         <header className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Reports & Compliance</h2>
            <div className="flex gap-2">
               <Button variant={activeTab === 'BUILDER' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('BUILDER')}>Report Builder</Button>
               <Button variant={activeTab === 'AUDIT' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('AUDIT')}>Session Logs</Button>
            </div>
         </header>

         {activeTab === 'AUDIT' ? (
            <Card title="Session Activity Log (Local)" className="h-[600px]">
               <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center px-4 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-default)]">
                     <div className="flex gap-4 text-xs font-mono text-[var(--text-secondary)] items-center">
                        <span>STATUS: <span className="text-[var(--status-normal)]">ACTIVE</span></span>
                        <span>STORAGE: <span className="text-[var(--text-primary)]">BROWSER MEMORY</span></span>
                     </div>
                     <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="h-6 text-xs" onClick={() => alert("CSV Export requires backend connection.")}>Export CSV</Button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--bg-secondary)] sticky top-0">
                           <tr>
                              <th className="p-3 text-xs font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border-default)]">Timestamp</th>
                              <th className="p-3 text-xs font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border-default)]">Operator</th>
                              <th className="p-3 text-xs font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border-default)]">Action</th>
                              <th className="p-3 text-xs font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border-default)]">Resource</th>
                              <th className="p-3 text-xs font-semibold text-[var(--text-muted)] uppercase border-b border-[var(--border-default)]">Details</th>
                           </tr>
                        </thead>
                        <tbody className="font-mono text-xs text-[var(--text-primary)]">
                           {logs.map((row, i) => (
                              <tr key={i} className="border-b border-[var(--border-muted)] hover:bg-[var(--bg-hover)] transition-colors">
                                 <td className="p-3 text-[var(--text-secondary)]">{row.timestamp}</td>
                                 <td className="p-3">{row.operatorId}</td>
                                 <td className="p-3">
                                    <span className={`bg-[var(--bg-tertiary)] px-1 py-0.5 rounded border ${row.eventType.includes("REJECT") || row.eventType.includes("OVERRIDE") || row.eventType.includes("SAFETY") ? 'border-[var(--status-critical)] text-[var(--status-critical)]' :
                                          row.eventType.includes("APPROVAL") ? 'border-[var(--status-normal)] text-[var(--status-normal)]' :
                                             'border-[var(--border-default)]'
                                       }`}>
                                       {row.eventType}
                                    </span>
                                 </td>
                                 <td className="p-3 text-[var(--text-link)]">{row.resource}</td>
                                 <td className="p-3 text-[var(--text-muted)] truncate max-w-[200px]" title={row.details}>
                                    {row.details}
                                 </td>
                              </tr>
                           ))}
                           {logs.length === 0 && (
                              <tr>
                                 <td colSpan={5} className="p-8 text-center text-[var(--text-muted)] italic">
                                    No actions recorded in this session.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </Card>
         ) : (
            !generatedReport ? (
               <>
                  {/* REPORT BUILDER (Form View) */}
                  <Card title="Automated White Paper Generator">
                     <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-1">
                           <label htmlFor="report-type" className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Document Type</label>
                           <div className="relative">
                              <select
                                 id="report-type"
                                 value={reportType}
                                 onChange={(e) => setReportType(e.target.value)}
                                 className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:border-[var(--border-emphasis)] focus:ring-1 focus:ring-[var(--border-emphasis)] cursor-pointer"
                              >
                                 <option>Daily Grid Operations White Paper</option>
                                 <option>Weekly Variance Analysis</option>
                                 <option>Critical Incident Post-Mortem</option>
                                 <option>NERC CIP Compliance Audit</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                              </div>
                           </div>
                        </div>
                        <div className="flex-1 w-full space-y-1">
                           <label htmlFor="date-range" className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Data Horizon</label>
                           <div className="relative">
                              <select
                                 id="date-range"
                                 value={dateRange}
                                 onChange={(e) => setDateRange(e.target.value)}
                                 className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:border-[var(--border-emphasis)] focus:ring-1 focus:ring-[var(--border-emphasis)] cursor-pointer"
                              >
                                 <option>Last 24 Hours</option>
                                 <option>Last 7 Days</option>
                                 <option>Last 30 Days</option>
                                 <option>Custom Range...</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                              </div>
                           </div>
                        </div>
                        <div className="w-32 space-y-1">
                           <label htmlFor="format" className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Format</label>
                           <div id="format" className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded text-sm text-[var(--text-secondary)] flex justify-between items-center opacity-70 cursor-not-allowed">
                              MD/PDF
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                           </div>
                        </div>
                        <Button
                           variant="primary"
                           className="w-full md:w-auto min-w-[120px]"
                           onClick={handleGenerate}
                           disabled={isGenerating}
                        >
                           {isGenerating ? "ANALYZING..." : "COMPILE REPORT"}
                        </Button>
                     </div>

                     {/* Progress Indicator for "Automated Analyst" */}
                     {isGenerating && (
                        <div className="mt-4 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-muted)] rounded flex items-center gap-3 animate-in fade-in">
                           <div className="relative w-4 h-4">
                              <div className="absolute inset-0 border-2 border-[var(--status-info)] border-t-transparent rounded-full animate-spin"></div>
                           </div>
                           <span className="text-xs font-mono text-[var(--status-info)]">{generationStep}</span>
                        </div>
                     )}
                  </Card>

                  {/* TEMPLATES & RECENTS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card title="Quick Templates">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <button onClick={() => setReportType("Daily Grid Operations White Paper")} className="text-left p-3 border border-[var(--border-default)] rounded hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)]">
                              <div className="font-semibold text-[var(--text-primary)]">Daily Ops White Paper</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">Full system telemetry analysis</div>
                           </button>
                           <button onClick={() => setReportType("Weekly Variance Analysis")} className="text-left p-3 border border-[var(--border-default)] rounded hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)]">
                              <div className="font-semibold text-[var(--text-primary)]">Weekly Variance</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">Load vs Forecast Delta</div>
                           </button>
                           <button onClick={() => setReportType("NERC CIP Compliance Audit")} className="text-left p-3 border border-[var(--border-default)] rounded hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)]">
                              <div className="font-semibold text-[var(--text-primary)]">Compliance Audit</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">Security & Access Logs</div>
                           </button>
                           <button onClick={() => setReportType("Critical Incident Post-Mortem")} className="text-left p-3 border border-[var(--border-default)] rounded hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)]">
                              <div className="font-semibold text-[var(--text-primary)]">Incident Post-Mortem</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">Root Cause Analysis (RCA)</div>
                           </button>
                        </div>
                     </Card>
                     <Card title="Recent Archives" isEmpty={true} emptyMessage="No reports in archive" />
                  </div>
               </>
            ) : (
               /* GENERATED REPORT VIEW (Paper Mode) */
               <div className="w-full bg-white text-black p-8 rounded shadow-lg min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                  <div className="absolute top-4 right-4 flex gap-2 print:hidden">
                     <Button variant="secondary" size="sm" className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300" onClick={() => window.print()}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Print / Save PDF
                     </Button>
                     <Button variant="ghost" size="sm" onClick={resetView} className="text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                        Close
                     </Button>
                  </div>

                  <div className="max-w-3xl mx-auto font-serif">
                     <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                        <div>
                           <h1 className="text-2xl font-bold uppercase tracking-wide">GridGuard AI</h1>
                           <p className="text-xs font-mono uppercase text-gray-600">Automated Intelligence Division</p>
                        </div>
                        <div className="text-right text-xs font-mono">
                           <p>ID: {Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
                           <p>DATE: {new Date().toLocaleDateString()}</p>
                        </div>
                     </div>

                     <div className="prose prose-sm max-w-none whitespace-pre-line font-serif leading-relaxed">
                        {generatedReport}
                     </div>

                     <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-500 font-mono">
                        <p>CONFIDENTIAL // ERCOT INTERNAL USE ONLY</p>
                        <p>Generated by Gemini 3 Pro (Automated Analyst)</p>
                     </div>
                  </div>
               </div>
            )
         )}
      </div>
   );
};
