
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category: 'NAVIGATION' | 'SYSTEM' | 'ACTION';
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dash', label: 'Go to Dashboard', category: 'NAVIGATION', action: () => navigate(ROUTES.DASHBOARD) },
    { id: 'nav-agents', label: 'Go to Agents Swarm', category: 'NAVIGATION', action: () => navigate(ROUTES.AGENTS) },
    { id: 'nav-analytics', label: 'Go to Analytics', category: 'NAVIGATION', action: () => navigate(ROUTES.ANALYTICS) },
    { id: 'nav-hist', label: 'Go to Historical Data', category: 'NAVIGATION', action: () => navigate(ROUTES.HISTORICAL) },
    { id: 'nav-sim', label: 'Go to Simulator', category: 'NAVIGATION', action: () => navigate(ROUTES.SCENARIOS) },
    { id: 'nav-reports', label: 'Go to Reports', category: 'NAVIGATION', action: () => navigate(ROUTES.REPORTS) },
    
    // System
    { id: 'sys-logout', label: 'Log Out / Lock Terminal', category: 'SYSTEM', action: () => navigate('/login') },
    
    // Actions (Mock)
    { id: 'act-alert', label: 'System: Clear All Alerts', category: 'ACTION', action: () => alert('Alerts cleared') },
    { id: 'act-export', label: 'System: Export Logs (CSV)', category: 'ACTION', action: () => alert('Export started...') },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen]);

  const execute = (cmd: Command) => {
    cmd.action();
    setIsOpen(false);
    setQuery('');
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        execute(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-muted)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] mr-3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm font-medium"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleListKeyDown}
          />
          <div className="flex items-center gap-1">
             <span className="text-[10px] font-mono bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">ESC</span>
          </div>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto py-2">
           {filteredCommands.length === 0 ? (
             <div className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">No commands found.</div>
           ) : (
             filteredCommands.map((cmd, idx) => (
               <button
                 key={cmd.id}
                 onClick={() => execute(cmd)}
                 onMouseEnter={() => setSelectedIndex(idx)}
                 className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${idx === selectedIndex ? 'bg-[var(--status-info-muted)] border-l-2 border-[var(--status-info)]' : 'border-l-2 border-transparent hover:bg-[var(--bg-hover)]'}`}
               >
                 <div className="flex items-center gap-3">
                    <span className={`text-xs uppercase tracking-wider font-bold ${idx === selectedIndex ? 'text-[var(--status-info)]' : 'text-[var(--text-muted)]'}`}>{cmd.category}</span>
                    <span className={`text-sm ${idx === selectedIndex ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{cmd.label}</span>
                 </div>
                 {idx === selectedIndex && (
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--status-info)]"><polyline points="9 18 15 12 9 6"></polyline></svg>
                 )}
               </button>
             ))
           )}
        </div>
        
        <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-muted)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
           <span>GridGuard AI</span>
           <div className="flex gap-3">
             <span>Use ↑↓ to navigate</span>
             <span>↵ to select</span>
           </div>
        </div>
      </div>
    </div>
  );
};
