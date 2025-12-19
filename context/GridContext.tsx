
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataServiceFactory';
import { genAiService } from '../services/genAiService';
import { agentOrchestrator } from '../services/agentOrchestrator';
import { GridStatus, MetricData, RiskTier } from '../types';

interface GridContextType {
  // Data State
  status: GridStatus;
  riskTier: RiskTier;
  loadMetric: MetricData | null;
  genMetric: MetricData | null;
  frequency: number | null;
  alerts: any[];
  weatherData: any[];
  lastUpdated: string;
  isLoading: boolean;
  isDemoMode: boolean;

  // Connection State
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'SIMULATION';
  connectionQuality: number; // 0-100%

  // Safety State (Global Interlocks)
  safetyState: {
    aiActuation: boolean;
    autoDispatch: boolean;
  };
  toggleSafety: (key: 'aiActuation' | 'autoDispatch') => void;

  // Actions
  refreshData: () => Promise<void>;
}

const GridContext = createContext<GridContextType | undefined>(undefined);

export const GridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core Data
  const [status, setStatus] = useState<GridStatus>(GridStatus.OFFLINE);
  const [riskTier, setRiskTier] = useState<RiskTier>(RiskTier.GREEN);
  const [loadMetric, setLoadMetric] = useState<MetricData | null>(null);
  const [genMetric, setGenMetric] = useState<MetricData | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any[]>([]);

  // Meta State
  const [lastUpdated, setLastUpdated] = useState<string>('--:--:--');
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'SIMULATION'>('DISCONNECTED');
  const [connectionQuality, setConnectionQuality] = useState(100);

  // Safety State
  const [safetyState, setSafetyState] = useState({
    aiActuation: true, // Corresponds to genAiService.safetyState.aiActuationEnabled
    autoDispatch: false // Default to manual for safety
  });

  const slowPollRef = useRef<number | null>(null);
  const fastPollRef = useRef<number | null>(null);

  // FAST LOOP: Frequency & Status (Critical Telemetry) - 4s
  const fetchFastTelemetry = async () => {
    try {
      const freq = await dataService.getGridFrequency();
      setFrequency(freq);

      const gridStatus = await dataService.getGridStatus();
      setStatus(gridStatus || GridStatus.OFFLINE);

      // Real-time Risk Tier Logic based on Frequency Deviation
      if (freq) {
        if (freq < 59.90 || freq > 60.10) setRiskTier(RiskTier.RED);
        else if (freq < 59.95 || freq > 60.05) setRiskTier(RiskTier.YELLOW);
        else if (gridStatus === GridStatus.CRITICAL) setRiskTier(RiskTier.RED);
        else setRiskTier(RiskTier.GREEN);
      }
    } catch (e) {
      // Silent fail on fast poll to avoid jitter
    }
  };

  // SLOW LOOP: Load, Gen, Weather (Heavy Data) - 60s
  const fetchSlowData = async () => {
    setIsLoading(true);
    const start = Date.now();
    const isDemo = localStorage.getItem('DEMO_MODE') === 'true';
    setIsDemoMode(isDemo);

    try {
      const [
        currentLoad,
        generation,
        activeAlerts,
        regionWeather
      ] = await Promise.all([
        dataService.getCurrentLoad(),
        dataService.getGeneration(),
        dataService.getAlerts(),
        dataService.getRegionalStatus()
      ]);

      // Latency Check
      const latency = Date.now() - start;
      setConnectionQuality(Math.max(0, 100 - (latency / 20)));

      setLoadMetric(currentLoad);
      setGenMetric(generation);
      setAlerts(activeAlerts);
      setWeatherData(Array.isArray(regionWeather) ? regionWeather : []);
      setLastUpdated(new Date().toLocaleTimeString());

      setConnectionStatus(isDemo ? 'SIMULATION' : (currentLoad ? 'CONNECTED' : 'DISCONNECTED'));

    } catch (e) {
      console.error("GridContext Slow Poll Failed", e);
      setConnectionStatus('RECONNECTING');
      setConnectionQuality(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync Safety State with Service
  const toggleSafety = (key: 'aiActuation' | 'autoDispatch') => {
    setSafetyState(prev => {
      const newState = !prev[key];
      if (key === 'aiActuation') {
        genAiService.safetyState.aiActuationEnabled = newState;
      }
      return { ...prev, [key]: newState };
    });
  };

  // Lifecycle
  useEffect(() => {
    // Initial Fetch
    fetchFastTelemetry();
    fetchSlowData();

    // Start Orchestrator (Background Process)
    if (localStorage.getItem('DEMO_MODE') === 'true' || genAiService.isAvailable) {
      agentOrchestrator.start();
    }

    // Set Timers
    fastPollRef.current = window.setInterval(fetchFastTelemetry, 4000); // 4s for Freq
    slowPollRef.current = window.setInterval(fetchSlowData, 60000);   // 60s for Load

    const handleConfigUpdate = () => { fetchFastTelemetry(); fetchSlowData(); agentOrchestrator.start(); };
    window.addEventListener('gridguard-config-updated', handleConfigUpdate);

    return () => {
      if (fastPollRef.current) clearInterval(fastPollRef.current);
      if (slowPollRef.current) clearInterval(slowPollRef.current);
      agentOrchestrator.stop(); // Stop agents on full app unmount
      window.removeEventListener('gridguard-config-updated', handleConfigUpdate);
    };
  }, []);

  return (
    <GridContext.Provider value={{
      status,
      riskTier,
      loadMetric,
      genMetric,
      frequency,
      alerts,
      weatherData,
      lastUpdated,
      isLoading,
      isDemoMode,
      connectionStatus,
      connectionQuality,
      safetyState,
      toggleSafety,
      refreshData: async () => { await fetchFastTelemetry(); await fetchSlowData(); }
    }}>
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = () => {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error('useGrid must be used within a GridProvider');
  }
  return context;
};
