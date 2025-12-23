
import React from 'react';
import { Skeleton } from './Skeleton';
import { Button } from './Button';

interface CardProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  status?: 'default' | 'warning' | 'critical';
  isEmpty?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  onConfigure?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  action,
  className = '',
  status = 'default',
  isEmpty = false,
  isLoading = false,
  emptyMessage = "Connect to ERCOT API to view data",
  emptyTitle = "No Data Available",
  onConfigure
}) => {
  const statusBorders = {
    default: 'border-[var(--border-default)]',
    warning: 'border-[var(--status-warning)] border-l-4',
    critical: 'border-[var(--status-critical)] border-l-4 shadow-[var(--shadow-glow-critical)]'
  };

  return (
    <div className={`bg-[var(--bg-secondary)] border rounded-lg overflow-hidden flex flex-col ${statusBorders[status]} ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-muted)] shrink-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            {title}
          </h3>
          {action && <div>{action}</div>}
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col relative min-h-0">
        {isLoading ? (
          <div className="space-y-4 w-full h-full min-h-[100px] flex flex-col">
            {/* Intelligent Skeleton loading */}
            <div className="flex gap-4">
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="20%" />
            </div>
            <Skeleton variant="rect" className="flex-1 min-h-[60px]" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 px-4">
            <svg className="w-12 h-12 text-[var(--text-muted)] mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <p className="text-[var(--text-primary)] font-medium mb-1">{emptyTitle}</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">{emptyMessage}</p>
            <Button variant="secondary" size="sm" onClick={onConfigure}>
              Configure API
            </Button>
            {/* Hidden children to maintain potential layout flow if needed */}
            <div className="hidden">{children}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
