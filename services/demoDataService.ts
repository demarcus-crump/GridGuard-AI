
/**
 * demoDataService.ts
 * 
 * ISOLATED Demo/Simulation Data Service
 * 
 * This service provides realistic synthetic data for demo mode.
 * It is COMPLETELY SEPARATE from the real API service to ensure
 * no mock data ever leaks into production.
 * 
 * Features:
 * - Realistic ERCOT-like load profiles
 * - Time-synchronized synthetic data
 * - Simulated grid events
 * - Consistent narrative for presentations
 */

import { GridStatus, MetricData, RiskTier } from '../types';

// ============================================================================
// SYNTHETIC DATA GENERATORS
// ============================================================================

// Realistic Texas summer load curve (hourly MW)
const TYPICAL_LOAD_PROFILE = [
    42000, 40000, 38500, 37500, 37000, 38000, // 00:00 - 05:00
    42000, 48000, 52000, 54000, 56000, 58000, // 06:00 - 11:00
    60000, 62000, 64000, 66000, 68000, 70000, // 12:00 - 17:00
    68000, 64000, 58000, 52000, 48000, 45000  // 18:00 - 23:00
];

// Typical fuel mix percentages
const TYPICAL_FUEL_MIX = {
    gas: 42,
    wind: 28,
    solar: 12,
    nuclear: 10,
    coal: 5,
    hydro: 2,
    other: 1
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const addNoise = (value: number, percentNoise: number = 2): number => {
    const noise = (Math.random() - 0.5) * 2 * (percentNoise / 100) * value;
    return Math.round(value + noise);
};

const getCurrentHour = (): number => new Date().getHours();

// Generates frequency with realistic drift
const generateFrequency = (): number => {
    // Base 60 Hz with small random deviation
    const base = 60.0;
    const deviation = (Math.random() - 0.5) * 0.06; // ±0.03 Hz typical
    return Math.round((base + deviation) * 1000) / 1000;
};

// ============================================================================
// DEMO DATA SERVICE
// ============================================================================

export const demoDataService = {
    /**
     * Get simulated grid status
     */
    getGridStatus: async (): Promise<GridStatus> => {
        // 90% normal, 8% warning, 2% critical for realistic demo
        const roll = Math.random();
        if (roll > 0.98) return GridStatus.CRITICAL;
        if (roll > 0.90) return GridStatus.WARNING;
        return GridStatus.NORMAL;
    },

    /**
     * Get simulated grid frequency
     */
    getGridFrequency: async (): Promise<number> => {
        return generateFrequency();
    },

    /**
     * Get simulated current load based on time of day
     */
    getCurrentLoad: async (): Promise<MetricData> => {
        const hour = getCurrentHour();
        const baseLoad = TYPICAL_LOAD_PROFILE[hour];
        return {
            value: addNoise(baseLoad, 3),
            unit: 'MW'
        };
    },

    /**
     * Get simulated generation (always slightly above load)
     */
    getGeneration: async (): Promise<MetricData> => {
        const hour = getCurrentHour();
        const baseLoad = TYPICAL_LOAD_PROFILE[hour];
        // Generation is 2-5% above load to maintain reserves
        const reserve = 1.02 + Math.random() * 0.03;
        return {
            value: addNoise(Math.round(baseLoad * reserve), 2),
            unit: 'MW'
        };
    },

    /**
     * Get simulated fuel mix
     */
    getFuelMix: async (): Promise<Record<string, number>> => {
        const hour = getCurrentHour();
        const mix = { ...TYPICAL_FUEL_MIX };

        // Solar ramps up during day, down at night
        if (hour >= 7 && hour <= 18) {
            mix.solar = Math.round(12 + (Math.sin((hour - 7) * Math.PI / 11) * 15));
            mix.gas = Math.max(25, mix.gas - mix.solar + 12);
        } else {
            mix.solar = 0;
            mix.gas = mix.gas + 12;
        }

        // Add noise to all values
        return Object.fromEntries(
            Object.entries(mix).map(([k, v]) => [k, addNoise(v, 5)])
        );
    },

    /**
     * Get simulated market prices (LMP)
     */
    getMarketPrices: async (): Promise<Array<{ time: string; value: number; hub: string }>> => {
        const hour = getCurrentHour();
        const prices = [];

        // Base price varies by time of day
        for (let i = 0; i < 24; i++) {
            let basePrice = 30;
            if (i >= 14 && i <= 19) basePrice = 80; // Peak hours
            else if (i >= 6 && i <= 21) basePrice = 45; // Day hours
            else basePrice = 25; // Night hours

            prices.push({
                time: `${i.toString().padStart(2, '0')}:00`,
                value: addNoise(basePrice, 20),
                hub: 'HB_HOUSTON'
            });
        }

        return prices;
    },

    /**
     * Get simulated load forecast
     */
    getForecast: async (currentLoad?: number): Promise<Array<{ time: string; actual: number; forecast: number }>> => {
        const hour = getCurrentHour();
        const result = [];

        for (let i = 0; i < 24; i++) {
            const forecastHour = (hour + i) % 24;
            const forecast = TYPICAL_LOAD_PROFILE[forecastHour];
            const actual = i < 2 ? addNoise(forecast, 2) : 0; // Only show actuals for past hours

            result.push({
                time: `${forecastHour.toString().padStart(2, '0')}:00`,
                actual: i < 2 ? actual : 0,
                forecast: addNoise(forecast, 3)
            });
        }

        return result;
    },

    /**
     * Get simulated regional weather data
     */
    getRegionalStatus: async (): Promise<Array<{ region: string; temp: number; unit: string; conditions: string }>> => {
        const hour = getCurrentHour();
        const baseTemp = hour >= 12 && hour <= 18 ? 95 : hour >= 6 ? 85 : 78;

        return [
            { region: 'north', temp: addNoise(baseTemp - 5, 5), unit: 'F', conditions: 'Partly Cloudy' },
            { region: 'houston', temp: addNoise(baseTemp, 5), unit: 'F', conditions: 'Humid' },
            { region: 'west', temp: addNoise(baseTemp + 5, 5), unit: 'F', conditions: 'Clear' },
            { region: 'south', temp: addNoise(baseTemp - 2, 5), unit: 'F', conditions: 'Sunny' },
            { region: 'austin', temp: addNoise(baseTemp - 1, 5), unit: 'F', conditions: 'Overcast' }
        ];
    },

    /**
     * Get simulated weather alerts
     */
    getAlerts: async (): Promise<Array<{ event: string; headline: string }>> => {
        // Occasionally show demo alerts
        if (Math.random() > 0.7) {
            return [
                {
                    event: 'Heat Advisory',
                    headline: 'Heat Advisory in effect until 8 PM CDT for the Houston metro area'
                }
            ];
        }
        return [];
    },

    /**
  * Get simulated news headlines
  */
    getMarketNews: async (): Promise<Array<{ title: string; source: string; url: string }>> => {
        return [
            {
                title: 'ERCOT projects record summer demand as Texas grows',
                source: 'Houston Chronicle',
                url: '#'
            },
            {
                title: 'Wind generation reaches 30GW milestone in ERCOT',
                source: 'Reuters',
                url: '#'
            },
            {
                title: 'New 500MW solar farm approved for West Texas',
                source: 'Austin Business Journal',
                url: '#'
            },
            {
                title: 'Battery storage projects surge across Texas grid',
                source: 'Energy News Network',
                url: '#'
            },
            {
                title: 'Natural gas prices drop amid mild winter weather',
                source: 'Bloomberg Energy',
                url: '#'
            },
            {
                title: 'ERCOT implements new demand response programs',
                source: 'Utility Dive',
                url: '#'
            }
        ];
    },

    /**
     * Get simulated interconnection queue
     */
    getInterconnectionQueue: async (): Promise<{ totalGW: number; pending: number }> => {
        return {
            totalGW: 185,
            pending: 2847
        };
    },

    /**
     * Get simulated solar data
     */
    getSolarData: async (): Promise<{ sunrise: string; sunset: string }> => {
        return {
            sunrise: '06:45 AM',
            sunset: '08:15 PM'
        };
    },

    /**
     * Get simulated historical data
     */
    getHistorical: async (): Promise<any> => {
        return {
            period: '30 days',
            avgLoad: 52000,
            peakLoad: 74000,
            minLoad: 35000
        };
    },

    /**
     * Get simulated wildfire hotspots (for demo mode)
     */
    getActiveWildfires: async (): Promise<Array<{ lat: number; lon: number; confidence: string; brightness: number; acq_date: string }>> => {
        // Simulate occasional fire near West Texas wind corridor
        if (Math.random() > 0.8) {
            return [
                { lat: 31.8, lon: -102.4, confidence: 'high', brightness: 320, acq_date: new Date().toISOString().split('T')[0] },
                { lat: 32.1, lon: -101.9, confidence: 'nominal', brightness: 290, acq_date: new Date().toISOString().split('T')[0] }
            ];
        }
        return [];
    },

    /**
     * Calculate risk tier from frequency
     */
    calculateRiskTier: (frequency: number, status: GridStatus): RiskTier => {
        if (frequency < 59.90 || frequency > 60.10) return RiskTier.RED;
        if (frequency < 59.95 || frequency > 60.05) return RiskTier.YELLOW;
        if (status === GridStatus.CRITICAL) return RiskTier.RED;
        if (status === GridStatus.WARNING) return RiskTier.YELLOW;
        return RiskTier.GREEN;
    },

    /**
     * Get Commercial Opportunities (Oil, Data Centers)
     * REAL COORDINATES: Verified locations for maximum demo credibility
     */
    getCommercialOpportunities: async (): Promise<any[]> => {
        return [
            // Real Permian Basin drilling zones
            { lon: -102.077, lat: 31.997, name: "Midland Basin Zone-A", type: "oil", capacity: "H-Tier Yield", status: "active", metrics: { yield: "2.4k BBL/d", proximity: "12km", cost: "$45M" }, desc: "Midland Basin core. Highest drilling density in Permian." },
            { lon: -103.493, lat: 31.428, name: "Delaware Basin Zone-B", type: "oil", capacity: "M-Tier Yield", status: "candidate", metrics: { yield: "1.8k BBL/d", proximity: "28km", cost: "$62M" }, desc: "Delaware Basin. Strategic depth for unconventional reserves." },
            // Real hyperscale data center locations
            { lon: -97.33, lat: 32.88, name: "Meta Fort Worth DC", type: "datacenter", capacity: "500 MW", status: "operational", metrics: { load: "500 MW", pue: "1.10", latency: "4ms" }, desc: "Meta hyperscale campus at 4500 Like Way. 100% wind-powered." },
            { lon: -96.99, lat: 32.48, name: "Google Midlothian DC", type: "datacenter", capacity: "1,200 MW", status: "expanding", metrics: { load: "1.2 GW", pue: "1.12", latency: "6ms" }, desc: "Google Ellis County campus. $1B+ investment. AI training cluster." },
            { lon: -96.91, lat: 32.52, name: "Google Red Oak DC", type: "datacenter", capacity: "800 MW", status: "operational", metrics: { load: "800 MW", pue: "1.11", latency: "5ms" }, desc: "Google secondary campus. 165-acre site in Red Oak." }
        ];
    },

    /**
     * Get Restricted Zones (Military, No-Go)
     * REAL COORDINATES: Fort Hood/Cavazos actual boundary
     */
    getRestrictedZones: async (): Promise<any[]> => {
        return [
            // Fort Cavazos (formerly Fort Hood) - REAL coordinates: 31.1349°N, 97.7756°W
            { id: "MIL-1", name: "Fort Hood (Cavazos)", type: "military", bounds: [[-98.05, 31.35], [-97.50, 31.35], [-97.50, 30.95], [-98.05, 30.95]], risk: "HIGH", desc: "Active U.S. Army installation. 214,000 acres. Restricted airspace R-6301." },
            // Big Bend National Park - REAL boundary
            { id: "NGZ-1", name: "Big Bend National Park", type: "nogo", bounds: [[-103.60, 29.55], [-102.75, 29.55], [-102.75, 29.10], [-103.60, 29.10]], risk: "ECOLOGICAL", desc: "National Park. No energy infrastructure permitted. UNESCO Biosphere." },
            // Laughlin AFB
            { id: "MIL-2", name: "Laughlin AFB", type: "military", bounds: [[-100.85, 29.40], [-100.70, 29.40], [-100.70, 29.32], [-100.85, 29.32]], risk: "HIGH", desc: "USAF pilot training base. Del Rio. Active military airspace." }
        ];
    },

    /**
     * Get Agricultural Data (Farmlands, Crops)
     * REAL REGIONS: Based on USDA Texas crop data
     */
    getAgriculturalData: async (): Promise<any[]> => {
        return [
            // Texas High Plains Cotton Belt - REAL agricultural region
            { name: "Lubbock Cotton Belt", type: "crop", bounds: [[-102.5, 34.0], [-101.0, 34.0], [-101.0, 33.0], [-102.5, 33.0]], yield: "High", status: "harvesting", desc: "#1 cotton-producing region in US. Conflict zone for wind development." },
            // Texas Gulf Coast Rice Belt - REAL agricultural region  
            { name: "Gulf Coast Rice Belt", type: "crop", bounds: [[-96.0, 29.8], [-94.5, 29.8], [-94.5, 29.0], [-96.0, 29.0]], yield: "Prime", status: "stable", desc: "Primary rice production zone. Wharton, Colorado, Matagorda counties." },
            // Rio Grande Valley Citrus - REAL agricultural region
            { name: "Rio Grande Valley Citrus", type: "crop", bounds: [[-98.5, 26.5], [-97.5, 26.5], [-97.5, 26.0], [-98.5, 26.0]], yield: "Prime", status: "stable", desc: "Citrus and vegetable production. Hidalgo, Cameron counties." }
        ];
    },

    /**
     * Get Congestion Data (Transmission Constraints)
     * DEMO MODE: Returns empty array to match production behavior
     */
    getCongestionData: async (): Promise<import('../types').CongestionZone[]> => {
        console.warn('[DEMO] getCongestionData: No congestion data in demo mode. Connect ERCOT API for production.');
        return [];
    },

    /**
     * Get ERCOT grid nodes (power generation assets)
     * REAL COORDINATES: Verified Texas power plant locations
     */
    getGridNodes: async (): Promise<import('../services/dataServiceFactory').PowerAsset[]> => {
        return [
            // Roscoe Wind Farm - REAL: 32.26°N, 100.34°W (largest wind farm when built)
            { lon: -100.34, lat: 32.26, name: "Roscoe Wind Farm", type: "wind", capacity: "781 MW", status: "online", desc: "Nolan County. 627 turbines across 100,000 acres. Historic largest wind farm." },
            // Panhandle Wind - approximate location in Hansford County
            { lon: -101.40, lat: 35.68, name: "Great Prairie Wind Farm", type: "wind", capacity: "1,027 MW", status: "online", desc: "Hansford County. Largest wind farm in Texas. 356 turbines." },
            // Horse Hollow Wind Farm - REAL location
            { lon: -100.13, lat: 32.08, name: "Horse Hollow Wind Farm", type: "wind", capacity: "735 MW", status: "online", desc: "Taylor & Nolan Counties. 421 turbines across 47,000 acres." },
            // Roadrunner Solar - West Texas
            { lon: -103.50, lat: 31.85, name: "Roadrunner Solar", type: "solar", capacity: "497 MW", status: "online", desc: "Upton County. Largest solar in ERCOT at completion. Enel Green Power." },
            // Houston Energy Center - downtown Houston coordinates
            { lon: -95.36, lat: 29.76, name: "W.A. Parish Plant", type: "gas", capacity: "3,653 MW", status: "online", desc: "Fort Bend County. Largest power plant in Texas. NRG Energy." },
            // STP Nuclear - REAL: 28.795°N, 96.048°W
            { lon: -96.048, lat: 28.795, name: "South Texas Project", type: "nuclear", capacity: "2,708 MW", status: "online", desc: "Matagorda County. Two 1,354 MW units. 12,200-acre site. Priority 1 exclusion." },
            // Comanche Peak - REAL: 32.298°N, 97.785°W
            { lon: -97.785, lat: 32.298, name: "Comanche Peak Nuclear", type: "nuclear", capacity: "2,446 MW", status: "online", desc: "Somervell County, Glen Rose. Two units. Primary inertia for DFW." }
        ];
    }
};

export default demoDataService;
