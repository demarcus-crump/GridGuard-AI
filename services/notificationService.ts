
type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type Listener = (toasts: ToastMessage[]) => void;

class NotificationService {
  private toasts: ToastMessage[] = [];
  private listeners: Listener[] = [];

  public subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.toasts));
  }

  public add(type: ToastType, title: string, message?: string, duration = 5000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, title, message, duration };
    
    this.toasts = [...this.toasts, toast];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  public remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  // Shortcuts
  public error(title: string, message?: string) { this.add('error', title, message); }
  public success(title: string, message?: string) { this.add('success', title, message); }
  public warning(title: string, message?: string) { this.add('warning', title, message); }
  public info(title: string, message?: string) { this.add('info', title, message); }
}

export const notificationService = new NotificationService();
