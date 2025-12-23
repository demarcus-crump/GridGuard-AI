
import React, { useEffect, useState } from 'react';
import { notificationService, ToastMessage } from '../../services/notificationService';

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  // Styles based on type
  const typeStyles = {
    success: 'border-[var(--status-normal)] bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
    error: 'border-[var(--status-critical)] bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
    warning: 'border-[var(--status-warning)] bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
    info: 'border-[var(--status-info)] bg-[var(--status-info-muted)] text-[var(--status-info)]'
  };

  const icons = {
    success: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    error: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    warning: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
  };

  return (
    <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-full ${typeStyles[toast.type]}`}>
      <div className="p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1">
          <p className="text-sm font-bold uppercase tracking-wide">{toast.title}</p>
          {toast.message && <p className="mt-1 text-xs opacity-90 font-mono leading-relaxed">{toast.message}</p>}
        </div>
        <button onClick={() => onDismiss(toast.id)} className="shrink-0 text-current opacity-70 hover:opacity-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return notificationService.subscribe((currentToasts) => {
      setToasts(currentToasts);
    });
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={(id) => notificationService.remove(id)} />
      ))}
    </div>
  );
};
