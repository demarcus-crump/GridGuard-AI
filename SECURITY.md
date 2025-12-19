# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.0.x | ✅ Current |
| 2.0.x | ⚠️ Limited |
| < 2.0 | ❌ No |

---

## Security Features

### Implemented

| Feature | Description |
|---------|-------------|
| **Safety Guardrails** | Physics-based validation prevents dangerous AI actions |
| **Privacy Protection** | PII redaction before AI processing |
| **Audit Trail** | SHA-256 cryptographic chain of custody |
| **Kill Switches** | Immediate AI shutdown capability |
| **HITL Approval** | Human approval required for all actions |
| **Hallucination Detection** | Fact-checking layer for AI outputs |

### Architecture

```
User Input → Privacy Guard → AI Processing → Safety Guard → Audit Log → Action
                                    ↓
                              Hallucination Check
                                    ↓
                              Human Approval
```

---

## Known Limitations (Prototype)

> ⚠️ **This is a prototype. Do NOT use in production.**

| Limitation | Risk | Mitigation |
|------------|------|------------|
| API keys in localStorage | Key exposure | Deploy backend |
| Browser-only execution | No isolation | Add server layer |
| CORS proxy usage | Data interception | Direct API access |
| IndexedDB storage | Data persistence | Backend database |

---

## Reporting a Vulnerability

1. **Do NOT** open a public issue
2. Email security concerns to the maintainer
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

---

## Compliance

| Standard | Status |
|----------|--------|
| NIST AI RMF 1.0 | ✅ 91% Aligned |
| NERC CIP | ⚠️ Prototype Only |
| SOC 2 | 🔜 Planned |
