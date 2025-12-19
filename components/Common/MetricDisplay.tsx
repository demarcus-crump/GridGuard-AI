import React from 'react';
import { Skeleton } from './Skeleton';

interface MetricDisplayProps {
  label: string;
  value?: string | number | null;
  unit?: string;
  change?: number;
  isLoading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  consensusScore?: number; // 0 to 1, representing Von Neumann's "Majority Vote" reliability
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  unit = '',
  change,
  isLoading = false,
  trend = 'neutral',
  className = '',
  consensusScore = 0.98 // Default high reliability
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  // Visualizing Puzzle 5: Reliable Systems from Unreliable Parts
  // We show a "Signal Strength" bar to indicate that this metric is a consensus of multiple sensors
  const renderConsensusBar = () => {
    const bars = 5;
    const filled = Math.round(consensusScore * bars);
    return (
      <div className="flex gap-0.5 ml-2 items-end h-3" title={`Signal Quality: ${(consensusScore * 100).toFixed(0)}% Consensus`}>
        {[...Array(bars)].map((_, i) => (
          <div 
            key={i} 
            className={`w-1 rounded-sm ${i < filled ? 'bg-[var(--status-normal)]' : 'bg-[var(--bg-tertiary)]'}`}
            style={{ height: `${60 + (i * 10)}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          {label}
        </span>
        {/* Signal Quality Indicator (The Von Neumann Reliability Check) */}
        {!isLoading && value && renderConsensusBar()}
      </div>
      
      <div className="flex items-baseline gap-2">
        {isLoading ? (
          <Skeleton width={120} height={32} className="my-1" />
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-mono font-semibold text-[var(--text-primary)]">
              {value ?? '--'}
            </span>
            <span className="text-sm font-mono text-[var(--text-muted)]">
              {unit}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center mt-2 h-5">
        {isLoading ? (
          <Skeleton width={60} height={16} />
        ) : change !== undefined ? (
          <div className={`flex items-center text-xs font-mono font-medium ${
            isPositive ? 'text-[var(--status-normal)]' : 
            isNegative ? 'text-[var(--status-warning)]' : 
            'text-[var(--text-muted)]'
          }`}>
            <span className="mr-1">
              {isPositive ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              ) : isNegative ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              )}
            </span>
            {Math.abs(change)}%
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)] italic">No trend data</span>
        )}
      </div>
    </div>
  );
};