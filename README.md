# GridGuard AI

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-Enterprise%20Prototype-orange)
![Compliance](https://img.shields.io/badge/NIST%20AI%20RMF-1.0%20Aligned-brightgreen)

> **Cognitive Grid Defense & Management Platform**  
> AI-powered decision support for critical energy infrastructure operators, designed for government, utility, and enterprise deployment.

---

## Executive Summary

GridGuard AI is an **enterprise-grade command center** for electric grid operators and critical infrastructure stakeholders. The platform combines real-time situational awareness, AI-powered analytics, and comprehensive governance frameworks to support grid reliability, cybersecurity preparedness, and regulatory compliance.

**The Challenge:** Modern power grids face increasing complexity from renewable integration, cyber threats, and extreme weather events. Operators need unified visibility across assets, predictive intelligence, and auditable AI decision support.

**Our Solution:** A physics-informed AI platform that provides:
- Real-time grid visualization and monitoring
- Multi-agent AI orchestration with human-in-the-loop controls
- NIST AI RMF 1.0 compliance framework out-of-the-box
- Cybersecurity training and incident response simulation

---

## Target Audiences

| Sector | Primary Use Cases |
|--------|-------------------|
| **Government (DOE, DHS, CISA)** | Grid security assessment, AI governance compliance, critical infrastructure mapping |
| **Electric Utilities** | Real-time operations, load forecasting, N-1 contingency analysis |
| **Data Center Developers** | Site selection near grid capacity, power availability analysis |
| **Oil & Gas Companies** | Pipeline proximity to transmission corridors, substation accessibility |
| **Defense Contractors** | Critical infrastructure visualization, cybersecurity scenario training |
| **Energy Traders** | Market intelligence, nodal price monitoring, demand forecasting |

---

## Platform Capabilities

### Current Status (v3.0.0)

| Capability | Status | Description |
|------------|--------|-------------|
| **3D Digital Twin** | Production | CesiumJS globe with satellite imagery, asset visualization, power flow animation |
| **Real-Time Dashboard** | Production | Grid metrics, regional thermal mapping, predictive alerts (demo data in prototype) |
| **AI Governance** | Production | NIST AI RMF framework, bias testing, model monitoring, cryptographic audit trail |
| **Research Library** | Production | Knowledge sources (NERC, ERCOT, NIST, DOE, IEEE), document management |
| **Cyber Simulation** | Demo | SCADA attack scenarios, DDoS training, ransomware response drills |
| **Agent Orchestrator** | Demo | Multi-agent visualization framework (orchestration architecture ready) |
| **Market Intelligence** | Demo | News aggregation from energy publications |

### Commercial-Ready Vision

With enterprise data integration, GridGuard AI enables:

| Use Case | Required Integration | Value Delivered |
|----------|----------------------|-----------------|
| **Optimal Site Selection** | GIS data, substation capacity feeds | Identify ideal locations for data centers, O&G facilities near grid capacity |
| **Predictive Maintenance** | SCADA historians, sensor feeds | AI-driven failure prediction for substation equipment |
| **Real-Time Trading** | ERCOT API, nodal pricing feeds | Live LMP monitoring and price forecasting |
| **Active Cyber Defense** | SIEM integration, network feeds | Automated threat detection and response |
| **Emissions Optimization** | Carbon intensity APIs | Dispatch optimization for sustainability targets |

---

## Feature Showcase

### Grid Recon — 3D Digital Twin

![Grid Recon](./docs/screenshots/grid-recon.png)

**Production-Ready Visualization:**
- CesiumJS-powered globe with Bing Maps satellite imagery
- Real-time power flow corridors with animated visualization
- 3D asset markers (wind turbines, solar farms, nuclear plants, substations)
- Interactive camera controls with preset location navigation
- Layer management (Commercial, Military, Agricultural zones)
- Automatic Esri fallback for guaranteed reliability
- Error boundary crash protection

---

### Dashboard — Operations Center

![Dashboard](./docs/screenshots/dashboard.png)

**Real-Time Situational Awareness:**
- Grid frequency, load, and generation metrics
- Fuel mix breakdown (Wind, Solar, Gas, Nuclear, Coal, Hydro)
- Regional thermal mapping with NWS weather integration
- SCED dispatch optimization recommendations
- Congestion monitoring with corridor spread analysis
- Predictive alerts with risk scoring

*Note: Metrics display synthetic data in demo mode. Production deployment requires ERCOT/GridStatus.io API integration.*

---

### Research & Data Intelligence

![Research](./docs/screenshots/research.png)

**Knowledge Management:**
- Curated sources (NERC, ERCOT, NIST, DOE, IEEE standards)
- Research paper discovery and import
- Vector store integration for RAG-powered queries
- Data import workflows for model fine-tuning
- Document upload and processing

---

### AI Governance — NIST AI RMF Alignment

![Governance](./docs/screenshots/governance.png)

**Enterprise AI Safety:**
- Bias testing and fairness metrics
- Model drift detection and alerting
- Hallucination checks for AI outputs
- Cryptographic audit trail (SHA-256 hashed logs)
- Kill switches and safe mode controls

| NIST AI RMF Function | Implementation Status |
|----------------------|----------------------|
| GOVERN | 90% Complete |
| MAP | 85% Complete |
| MEASURE | 95% Complete |
| MANAGE | 95% Complete |

---

### Cyber Simulation — Training Environment

![Cyber Sim](./docs/screenshots/cyber-sim.png)

**Operator Preparedness:**
- SCADA attack scenario simulations
- DDoS response training
- Ransomware incident drills
- Incident response playbook exercises

---

### Agent Orchestrator — AI Visualization

![Agents](./docs/screenshots/agents.png)

**Multi-Agent Framework:**
- Visual representation of AI agent network
- Agent activity monitoring dashboard
- Designed for Chain-of-Thought reasoning visualization
- Human-in-the-loop approval architecture

---

### Market Intelligence

![Insights](./docs/screenshots/insights.png)

**Energy News Aggregation:**
- Real-time headlines from Reuters, Bloomberg, industry publications
- Texas grid and ERCOT-focused content filtering
- Article summaries with source attribution

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| AI Engine | Google Gemini Pro (multimodal) |
| 3D Visualization | CesiumJS with Cesium Ion |
| Data Services | GridStatus.io, EIA, NewsAPI, VisualCrossing |
| Governance | Custom NIST AI RMF implementation |

---

## Getting Started

### Prerequisites

- Node.js v18+
- Modern browser (Chrome/Edge recommended)
- API keys (optional — demo mode works without)

### Installation

```bash
git clone https://github.com/demarcus-crump/GridGuard-AI.git
cd GridGuard-AI
npm install

# Optional: Add API keys for live data
cp .env.example .env.local
# Edit .env.local with your keys

npm run dev
```

Access the platform at `http://localhost:3000`

### Demo Mode

The platform operates in **Demo Mode** by default with synthetic data. No API keys required for evaluation.

---

## Project Structure

```
gridguard-ai/
├── pages/                    # Application views
│   ├── Dashboard.tsx         # Operations center
│   ├── DigitalTwin.tsx       # 3D Grid Recon
│   ├── Governance.tsx        # AI compliance
│   ├── CyberSim.tsx          # Attack simulation
│   └── Research.tsx          # Knowledge base
├── services/
│   ├── genAiService.ts       # Gemini integration
│   ├── agentOrchestrator.ts  # Multi-agent framework
│   ├── safetyGuard.ts        # Physics guardrails
│   ├── auditService.ts       # Cryptographic logging
│   └── dataServiceFactory.ts # Demo/production routing
├── components/
│   ├── MapErrorBoundary.tsx  # Crash protection
│   └── ...
└── docs/
    ├── ARCHITECTURE.md       # Technical documentation
    └── ROADMAP.md            # Feature roadmap
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [AI_GOVERNANCE_FRAMEWORK.md](AI_GOVERNANCE_FRAMEWORK.md) | NIST AI RMF alignment details |
| [AI_SYSTEMS_CATALOG.md](AI_SYSTEMS_CATALOG.md) | AI component registry |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture |
| [SECURITY.md](SECURITY.md) | Security policies |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |

---

## Security

- All API credentials loaded via environment variables
- No hardcoded secrets in source code
- `.env.local` excluded from version control
- See [SECURITY.md](SECURITY.md) for vulnerability reporting

---

## Disclaimer

This software is an **enterprise prototype** intended for demonstration and evaluation purposes. It is **not certified for direct control of production critical infrastructure**. Deployment in operational environments requires additional validation, security hardening, and regulatory approval.

---

## Business Inquiries

For enterprise licensing, custom integration, or partnership opportunities:

**DeMarcus Crump**  
[GitHub](https://github.com/demarcus-crump) | [LinkedIn](https://linkedin.com/in/demarcuscrump)

---

## License

MIT License — See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with:
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Google Gemini Pro](https://ai.google.dev/)
- [CesiumJS](https://cesium.com/)
- [GridStatus.io](https://www.gridstatus.io/)
