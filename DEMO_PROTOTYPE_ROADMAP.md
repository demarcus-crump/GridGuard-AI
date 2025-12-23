# Roadmap: Demo & Prototype Readiness
**Goal:** Create a flawless, "Showstopper" presentation for stakeholders.

The platform functions, but to make it a perfect demo, we need to bridge the final gaps between "Fetching Data" and "Showing Data" in the charts.

## Phase 1: Visualization Completion (The Last Mile)
*Currently, the Analytics page shows "Empty Charts" even if data is loaded. We need to render the actual lines.*

*   [ ] **Install a Chart Library:** Add `recharts` or `chart.js`.
*   [ ] **Wire Analytics:** Connect the `apiService.getHistorical()` data to a real Line Chart on the Analytics page.
*   [ ] **Wire Forecast:** Connect the `apiService.getForecast()` (or AI prediction) to the Dashboard "24-Hour Forecast" card.

## Phase 2: User Experience Polish
*   [ ] **Pre-filled Credentials (Optional):** For a smooth demo, hardcode a "Demo User" button on the Login page so you don't have to copy-paste API keys live in front of an audience.
*   [ ] **Loading States:** Verify that the "Skeleton Loaders" persist exactly as long as the AI/API latency. Ensure no layout shifts occur when data snaps in.
*   [ ] **Error Toasts:** Replace console logs with visible "Toast Notifications" if an API key is invalid (e.g., "Connection Refused: Check GridStatus Key").

## Phase 3: The "Scripted" Scenarios
*Prepare specific inputs that guarantee impressive AI results.*

*   [ ] **Scenario Prompt Engineering:** Refine the system instruction in `genAiService` to ensure `gemini-3-pro` always outputs the specific military format needed for the demo, regardless of variance.
*   [ ] **Image Assets:** Have a folder of "Damaged Transformer" or "Grid Schematic" images ready to upload for the Vision demo.

## Phase 4: Reliability
*   [ ] **Rate Limit Handling:** Add a `try/catch` with exponential backoff in `agentOrchestrator.ts`. If you leave the Agents page running for 1 hour, it might hit the Gemini API rate limit. It should handle this gracefully (pause and resume) rather than crashing.

---
**Definition of Done (Demo Ready):**
1. You can log in.
2. The Dashboard Map lights up with real NWS temps.
3. You can speak to the Grid ("Status Report").
4. You can run a Scenario ("Heat Wave").
5. **The Analytics page shows a real line graph.**
