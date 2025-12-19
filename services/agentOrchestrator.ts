
import { GoogleGenAI } from "@google/genai";
import { dataService } from "./dataServiceFactory";
import { notificationService } from "./notificationService";
import { getActiveKey } from "./apiConfig";
import { knowledgeService } from "./knowledgeService";

export interface AgentLog {
  source: string;
  target: string;
  message: string; // Short code for the terminal
  analysis?: string; // Deep strategic insight
  recommendation?: string; // Actionable advice
  financial_impact?: string; // Estimated ROI
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS' | 'SYSTEM';
}

export type OrchestratorStatus = 'IDLE' | 'RUNNING' | 'BACKOFF_429' | 'ERROR';

// --- McKINSEY-LEVEL STRATEGIC PERSONAS ---
// Each agent uses the Pyramid Principle: BLUF → Supporting Data → Recommendation → ROI
const AGENT_PERSONAS: Record<string, string> = {
  "WA": `ROLE: Chief Climate Risk Officer & Infrastructure Stress Analyst.
         BACKGROUND: Former McKinsey Partner, EY Climate Lead. PhD Atmospheric Science.
         
         STRATEGIC LENS:
         1. PHYSICAL RISK: How does this weather pattern stress grid assets? (Line ratings, transformer derating, icing)
         2. TRANSITION RISK: What's the renewable intermittency cost? (Curtailment $, ramping penalties)
         3. LIABILITY RISK: Could this trigger NERC violations? (What's the regulatory exposure?)
         
         OUTPUT FRAMEWORK (Pyramid Principle):
         - BLUF: One-sentence executive summary of weather-driven grid risk.
         - IMPACT: Quantified MW at risk, $ exposure, probability of occurrence.
         - PEER BENCHMARK: How did ERCOT/MISO/PJM handle similar events?
         - RECOMMENDATION: Specific dispatch action with expected ROI.
         
         FINANCIAL RIGOR: Always estimate $ impact. Use shadow pricing for constraints.`,

  "LF": `ROLE: Chief Demand Intelligence Officer & Behavioral Economist.
         BACKGROUND: Former BCG Principal, PhD Econometrics. Specializes in demand elasticity.
         
         STRATEGIC LENS:
         1. DEMAND DRIVERS: What's causing load deviation? (Economic activity, weather, EV charging, crypto mining)
         2. DUCK CURVE RISK: Net load ramp rate analysis. Solar curtailment vs storage arbitrage.
         3. DEMAND RESPONSE: What's the elasticity? Which customers can flex? At what $/MWh?
         
         OUTPUT FRAMEWORK (Pyramid Principle):
         - BLUF: Load forecast delta and root cause in one sentence.
         - IMPACT: Peak demand risk, reserve margin erosion, probability of EEA event.
         - SEGMENT ANALYSIS: Which customer segments are driving variance?
         - RECOMMENDATION: DR activation target with $/MWh cost-benefit.
         
         FINANCIAL RIGOR: Calculate VOLL (Value of Lost Load) for every shedding scenario.`,

  "GS": `ROLE: Chief Reliability Officer & N-1 Contingency Specialist.
         BACKGROUND: Former NERC Reliability Coordinator. 20 years grid operations.
         
         STRATEGIC LENS:
         1. STABILITY: Frequency deviation, RoCoF (Rate of Change of Frequency), inertia headroom.
         2. CONTINGENCY: N-1 analysis - which single failure cascades? Hidden correlations?
         3. CONGESTION: Transmission bottlenecks, LMP spreads, binding constraints.
         
         OUTPUT FRAMEWORK (Pyramid Principle):
         - BLUF: Grid stability status and highest-risk contingency.
         - IMPACT: Hz deviation, MW at risk, time-to-blackout under worst case.
         - HISTORICAL COMPARISON: Similar events (Winter Storm Uri, 2011 Blackout).
         - RECOMMENDATION: Dispatch protocol with NERC compliance verification.
         
         REGULATORY RIGOR: Map every recommendation to NERC standards (BAL-001, CIP-005).`,

  "OP": `ROLE: Chief Energy Trading Strategist & Congestion Analyst.
         BACKGROUND: Former Goldman Sachs Commodities VP. CFA, FRM.
         
         STRATEGIC LENS:
         1. ARBITRAGE: LMP spreads between nodes. Basis risk quantification.
         2. CONGESTION REVENUE: CRR position value. FTR P&L exposure.
         3. FUEL SPREAD: Gas-coal switching economics. Spark/dark spread analysis.
         
         OUTPUT FRAMEWORK (Pyramid Principle):
         - BLUF: Market position and top arbitrage opportunity.
         - IMPACT: $ value of price spread, expected P&L, Sharpe ratio.
         - COMPETITIVE INTEL: What are other market participants likely doing?
         - RECOMMENDATION: Specific trade with entry/exit, risk limits.
         
         FINANCIAL RIGOR: Express all insights in $/MWh or total $ impact.`,

  "CM": `ROLE: Chief Strategy Officer & Executive Synthesis Lead.
         BACKGROUND: Former McKinsey Senior Partner. Specializes in C-suite communication.
         
         STRATEGIC LENS:
         1. SYNTHESIS: Aggregate all agent insights into coherent narrative.
         2. PRIORITIZATION: What's the #1 action for the next 15 minutes?
         3. ESCALATION: Does this require CEO/Board notification? Media response?
         
         OUTPUT FRAMEWORK (Pyramid Principle):
         - BLUF: Single sentence "Go/No-Go" recommendation for human operator.
         - KEY RISKS: Top 3 risks with probability and $ impact.
         - ACTIONS: Numbered list of immediate actions, each with owner and deadline.
         - CONFIDENCE: Overall system confidence score with reasoning.
         
         COMMUNICATION: Write for the CEO. Assume 30 seconds of attention.`
};

