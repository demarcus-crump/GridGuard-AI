
import { ReactNode } from 'react';

export enum GridStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE',
  INFO = 'INFO'
}

export enum RiskTier {
  GREEN = 'GREEN',   // Auto-Approve (<2% Shedding)
  YELLOW = 'YELLOW', // HITL Review (2-10% Shedding)
  RED = 'RED'        // Manual Only (>10% Shedding or Divergence)
}

export interface MetricData {
  value: number | string | null;
  unit: string;
  change?: number;
  timestamp?: string;
}

export interface AgentData {
  id: string; // The code (e.g., "LF")
  name: string;
  desc: string; // Description of agent responsibility
  status: GridStatus;
  metrics: {
    actions: number;
    accuracy: number;
    latency: number;
  };
  lastAction?: string;
}

export interface NavRoute {
  path: string;
  label: string;
  icon: ReactNode;
}

export interface ConsensusResult {
  agreed: boolean;
  score: number; // 0.0 to 1.0
  primaryAnalysis: string;
  secondaryAnalysis: string;
  tertiaryAnalysis: string;
  finalOutput: string;
  riskTier: RiskTier;
  divergenceReason?: string;
}

/**
 * CongestionZone - Real-time transmission congestion data
 * Used by Congestion Monitor panel
 */
export interface CongestionZone {
  id: string;
  name: string;
  loadPct: number;        // 0-100 percent of thermal limit
  spread: number;         // LMP spread in $/MWh
  trend: 'up' | 'down' | 'stable';
  timestamp: string;      // ISO timestamp
}
