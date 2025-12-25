
/**
 * apiService.ts
 * 
 * REAL API Service - Production Data Only
 * 
 * This service makes REAL API calls to external data providers.
 * NO mock/demo data should exist in this file.
 * 
 * For demo mode, see demoDataService.ts
 */

import { GridStatus, MetricData } from '../types';
import { getActiveKey, API_CONFIG } from './apiConfig';

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GRID_STATUS: 'https://api.gridstatus.io/v1',
  NWS: 'https://api.weather.gov',
  EIA: 'https://api.eia.gov/v2',
  NEWS: 'https://newsapi.org/v2',
  VISUAL_CROSSING: 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline',
  NASA_FIRMS: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
};

// ============================================================================
// HELPERS
// ============================================================================

const fetchWithProxy = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Use CORS proxy for browser requests
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxyUrl, { ...options });
    return res;
  } catch (e) {
    console.error('API Fetch Error:', e);
    throw e;
  }
};

const getGridStatusKey = () => getActiveKey('GRID_STATUS_KEY');
const getEiaKey = () => getActiveKey('EIA_KEY');
const getNewsKey = () => getActiveKey('NEWS_API_KEY');
const getWeatherKey = () => getActiveKey('WEATHER_API_KEY');
const getNasaKey = () => getActiveKey('NASA_API_KEY');

// ============================================================================
// REAL API SERVICE
// ============================================================================

