
/**
 * scedService.ts
 * 
 * Security-Constrained Economic Dispatch (SCED) AI Service
 * 
 * COMMERCIAL ARCHITECTURE:
 * - Treats dispatch as "Model Inference" with confidence scores
 * - Provides reasoning chain for each decision
 * - Simulates async computation for realistic UI feel
 * - Deterministic algorithm based on market + grid conditions
 */

import { auditService } from './auditService';

// ============================================================================
// INFERENCE TYPES
// ============================================================================

/**
 * DispatchDecision - The AI's recommendation for a single resource
 */
export interface DispatchDecision {
    id: string;
    action: 'HOLD' | 'DEPLOY' | 'CHARGE' | 'CURTAIL' | 'RAMP_UP';
    resource: string;
    targetMW: number;
    confidence: number; // 0.0 to 1.0
    reasoning: string[]; // List of factors explaining the decision
    modelId: string;
    expectedProfit: number; // $/MWh expected arbitrage
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * SCEDAnalysisResult - Complete analysis output
 */
export interface SCEDAnalysisResult {
    timestamp: string;
    decisions: DispatchDecision[];
    marketCondition: 'NORMAL' | 'STRESSED' | 'VOLATILE' | 'EMERGENCY';
    systemHealth: number; // 0-100
    analysisTimeMs: number;
}

/**
 * SCEDInput - Required inputs for analysis
 */
export interface SCEDInput {
    currentLoadMW: number;
    currentPricePerMWh: number;
    prevPricePerMWh?: number;
    reserveMarginMW?: number;
    renewablePenetration?: number; // 0-1
}

// ============================================================================
// THRESHOLDS (Tunable parameters)
// ============================================================================

const THRESHOLDS = {
    PRICE_LOW: 25,           // $/MWh - Below this, charge batteries
    PRICE_HIGH: 50,          // $/MWh - Above this, discharge for arbitrage
    PRICE_SPIKE: 100,        // $/MWh - Emergency dispatch territory
    PRICE_NEGATIVE: 0,       // Curtailment required

    LOAD_HIGH: 60000,        // MW - High demand territory
    LOAD_CRITICAL: 68000,    // MW - Dispatch peakers

    RESERVE_LOW: 3000,       // MW - Low reserve margin
};

// ============================================================================
// RESOURCE DEFINITIONS (Available dispatchable assets)
// ============================================================================

interface DispatchableResource {
    id: string;
    name: string;
    type: 'BATTERY' | 'PEAKER' | 'WIND' | 'SOLAR' | 'DEMAND_RESPONSE';
    capacityMW: number;
    marginalCost: number; // $/MWh
    rampRate: number; // MW/min
}

const RESOURCES: DispatchableResource[] = [
    { id: 'BAT_WEST', name: 'Battery Storage West', type: 'BATTERY', capacityMW: 200, marginalCost: 5, rampRate: 100 },
    { id: 'BAT_COAST', name: 'Battery Storage Coast', type: 'BATTERY', capacityMW: 150, marginalCost: 5, rampRate: 75 },
    { id: 'PEAK_4', name: 'Peaker Gas Unit 4', type: 'PEAKER', capacityMW: 300, marginalCost: 85, rampRate: 15 },
    { id: 'PEAK_7', name: 'Peaker Gas Unit 7', type: 'PEAKER', capacityMW: 250, marginalCost: 90, rampRate: 12 },
    { id: 'WIND_COAST', name: 'Wind Farm Coastal', type: 'WIND', capacityMW: 500, marginalCost: 0, rampRate: 50 },
    { id: 'DR_COMM', name: 'Commercial DR Program', type: 'DEMAND_RESPONSE', capacityMW: 100, marginalCost: 45, rampRate: 50 },
];

// ============================================================================
// SCED INFERENCE ENGINE
// ============================================================================

/**
 * Calculate confidence score based on signal strength
 * Higher price/load deltas = more confident decisions
 */
function calculateConfidence(
    price: number,
    load: number,
    priceChange: number
): number {
    let confidence = 0.5; // Base confidence

    // Strong price signal increases confidence
    if (price > THRESHOLDS.PRICE_SPIKE) confidence += 0.35;
    else if (price > THRESHOLDS.PRICE_HIGH) confidence += 0.2;
    else if (price < THRESHOLDS.PRICE_NEGATIVE) confidence += 0.3;

    // Load signal
    if (load > THRESHOLDS.LOAD_CRITICAL) confidence += 0.15;
    else if (load > THRESHOLDS.LOAD_HIGH) confidence += 0.08;

    // Price volatility (big changes = more confident action needed)
    if (Math.abs(priceChange) > 20) confidence += 0.1;

    return Math.min(0.99, Math.max(0.3, confidence));
}

/**
 * Determine market condition label
 */
function determineMarketCondition(price: number, load: number): SCEDAnalysisResult['marketCondition'] {
    if (price > THRESHOLDS.PRICE_SPIKE || load > THRESHOLDS.LOAD_CRITICAL) return 'EMERGENCY';
    if (price > THRESHOLDS.PRICE_HIGH || load > THRESHOLDS.LOAD_HIGH) return 'STRESSED';
    if (price < THRESHOLDS.PRICE_NEGATIVE) return 'VOLATILE';
    return 'NORMAL';
}

/**
 * Generate dispatch decisions based on market conditions
 */
function generateDecisions(input: SCEDInput): DispatchDecision[] {
    const { currentLoadMW, currentPricePerMWh, prevPricePerMWh = currentPricePerMWh } = input;
    const priceChange = currentPricePerMWh - prevPricePerMWh;
    const decisions: DispatchDecision[] = [];

    const baseConfidence = calculateConfidence(currentPricePerMWh, currentLoadMW, priceChange);

    // ========================================
    // SCENARIO 1: High Price - Deploy Batteries
    // ========================================
    if (currentPricePerMWh > THRESHOLDS.PRICE_HIGH) {
        const battery = RESOURCES.find(r => r.id === 'BAT_WEST')!;
        const profit = currentPricePerMWh - battery.marginalCost;
        const deployMW = Math.min(battery.capacityMW, Math.round(profit * 2));

        decisions.push({
            id: `sced-${Date.now()}-bat`,
            action: 'DEPLOY',
            resource: battery.name,
            targetMW: deployMW,
            confidence: baseConfidence + (currentPricePerMWh > THRESHOLDS.PRICE_SPIKE ? 0.15 : 0),
            reasoning: [
                `Price at $${currentPricePerMWh.toFixed(2)}/MWh exceeds $${THRESHOLDS.PRICE_HIGH} threshold`,
                `Expected arbitrage profit: $${profit.toFixed(2)}/MWh`,
                priceChange > 0 ? `Price trending UP (+$${priceChange.toFixed(2)})` : `Price stable`,
                `Battery discharge at ${deployMW}MW recommended`
            ],
            modelId: 'sced-optimizer-v2',
            expectedProfit: profit * deployMW,
            priority: currentPricePerMWh > THRESHOLDS.PRICE_SPIKE ? 'CRITICAL' : 'HIGH'
        });
    }

    // ========================================
    // SCENARIO 2: High Load - Dispatch Peakers
    // ========================================
    if (currentLoadMW > THRESHOLDS.LOAD_HIGH) {
        const peaker = RESOURCES.find(r => r.id === 'PEAK_4')!;
        const loadOverThreshold = currentLoadMW - THRESHOLDS.LOAD_HIGH;
        const dispatchMW = Math.min(peaker.capacityMW, Math.round(loadOverThreshold * 0.5));

        decisions.push({
            id: `sced-${Date.now()}-peak`,
            action: 'RAMP_UP',
            resource: peaker.name,
            targetMW: dispatchMW,
            confidence: baseConfidence,
            reasoning: [
                `System load ${(currentLoadMW / 1000).toFixed(1)}GW exceeds ${(THRESHOLDS.LOAD_HIGH / 1000).toFixed(1)}GW threshold`,
                `Capacity shortfall of ${loadOverThreshold}MW detected`,
                `Peaker dispatch at $${peaker.marginalCost}/MWh is economic`,
                `Ramp rate: ${peaker.rampRate}MW/min, full dispatch in ${Math.ceil(dispatchMW / peaker.rampRate)}min`
            ],
            modelId: 'sced-optimizer-v2',
            expectedProfit: (currentPricePerMWh - peaker.marginalCost) * dispatchMW,
            priority: currentLoadMW > THRESHOLDS.LOAD_CRITICAL ? 'CRITICAL' : 'HIGH'
        });
    }

    // ========================================
    // SCENARIO 3: Low/Negative Price - Curtail Wind
    // ========================================
    if (currentPricePerMWh < THRESHOLDS.PRICE_LOW) {
        const wind = RESOURCES.find(r => r.id === 'WIND_COAST')!;
        const curtailMW = Math.round(wind.capacityMW * 0.15); // Curtail 15%

        decisions.push({
            id: `sced-${Date.now()}-wind`,
            action: 'CURTAIL',
            resource: wind.name,
            targetMW: curtailMW,
            confidence: baseConfidence - 0.1, // Lower confidence for curtailment
            reasoning: [
                `Price at $${currentPricePerMWh.toFixed(2)}/MWh below $${THRESHOLDS.PRICE_LOW} threshold`,
                currentPricePerMWh < 0 ? `NEGATIVE PRICING in effect - congestion present` : `Low demand period`,
                `Wind curtailment reduces transmission congestion`,
                `Recommended curtailment: ${curtailMW}MW (${((curtailMW / wind.capacityMW) * 100).toFixed(0)}% of capacity)`
            ],
            modelId: 'sced-optimizer-v2',
            expectedProfit: Math.abs(currentPricePerMWh) * curtailMW, // Avoided negative revenue
            priority: currentPricePerMWh < 0 ? 'HIGH' : 'MEDIUM'
        });
    }

    // ========================================
    // SCENARIO 4: Low Price - Charge Batteries
    // ========================================
    if (currentPricePerMWh < THRESHOLDS.PRICE_LOW && currentLoadMW < THRESHOLDS.LOAD_HIGH) {
        const battery = RESOURCES.find(r => r.id === 'BAT_COAST')!;
        const chargeMW = Math.round(battery.capacityMW * 0.8);

        decisions.push({
            id: `sced-${Date.now()}-charge`,
            action: 'CHARGE',
            resource: battery.name,
            targetMW: chargeMW,
            confidence: baseConfidence,
            reasoning: [
                `Low price period: $${currentPricePerMWh.toFixed(2)}/MWh`,
                `Optimal charging window detected`,
                `Charging at ${chargeMW}MW for peak arbitrage`,
                `Expected peak price differential: +$${(THRESHOLDS.PRICE_HIGH - currentPricePerMWh).toFixed(2)}/MWh`
            ],
            modelId: 'sced-optimizer-v2',
            expectedProfit: (THRESHOLDS.PRICE_HIGH - currentPricePerMWh) * chargeMW * 0.85, // 85% round-trip efficiency
            priority: 'MEDIUM'
        });
    }

    // ========================================
    // DEFAULT: System Optimized
    // ========================================
    if (decisions.length === 0) {
        decisions.push({
            id: `sced-${Date.now()}-hold`,
            action: 'HOLD',
            resource: 'All Assets',
            targetMW: 0,
            confidence: 0.85,
            reasoning: [
                `Market price $${currentPricePerMWh.toFixed(2)}/MWh within normal band`,
                `System load ${(currentLoadMW / 1000).toFixed(1)}GW within capacity`,
                `No arbitrage opportunity detected`,
                `Maintaining current dispatch schedule`
            ],
            modelId: 'sced-optimizer-v2',
            expectedProfit: 0,
            priority: 'LOW'
        });
    }

    return decisions.sort((a, b) => {
        // Sort by priority, then confidence
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.confidence - a.confidence;
    });
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Run SCED analysis and return dispatch recommendations.
 * 
 * @param input - Current grid and market conditions
 * @returns Promise<SCEDAnalysisResult> - AI-generated dispatch decisions with reasoning
 */
export async function getDispatchRecommendations(input: SCEDInput): Promise<SCEDAnalysisResult> {
    const startTime = Date.now();

    // Simulate computation time (essential for UI "feel")
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

    const decisions = generateDecisions(input);
    const marketCondition = determineMarketCondition(input.currentPricePerMWh, input.currentLoadMW);

    // Calculate system health (inverse of stress)
    let systemHealth = 100;
    if (marketCondition === 'EMERGENCY') systemHealth = 35;
    else if (marketCondition === 'STRESSED') systemHealth = 60;
    else if (marketCondition === 'VOLATILE') systemHealth = 75;

    const result: SCEDAnalysisResult = {
        timestamp: new Date().toISOString(),
        decisions,
        marketCondition,
        systemHealth,
        analysisTimeMs: Date.now() - startTime
    };

    // Log to audit trail
    auditService.log({
        operatorId: 'SYS-SCED',
        eventType: 'AI_RECOMMENDATION',
        resource: 'SCED_ANALYSIS',
        details: `Generated ${decisions.length} recommendations. Market: ${marketCondition}. Top action: ${decisions[0]?.action || 'NONE'}`
    });

    return result;
}

/**
 * Execute a dispatch decision (send to control system)
 */
export async function executeDispatch(decision: DispatchDecision): Promise<boolean> {
    // Simulate control system communication
    await new Promise(resolve => setTimeout(resolve, 200));

    auditService.log({
        operatorId: 'OPERATOR',
        eventType: 'OPERATOR_APPROVAL',
        resource: decision.resource,
        details: `Executed ${decision.action} for ${decision.targetMW}MW. Confidence: ${(decision.confidence * 100).toFixed(0)}%`
    });

    console.log(`[SCED] Dispatch executed: ${decision.action} ${decision.targetMW}MW on ${decision.resource}`);
    return true;
}
