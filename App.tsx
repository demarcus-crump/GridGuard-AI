
import React, { useState } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Analytics } from './pages/Analytics';
import { Historical } from './pages/Historical';
import { Scenarios } from './pages/Scenarios';
import { Reports } from './pages/Reports';
import { Insights } from './pages/Insights';
import { Login } from './pages/Login';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { DigitalTwin } from './pages/DigitalTwin';
import { MapErrorBoundary } from './components/MapErrorBoundary';
import { AuditLog } from './pages/AuditLog';
import { CyberSim } from './pages/CyberSim';
import { Research } from './pages/Research';
import { Governance } from './pages/Governance';
import { ChatWidget } from './components/Chat/ChatWidget';
import { ToastContainer } from './components/Common/Toast';
import { CommandPalette } from './components/Common/CommandPalette';
import { GlobalAnnunciator } from './components/Layout/GlobalAnnunciator';
import { ROUTES } from './constants';
import { GridProvider } from './context/GridContext';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col relative">

      {/* Global Alarm Banner (Top of Stack) */}
      {!isLoginPage && <GlobalAnnunciator />}

      <div className="flex flex-1 min-h-0">
        {!isLoginPage && (
          <Sidebar
            isMobileOpen={isMobileNavOpen}
            onMobileClose={() => setIsMobileNavOpen(false)}
          />
        )}

        {/* Mobile Header (Only visible on small screens when not on login) */}
        {!isLoginPage && (
          <div className="fixed top-0 left-0 right-0 h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center px-4 lg:hidden z-30">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <span className="ml-3 font-bold text-lg">GridGuard AI</span>
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={`
            flex-1 overflow-y-auto transition-all duration-300 ease-in-out
            ${!isLoginPage ? 'lg:ml-64 p-4 md:p-8 pt-20 lg:pt-8' : 'w-full'}
            `}
        >
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.INSIGHTS} element={<Insights />} />
              <Route path={ROUTES.RECON} element={<MapErrorBoundary><DigitalTwin /></MapErrorBoundary>} />
              <Route path={ROUTES.AGENTS} element={<Agents />} />
              <Route path={ROUTES.KNOWLEDGE} element={<KnowledgeBase />} />
              <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
              <Route path={ROUTES.HISTORICAL} element={<Historical />} />
              <Route path={ROUTES.SCENARIOS} element={<Scenarios />} />
              <Route path={ROUTES.REPORTS} element={<Reports />} />
              <Route path={ROUTES.AUDIT} element={<AuditLog />} />
              <Route path={ROUTES.CYBERSIM} element={<CyberSim />} />
              <Route path={ROUTES.RESEARCH} element={<Research />} />
              <Route path={ROUTES.GOVERNANCE} element={<Governance />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Global Overlays */}
      {!isLoginPage && <ChatWidget />}
      {!isLoginPage && <CommandPalette />}
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GridProvider>
      <MemoryRouter initialEntries={['/login']}>
        <AppContent />
      </MemoryRouter>
    </GridProvider>
  );
};

export default App;
