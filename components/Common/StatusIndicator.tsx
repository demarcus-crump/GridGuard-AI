import React from 'react';
import { GridStatus } from '../../types';

interface StatusIndicatorProps {
  status: GridStatus;
  showLabel?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, showLabel = true }) => {
  const getStyles = (s: GridStatus) => {
    switch (s) {
      case GridStatus.NORMAL:
        return { dot: 'bg-[var(--status-normal)] shadow-[0_0_8px_var(--status-normal-muted)]', text: 'text-[var(--status-normal)]' };
      case GridStatus.WARNING:
        return { dot: 'bg-[var(--status-warning)] animate-pulse', text: 'text-[var(--status-warning)]' };
      case GridStatus.CRITICAL:
        return { dot: 'bg-[var(--status-critical)] animate-pulse', text: 'text-[var(--status-critical)]' };
      case GridStatus.OFFLINE:
        return { dot: 'bg-[var(--status-offline)]', text: 'text-[var(--status-offline)]' };
      default:
        return { dot: 'bg-[var(--status-info)]', text: 'text-[var(--status-info)]' };
    }
  };

  const styles = getStyles(status);

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
      {showLabel && (
        <span className={`text-xs font-medium uppercase tracking-wider ${styles.text}`}>
          {status}
        </span>
      )}
    </div>
  );
};
