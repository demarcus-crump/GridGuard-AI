// state.ts - Application state management

// Define interface for state data to avoid circular references
interface AppStateData {
  apiConnected: boolean;
  modelLoaded: boolean;
  gridStatus: any | null;
  forecast: any | null;
  agents: any | null;
  regions: any | null;
  alerts: any[];
  currentPage: string;
  sidebarCollapsed: boolean;
}

export class StateManager implements AppStateData {
  // Connection status
  apiConnected = false;
  modelLoaded = false;
  
  // Data (null = not loaded, undefined = loading)
  gridStatus: any | null = null;
  forecast: any | null = null;
  agents: any | null = null;
  regions: any | null = null;
  alerts: any[] = [];
  
  // UI state
  currentPage = 'dashboard';
  sidebarCollapsed = false;
  
  // Listeners
  private _listeners: ((state: StateManager) => void)[] = [];
  
  subscribe(fn: (state: StateManager) => void) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }
  
  update(changes: Partial<AppStateData>) {
    Object.assign(this, changes);
    this._listeners.forEach(fn => fn(this));
  }
}

export const state = new StateManager();