
import React, { useState, useEffect } from 'react';
import { NavRoute } from '../../types';
import { ROUTES } from '../../constants';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SettingsModal } from './SettingsModal';
import { useGrid } from '../../context/GridContext';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Icons = {
  Dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9"></rect>
      <rect x="14" y="3" width="7" height="5"></rect>
      <rect x="14" y="12" width="7" height="9"></rect>
      <rect x="3" y="16" width="7" height="5"></rect>
    </svg>
  ),
  Insights: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
  ),
  Agents: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
      <rect x="9" y="9" width="6" height="6"></rect>
      <line x1="9" y1="1" x2="9" y2="4"></line>
      <line x1="15" y1="1" x2="15" y2="4"></line>
      <line x1="9" y1="20" x2="9" y2="23"></line>
      <line x1="15" y1="20" x2="15" y2="23"></line>
      <line x1="20" y1="9" x2="23" y2="9"></line>
      <line x1="20" y1="14" x2="23" y2="14"></line>
      <line x1="1" y1="9" x2="4" y2="9"></line>
      <line x1="1" y1="14" x2="4" y2="14"></line>
    </svg>
  ),
  Analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  ),
  Historical: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  Scenarios: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  ),
  Reports: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Knowledge: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
      <path d="M12 6l-4 4h3v4h2v-4h3l-4-4z"></path>
      <line x1="12" y1="14" x2="12" y2="18"></line>
    </svg>
  ),
  Recon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h20"></path>
      <path d="M12 2v20"></path>
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="4"></circle>
    </svg>
  ),
  Audit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="M9 12l2 2 4-4"></path>
    </svg>
  ),
  CyberSim: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="M12 8v4"></path>
      <path d="M12 16h.01"></path>
    </svg>
  ),
  Research: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="M21 21l-4.35-4.35"></path>
      <path d="M11 8v6"></path>
      <path d="M8 11h6"></path>
    </svg>
  ),
  Governance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
      <path d="m9 12 2 2 4-4"></path>
    </svg>
  )
};

const navItems: NavRoute[] = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: Icons.Dashboard },
  { path: ROUTES.RECON, label: 'Grid Recon (3D)', icon: Icons.Recon },
  { path: ROUTES.INSIGHTS, label: 'Insights', icon: Icons.Insights },
  { path: ROUTES.AGENTS, label: 'Orchestrator', icon: Icons.Agents },
  { path: ROUTES.KNOWLEDGE, label: 'Knowledge Base', icon: Icons.Knowledge },
  { path: ROUTES.RESEARCH, label: 'Research', icon: Icons.Research },
  { path: ROUTES.ANALYTICS, label: 'Analytics', icon: Icons.Analytics },
  { path: ROUTES.HISTORICAL, label: 'Historical', icon: Icons.Historical },
  { path: ROUTES.SCENARIOS, label: 'Scenarios', icon: Icons.Scenarios },
  { path: ROUTES.REPORTS, label: 'Reports', icon: Icons.Reports },
  { path: ROUTES.AUDIT, label: 'Audit Trail', icon: Icons.Audit },
  { path: ROUTES.CYBERSIM, label: 'Cyber Sim', icon: Icons.CyberSim },
  { path: ROUTES.GOVERNANCE, label: 'Governance', icon: Icons.Governance },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use Global Grid Context
  const { safetyState, toggleSafety, connectionStatus } = useGrid();

  // Initialize from LocalStorage, or default to Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('THEME_MODE');

    // Priority 1: User's explicit saved preference
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      return false;
    }
    if (saved === 'dark') {
      return true;
    }

    // Priority 2: Default to Dark Mode (professional mission control aesthetic)
    return true;
  });


  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('THEME_MODE', 'light');
      setIsDarkMode(false);
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('THEME_MODE', 'dark');
      setIsDarkMode(true);
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  if (location.pathname === '/login') return null;

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 left-0 w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-default)] flex flex-col z-50 transition-transform duration-300 ease-in-out
          lg:translate-x-0 
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-muted)]">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg tracking-tight font-sans text-[var(--text-primary)]">GridGuard AI</h1>
            {localStorage.getItem('DEMO_MODE') === 'true' && (
              <span className="bg-[var(--status-warning)] text-black text-[8px] font-bold px-1.5 py-0.5 rounded uppercase animate-pulse">
                DEMO
              </span>
            )}
          </div>
          <button onClick={onMobileClose} className="lg:hidden text-[var(--text-secondary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-emphasis)] focus-visible:ring-inset ${isActive
                  ? 'bg-[var(--bg-active)] text-[var(--text-link)] border-l-2 border-[var(--status-info)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                  }`}
              >
                <span className={`mr-3 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* SAFETY INTERLOCK DISPLAY (Critical HCI Requirement) */}
        <div className="px-4 pb-2">
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-muted)] rounded p-2 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Safety Interlocks</span>
              <div className={`w-2 h-2 rounded-full ${safetyState.aiActuation ? 'bg-[var(--status-normal)]' : 'bg-[var(--status-critical)] animate-pulse'}`}></div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-primary)]">
              <span>AI Actuation</span>
              <span className={`font-mono font-bold ${safetyState.aiActuation ? 'text-[var(--status-normal)]' : 'text-[var(--status-critical)]'}`}>
                {safetyState.aiActuation ? 'ARMED' : 'DISABLED'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border-muted)]" role="contentinfo" aria-label="System Status">
          <div className="flex flex-col gap-3 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-[var(--status-normal)]' : connectionStatus === 'SIMULATION' ? 'bg-[var(--status-info)]' : 'bg-[var(--status-warning)]'}`}></div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[100px]">{connectionStatus}</span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors border border-[var(--border-muted)]"
              >
                {isDarkMode ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                )}
              </button>
            </div>

            <button
              onClick={() => { setIsSettingsOpen(true); onMobileClose?.(); }}
              className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--status-info)] transition-colors text-left"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              SYSTEM CONFIG
            </button>

            <button
              onClick={() => { navigate('/login'); onMobileClose?.(); }}
              className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--status-critical)] transition-colors text-left"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              DISCONNECT
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono opacity-50 mt-2">
            Stable Shell (Active)
          </div>
        </div>
      </aside>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
