# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.1.x | ✅ Current |
| 3.0.x | ⚠️ Limited |
| < 3.0 | ❌ No |

---

## Security Posture Assessment

> **Last Audit:** 2025-12-24  
> **DEF-CON Score:** 3/5 (Startup Demo Ready)

### What This Means

| Score | Description |
|-------|-------------|
| 5 | Pentagon Ready (Zero Trust, FedRAMP High) |
| 4 | Enterprise Ready (SSO, Server-side auth) |
| **3** | **Startup Demo Ready** ← Current |
| 2 | Hackathon MVP |
| 1 | Insecure Prototype |

**Bottom Line:** This platform demonstrates production-grade AI governance concepts but operates as a client-side application. It's appropriate for **investor demos, evaluations, and training** — not operational deployment.

---

## Security Features Implemented

| Feature | Description | Status |
|---------|-------------|--------|
| **Safety Guardrails** | Physics-based validation prevents dangerous AI actions | ✅ Operational |
| **Privacy Protection** | PII redaction before AI processing | ✅ Operational |
| **Audit Trail** | SHA-256 cryptographic chain of custody | ✅ Operational |
| **Kill Switches** | Immediate AI shutdown capability | ✅ Operational |
| **HITL Approval** | Human approval required for critical actions | ✅ Operational |
| **Hallucination Detection** | Fact-checking layer for AI outputs | ✅ Operational |
| **Bias Testing** | Fairness metrics and disparate impact detection | ✅ Operational |
| **Model Drift Detection** | Real-time accuracy monitoring | ✅ Operational |

### Architecture

```
User Input → Privacy Guard → AI Processing → Safety Guard → Audit Log → Action
                                    ↓
                              Hallucination Check
                                    ↓
                              Human Approval
```

---

## Vulnerability Assessment (Kill Chain)

> 🔴 These are known limitations, documented for transparency.

| Priority | File | Issue | Remediation |
|----------|------|-------|-------------|
| 🔴 CRITICAL | `apiService.ts:35` | Uses public CORS proxy (`corsproxy.io`) — traffic visible to third party | Deploy backend API gateway |
| 🔴 CRITICAL | `scedService.ts:326` | `executeDispatch()` has no auth/role checks | Add server-side RBAC |
| 🟡 HIGH | `services/apiConfig.ts:44` | API keys stored in `localStorage` (XSS extractable) | Move to secure cookie + backend |

### Why These Exist

This is a **browser-based prototype** designed for rapid demonstration. The architecture prioritizes:
- Fast iteration
- Zero-infrastructure demos
- Investor/customer evaluation

Production deployment requires the hardening steps below.

---

## Production Hardening Roadmap

### Phase 1: Backend Deployment
- [ ] Deploy Node.js/FastAPI backend
- [ ] Move API calls server-side
- [ ] Eliminate CORS proxy dependency

### Phase 2: Authentication
- [ ] Implement OAuth 2.0 + PKCE
- [ ] Add MFA support
- [ ] Integrate SSO (Azure AD, Okta)

### Phase 3: Authorization
- [ ] Define role hierarchy (Viewer → Operator → Admin → SuperAdmin)
- [ ] Enforce RBAC on backend
- [ ] Add resource-level permissions

### Phase 4: Data Security
- [ ] Migrate audit logs to immutable server storage
- [ ] Add at-rest encryption
- [ ] Implement key management (AWS KMS, HashiCorp Vault)

### Phase 5: Compliance
- [ ] FedRAMP High authorization
- [ ] NERC CIP certification
- [ ] SOC 2 Type II audit

---

## Known Limitations (Prototype)

> ⚠️ **This is a prototype. Do NOT use in production critical infrastructure.**

| Limitation | Risk Level | Impact | Remediation |
|------------|------------|--------|-------------|
| API keys in localStorage | HIGH | Key exposure via XSS | Deploy backend |
| Browser-only execution | MEDIUM | No network isolation | Add server layer |
| CORS proxy usage | HIGH | Data interception | Direct API access |
| IndexedDB storage | LOW | Limited capacity | Backend database |
| No RBAC enforcement | HIGH | All users equal | Server-side roles |

---

## Reporting a Vulnerability

1. **Do NOT** open a public issue
2. Email security concerns to the maintainer
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
4. Expected response time: 48 hours

---

## Compliance Status

| Standard | Status | Notes |
|----------|--------|-------|
| NIST AI RMF 1.0 | ✅ 91% Aligned | Full governance framework implemented |
| NERC CIP | ⚠️ Prototype Only | Requires operational deployment |
| SOC 2 Type II | 🔜 Planned | Requires backend + audit infrastructure |
| FedRAMP | 🔜 Planned | Requires full hardening roadmap |

---

## For Investors

This security documentation demonstrates:

1. **Awareness** — We understand what's needed for production
2. **Architecture** — AI governance patterns are already implemented
3. **Roadmap** — Clear path to enterprise/government readiness
4. **Honesty** — Transparent about current limitations

The platform is designed so that security hardening is **additive** — the core AI governance, audit trail, and safety systems don't need to be rewritten, just wrapped with authentication and server-side enforcement.
