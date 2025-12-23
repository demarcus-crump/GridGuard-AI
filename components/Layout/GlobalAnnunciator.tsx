
import React from 'react';
import { useGrid } from '../../context/GridContext';
import { RiskTier } from '../../types';

export const GlobalAnnunciator: React.FC = () => {
  const { riskTier, alerts, status } = useGrid();

  // Only show if RED tier or Critical alerts exist
  if (riskTier !== RiskTier.RED && alerts.length === 0) return null;

  return (
    <div className="bg-[var(--status-critical)] text-white px-4 py-2 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300 relative z-[60]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 animate-pulse font-bold">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
           <span>CRITICAL GRID CONDITION</span>
        </div>
        <div className="h-6 w-px bg-white/30"></div>
        <div className="text-sm font-mono flex gap-4">
           {riskTier === RiskTier.RED && <span>RISK TIER: RED (ACTIVATE DR)</span>}
           {alerts.length > 0 && <span>NWS ALERTS: {alerts.length} ACTIVE</span>}
        </div>
      </div>
      <button className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors">
         ACKNOWLEDGE
      </button>
    </div>
  );
};
