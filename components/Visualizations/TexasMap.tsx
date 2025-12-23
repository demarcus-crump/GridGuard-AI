import React from 'react';
import { REGIONS } from '../../constants';

interface TexasMapProps {
  data?: any; // Expecting { region: 'north', temp: 95, ... } from NWS
}

export const TexasMap: React.FC<TexasMapProps> = ({ data }) => {
  // Stylized ERCOT Weather Zones aligned with requested regions
  const regionPaths = {
    west: "M 50 150 L 200 150 L 200 400 L 120 350 L 50 250 Z",
    north: "M 200 50 L 450 50 L 450 180 L 200 180 Z",
    austin: "M 200 180 L 400 180 L 350 400 L 200 400 Z", 
    houston: "M 400 180 L 520 180 L 520 350 L 350 400 Z", 
    east: "M 450 50 L 550 50 L 550 180 L 450 180 Z" 
  };

  return (
    <div className="relative w-full h-full min-h-[300px] bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex items-center justify-center">
      
      {/* Map Layer */}
      <svg viewBox="0 0 600 500" className={`w-full h-full absolute inset-0 transition-opacity duration-500`}>
        <g transform="translate(0, 0)">
          {REGIONS.map((region) => {
             const path = regionPaths[region.id as keyof typeof regionPaths] || "M0 0";
             // If data exists and matches region (simplified for North example), highlight it
             const hasData = data && region.id === data.region;
             
             return (
              <g key={region.id} className="group">
                <path 
                  d={path} 
                  fill={hasData ? "var(--bg-hover)" : "var(--bg-tertiary)"} 
                  stroke="var(--border-default)" 
                  strokeWidth="1.5"
                  className="transition-colors duration-300 group-hover:fill-[var(--bg-hover)]"
                />
                {/* Region Node Placeholder */}
                <circle 
                  cx={region.cx} 
                  cy={region.cy} 
                  r={8} 
                  fill={hasData ? "var(--status-normal)" : "var(--bg-secondary)"}
                  stroke={hasData ? "var(--status-normal-emphasis)" : "var(--border-default)"}
                  strokeWidth="2"
                  className="group-hover:stroke-[var(--text-link)]" 
                />
                <text 
                  x={region.cx} 
                  y={region.cy + 24} 
                  textAnchor="middle" 
                  className="text-[10px] fill-[var(--text-muted)] font-mono uppercase tracking-widest pointer-events-none font-bold"
                >
                  {region.name}
                </text>
                
                {/* Data Label Overlay (If available) */}
                {hasData && (
                  <text x={region.cx} y={region.cy - 15} textAnchor="middle" className="text-[10px] fill-[var(--text-primary)] font-mono font-bold bg-black">
                    {data.temp}°{data.unit}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      
      {!data && (
        <div className="absolute bottom-4 right-4 bg-[var(--bg-tertiary)] px-3 py-1 rounded text-[10px] text-[var(--text-muted)] border border-[var(--border-muted)]">
           Live Weather Data: Disconnected
        </div>
      )}
    </div>
  );
};