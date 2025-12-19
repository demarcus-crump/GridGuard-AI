
import React, { useState, useRef } from 'react';
import { Card } from '../components/Common/Card';
import { Button } from '../components/Common/Button';
import { knowledgeService, KnowledgeItem } from '../services/knowledgeService';

export const KnowledgeBase: React.FC = () => {
  const [items, setItems] = useState<KnowledgeItem[]>(knowledgeService.getKnowledgeBase());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshList = () => {
    setItems([...knowledgeService.getKnowledgeBase()]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        await knowledgeService.ingestFile(e.dataTransfer.files[i]);
      }
      refreshList();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        for (let i = 0; i < e.target.files.length; i++) {
          await knowledgeService.ingestFile(e.target.files[i]);
        }
        refreshList();
    }
  };

  const handleDelete = (id: string) => {
    knowledgeService.deleteItem(id);
    refreshList();
  };

  return (
    <div className="space-y-6">
       <header className="flex justify-between items-center mb-2">
         <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Knowledge Injection</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Upload CSVs, Logs, or PDFs to Enable Agentic RAG.</p>
         </div>
         <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
               UPLOAD DATA
            </Button>
         </div>
       </header>

       <input 
         type="file" 
         ref={fileInputRef} 
         className="hidden" 
         multiple 
         accept=".csv,.txt,.json,.md"
         onChange={handleFileSelect}
       />

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* UPLOAD ZONE */}
          <div className="lg:col-span-1">
             <div 
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}
               className={`h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center transition-all ${isDragging ? 'border-[var(--status-info)] bg-[var(--status-info-muted)]' : 'border-[var(--border-default)] bg-[var(--bg-secondary)]'}`}
             >
                <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <h3 className="font-bold text-[var(--text-primary)]">Drop Knowledge Here</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-2 mb-4">
                   Upload Historical Load Data (CSV), Maintenance Logs (TXT), or Incident Reports.
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">
                   Supported: CSV, JSON, TXT
                </p>
             </div>
             
             <div className="mt-6 p-4 bg-[var(--bg-tertiary)] rounded border border-[var(--border-muted)]">
                <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase mb-2">How it works</h4>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                   <li className="flex gap-2">
                      <span className="text-[var(--status-info)]">1.</span>
                      <span><strong>Ingest:</strong> Files are parsed and stored in memory.</span>
                   </li>
                   <li className="flex gap-2">
                      <span className="text-[var(--status-info)]">2.</span>
                      <span><strong>Context Window:</strong> Data is injected into the Gemini 3 Pro prompt window (up to 2M tokens).</span>
                   </li>
                   <li className="flex gap-2">
                      <span className="text-[var(--status-info)]">3.</span>
                      <span><strong>Agentic RAG:</strong> Agents query this data before making any decisions.</span>
                   </li>
                </ul>
             </div>
          </div>

          {/* ACTIVE KNOWLEDGE LIST */}
          <div className="lg:col-span-2">
             <Card title="Active Context (In-Memory)">
                {items.length === 0 ? (
                   <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                      <span>No Active Knowledge Base</span>
                      <span className="text-xs">Agents are using default training data only.</span>
                   </div>
                ) : (
                   <div className="space-y-3">
                      {items.map(item => (
                         <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded hover:border-[var(--status-info)] transition-colors group">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
                                  {item.type}
                               </div>
                               <div>
                                  <div className="font-bold text-sm text-[var(--text-primary)]">{item.name}</div>
                                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                                     {(item.size / 1024).toFixed(1)} KB • Uploaded {item.uploadDate}
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className="text-[10px] text-[var(--status-normal)] font-bold bg-[var(--status-normal-muted)] px-2 py-1 rounded">
                                  ACTIVE
                               </span>
                               <button 
                                 onClick={() => handleDelete(item.id)}
                                 className="text-[var(--text-muted)] hover:text-[var(--status-critical)] p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </Card>
          </div>
       </div>
    </div>
  );
};
