
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
    getMarketNews: async (): Promise<Array<{ title: string; source: { name: string }; url: string; description: string; publishedAt: string }>> => {
        const now = new Date();
        return [
            {
                title: 'ERCOT projects record summer demand as Texas grows',
                source: { name: 'Houston Chronicle' },
                description: 'Texas grid operator ERCOT forecasts peak summer demand could reach 85,000 MW this year, driven by population growth and extreme heat. New generation capacity is being added to meet the surge.',
                publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                url: '#'
            },
            {
                title: 'Wind generation reaches 30GW milestone in ERCOT',
                source: { name: 'Reuters' },
                description: 'Texas wind farms generated over 30 gigawatts of power for the first time, setting a new record. Wind now accounts for nearly 40% of ERCOT\'s total generation capacity.',
                publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
                url: '#'
            },
            {
                title: 'New 500MW solar farm approved for West Texas',
                source: { name: 'Austin Business Journal' },
                description: 'State regulators approved construction of a massive solar installation near Midland. The project will add significant renewable capacity and create hundreds of jobs during construction.',
                publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
                url: '#'
            },
            {
                title: 'Battery storage projects surge across Texas grid',
                source: { name: 'Energy News Network' },
                description: 'Over 2,000 MW of battery energy storage systems are now operational in ERCOT, helping to stabilize the grid during peak demand and renewable energy fluctuations.',
                publishedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
                url: '#'
            },
            {
                title: 'Natural gas prices drop amid mild winter weather',
                source: { name: 'Bloomberg Energy' },
                description: 'Warmer-than-expected temperatures across Texas have reduced heating demand, causing natural gas prices at Houston Ship Channel to fall 15% this week.',
                publishedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
                url: '#'
            },
            {
                title: 'ERCOT implements new demand response programs',
                source: { name: 'Utility Dive' },
                description: 'The grid operator launched enhanced demand response initiatives, allowing commercial customers to reduce load during peak hours in exchange for financial incentives.',
                publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
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
     */
    getCommercialOpportunities: async (): Promise<any[]> => {
        return [
            { lon: -103.2, lat: 31.8, name: "Permian Zone-A (Oil)", type: "oil", capacity: "H-Tier Yield", status: "candidate", metrics: { yield: "2.4k BBL/d", proximity: "12km", cost: "$45M" }, desc: "Top-tier drilling density. High proximity to West-North corridor." },
            { lon: -102.8, lat: 32.2, name: "Permian Zone-B (Oil)", type: "oil", capacity: "M-Tier Yield", status: "candidate", metrics: { yield: "1.8k BBL/d", proximity: "28km", cost: "$62M" }, desc: "Secondary expansion zone. Strategic depth for long-term reserves." },
            { lon: -97.2, lat: 32.8, name: "DFW Edge DC Candidate", type: "datacenter", capacity: "500 MW", status: "proposed", metrics: { load: "500 MW", pue: "1.15", latency: "4ms" }, desc: "Proposed AI cluster. Critical proximity to North-Houston corridor." },
            { lon: -97.6, lat: 30.4, name: "Austin Compute Hub", type: "datacenter", capacity: "1,200 MW", status: "proposed", metrics: { load: "1.2 GW", pue: "1.12", latency: "6ms" }, desc: "Hyperscale AI training site candidate. Strategic alignment with TX-SH 130 corridor." }
        ];
    },

    /**
     * Get Restricted Zones (Military, No-Go)
     */
    getRestrictedZones: async (): Promise<any[]> => {
        return [
            { id: "MIL-1", name: "Fort Cavazos (Military)", type: "military", bounds: [[-98.0, 31.5], [-97.5, 31.5], [-97.5, 31.0], [-98.0, 31.0]], risk: "HIGH", desc: "Active military installation. Restricted airspace and radio silence zones." },
            { id: "NGZ-1", name: "Big Bend Protection Zone", type: "nogo", bounds: [[-104.0, 29.5], [-102.5, 29.5], [-102.5, 29.0], [-104.0, 29.0]], risk: "ECOLOGICAL", desc: "No-Go Zone for energy infrastructure. Ecological preservation priority." }
        ];
    },

    /**
     * Get Agricultural Data (Farmlands, Crops)
     */
    getAgriculturalData: async (): Promise<any[]> => {
        return [
            { name: "West Texas Cotton Belt", type: "crop", bounds: [[-102.0, 34.0], [-100.0, 34.0], [-100.0, 32.0], [-102.0, 32.0]], yield: "High", status: "harvesting", desc: "Major agricultural corridor. Potential conflict with wind turbine placement." },
            { name: "Rice Belt Coast", type: "crop", bounds: [[-96.5, 29.5], [-95.0, 29.5], [-95.0, 28.5], [-96.5, 28.5]], yield: "Prime", status: "stable", desc: "Strategic crop zone. Requires thermal management for nearby infrastructure." }
        ];
    }
};

export default demoDataService;