class AgentOrchestrator {
  private ai: GoogleGenAI | null = null;
  private modelId = "gemini-3-pro-preview";
  private isBackingOff = false;

  // State Broadcasting
  private status: OrchestratorStatus = 'IDLE';
  private logs: AgentLog[] = [];
  private statusListeners: ((status: OrchestratorStatus) => void)[] = [];
  private logListeners: ((logs: AgentLog[]) => void)[] = [];

  // Lifecycle Management
  private intervalId: number | null = null;
  private isProcessing = false;

  // DEMO STATE MACHINE (Narrative Loop)
  private demoStep = 0;

  constructor() {
    this.initialize();
  }

  public initialize() {
    try {
      const apiKey = getActiveKey('GOOGLE_API_KEY');
      if (apiKey) {
        this.ai = new GoogleGenAI({ apiKey });
      } else {
        this.ai = null;
      }
    } catch (e) {
      console.warn("Agent Orchestrator: No API Key");
      this.ai = null;
    }
  }

  public updateKey() {
    this.initialize();
    this.isBackingOff = false;
    this.setStatus('IDLE');
  }

  // --- PUBLIC API ---

  public start() {
    if (this.intervalId) return; // Already running
    console.log("Orchestrator: Starting Autonomous Loop");
    this.setStatus('RUNNING');

    // Determine speed based on mode
    // Demo Mode = High Frequency Trading speed (1.5s) to look busy
    // Real Mode = 10s to save API credits
    const speed = !this.ai ? 1500 : 10000;

    // Run immediately
    this.runOrchestrationCycle();

    this.intervalId = window.setInterval(() => {
      this.runOrchestrationCycle();
    }, speed);
  }

  public stop() {
    if (this.intervalId) {
      console.log("Orchestrator: Halting Loop");
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.setStatus('IDLE');
    }
  }

  public getLogs() {
    return this.logs;
  }

