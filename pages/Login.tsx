
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Common/Button';
import { ROUTES } from '../constants';
import { genAiService } from '../services/genAiService';
import { liveService } from '../services/liveService';
import { agentOrchestrator } from '../services/agentOrchestrator';
import { API_CONFIG } from '../services/apiConfig'; 
import { SystemManifestModal } from '../components/Layout/SystemManifestModal';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  
  const [gridKey, setGridKey] = useState('');
  const [eiaKey, setEiaKey] = useState('');
  const [ercotKey, setErcotKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDemoHovered, setIsDemoHovered] = useState(false);
  
  // Manifest Modal State
  const [isManifestOpen, setIsManifestOpen] = useState(false);

  // Auto-typing boot sequence for the right side visual only
  const [bootSequence, setBootSequence] = useState<string[]>([]);

  useEffect(() => {
    // PRE-FILL KEYS IF HARDCODED IN CONFIG
    if (API_CONFIG.GRID_STATUS_KEY) setGridKey(API_CONFIG.GRID_STATUS_KEY);
    if (API_CONFIG.EIA_KEY) setEiaKey(API_CONFIG.EIA_KEY);
    if (API_CONFIG.ERCOT_API_KEY) setErcotKey(API_CONFIG.ERCOT_API_KEY);
    if (API_CONFIG.GOOGLE_API_KEY) setAiKey(API_CONFIG.GOOGLE_API_KEY);

    // Boot Sequence Animation
    const sequence = [
      "ESTABLISHING SECURE UPLINK...",
      "VERIFYING TLS 1.3 HANDSHAKE...",
      "LOADING NEURAL WEIGHTS (GEMINI-3-PRO)...",
      "CHECKING NERC CIP COMPLIANCE...",
      "SYSTEM READY."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setBootSequence(prev => [...prev, sequence[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const enableDemoMode = () => {
      localStorage.setItem('DEMO_MODE', 'true');
      setAccessCode('DEMO_ACCESS_GRANTED');
      performLogin('demo');
  };

  const autoFillSafe = () => {
      setGridKey('SIMULATED_GRID_KEY');
      setEiaKey('SIMULATED_EIA_KEY');
      setAiKey('SIMULATED_GEMINI_KEY');
      localStorage.setItem('DEMO_MODE', 'true');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gridKey.includes('SIMULATED')) {
        localStorage.setItem('DEMO_MODE', 'true');
        performLogin('demo');
    } else {
        localStorage.removeItem('DEMO_MODE');
        performLogin('normal');
    }
  };

  const performLogin = (mode: 'normal' | 'demo') => {
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (mode === 'normal' && accessCode && accessCode !== 'admin') {
        setError('ACCESS DENIED: INVALID AUTHORIZATION CODE.');
        setIsLoading(false);
        return;
      }

      if (mode === 'normal') {
        // Only save to localStorage if NOT hardcoded to avoid redundant storage
        if (gridKey && gridKey !== API_CONFIG.GRID_STATUS_KEY) localStorage.setItem('GRID_STATUS_KEY', gridKey);
        if (eiaKey && eiaKey !== API_CONFIG.EIA_KEY) localStorage.setItem('EIA_KEY', eiaKey);
        if (ercotKey && ercotKey !== API_CONFIG.ERCOT_API_KEY) localStorage.setItem('ERCOT_API_KEY', ercotKey);
        if (aiKey && aiKey !== API_CONFIG.GOOGLE_API_KEY) localStorage.setItem('GOOGLE_API_KEY', aiKey);
      }

      genAiService.updateKey();
      liveService.updateKey();
      agentOrchestrator.updateKey();

      navigate(ROUTES.DASHBOARD);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#05090e] text-[var(--text-primary)] flex relative overflow-hidden font-sans">
      
      {/* Background Tech Mesh */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(88, 166, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(88, 166, 255, 0.1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#05090e] via-transparent to-[#05090e] z-0"></div>

      {/* LEFT SIDE: THE MISSION BRIEFING */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 z-10 relative border-r border-[var(--border-muted)] bg-[#05090e]/60 backdrop-blur-sm">
        <div className="flex flex-col h-full relative">
           <div className="mb-12 shrink-0">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                GRIDGUARD AI
              </h1>
           </div>
           
           <h2 className="text-5xl font-extrabold tracking-tight leading-tight mb-8 shrink-0">
             Cognitive Grid Defense & <br/>Management.
           </h2>
           
           <p className="text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed mb-12 shrink-0">
             Unified Command & Control. Fusing <strong>Physics-Informed AI</strong> with Real-Time Economic Dispatch (SCED) to secure North American infrastructure against kinetic and cybernetic threats.
           </p>

           {/* Features List */}
           <div className="space-y-8 shrink-0 z-10">
              <div className="flex gap-5 group">
                 <div className="mt-1 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-[var(--status-info)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--status-info)]"><path d="M12 5v14M5 12h14"></path></svg>
                    </div>
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">Predictive Resilience (N-1)</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">Automated contingency analysis and load forecasting to prevent cascading failures.</p>
                 </div>
              </div>

              <div className="flex gap-5 group">
                 <div className="mt-1 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-[var(--status-normal)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--status-normal)]"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    </div>
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">Market & Asset Optimization</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">Real-time arbitrage and peak shaving to reduce operational costs.</p>
                 </div>
              </div>

              <div className="flex gap-5 group">
                 <div className="mt-1 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center border border-[var(--status-critical)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--status-critical)]">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                    </div>
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)] mb-1">Active Defense & Compliance</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">Continuous NERC CIP monitoring with automated threat isolation protocols.</p>
                 </div>
              </div>
           </div>

           <div className="mt-auto pt-8 border-t border-[var(--border-muted)] flex items-start justify-between opacity-60">
              <div className="flex items-start gap-12">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider">Authorized For</span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">CUI / FEDRAMP HIGH</span>
                </div>
                <div className="w-px h-8 bg-[var(--border-muted)]"></div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider">Protocol</span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">TLS 1.3 / FIPS 140-2</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsManifestOpen(true)}
                className="flex items-center gap-2 text-xs font-mono text-[var(--text-link)] hover:text-white transition-colors border border-[var(--text-link)] px-3 py-1.5 rounded hover:bg-[var(--text-link)] hover:border-transparent"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                SYSTEM MANIFEST
              </button>
           </div>
        </div>
      </div>

      {/* RIGHT SIDE: THE SECURE TERMINAL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md space-y-6">
           
           <div className="lg:hidden text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">GridGuard AI</h1>
              <p className="text-sm text-[var(--text-secondary)]">Critical Infrastructure Defense Platform</p>
              <button onClick={() => setIsManifestOpen(true)} className="mt-4 text-xs text-[var(--text-link)] underline">View System Capabilities</button>
           </div>

           <div className="bg-[#0D1117] border border-[var(--border-default)] rounded-lg shadow-2xl p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--status-info-muted)] to-transparent opacity-0 group-hover:opacity-1 pointer-events-none translate-y-[-100%] group-hover:animate-[scan_2s_linear_infinite]" style={{ height: '50%' }}></div>

              <div className="flex justify-between items-center mb-6">
                 <div className="text-[10px] font-mono text-[var(--status-info)] border border-[var(--status-info)] px-2 py-0.5 rounded bg-[var(--status-info-muted)] uppercase tracking-wider">
                   Secure Gateway
                 </div>
                 <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--status-critical)] animate-pulse"></div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">MONITORED</span>
                 </div>
              </div>

              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">Identify</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6">Enter secure credentials to access the control plane.</p>

              <form onSubmit={handleLogin} className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider">Access Code</label>
                    <input 
                      type="password"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="w-full bg-[#05090e] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-3 rounded text-sm font-mono focus:outline-none focus:border-[var(--status-info)] focus:ring-1 focus:ring-[var(--status-info)] transition-all"
                      placeholder="••••••••••••"
                      autoFocus
                    />
                 </div>

                 <div className="pt-4 border-t border-[var(--border-muted)]">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] tracking-wider">API Configuration (Optional)</span>
                       <button type="button" onClick={autoFillSafe} className="text-[10px] text-[var(--text-link)] hover:underline font-mono">
                          [Auto-Fill Demo Keys]
                       </button>
                    </div>
                    {/* KEY INPUTS - HIDDEN IF HARDCODED TO REDUCE CLUTTER, BUT SHOWN IF EMPTY */}
                    {(!API_CONFIG.GRID_STATUS_KEY || !API_CONFIG.GOOGLE_API_KEY) && (
                        <div className="grid grid-cols-1 gap-3">
                        <input 
                            type="password"
                            value={gridKey}
                            onChange={(e) => setGridKey(e.target.value)}
                            placeholder="GridStatus.io API Key"
                            className="w-full bg-[#05090e] border border-[var(--border-default)] text-[var(--text-secondary)] px-3 py-2 rounded text-xs font-mono focus:outline-none focus:border-[var(--border-emphasis)]"
                        />
                        <input 
                            type="password"
                            value={aiKey}
                            onChange={(e) => setAiKey(e.target.value)}
                            placeholder="Google Gemini API Key"
                            className="w-full bg-[#05090e] border border-[var(--border-default)] text-[var(--text-secondary)] px-3 py-2 rounded text-xs font-mono focus:outline-none focus:border-[var(--border-emphasis)]"
                        />
                        </div>
                    )}
                    {(API_CONFIG.GRID_STATUS_KEY && API_CONFIG.GOOGLE_API_KEY) && (
                        <div className="text-[10px] text-[var(--status-success)] font-mono border border-[var(--status-success-muted)] p-2 rounded bg-[var(--status-success-muted)]/10">
                            ✓ SYSTEM KEYS PRE-LOADED VIA CONFIG
                        </div>
                    )}
                 </div>

                 {error && (
                    <div className="p-3 bg-[var(--status-critical-muted)] border border-[var(--status-critical)] rounded text-[var(--status-critical)] text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                       {error}
                    </div>
                 )}

                 <Button 
                   variant="secondary" 
                   className="w-full py-2 text-sm tracking-widest font-mono"
                   disabled={isLoading}
                 >
                   {isLoading ? "VERIFYING CREDENTIALS..." : "INITIATE SESSION"}
                 </Button>
              </form>
              
              {/* Boot Sequence Visual */}
              <div className="mt-6 p-3 bg-black rounded border border-[var(--border-muted)] h-24 overflow-hidden font-mono text-[10px] text-[var(--status-success)] opacity-60">
                 {bootSequence.map((line, i) => (
                    <div key={i} className="mb-1">{`> ${line}`}</div>
                 ))}
                 <div className="animate-pulse">_</div>
              </div>
           </div>

           {/* DEMO MODE BUTTON */}
           <button 
             onClick={enableDemoMode}
             onMouseEnter={() => setIsDemoHovered(true)}
             onMouseLeave={() => setIsDemoHovered(false)}
             className={`w-full group relative overflow-hidden rounded-lg p-4 border transition-all duration-300 ${isDemoHovered ? 'bg-[var(--status-info)] border-[var(--status-info)]' : 'bg-[var(--bg-secondary)] border-[var(--border-muted)]'}`}
           >
             <div className="flex items-center justify-between relative z-10">
               <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${isDemoHovered ? 'bg-white text-[var(--status-info)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                  <div className="text-left">
                     <div className={`font-bold text-sm ${isDemoHovered ? 'text-white' : 'text-[var(--text-primary)]'}`}>ENTER DEMO MODE (SIMULATION)</div>
                     <div className={`text-xs ${isDemoHovered ? 'text-white/80' : 'text-[var(--text-secondary)]'}`}>Load high-fidelity synthetic data (No API Keys required)</div>
                  </div>
               </div>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDemoHovered ? 'white' : 'var(--text-muted)'} strokeWidth="2" className={`transition-transform duration-300 ${isDemoHovered ? 'translate-x-1' : ''}`}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
             </div>
             <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] transition-transform duration-1000 ${isDemoHovered ? 'animate-[shimmer_1.5s_infinite]' : ''}`}></div>
           </button>
        </div>
      </div>

      <SystemManifestModal isOpen={isManifestOpen} onClose={() => setIsManifestOpen(false)} />
    </div>
  );
};
