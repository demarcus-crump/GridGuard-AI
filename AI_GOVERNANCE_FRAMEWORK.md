# GridGuard AI - Governance & Ethics Framework

**Compliance Standard:** NIST AI Risk Management Framework (AI RMF 1.0) | NERC CIP  
**Version:** 2.0  
**Last Updated:** 2025-12-17

---

## NIST AI RMF 1.0 Alignment

GridGuard AI implements all four core functions of the NIST AI Risk Management Framework:

| Function | Purpose | Status |
|----------|---------|--------|
| **GOVERN** | Culture, policies, accountability | ✅ Implemented |
| **MAP** | Context, risk identification | ✅ Implemented |
| **MEASURE** | Quantitative assessment | ⚠️ Partial |
| **MANAGE** | Risk mitigation, human oversight | ✅ Implemented |

---

## 1. GOVERN: Accountability & Policies

### Core Philosophy: "Human-in-Command"
GridGuard AI is a **Decision Support System (DSS)**, not an autonomous operator.

> **The AI suggests; the Human decides.**

### Accountability Structure

| Role | Responsibilities |
|------|------------------|
| Operator | Final approval authority for all AI actions |
| AI System | Recommendations only; no autonomous execution |
| Safety Guard | Automatic blocking of physics violations |
| Audit System | SHA-256 chain of custody for all actions |

### Implementation
- ✅ Human-in-the-Loop (HITL) approval flow (`ChatWidget.tsx`)
- ✅ Risk tier system (GREEN/YELLOW/RED) (`Dashboard.tsx`)
- ✅ Role-based permissions (`syncService.ts`)
- ✅ API key controls for third-party services (`apiConfig.ts`)

---

## 2. MAP: Risk Identification

### AI System Context

| Component | Purpose | Risk Level |
|-----------|---------|------------|
| Load Forecaster | Demand prediction | Medium |
| Grid Stabilizer | Real-time balancing | High |
| Emergency Response | Outage coordination | Critical |
| Weather Analyst | Impact assessment | Low |

### Risk Assessment
- ✅ N-1 contingency analysis (`predictiveService.ts`)
- ✅ Cyber attack simulation (`cyberSimService.ts`)
- ✅ Incident recording for post-mortem (`incidentRecorder.ts`)

---

## 3. MEASURE: Transparency & Explainability

### Transparency Requirements

| Requirement | Implementation |
|-------------|----------------|
| Chain-of-Thought | BLUF format for all recommendations |
| Model Cards | Version, training cutoff, limitations |
| Confidence Intervals | Certainty level in predictions |
| Audit Trail | Immutable SHA-256 hashed logs |

### Implementation
- ✅ Model Cards in UI (`ModelCard.tsx`)
- ✅ Confidence intervals in AI responses
- ✅ BLUF (Bottom Line Up Front) format
- ⚠️ Bias testing suite (Future: Phase 2)
- ⚠️ Continuous model monitoring (Future: Phase 2)

---

## 4. MANAGE: Safety & Human Oversight

### Safety Guardrails

| Rule | Limit | Violation Code |
|------|-------|----------------|
| Max Load Shed | ≤ 2000 MW per command | NERC-BAL-003 |
| Protected Targets | Hospitals, Nuclear, Military | ETHICS-PRIORITY-01 |
| Frequency Floor | No action if > 59.9 Hz | PHYSICS-FREQ-001 |
| Data Access | Zone-restricted clearance | SEC-AUTH-005 |

### Kill Switches
- ✅ AI Actuation Toggle (Global off-switch)
- ✅ External Tools Toggle
- ✅ Safe Mode (Read-only)

### Implementation
- ✅ Physics-based guardrails (`safetyGuard.ts`)
- ✅ Privacy protection (`privacyGuard.ts`)
- ✅ Audit logging (`auditService.ts`)
- ✅ Offline/air-gapped mode (`offlineService.ts`)

---

## 5. Ethical AI Principles

### Pillar A: Transparency
Every recommendation includes the "Why" – no black box decisions.

### Pillar B: Accountability
All AI actions are tagged with the approving operator ID and cryptographically hashed.

### Pillar C: Safety
Deterministic tooling with physics validation prevents hallucinated commands.

### Pillar D: Fairness
Load shedding based on criticality (hospitals first), not demographics.

---

## 6. Implementation Checklist

| Feature | Status | File |
|---------|--------|------|
| Human-in-the-Loop UI | ✅ | `ChatWidget.tsx` |
| Model Cards | ✅ | `ModelCard.tsx` |
| Audit Logging (SHA-256) | ✅ | `auditService.ts` |
| Safety Guardrails | ✅ | `safetyGuard.ts` |
| Privacy Protection | ✅ | `privacyGuard.ts` |
| Kill Switches | ✅ | `GridContext.tsx` |
| Incident Recording | ✅ | `incidentRecorder.ts` |
| Offline Mode | ✅ | `offlineService.ts` |
| Bias Testing Suite | ⚠️ | Future Phase 2 |
| Model Drift Monitoring | ⚠️ | Future Phase 2 |

---

## 7. Compliance References

- [NIST AI RMF 1.0](https://www.nist.gov/itl/ai-risk-management-framework)
- [NERC CIP Standards](https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx)
- [ERCOT Operating Guides](https://www.ercot.com/mktrules/guides)