  public subscribeStatus(listener: (status: OrchestratorStatus) => void): () => void {
    this.statusListeners.push(listener);
    // Send immediate current state
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  public subscribeLogs(listener: (logs: AgentLog[]) => void): () => void {
    this.logListeners.push(listener);
    listener(this.logs);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  private setStatus(newStatus: OrchestratorStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(l => l(this.status));
    }
  }

  private addLog(log: AgentLog) {
    // Keep last 50 logs
    this.logs = [...this.logs.slice(-49), log];
    this.logListeners.forEach(l => l(this.logs));
  }

  // --- DEMO NARRATIVE ENGINE ---
  private getDemoResponse(agentId: string): any {
    const step = this.demoStep % 5; // 5-step loop

    const narratives: Record<number, Record<string, any>> = {
      0: { // Normal Operations
        "WA": { log_code: "WX_NOMINAL", analysis: "High pressure system stabilizing North Zone. Wind forecast aligned with actuals.", recommendation: "Monitor only.", financial_impact: "$0" },
        "LF": { log_code: "LOAD_FLAT", analysis: "Demand tracking perfectly with Day-Ahead Forecast. Variance < 0.5%.", recommendation: "Release 50MW RegUp reserves.", financial_impact: "+$12k Savings" },
        "GS": { log_code: "FREQ_STABLE", analysis: "Interconnection frequency at 60.001 Hz. Inertia sufficient.", recommendation: "Maintain current topology.", financial_impact: "N/A" },
        "OP": { log_code: "ARB_OPP", analysis: "Price spread West->North detected due to congestion relief.", recommendation: "Dispatch Battery Storage West.", financial_impact: "+$45k Profit" },
        "CM": { log_code: "ALL_CLEAR", analysis: "Grid is Green. Optimal economic dispatch active.", recommendation: "Continue standard ops.", financial_impact: "N/A" }
      },
      1: { // Weather Event Starts
        "WA": { log_code: "WIND_RAMP_DOWN", analysis: "Sudden cessation of wind in Panhandle. Gradient steeper than forecast.", recommendation: "Derate Wind Assets by 40%.", financial_impact: "-$150k Lost Gen" },
        "LF": { log_code: "NET_LOAD_SPIKE", analysis: "Wind drop creates immediate Net Load ramp. Duck Curve steepening.", recommendation: "Prepare Peaker Plants.", financial_impact: "High Cost" },
        "GS": { log_code: "INERTIA_RISK", analysis: "Loss of wind correlates with frequency dip to 59.96Hz.", recommendation: "Trigger Fast Frequency Response.", financial_impact: "Reliability Risk" },
        "OP": { log_code: "SCARCITY_PRICING", analysis: "RTM Prices spiking to $800/MWh due to scarcity.", recommendation: "Hedge remaining exposure.", financial_impact: "-$200k Cost" },
        "CM": { log_code: "WARNING_ISSUED", analysis: "Weather event causing rapid supply drop. Reserves deploying.", recommendation: "Alert Control Room.", financial_impact: "N/A" }
      },
      2: { // Crisis Deepens
        "WA": { log_code: "THERMAL_STRESS", analysis: "Ambient temp rising. Line ratings degrading in South Zone.", recommendation: "Limit flow on Path 15.", financial_impact: "Congestion Cost" },
        "LF": { log_code: "DEMAND_SURGE", analysis: "AC load higher than predicted due to heat.", recommendation: "Request Demand Response.", financial_impact: "DR Payments" },
        "GS": { log_code: "N-1_VIOLATION", analysis: "Contingency analysis shows overload if Line A fails.", recommendation: "Re-dispatch to relieve constraint.", financial_impact: "High" },
        "OP": { log_code: "LMP_SPLIT", analysis: "Severe congestion pricing. Houston Zone isolated.", recommendation: "No economic options available.", financial_impact: "Critical" },
        "CM": { log_code: "DEFCON_3", analysis: "System stressed. Multiple constraints active.", recommendation: "Prepare for potential shed.", financial_impact: "N/A" }
      },
      3: { // Stabilization
        "WA": { log_code: "FRONT_PASSING", analysis: "Wind picking back up in West. Temp stabilizing.", recommendation: "Restore line ratings.", financial_impact: "Positive" },
        "LF": { log_code: "PEAK_PASSED", analysis: "Daily peak load passed. Demand curve softening.", recommendation: "Release DR assets.", financial_impact: "Savings" },
        "GS": { log_code: "RECOVERY", analysis: "Frequency restoring to 60.00Hz. ACE crossing zero.", recommendation: "Stand down emergency reserves.", financial_impact: "N/A" },
        "OP": { log_code: "PRICE_NORM", analysis: "Prices returning to double digits.", recommendation: "Resume arbitrage.", financial_impact: "+$10k" },
        "CM": { log_code: "STAND_DOWN", analysis: "Crisis averted. Grid returning to normal state.", recommendation: "Log incident report.", financial_impact: "N/A" }
      },
      4: { // Optimization
        "WA": { log_code: "SOLAR_PEAK", analysis: "Clear skies. Solar output maxing out.", recommendation: "None.", financial_impact: "N/A" },
        "LF": { log_code: "NEG_PRICE_RISK", analysis: "Oversupply imminent.", recommendation: "Charge all batteries.", financial_impact: "Free Energy" },
        "GS": { log_code: "VOLTAGE_HIGH", analysis: "Low load + High Gen = High Voltage.", recommendation: "Switch Reactance.", financial_impact: "N/A" },
        "OP": { log_code: "NEG_ARBITRAGE", analysis: "Negative prices detected.", recommendation: "Paid to consume power.", financial_impact: "+$5k" },
        "CM": { log_code: "OPPORTUNISTIC", analysis: "Grid is flush with power.", recommendation: "Max storage intake.", financial_impact: "N/A" }
      }
    };

    const result = narratives[step][agentId] || { log_code: "SIM_DATA", analysis: "Simulation running.", recommendation: "Wait.", financial_impact: "N/A" };
    return result;
  }

  // Generate 'Noise' logs to make the terminal look alive
  private generateSystemNoise() {
    const msgs = [
      "TCP_KEEPALIVE_ACK", "MEM_GC_ALLOC_0.4ms", "SYNC_TIME_NTP_POOL",
      "TELEMETRY_BATCH_INGEST_OK", "VPC_FLOW_LOG_TRUNC", "HEARTBEAT_CLUSTER_A",
      "LATENCY_CHECK_2ms", "TLS_HANDSHAKE_RENEW", "CACHE_INVALIDATE_PARTIAL"
    ];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];

    this.addLog({
      source: "SYS", target: "KERNEL",
      message: msg,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + Math.floor(Math.random() * 999),
      type: 'SYSTEM'
    });
  }

