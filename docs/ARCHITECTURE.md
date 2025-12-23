# System Architecture

## Overview

GridGuard AI v3.0 is an **enterprise-grade Decision Support System** for electric grid operators. Built with NIST AI RMF 1.0 compliance and NERC CIP governance.

---

## High-Level Diagram

```mermaid
graph TD
    User[Operator] --> UI[React UI Layer]
    
    subgraph "GridGuard Client"
        UI --> Auth[Auth / Config]
        UI --> Dash[Dashboard]
        UI --> Map3D[3D Digital Twin]
        UI --> Chat[Chat Widget]
        
        subgraph "AI Layer"
            Chat --> GenAI[GenAiService]
            GenAI --> Guard[Safety Guard]
            GenAI --> Privacy[Privacy Guard]
            GenAI --> Live[LiveService - Voice]
            GenAI --> Agents[AgentOrchestrator]
        end
        
        subgraph "Governance Layer"
            Guard --> Audit[Audit Service - SHA256]
            Audit --> Bias[Bias Testing]
            Audit --> Monitor[Model Monitor]
        end
        
        subgraph "Data Layer"
            Dash --> API[ApiService]
            API --> Grid[GridStatus.io]
            API --> NWS[NWS Weather]
            Map3D --> Cesium[CesiumJS]
        end
        
        subgraph "Intelligence Layer"
            Predict[Predictive Service]
            CyberSim[Cyber Sim Service]
            Recorder[Incident Recorder]
            Vector[Vector Store]
        end
    end
    
    GenAI -->|Inference| Gemini[Google Gemini API]
    Cesium -->|Tiles| Ion[Cesium Ion]
```

---

## Services Architecture

### Core AI Services

| Service | File | Purpose |
|---------|------|---------|
| `genAiService` | `services/genAiService.ts` | Gemini Pro integration, chat, function calling |
| `agentOrchestrator` | `services/agentOrchestrator.ts` | Multi-agent consensus system |
| `liveService` | `services/liveService.ts` | Voice commands via Gemini Live API |

### Governance Services

| Service | File | Purpose |
|---------|------|---------|
| `safetyGuard` | `services/safetyGuard.ts` | Physics-based validation |
| `privacyGuard` | `services/privacyGuard.ts` | PII redaction |
| `auditService` | `services/auditService.ts` | SHA-256 immutable logging |
| `biasTestingService` | `services/biasTestingService.ts` | Fairness metrics |
| `modelMonitorService` | `services/modelMonitorService.ts` | Drift & hallucination detection |

### Data Services

| Service | File | Purpose |
|---------|------|---------|
| `apiService` | `services/apiService.ts` | External data aggregation |
| `dataImportService` | `services/dataImportService.ts` | CSV import |
| `vectorStore` | `services/vectorStore.ts` | RAG embeddings |
| `knowledgeService` | `services/knowledgeService.ts` | Document management |

### Intelligence Services

| Service | File | Purpose |
|---------|------|---------|
| `predictiveService` | `services/predictiveService.ts` | N-1 contingency analysis |
| `cyberSimService` | `services/cyberSimService.ts` | Attack simulation |
| `incidentRecorder` | `services/incidentRecorder.ts` | Flight recorder |
| `researchAgent` | `services/researchAgent.ts` | Paper discovery |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite |
| **Styling** | CSS Variables + Tailwind |
| **AI** | Google Gemini 1.5 Pro |
| **Voice** | Gemini Live API |
| **3D Maps** | CesiumJS |
| **Charts** | Recharts |
| **Storage** | IndexedDB + localStorage |

---

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant GenAI
    participant SafetyGuard
    participant AuditService
    participant API

    User->>UI: Send command
    UI->>GenAI: Process with AI
    GenAI->>SafetyGuard: Validate action
    SafetyGuard-->>AuditService: Log attempt
    
    alt Action Allowed
        SafetyGuard->>API: Execute
        API-->>UI: Return result
        AuditService->>AuditService: Log success
    else Action Blocked
        SafetyGuard-->>UI: Safety error
        AuditService->>AuditService: Log violation
    end
```

---

## Governance Flow

```mermaid
graph LR
    AI[AI Output] --> Hallucination[Hallucination Check]
    Hallucination --> Bias[Bias Test]
    Bias --> Safety[Safety Validation]
    Safety --> HITL[Human Approval]
    HITL --> Audit[Audit Log]
    Audit --> Execute[Execute Action]
```

---

## Future Architecture

```
                    ┌─────────────────────────────────────┐
                    │         Load Balancer               │
                    └─────────────────────────────────────┘
                               │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  BFF     │        │  BFF     │        │  BFF     │
    │  Node.js │        │  Node.js │        │  Node.js │
    └──────────┘        └──────────┘        └──────────┘
          │                   │                   │
          └─────────┬────────┴─────────┬─────────┘
                    ▼                  ▼
            ┌──────────────┐  ┌──────────────┐
            │   Pinecone   │  │  PostgreSQL  │
            │  Vector DB   │  │   Audit DB   │
            └──────────────┘  └──────────────┘
```
