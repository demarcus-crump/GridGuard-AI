
import { notificationService } from "./notificationService";

/**
 * GOVERNANCE PILLAR D: FAIRNESS & PRIVACY (INPUT GUARD)
 * 
 * This service acts as an "Anonymization Proxy".
 * It intercepts User Prompts BEFORE they are sent to the AI.
 * 
 * OBJECTIVES:
 * 1. Remove Socio-Economic Indicators (Prevent Bias).
 * 2. Scrub PII (Protect Privacy).
 * 3. Enforce "Blind Operation" protocols.
 */

export interface SanitizationResult {
  safeText: string;
  wasSanitized: boolean;
  redactedTypes: string[];
}

class PrivacyGuard {
  
  // Patterns that suggest bias or PII
  private PATTERNS = [
    { type: 'SOCIO_ECONOMIC', regex: /\b(wealthy|poor|low-income|high-income|rich|ghetto|upscale|luxury|slum)\b/gi, replacement: '[REDACTED_SOCIO_ECONOMIC]' },
    { type: 'DEMOGRAPHIC', regex: /\b(black|white|hispanic|asian|minority|demographic)\b/gi, replacement: '[REDACTED_DEMOGRAPHIC]' },
    { type: 'PII_PHONE', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },
    { type: 'PII_EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[REDACTED_EMAIL]' },
    // Example: Specific neighborhoods known for demographic variance (Sanitized for fairness)
    { type: 'GEO_BIAS', regex: /\b(highland park|river oaks|fifth ward|pleasant grove)\b/gi, replacement: '[REDACTED_LOCATION_BIAS]' }
  ];

  public sanitize(input: string): SanitizationResult {
    let safeText = input;
    const redactedTypes: string[] = [];
    let wasSanitized = false;

    this.PATTERNS.forEach(pattern => {
      if (pattern.regex.test(safeText)) {
        safeText = safeText.replace(pattern.regex, pattern.replacement);
        if (!redactedTypes.includes(pattern.type)) {
            redactedTypes.push(pattern.type);
        }
        wasSanitized = true;
      }
    });

    if (wasSanitized) {
        notificationService.info("Privacy Guard Active", `Input sanitized to remove ${redactedTypes.join(', ')} data.`);
    }

    return { safeText, wasSanitized, redactedTypes };
  }
}

export const privacyGuard = new PrivacyGuard();
