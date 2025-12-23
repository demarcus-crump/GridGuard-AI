# Changelog

All notable changes to GridGuard AI are documented here.

---

## [3.0.0] - 2025-12-17

### Added

#### AI Governance (NIST AI RMF 1.0)
- **Bias Testing Service** - Fairness metrics, disparate impact detection
- **Model Monitor Service** - Drift detection, hallucination checking
- **Governance Page** - Dashboard for compliance metrics
- **AI Systems Catalog** - Complete AI component registry

#### Data Intelligence
- **Research Agent** - White paper discovery (NERC, ERCOT, IEEE, NIST, DOE)
- **Data Import Service** - Bulk CSV import with column mapping
- **Vector Store** - IndexedDB-backed RAG embeddings
- **Fine-Tuning Service** - Gemini JSONL export for model training

#### Advanced Features
- **Cyber Sim Page** - Attack scenario training (SCADA, DDoS, Ransomware)
- **Predictive Alerts Panel** - N-1 contingency analysis on Dashboard
- **Incident Recordings Tab** - Flight recorder on Historical page

### Changed
- Updated README.md to v3.0.0
- Updated ARCHITECTURE.md with new services
- Updated AI_GOVERNANCE_FRAMEWORK.md for NIST alignment
- Added Governance and Research to sidebar navigation

---

## [2.0.0] - 2025-12-01

### Added
- **3D Digital Twin** - CesiumJS integration
- **Voice Commands** - Gemini Live API
- **Audit Trail** - SHA-256 immutable logging
- **Predictive Service** - N-1 contingency analysis
- **Incident Recorder** - Flight recorder
- **Offline Service** - Air-gapped mode
- **Sync Service** - Multi-user collaboration

---

## [1.0.0] - 2025-11-15

### Added
- Initial platform release
- Dashboard with live telemetry
- Multi-agent orchestrator
- AI chat with Gemini Pro
- Safety guardrails
- Scenario simulator
