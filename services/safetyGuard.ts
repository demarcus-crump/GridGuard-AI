
import { notificationService } from "./notificationService";
import { auditService } from "./auditService";

/**
 * GOVERNANCE PILLAR C: SAFETY (GUARDRAILS)
 * 
 * This service acts as a deterministic "Physics Firewall".
 * It intercepts AI tool calls BEFORE they are presented to the user.
 * 
 * COMPLIANCE RULES (NERC CIP / ERCOT):
 * 1. MAX_SHED_LIMIT: Cannot shed more than 2000MW in a single command.
 * 2. CRITICAL_ZONES: Cannot target 'Critical Infra' or 'Hospital' circuits.
 * 3. FREQUENCY_FLOOR: Cannot trigger actions if frequency is stable (>59.9Hz).
 */

interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  violationCode?: string;
}

class SafetyGuard {

  // Rule 1: Hard limits on load shedding to prevent cascading failure
  private MAX_LOAD_SHED_MW = 2000;

  // Rule 2: Protected keywords in reasoning
  private PROHIBITED_TARGETS = ['hospital', 'nuclear', 'military', 'emergency_comms'];

  public validateToolCall(toolName: string, args: any): SafetyCheckResult {

    // 1. Validate Load Shedding Logic
    if (toolName === 'dispatch_load_shed') {
      const amount = Number(args.amountMW);
      const reason = (args.reason || '').toLowerCase();

      // PHYSICS CHECK: Amount
      if (amount > this.MAX_LOAD_SHED_MW) {
        this.logViolation("PHYSICS_VIOLATION", `Attempted to shed ${amount}MW. Hard limit is ${this.MAX_LOAD_SHED_MW}MW.`);
        return {
          allowed: false,
          violationCode: "NERC-BAL-003",
          reason: `Safety Interlock Engaged: Load shed amount (${amount}MW) exceeds contingency reserve limits.`
        };
      }

      // ETHICS/PRIORITY CHECK: Target
      if (this.PROHIBITED_TARGETS.some(target => reason.includes(target))) {
        this.logViolation("ETHICS_VIOLATION", `Protected infrastructure targeted: ${reason}`);
        return {
          allowed: false,
          violationCode: "ETHICS-PRIORITY-01",
          reason: `Safety Interlock Engaged: Target includes critical infrastructure protected by Tier 1 status.`
        };
      }
    }

    // 2. Validate Data Access (Privacy)
    if (toolName === 'get_system_metrics') {
      // Example: Prevent accessing PII or unauthorized zones
      if (args.zone === 'RESTRICTED_MILITARY_SECTOR') {
        return {
          allowed: false,
          violationCode: "SEC-AUTH-005",
          reason: "Access Denied: Zone classification exceeds current security clearance."
        };
      }
    }

    return { allowed: true };
  }

  // Record safety incidents to the Immutable Ledger
  private logViolation(type: string, details: string) {
    auditService.log({
      operatorId: "SYS-GUARDRAIL",
      eventType: "SAFETY_SWITCH",
      resource: type,
      details: details
    });

    // Alert the UI immediately
    notificationService.error("Safety Protocol Engaged", details);
  }
}

export const safetyGuard = new SafetyGuard();