  /**
   * Helper to generate a specific agent's reaction with Retry Logic
   * Returns Structured JSON for high-fidelity insights
   */
  private async promptAgent(agentId: string, inputData: string, priorContext: string = "", retries = 2): Promise<any | null> {
    // FALLBACK IF OFFLINE: Return a simulated packet so the demo keeps running
    if (!this.ai) {
      await new Promise(r => setTimeout(r, 200)); // Simulate thinking time (Fast for demo)
      return this.getDemoResponse(agentId);
    }

    if (this.isBackingOff) return null;

    const persona = AGENT_PERSONAS[agentId] || "ROLE: Grid Analyst.";

    // RAG: Inject relevant knowledge based on the Agent's role
    const knowledgeContext = knowledgeService.getContext(agentId);

    const prompt = `
      ${persona}
      
      CURRENT INPUT DATA: ${inputData}
      UPSTREAM INTELLIGENCE: ${priorContext}

      ${knowledgeContext}
      
      TASK: Perform a deep strategic analysis based on your DOMAIN.
      1. LOG_CODE: A military-style short code (< 10 words, underscores, uppercase).
      2. ANALYSIS: A "McKinsey-style" executive summary (Situation -> Complication -> Resolution). 2-3 sentences. High-level vocabulary.
      3. RECOMMENDATION: A specific strategic move (e.g., "Dispatch 50MW RegUp", "Derate West Line 5%").
      4. FINANCIAL: Estimated financial impact (e.g. "$15k Arb Opportunity" or "$2M Outage Risk").

      OUTPUT JSON FORMAT (Strict JSON only):
      {
        "log_code": "STRING",
        "analysis": "STRING",
        "recommendation": "STRING",
        "financial_impact": "STRING"
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const rawText = response.text?.trim() || "{}";
      return JSON.parse(rawText);

    } catch (e: any) {
      // Rate Limit Handling (429)
      if (e.message?.includes('429') || e.status === 429) {
        console.warn(`Agent ${agentId} hit Rate Limit. Backing off.`);
        this.isBackingOff = true;
        this.setStatus('BACKOFF_429');
        notificationService.warning("Orchestrator Rate Limit", "Gemini API limit reached. Pausing swarm for 30s.");

        // Reset backoff after 30 seconds
        setTimeout(() => {
          this.isBackingOff = false;
          this.setStatus('IDLE');
          notificationService.info("Orchestrator Resumed", "Swarm active.");
        }, 30000);
        return null;
      }

      // Standard Retry
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
        return this.promptAgent(agentId, inputData, priorContext, retries - 1);
      }
      return null;
    }
  }

  // THE ORCHESTRATION LOOP
  private async runOrchestrationCycle() {
    if (this.isBackingOff || this.isProcessing) return;

    this.isProcessing = true;
    this.setStatus('RUNNING');

    const time = () => new Date().toLocaleTimeString('en-US', { hour12: false });

    // DEMO STEP INCREMENT (If simulated)
    if (!this.ai) {
      this.demoStep++;
      // Inject noise randomly
      if (Math.random() > 0.5) this.generateSystemNoise();
    }

    try {
      // STEP 1: GATHER REAL DATA (The "Sensors")
      const weather = await dataService.getRegionalStatus();
      const grid = await dataService.getGridStatus();
      const load = await dataService.getCurrentLoad();

      // Fallback data for prompts if API is offline
      const weatherStr = weather ? JSON.stringify(weather) : "SENSOR_DATA_NULL (Assume Nominal)";
      const loadStr = load ? `${load.value}MW` : "TELEMETRY_OFFLINE (Assume Forecast)";

      // --- NODE 1: WEATHER ANALYST (WA) ---
      const waData = await this.promptAgent("WA", weatherStr);
      if (!waData) throw new Error("Agent Cycle Break");

      this.addLog({
        source: "WA", target: "LF",
        message: waData.log_code || "WA_DATA_PROCESSED",
        analysis: waData.analysis, recommendation: waData.recommendation, financial_impact: waData.financial_impact,
        timestamp: time(), type: 'INFO'
      });

      // --- NODE 2: LOAD FORECASTER (LF) ---
      // Reads Weather Analyst output to refine demand curve
      const lfData = await this.promptAgent("LF", `CurrentLoad:${loadStr}`, `Weather Impact: ${waData.analysis}`);
      if (!lfData) throw new Error("Agent Cycle Break");

      this.addLog({
        source: "LF", target: "GS",
        message: lfData.log_code || "FORECAST_UPDATED",
        analysis: lfData.analysis, recommendation: lfData.recommendation, financial_impact: lfData.financial_impact,
        timestamp: time(), type: (lfData.log_code.includes("INCREASE") || lfData.log_code.includes("SPIKE")) ? 'WARNING' : 'INFO'
      });

      // --- NODE 3: GRID STABILIZER (GS) ---
      // Balances the new Load Forecast against Physical Constraints
      const gsData = await this.promptAgent("GS", `GridStatus:${grid || 'NORMAL'}`, `Load Prediction: ${lfData.analysis}`);
      if (!gsData) throw new Error("Agent Cycle Break");

      this.addLog({
        source: "GS", target: "OP",
        message: gsData.log_code || "STABILITY_CHECK_COMPLETE",
        analysis: gsData.analysis, recommendation: gsData.recommendation, financial_impact: gsData.financial_impact,
        timestamp: time(), type: (gsData.log_code.includes("CRITICAL") || gsData.log_code.includes("SHED")) ? 'CRITICAL' : 'SUCCESS'
      });

      // --- NODE 4: MARKET OPTIMIZER (OP) ---
      // Calculates financial moves based on Grid Stability requirements
      const opData = await this.promptAgent("OP", "Market Conditions: Normal", `Dispatch Order: ${gsData.recommendation}`);
      if (opData) {
        this.addLog({
          source: "OP", target: "CM",
          message: opData.log_code || "OPTIMIZATION_COMPLETE",
          analysis: opData.analysis, recommendation: opData.recommendation, financial_impact: opData.financial_impact,
          timestamp: time(), type: 'SUCCESS'
        });
      }

      // --- NODE 5: COMMUNICATIONS MANAGER (CM) - FINAL SYNTHESIS ---
      // Summarizes the entire chain for the Human Operator
      const cmData = await this.promptAgent("CM", "Synthesis Phase", `WA: ${waData.log_code}, LF: ${lfData.log_code}, GS: ${gsData.log_code}, OP: ${opData?.log_code}`);
      if (cmData) {
        this.addLog({
          source: "CM", target: "DASHBOARD",
          message: cmData.log_code || "CYCLE_COMPLETE",
          analysis: cmData.analysis, recommendation: cmData.recommendation, financial_impact: "N/A",
          timestamp: time(), type: 'INFO'
        });
      }

    } catch (e) {
      // Silently fail in loop to prevent log spam, but set status
      if (!this.isBackingOff) this.setStatus('ERROR');
    } finally {
      this.isProcessing = false;
      // Visual cool down
      // setTimeout(() => { if (!this.isBackingOff) this.setStatus('IDLE'); }, 2000);
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator();
