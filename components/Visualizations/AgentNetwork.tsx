
import React from 'react';
import { AGENT_LIST } from '../../constants';

interface AgentNetworkProps {
  activeAgent?: string | null; // ID of the agent currently "speaking"
}

export const AgentNetwork: React.FC<AgentNetworkProps> = ({ activeAgent }) => {
  // Center: Comms Manager (CM)
  // Inner Ring (Tier 2): Core Analysis (LF, WA, GS, AM)
  // Outer Ring (Tier 3): Execution/Support (Rest)

  const width = 800;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;
  
  const innerRadius = 120;
  const outerRadius = 220;

  // Helper to place nodes in circle
  const getPosition = (index: number, total: number, radius: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start at top
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  const cmNode = AGENT_LIST.find(a => a.id === 'CM');
  const tier2Nodes = AGENT_LIST.filter(a => ['LF', 'WA', 'GS', 'AM'].includes(a.id));
  const tier3Nodes = AGENT_LIST.filter(a => !['CM', 'LF', 'WA', 'GS', 'AM'].includes(a.id));

  const isActive = (id: string) => activeAgent === id;

  return (
    <div className="relative w-full h-[400px] bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex items-center justify-center border border-[var(--border-muted)]">
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full absolute inset-0">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="active-glow" x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="8" result="blur" />
             <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Connections Layer (Background) */}
        <g className="opacity-20 stroke-[var(--border-emphasis)] stroke-[1px] stroke-dasharray-[4,4]">
           {/* CM to Tier 2 */}
           {tier2Nodes.map((node, i) => {
             const pos = getPosition(i, tier2Nodes.length, innerRadius);
             const activeLink = isActive('CM') || isActive(node.id);
             return (
               <line 
                  key={`l2-${i}`} 
                  x1={centerX} y1={centerY} x2={pos.x} y2={pos.y} 
                  className={`transition-all duration-300 ${activeLink ? 'stroke-[var(--status-info)] stroke-[2px] opacity-100' : ''}`}
               />
             );
           })}
           {/* Tier 2 to Tier 3 (Simplified: Connect nearest) */}
           {tier3Nodes.map((node, i) => {
             const pos = getPosition(i, tier3Nodes.length, outerRadius);
             const activeLink = isActive(node.id); // Simplified logic
             return (
               <line 
                 key={`l3-${i}`} x1={centerX} y1={centerY} x2={pos.x} y2={pos.y} 
                 className={`opacity-50 transition-all duration-300 ${activeLink ? 'stroke-[var(--status-info)] stroke-[2px] opacity-100' : ''}`} 
               />
             );
           })}
        </g>

        {/* Nodes Layer */}
        
        {/* Tier 3: Support */}
        {tier3Nodes.map((agent, i) => {
          const pos = getPosition(i, tier3Nodes.length, outerRadius);
          const active = isActive(agent.id);
          return (
            <g key={agent.id} transform={`translate(${pos.x}, ${pos.y})`}>
              {active && <circle r="28" className="fill-[var(--status-info)]/20 animate-ping" />}
              <circle 
                r="18" 
                className={`transition-colors duration-300 ${active ? 'fill-[var(--status-info)] stroke-[var(--text-inverse)]' : 'fill-[var(--bg-tertiary)] stroke-[var(--border-muted)]'} stroke-2`} 
              />
              <text dy="4" textAnchor="middle" className={`text-[10px] font-mono font-bold pointer-events-none ${active ? 'fill-[var(--text-inverse)]' : 'fill-[var(--text-muted)]'}`}>{agent.id}</text>
            </g>
          );
        })}

        {/* Tier 2: Core */}
        {tier2Nodes.map((agent, i) => {
          const pos = getPosition(i, tier2Nodes.length, innerRadius);
          const active = isActive(agent.id);
          return (
             <g key={agent.id} transform={`translate(${pos.x}, ${pos.y})`}>
              {active && <circle r="34" className="fill-[var(--text-link)]/20 animate-ping" />}
              <circle 
                r="22" 
                className={`transition-colors duration-300 ${active ? 'fill-[var(--text-link)] stroke-white' : 'fill-[var(--bg-secondary)] stroke-[var(--text-link)]'} stroke-2`} 
              />
              <text dy="5" textAnchor="middle" className={`text-[12px] font-mono font-bold pointer-events-none ${active ? 'fill-white' : 'fill-[var(--text-link)]'}`}>{agent.id}</text>
            </g>
          );
        })}

        {/* Tier 1: Center (CM) */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {isActive('CM') && <circle r="40" className="fill-[var(--status-info)]/30 animate-pulse" />}
          <circle r="30" className="fill-[var(--bg-primary)] stroke-[var(--status-info)] stroke-[3px]" filter="url(#glow)" />
          <text dy="6" textAnchor="middle" className="text-[14px] fill-[var(--text-primary)] font-mono font-bold">CM</text>
        </g>
      </svg>

      {/* Empty State Overlay */}
      {!activeAgent && (
        <div className="absolute inset-0 bg-[var(--bg-primary)]/10 backdrop-blur-[0px] pointer-events-none flex flex-col items-center justify-center p-6 text-center z-10 opacity-0 transition-opacity">
           {/* Can be used for "Offline" state if needed */}
        </div>
      )}
    </div>
  );
};
