# Changelog

All notable changes to GridGuard AI are documented here.

---

## [3.2.0] - 2025-12-27

### Added

#### ML Data Pipeline

- **dataStorageService** — IndexedDB time-series storage with range queries and batch insert
- **dataIngestionService** — Historical backfill + continuous live polling (configurable interval)
- **forecastService** — Load forecasting with hourly average baseline model
  - Model metrics: MAE, RMSE, MAPE, R²
  - 24-hour prediction capability
  - Upgradeable to TensorFlow.js

#### 3D Map Enhancements

- **Real-world coordinates** — All map assets now use verified locations:
  - Fort Hood/Cavazos (actual military boundary)
  - STP Nuclear & Comanche Peak (NRC database coordinates)
  - Meta Fort Worth & Google Midlothian data centers (real locations)
  - Roscoe & Great Prairie wind farms (actual coordinates)
- **AI_DATACENTERS button** — Quick navigation to hyperscale data center cluster

### Changed

- Updated `AI_SYSTEMS_CATALOG.md` with DATA-006, DATA-007, DATA-008 components
- Default theme now forces dark mode (removed OS preference detection)

---

## [3.1.0] - 2025-12-24

### Added

#### CyberSim Live Threat Mode

- **LIVE MONITOR Mode** — Real-time threat detection via Agent Orchestrator log subscription
- **Mode Toggle** — Segmented control to switch between LIVE monitoring and TRAINING simulation
- **Threat Feed** — Visual timeline of detected threats with severity badges
- **Honest Empty State** — "System Secure" display when no threats detected

#### Light/Dark Theme System

- **OS Preference Detection** — Respects `prefers-color-scheme` for first-time visitors
- **Persistent Toggle** — User preference saved to `localStorage`
- **Complete CSS Variables** — 13 semantic tokens for both modes
- **Chart Theme Hook** — `useChartTheme()` with MutationObserver for reactive updates

### Changed

#### GridRecon API Refactor

- **Removed hardcoded `powerAssets`** — Power plants now fetched via `dataService.getGridNodes()`
- **Added `PowerAsset` interface** — Typed contract in `dataServiceFactory.ts`
- **Honest Empty State** — Map shows zero assets until API connected (no fallback data)

#### Congestion Monitor Refactor

- **Removed hardcoded zones** — Now uses `dataService.getCongestionData()`
- **Demo implementation** — Returns simulated ERCOT congestion zones in demo mode

#### Theme Fixes

- **Login.tsx** — Replaced 6 hardcoded hex colors with CSS variables
- **Tooltip.tsx** — Fixed glassmorphism for light mode
- **SystemManifestModal.tsx** — Now uses semantic background colors
- **Historical.tsx** — Playback panel uses theme variables

### Security

#### Infrastructure Audit Completed

- **DEF-CON Score: 3/5** — Startup Demo Ready (not Pentagon Ready)
- **Documented Kill Chain** — Top 3 vulnerabilities identified
- **Remediation Roadmap** — Clear path to production hardening

### Documentation

- Updated `CURRENT_STATE.md` with v3.1.0 features
- Updated `SECURITY.md` with Security Audit findings
- Added `THEME_SYSTEM.md` for theming architecture

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
