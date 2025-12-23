
import React from 'react';
import { REGIONS } from '../../constants';
import { GridStatus } from '../../types';

interface GridMapProps {
  data?: any[]; // [{ region: 'north', temp: 95 }, ...]
  gridStatus?: GridStatus;
}

export const GridMap: React.FC<GridMapProps> = ({ data, gridStatus }) => {
  // 1. Color Logic based on Temperature (NWS Data)
  const getRegionFill = (regionId: string) => {
    // Default color (Neutral/Offline)
    if (!data || data.length === 0) return "var(--bg-tertiary)";

    const regionData = data.find((d: any) => d.region === regionId);

    // If we have data, visualize the HEAT
    if (regionData) {
      const t = regionData.temp;
      if (t >= 100) return "#DA3633"; // Critical Red
      if (t >= 90) return "#D29922";  // Warning Orange
      if (t >= 80) return "#E3B341";  // Yellow
      if (t <= 32) return "#58A6FF";  // Freeze Blue
      return "#238636";               // Normal Green
    }

    return "var(--bg-tertiary)";
  };

  const getRegionOpacity = (regionId: string) => {
    if (!data || data.length === 0) return 0.5;
    const regionData = data.find((d: any) => d.region === regionId);
    return regionData ? 0.8 : 0.3;
  };

  return (
    <div className="relative w-full h-full bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex items-center justify-center p-4">

      {/* SVG Container */}
      <svg
        viewBox="0 0 300 320"
        className="w-full h-full drop-shadow-xl"
        style={{ filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.5))' }}
      >
        <defs>
          <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
            {/* Changed stroke from hardcoded white to variable for Light Mode support */}
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--border-muted)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Render Each Region */}
        {REGIONS.map((region) => {
          const fillColor = getRegionFill(region.id);
          const regionData = data?.find((d: any) => d.region === region.id);

          return (
            <g key={region.id} className="transition-all duration-500 hover:opacity-100 group">
              {/* Region Shape */}
              <path
                d={region.path}
                fill={fillColor}
                fillOpacity={getRegionOpacity(region.id)}
                stroke="var(--border-default)"
                strokeWidth="1"
                className="cursor-pointer hover:stroke-[var(--text-primary)] hover:stroke-2"
              />

              {/* Pattern Overlay for texture */}
              <path d={region.path} fill="url(#grid-pattern)" pointerEvents="none" />

              {/* Region Label & Data */}
              <foreignObject x={region.cx - 40} y={region.cy - 20} width="80" height="60" pointerEvents="none">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] font-mono uppercase tracking-widest text-[var(--text-primary)] bg-[var(--bg-tertiary)]/80 px-1 rounded backdrop-blur-sm mb-0.5 border border-[var(--border-muted)]">
                    {region.name.split(' ')[0]}
                  </span>
                  {regionData ? (
                    <span className="text-xs font-bold text-white drop-shadow-md">
                      {regionData.temp}°{regionData.unit}
                    </span>
                  ) : (
                    <span className="text-[8px] text-[var(--text-muted)]">--</span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Legend / Overlay */}
      <div className="absolute bottom-8 right-4 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--border-muted)] p-3 rounded-lg shadow-lg">
        <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-2">Regional Thermal Load</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#DA3633]"></div>
            <span className="text-[10px] text-[var(--text-primary)]">Critical (&gt;100°F)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#D29922]"></div>
            <span className="text-[10px] text-[var(--text-primary)]">Warning (90-99°F)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#238636]"></div>
            <span className="text-[10px] text-[var(--text-primary)]">Nominal (&lt;90°F)</span>
          </div>
        </div>
        {!data || data.length === 0 && (
          <div className="mt-2 pt-2 border-t border-[var(--border-muted)] text-[9px] text-[var(--status-warning)]">
            Live NWS Data Pending...
          </div>
        )}
      </div>
    </div>
  );
};
