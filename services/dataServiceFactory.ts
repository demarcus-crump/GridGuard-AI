
/**
 * dataServiceFactory.ts
 * 
 * Factory that returns the appropriate data service based on mode.
 * 
 * COMMERCIAL ARCHITECTURE:
 * - Demo service is DYNAMICALLY imported only when needed
 * - Production builds will tree-shake the demo module entirely
 * - This prevents contamination of production bundles
 */

import { apiService } from './apiService';
import { GridStatus, MetricData, CongestionZone } from '../types';

// ============================================================================
// DATA SERVICE INTERFACE (The Contract)
// ============================================================================
// TYPES
// ============================================================================

export interface PowerAsset {
    lon: number;
    lat: number;
    name: string;
    type: 'wind' | 'solar' | 'gas' | 'nuclear' | 'hydro' | 'coal' | 'battery';
    capacity: string;
    status: 'online' | 'offline' | 'maintenance';
    desc: string;
}

export interface DataService {
    getGridStatus: () => Promise<GridStatus | null>;
    getGridFrequency: () => Promise<number | null>;
    getCurrentLoad: () => Promise<MetricData | null>;
    getGeneration: () => Promise<MetricData | null>;
    getFuelMix: () => Promise<Record<string, number> | null>;
    getMarketPrices: () => Promise<Array<{ time: string; value: number; hub: string }>>;
    getForecast: (currentLoad?: number) => Promise<Array<{ time: string; actual: number; forecast: number }>>;
    getRegionalStatus: () => Promise<Array<{ region: string; temp: number; unit: string }>>;
    getAlerts: () => Promise<Array<{ event: string; headline: string }>>;
    getMarketNews: () => Promise<Array<{ title: string; source: string; url: string }>>;
    getInterconnectionQueue: () => Promise<{ totalGW: number; pending: number } | null>;
    getSolarData: () => Promise<{ sunrise: string; sunset: string }>;
    getHistorical: (start?: string, end?: string) => Promise<any>;
    getActiveWildfires: () => Promise<Array<{ lat: number; lon: number; confidence: string; brightness: number; acq_date: string }>>;
    getCommercialOpportunities: () => Promise<any[]>;
    getRestrictedZones: () => Promise<any[]>;
    getAgriculturalData: () => Promise<any[]>;
    getCongestionData: () => Promise<CongestionZone[]>;
    getGridNodes: () => Promise<PowerAsset[]>;
}

// ============================================================================
// MODE DETECTION
// ============================================================================

const isDemoMode = (): boolean => {
    return localStorage.getItem('DEMO_MODE') === 'true';
};

// ============================================================================
// DYNAMIC IMPORT FIREWALL
// ============================================================================

/**
 * Cached demo service instance (lazy loaded)
 * Only populated when demo mode is activated
 */
let cachedDemoService: DataService | null = null;

/**
 * Asynchronously get the appropriate data service based on current mode.
 * 
 * CRITICAL: This function uses dynamic import() for the demo service.
 * This ensures the demo code is:
 * 1. NOT bundled in production when not needed
 * 2. Loaded on-demand only in demo mode
 * 3. Tree-shaken by Vite/Rollup in production builds
 * 
 * @returns Promise<DataService> The appropriate service for current mode
 */
const getDataServiceAsync = async (): Promise<DataService> => {
    if (isDemoMode()) {
        // Dynamic import - demo bundle is separate chunk
        if (!cachedDemoService) {
            console.log('[FACTORY] Demo mode detected. Loading demo service...');
            const module = await import('./demoDataService');
            cachedDemoService = module.demoDataService as DataService;
        }
        return cachedDemoService;
    }
    // Production mode - return real API service
    return apiService as DataService;
};

// ============================================================================
// PUBLIC API (Wrapper with Dynamic Resolution)
// ============================================================================

/**
 * Unified data service interface.
 * All methods automatically resolve to the correct backend (demo/prod).
 * Uses dynamic import to prevent demo module from contaminating prod bundle.
 */
export const dataService = {
    getGridStatus: async () => {
        const service = await getDataServiceAsync();
        return service.getGridStatus();
    },

    getGridFrequency: async () => {
        const service = await getDataServiceAsync();
        return service.getGridFrequency();
    },

    getCurrentLoad: async () => {
        const service = await getDataServiceAsync();
        return service.getCurrentLoad();
    },

    getGeneration: async () => {
        const service = await getDataServiceAsync();
        return service.getGeneration();
    },

    getFuelMix: async () => {
        const service = await getDataServiceAsync();
        return service.getFuelMix();
    },

    getMarketPrices: async () => {
        const service = await getDataServiceAsync();
        return service.getMarketPrices();
    },

    getForecast: async (currentLoad?: number) => {
        const service = await getDataServiceAsync();
        return service.getForecast(currentLoad);
    },

    getRegionalStatus: async () => {
        const service = await getDataServiceAsync();
        return service.getRegionalStatus();
    },

    getAlerts: async () => {
        const service = await getDataServiceAsync();
        return service.getAlerts();
    },

    getMarketNews: async () => {
        const service = await getDataServiceAsync();
        return service.getMarketNews();
    },

    getInterconnectionQueue: async () => {
        const service = await getDataServiceAsync();
        return service.getInterconnectionQueue();
    },

    getSolarData: async () => {
        const service = await getDataServiceAsync();
        return service.getSolarData();
    },

    getHistorical: async (start?: string, end?: string) => {
        const service = await getDataServiceAsync();
        return service.getHistorical(start, end);
    },

    getActiveWildfires: async () => {
        const service = await getDataServiceAsync();
        return service.getActiveWildfires();
    },

    getCommercialOpportunities: async () => {
        const service = await getDataServiceAsync();
        return service.getCommercialOpportunities();
    },

    getRestrictedZones: async () => {
        const service = await getDataServiceAsync();
        return service.getRestrictedZones();
    },

    getAgriculturalData: async () => {
        const service = await getDataServiceAsync();
        return service.getAgriculturalData();
    },

    getCongestionData: async (): Promise<CongestionZone[]> => {
        const service = await getDataServiceAsync();
        return service.getCongestionData();
    },

    getGridNodes: async (): Promise<PowerAsset[]> => {
        const service = await getDataServiceAsync();
        return service.getGridNodes();
    },

    // Utility - synchronous check (no dynamic import needed)
    isDemoMode
};

export default dataService;