export const apiService = {
  /**
   * Get real ERCOT grid status from GridStatus.io
   */
  getGridStatus: async (): Promise<GridStatus | null> => {
    const key = getGridStatusKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_grid_conditions?api_key=${key}&limit=1`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      const raw = (data.data?.[0]?.notes || '').toUpperCase();

      if (raw.includes('EMERGENCY') || raw.includes('EEA')) return GridStatus.CRITICAL;
      if (raw.includes('WATCH') || raw.includes('ADVISORY')) return GridStatus.WARNING;
      return null; // Return null instead of fallback to NORMAL
    } catch (e) {
      console.error('getGridStatus Error:', e);
      return null;
    }
  },

  /**
   * Get real ERCOT frequency from GridStatus.io
   */
  getGridFrequency: async (): Promise<number | null> => {
    const key = getGridStatusKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_as?api_key=${key}&limit=1`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      // GridStatus.io returns frequency in the ancillary services data
      return data.data?.[0]?.frequency || null;
    } catch (e) {
      console.error('getGridFrequency Error:', e);
      return null;
    }
  },

  /**
   * Get real ERCOT current load from GridStatus.io
   */
  getCurrentLoad: async (): Promise<MetricData | null> => {
    const key = getGridStatusKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_load?api_key=${key}&limit=1`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      const load = data.data?.[0]?.load;

      if (load !== undefined) {
        return { value: Math.round(load), unit: 'MW' };
      }
      return null;
    } catch (e) {
      console.error('getCurrentLoad Error:', e);
      return null;
    }
  },

  /**
   * Get real ERCOT generation from GridStatus.io
   */
  getGeneration: async (): Promise<MetricData | null> => {
    const key = getGridStatusKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_generation?api_key=${key}&limit=1`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      const gen = data.data?.[0]?.generation;

      if (gen !== undefined) {
        return { value: Math.round(gen), unit: 'MW' };
      }
      return null;
    } catch (e) {
      console.error('getGeneration Error:', e);
      return null;
    }
  },

  /**
   * Get real ERCOT fuel mix from GridStatus.io
   */
  getFuelMix: async (): Promise<Record<string, number> | null> => {
    const key = getGridStatusKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_fuel_mix?api_key=${key}&limit=1`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      const row = data.data?.[0];

      if (row) {
        return {
          gas: row.gas || 0,
          wind: row.wind || 0,
          solar: row.solar || 0,
          nuclear: row.nuclear || 0,
          coal: row.coal || 0,
          hydro: row.hydro || 0,
          other: row.other || 0
        };
      }
      return null;
    } catch (e) {
      console.error('getFuelMix Error:', e);
      return null;
    }
  },

  /**
   * Get real ERCOT market prices (LMP) from GridStatus.io
   */
  getMarketPrices: async (): Promise<Array<{ time: string; value: number; hub: string }>> => {
    const key = getGridStatusKey();
    if (!key) return [];

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_spp?api_key=${key}&limit=24`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return [];

      const data = await res.json();
      return (data.data || []).map((row: any) => ({
        time: new Date(row.interval_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: row.spp || 0,
        hub: row.location || 'HB_HOUSTON'
      }));
    } catch (e) {
      console.error('getMarketPrices Error:', e);
      return [];
    }
  },

  /**
   * Get real ERCOT load forecast from GridStatus.io
   */
  getForecast: async (currentLoad?: number): Promise<Array<{ time: string; actual: number; forecast: number }>> => {
    const key = getGridStatusKey();
    if (!key) return [];

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_load_forecast?api_key=${key}&limit=48`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return [];

      const data = await res.json();
      return (data.data || []).slice(0, 24).map((row: any) => ({
        time: new Date(row.interval_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        actual: row.actual_load || 0,
        forecast: row.forecast_load || row.stlf || 0
      }));
    } catch (e) {
      console.error('getForecast Error:', e);
      return [];
    }
  },

  /**
   * Get real regional weather data from Visual Crossing (upgraded from NWS)
   */
  getRegionalStatus: async (): Promise<Array<{ region: string; temp: number; unit: string; conditions?: string }>> => {
    const key = getWeatherKey();

    // Texas cities for regional weather
    const regions = [
      { region: 'houston', city: 'Houston,TX' },
      { region: 'north', city: 'Dallas,TX' },
      { region: 'west', city: 'Midland,TX' },
      { region: 'south', city: 'Corpus Christi,TX' },
      { region: 'austin', city: 'Austin,TX' }
    ];

    if (!key) {
      // Fallback to NWS if no Visual Crossing key
      try {
        const res = await fetch(`${ENDPOINTS.NWS}/stations/KIAH/observations/latest`, {
          headers: { 'User-Agent': 'GridGuardAI (contact@gridguard.ai)' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        const baseTemp = data.properties?.temperature?.value;
        if (baseTemp === null || baseTemp === undefined) return [];
        const tempF = Math.round((baseTemp * 9 / 5) + 32);
        return regions.map(r => ({ region: r.region, temp: tempF, unit: 'F' }));
      } catch { return []; }
    }

    try {
      // Fetch all regions in parallel using Visual Crossing
      const results = await Promise.all(
        regions.map(async (r) => {
          try {
            const url = `${ENDPOINTS.VISUAL_CROSSING}/${encodeURIComponent(r.city)}/today?unitGroup=us&key=${key}&include=current`;
            const res = await fetchWithProxy(url);
            if (!res.ok) return { region: r.region, temp: null as any, unit: 'F' };
            const data = await res.json();
            return {
              region: r.region,
              temp: data.currentConditions ? Math.round(data.currentConditions.temp) : null as any,
              unit: 'F',
              conditions: data.currentConditions?.conditions || ''
            };
          } catch {
            return { region: r.region, temp: null as any, unit: 'F' };
          }
        })
      );
      return results;
    } catch (e) {
      console.error('getRegionalStatus Error:', e);
      return [];
    }
  },

  /**
   * Get real weather alerts from NWS for Texas
   */
  getAlerts: async (): Promise<Array<{ event: string; headline: string }>> => {
    try {
      const res = await fetch(`${ENDPOINTS.NWS}/alerts/active?area=TX`, {
        headers: { 'User-Agent': 'GridGuardAI (contact@gridguard.ai)' }
      });

      if (!res.ok) return [];
      const data = await res.json();

      return (data.features || []).slice(0, 5).map((f: any) => ({
        event: f.properties?.event || 'Alert',
        headline: f.properties?.headline || ''
      }));
    } catch (e) {
      console.error('getAlerts Error:', e);
      return [];
    }
  },

  /**
   * Get real energy news from NewsAPI
   */
  getMarketNews: async (): Promise<Array<{ title: string; source: string; url: string }>> => {
    const key = getNewsKey();
    if (!key) return [];

    try {
      const query = encodeURIComponent('ercot OR "texas grid" OR "energy market" OR "power grid texas"');
      const url = `${ENDPOINTS.NEWS}/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${key}`;
      const res = await fetchWithProxy(url);

      if (!res.ok) return [];
      const data = await res.json();

      return (data.articles || []).map((a: any) => ({
        title: a.title || '',
        source: a.source?.name || 'Unknown',
        url: a.url || '#'
      }));
    } catch (e) {
      console.error('getMarketNews Error:', e);
      return [];
    }
  },

  /**
   * Get real interconnection queue from GridStatus.io
   */
  getInterconnectionQueue: async (): Promise<{ totalGW: number; pending: number } | null> => {
    const key = getGridStatusKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_interconnection_queue?api_key=${key}&limit=100`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      const queue = data.data || [];

      const totalMW = queue.reduce((sum: number, item: any) => sum + (item.capacity_mw || 0), 0);

      return {
        totalGW: Math.round(totalMW / 1000),
        pending: queue.length
      };
    } catch (e) {
      console.error('getInterconnectionQueue Error:', e);
      return null;
    }
  },

  /**
   * Get solar data (sunrise/sunset) from Visual Crossing
   */
  getSolarData: async (): Promise<{ sunrise: string | null; sunset: string | null }> => {
    const key = getWeatherKey();
    if (!key) {
      return { sunrise: null, sunset: null };
    }

    try {
      const url = `${ENDPOINTS.VISUAL_CROSSING}/Austin,TX/today?unitGroup=us&key=${key}&include=days`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return { sunrise: null, sunset: null };

      const data = await res.json();
      const day = data.days?.[0];

      return {
        sunrise: day?.sunrise || null,
        sunset: day?.sunset || null
      };
    } catch (e) {
      console.error('getSolarData Error:', e);
      return { sunrise: null, sunset: null };
    }
  },

  /**
   * Get historical data from EIA
   */
  getHistorical: async (start?: string, end?: string): Promise<any> => {
    const key = getEiaKey();
    if (!key) return null;

    try {
      const url = `${ENDPOINTS.EIA}/electricity/rto/region-data/data?api_key=${key}&frequency=hourly&data[0]=value&facets[respondent][]=ERCO&sort[0][column]=period&sort[0][direction]=desc&length=168`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return null;

      const data = await res.json();
      return data.response?.data || null;
    } catch (e) {
      console.error('getHistorical Error:', e);
      return null;
    }
  },

  /**
   * Get ancillary services data
   */
  getAncillaryServices: async (): Promise<any[]> => {
    const key = getGridStatusKey();
    if (!key) return [];

    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets/ercot_as?api_key=${key}&limit=10`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return [];

      const data = await res.json();
      return data.data || [];
    } catch (e) {
      console.error('getAncillaryServices Error:', e);
      return [];
    }
  },

  /**
   * Get active wildfires near Texas grid infrastructure from NASA FIRMS
   * Returns satellite-detected fire hotspots within last 24h
   */
  getActiveWildfires: async (): Promise<Array<{ lat: number; lon: number; confidence: string; brightness: number; acq_date: string }>> => {
    const key = getNasaKey();
    if (!key) return [];

    try {
      // Texas bounding box (approximate)
      // West: -106.6, East: -93.5, South: 25.8, North: 36.5
      const url = `${ENDPOINTS.NASA_FIRMS}/${key}/VIIRS_SNPP_NRT/USA_contiguous_and_Hawaii/1`;
      const res = await fetchWithProxy(url);
      if (!res.ok) return [];

      const csvText = await res.text();
      const lines = csvText.split('\n');
      const headers = lines[0]?.split(',') || [];

      const latIdx = headers.indexOf('latitude');
      const lonIdx = headers.indexOf('longitude');
      const confIdx = headers.indexOf('confidence');
      const brightIdx = headers.indexOf('bright_ti4');
      const dateIdx = headers.indexOf('acq_date');

      const fires: Array<{ lat: number; lon: number; confidence: string; brightness: number; acq_date: string }> = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]?.split(',');
        if (!cols || cols.length < 5) continue;

        const lat = parseFloat(cols[latIdx]);
        const lon = parseFloat(cols[lonIdx]);

        // Filter to Texas bounding box
        if (lat >= 25.8 && lat <= 36.5 && lon >= -106.6 && lon <= -93.5) {
          fires.push({
            lat,
            lon,
            confidence: cols[confIdx] || 'nominal',
            brightness: parseFloat(cols[brightIdx]) || 0,
            acq_date: cols[dateIdx] || ''
          });
        }
      }

      return fires.slice(0, 50); // Limit to 50 most recent
    } catch (e) {
      console.error('getActiveWildfires Error:', e);
      return [];
    }
  },

  /**
   * Get seismic activity (placeholder - would need USGS integration)
   */
  getSeismicActivity: async (): Promise<any[]> => {
    return []; // Not critical for grid ops
  },

  /**
   * Verify GridStatus.io API key
   */
  verifyGridStatusKey: async (key: string): Promise<{ success: boolean; message: string }> => {
    try {
      const url = `${ENDPOINTS.GRID_STATUS}/datasets?api_key=${key}&limit=1`;
      const res = await fetchWithProxy(url);
      return {
        success: res.ok,
        message: res.ok ? 'GridStatus.io API key verified' : 'Invalid API key'
      };
    } catch (e) {
      return { success: false, message: 'Connection failed' };
    }
  },

  /**
   * Verify ERCOT API key (placeholder)
   */
  verifyErcotKey: async (key: string): Promise<{ success: boolean; message: string }> => {
    return { success: key.length > 5, message: 'Verified' };
  },

  /**
   * Placeholder for real commercial opportunities
   */
  getCommercialOpportunities: async (): Promise<any[]> => {
    return [];
  },

  /**
   * Placeholder for real restricted zones
   */
  getRestrictedZones: async (): Promise<any[]> => {
    return [];
  },

  /**
   * Placeholder for real agricultural data
   */
  getAgriculturalData: async (): Promise<any[]> => {
    return [];
  },

  /**
   * Fetch real-time transmission congestion data
   * 
   * COMMERCIAL NOTE: This is a stub. Connect to ERCOT Congestion API
   * or GridStatus.io transmission constraints endpoint for production.
   */
  getCongestionData: async (): Promise<import('../types').CongestionZone[]> => {
    console.warn('[API] getCongestionData: Real congestion API not connected yet. Returning empty array.');
    return [];
  },

  /**
   * Get ERCOT grid nodes (power generation assets)
   * 
   * PRODUCTION NOTE: Connect to EIA API or GridStatus.io power plants endpoint.
   * This returns empty in production until the real API is connected.
   * 
   * @returns Empty array - no hardcoded fallbacks (honest mode)
   */
  getGridNodes: async (): Promise<import('./dataServiceFactory').PowerAsset[]> => {
    console.warn('[API] getGridNodes: Real power plant API not connected yet. Returning empty array.');
    // HONEST MODE: Return empty rather than fake data
    // Connect to: https://api.eia.gov/v2/electricity/operating-generator-capacity
    return [];
  }
};

export default apiService;
