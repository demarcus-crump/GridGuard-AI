
import React from 'react';

export const ROUTES = {
  DASHBOARD: '/',
  AGENTS: '/agents',
  ANALYTICS: '/analytics',
  HISTORICAL: '/historical',
  SCENARIOS: '/scenarios',
  REPORTS: '/reports',
  INSIGHTS: '/insights',
  KNOWLEDGE: '/knowledge',
  RECON: '/recon',
  AUDIT: '/audit',
  CYBERSIM: '/cyber-sim',
  RESEARCH: '/research',
  GOVERNANCE: '/governance'
};

// SVG Paths for Texas Weather Zones (Simplified for Dashboard UI)
// These roughly correspond to: West, North (DFW), South (Corpus), Houston, Austin/Central
export const REGIONS = [
  {
    id: 'west',
    name: 'West / Panhandle',
    path: "M 10 10 L 120 10 L 120 120 L 80 160 L 10 140 Z",
    cx: 65, cy: 80
  },
  {
    id: 'north',
    name: 'North (DFW)',
    path: "M 120 10 L 280 10 L 280 90 L 180 120 L 120 120 Z",
    cx: 200, cy: 60
  },
  {
    id: 'austin',
    name: 'Central (Austin)',
    path: "M 120 120 L 180 120 L 220 180 L 160 240 L 80 160 Z",
    cx: 150, cy: 160
  },
  {
    id: 'houston',
    name: 'Coast (Houston)',
    path: "M 280 90 L 280 180 L 220 220 L 180 120 Z",
    cx: 240, cy: 150
  },
  {
    id: 'south',
    name: 'South (Valley)',
    path: "M 160 240 L 220 220 L 200 300 L 140 280 Z",
    cx: 180, cy: 260
  }
];

export const AGENT_LIST = [
  { id: 'LF', name: 'Load Forecaster', desc: 'Predicts electricity demand using ML' },
  { id: 'WA', name: 'Weather Analyst', desc: 'Monitors weather impact on grid' },
  { id: 'GS', name: 'Grid Stabilizer', desc: 'Balances supply/demand in real-time' },
  { id: 'AM', name: 'Asset Manager', desc: 'Tracks power plant status' },
  { id: 'RE', name: 'Renewable Energy', desc: 'Optimizes solar & wind generation' },
  { id: 'DR', name: 'Demand Response', desc: 'Coordinates load shedding' },
  { id: 'HD', name: 'Historical Data', desc: 'Provides historical patterns' },
  { id: 'OP', name: 'Optimizer', desc: 'Finds optimal resource allocation' },
  { id: 'RS', name: 'Risk Surveillance', desc: 'Detects threats & anomalies' },
  { id: 'RC', name: 'Resource Controller', desc: 'Manages energy storage' },
  { id: 'ER', name: 'Emergency Response', desc: 'Handles grid emergencies' },
  { id: 'CM', name: 'Comm Manager', desc: 'Coordinates agent communication' }
];

// Deprecated GEO_NODES (Kept to prevent breaking legacy imports if any, but unused in new map)
export const GEO_NODES = [];
export const GEO_LINKS = [];
