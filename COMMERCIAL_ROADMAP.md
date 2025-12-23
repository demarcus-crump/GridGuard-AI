# Roadmap: Commercial & Enterprise Readiness
**Goal:** Deploy to ERCOT / Utility Control Rooms.
**Constraint:** Must meet NERC CIP (Critical Infrastructure Protection) standards.

This moves the application from "Browser-Based App" to "Secure Distributed System".

## Phase 0: Governance & Compliance (The "Must Haves")
*Before we scale, we must prove safety.*
*   [ ] **Define Model Constitution:** Implement the rules from `AI_GOVERNANCE_FRAMEWORK.md`.
*   [ ] **Model Cards:** Deploy live "System Facts" accessible to every operator (Completed in Prototype).
*   [ ] **Legal Review:** Validate liability frameworks for AI-assisted decisions.

## Phase 1: Architecture & Security (The "BFF" Shift)
*Stop exposing API keys in the browser.*

*   [ ] **Backend-for-Frontend (BFF):** Build a Python FastAPI or Node.js server.
    *   *Action:* Move `services/apiService.ts` and `services/genAiService.ts` to the server.
    *   *Benefit:* Keys stored in AWS Secrets Manager, not LocalStorage.
*   [ ] **Authentication:** Implement SSO (Single Sign-On).
    *   *Tech:* Auth0 or Microsoft Entra ID (Azure AD).
    *   *Requirement:* Hardware MFA (YubiKey) support.
*   [ ] **Audit Logging:** Record every Chat prompt, Scenario run, and Agent action.
    *   *Tech:* Immutable append-only log (AWS CloudTrail or PostgreSQL Audit Table).

## Phase 2: Data Persistence & RAG
*The system needs Long-Term Memory.*

*   [ ] **TimescaleDB (Time-Series):** Store the GridStatus data history.
    *   *Why:* Allows for "Year-over-Year" analysis without hitting external APIs 1000 times.
*   [ ] **Vector Database (Pinecone/Milvus):**
    *   *Action:* Ingest ERCOT Protocols, NERC Compliance Manuals, and historical incident PDF reports.
    *   *Benefit:* **RAG (Retrieval Augmented Generation).** The Chatbot cites specific page numbers from the ERCOT manual when answering questions.

## Phase 3: Advanced AI Orchestration
*Make the Agents autonomous workers, not just log generators.*

*   [ ] **LangGraph / Vertex AI Agents:**
    *   *Action:* Port `agentOrchestrator.ts` to a server-side Agent framework.
    *   *Benefit:* Agents can maintain state ("I monitored this yesterday") and trigger complex workflows (e.g., automatically drafting an email to a supervisor).
*   [ ] **Human-in-the-Loop Workflow Engine:**
    *   *Action:* Create a "Pending Approvals" dashboard for Supervisors to review AI actions before execution.

## Phase 4: Infrastructure & Deployment
*   [ ] **Containerization:** Dockerize the Frontend and Backend.
*   [ ] **GovCloud:** Deploy to AWS GovCloud or Azure Government.
*   [ ] **Air-Gapped Mode:** Ensure the Local LLM (e.g., Gemma 2) can run if the control room loses internet access.

## Phase 5: Legal & Compliance
*   [ ] **SOC 2 Type II Certification.**
*   [ ] **NERC CIP Audit.**
*   [ ] **Data Residency:** Ensure no data leaves the US (Vertex AI High-Security configuration).
