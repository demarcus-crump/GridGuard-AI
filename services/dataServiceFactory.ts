
/**
 * dataServiceFactory.ts
 * 
 * Factory that returns the appropriate data service based on mode.
 * 
 * This is the SINGLE entry point for all data fetching in the app.
 * It ensures complete separation between demo and production data.
 */

import { apiService } from './apiService';
import { demoDataService } from './demoDataService';
import { GridStatus, MetricData, RiskTier } from '../types';

// ============================================================================
// DATA SERVICE INTERFACE
// ============================================================================

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
}

// ============================================================================
// MODE DETECTION
// ============================================================================

const isDemoMode = (): boolean => {
    return localStorage.getItem('DEMO_MODE') === 'true';
};

// ============================================================================
// DATA SERVICE FACTORY
// ============================================================================

/**
 * Get the appropriate data service based on current mode.
 * 
 * DEMO MODE: Returns demoDataService (synthetic data)
 * REAL MODE: Returns apiService (real API calls)
 */
export const getDataService = (): DataService => {
    if (isDemoMode()) {
        return demoDataService;
    }
    return apiService;
};

/**
 * Wrapper functions that automatically select the right service.
 * Use these throughout the app for convenience.
 */
export const dataService = {
    getGridStatus: async () => {
        const service = getDataService();
        return service.getGridStatus();
    },

    getGridFrequency: async () => {
        const service = getDataService();
        return service.getGridFrequency();
    },

    getCurrentLoad: async () => {
        const service = getDataService();
        return service.getCurrentLoad();
    },

    getGeneration: async () => {
        const service = getDataService();
        return service.getGeneration();
    },

    getFuelMix: async () => {
        const service = getDataService();
        return service.getFuelMix();
    },

    getMarketPrices: async () => {
        const service = getDataService();
        return service.getMarketPrices();
    },

    getForecast: async (currentLoad?: number) => {
        const service = getDataService();
        return service.getForecast(currentLoad);
    },

    getRegionalStatus: async () => {
        const service = getDataService();
        return service.getRegionalStatus();
    },

    getAlerts: async () => {
        const service = getDataService();
        return service.getAlerts();
    },

    getMarketNews: async () => {
        const service = getDataService();
        return service.getMarketNews();
    },

    getInterconnectionQueue: async () => {
        const service = getDataService();
        return service.getInterconnectionQueue();
    },

    getSolarData: async () => {
        const service = getDataService();
        return service.getSolarData();
    },

    getHistorical: async (start?: string, end?: string) => {
        const service = getDataService();
        return service.getHistorical(start, end);
    },

    getActiveWildfires: async () => {
        const service = getDataService();
        return service.getActiveWildfires();
    },

    getCommercialOpportunities: async () => {
        const service = getDataService();
        return (service as any).getCommercialOpportunities?.() || [];
    },

    getRestrictedZones: async () => {
        const service = getDataService();
        return (service as any).getRestrictedZones?.() || [];
    },

    getAgriculturalData: async () => {
        const service = getDataService();
        return (service as any).getAgriculturalData?.() || [];
    },

    // Utility
    isDemoMode
};

export default dataService;
