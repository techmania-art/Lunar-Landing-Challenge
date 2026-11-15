# Architecture Context

## Stack

The source context identifies the following application stack. Verify the installed versions and repository configuration before implementation.

| Layer | Technology | Role |
|---|---|---|
| Framework | Next.js 16 + TypeScript | Full-stack application and server/client boundaries |
| UI | Tailwind CSS + shadcn/ui | Responsive interface and reusable components |
| Icons | Lucide React | Consistent line icons |
| Styling | CSS custom properties + Tailwind theme tokens | Centralized dark theme |
| Map | To be selected/verified | Lunar imagery, coordinate display, layers, and map interaction |
| Astronomical data | NASA JPL Horizons | Sun/Earth observer and ephemeris information |
| Lunar terrain data | LROC/QuickMap-related datasets or another verified source | Imagery, elevation, and terrain context |
| Analysis engine | TypeScript server-side modules or a suitable computation service | Combine ephemeris and terrain data |
| Report export | To be selected | Generate a PDF from completed analysis |

Do not assume that QuickMap itself exposes a turnkey API for every map layer or calculation. Verify data access, licensing, coordinate reference systems, and service limits before integration.

Authentication, database, collaboration, and background-job technologies are not defined by the Lunar Mission Planner requirements. Do not add Clerk, Prisma, PostgreSQL, Liveblocks, Trigger.dev, or Vercel Blob solely because they appeared in a previous unrelated template. Add them only if the repository or product requirements confirm they are needed.

## Product System Boundaries

Keep these responsibilities separate:

- `app/` — Next.js routes, pages, layouts, and route handlers.
- `components/` — UI composition: mission form, map panel, analysis cards, progress state, and navigation.
- `lib/` — shared utilities, validation, API clients, and data transformations.
- `lib/services/` or equivalent — Horizons and lunar terrain data access.
- `lib/analysis/` or equivalent — calculations that combine astronomical directions with terrain data.
- `types/` — shared TypeScript contracts.
- `public/` — static assets, including the supplied lunar hero background if appropriate.
- `context/` — project specifications and progress documentation.

Adapt names to the repository's existing structure; do not create duplicate layers if equivalent ones already exist.

## Main Data Flow

1. User supplies latitude, longitude, mission date, and mission time in UTC.
2. The application validates the input.
3. The map converts the selected coordinates to the map's projection and centers the view on the selected site.
4. The map displays a red target rectangle, center marker, and coordinate callout.
5. The analysis orchestration requests astronomical data for the correct lunar surface observer and requested time/period.
6. The terrain service retrieves the relevant lunar imagery/elevation data for the selected area.
7. The analysis layer combines Sun/Earth directions with terrain horizon information where available.
8. The analysis response is normalized into the UI-facing result contract.
9. The right-side panel transitions from loading to complete, partial, or error state.

## External Data Responsibilities

### NASA JPL Horizons

Use Horizons for appropriate astronomical observer/ephemeris outputs, including Sun and Earth apparent directions as required by the product.

Before implementation, verify:
- The correct lunar surface observer/site configuration.
- Coordinate conventions and reference frame.
- Time scale and UTC conversion.
- Requested output quantities and units.
- Whether the selected query mode supports the required observer location.
- Query limits, response format, and error handling.

Horizons positions alone do not prove that a body is visible above local terrain.

### Lunar imagery and terrain

Use a verified lunar mapping/terrain source for:
- Lunar imagery.
- Elevation/topography.
- Surface features and local terrain context.
- Data needed to estimate local horizon obstruction.

QuickMap is a useful exploration and data-discovery interface. Do not assume that copying its website URL or embedding its page provides programmatic access to the required datasets. Verify the actual downloadable data services or APIs.

### Combined visibility analysis

The analysis layer may derive:
- Geometric Sun elevation/azimuth.
- Geometric Earth elevation/azimuth.
- Terrain-corrected solar visibility.
- Terrain-corrected Earth line-of-sight visibility.
- Candidate direct-communication visibility windows.

The terrain-corrected outputs require appropriate terrain data and a documented horizon/obstruction method. A direct radio link additionally depends on communication hardware, antenna orientation, relay availability, and link-budget constraints. Label outputs accurately.

## UI-Facing Data Contract

Use explicit types and adapt them to the existing codebase. Keep the UI independent from raw external API response formats.

```ts
export interface MissionInput {
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD
  timeUtc: string; // HH:mm
  comparisonSite?: {
    latitude: number;
    longitude: number;
  };
}

export type AvailabilityStatus =
  | "available"
  | "unavailable"
  | "terrain-obstructed"
  | "unknown";

export interface DirectionResult {
  azimuthDegrees: number;
  elevationDegrees: number;
  geometricStatus: "above-horizon" | "below-horizon" | "unknown";
}

export interface MissionAnalysisResult {
  sun: DirectionResult & {
    illuminationStatus:
      | "sunlit"
      | "dark"
      | "terrain-obstructed"
      | "unknown";
  };
  earth: DirectionResult & {
    terrainVisibility: AvailabilityStatus;
  };
  communication: {
    currentStatus: AvailabilityStatus;
    windows: Array<{
      startUtc: string;
      endUtc: string;
    }>;
  };
  terrain: {
    elevationMeters?: number;
    slopeDegrees?: number;
    roughness?: string;
  };
  metadata: {
    sources: string[];
    calculatedAt: string;
    isDemoData: boolean;
    warnings: string[];
  };
}
```

This is a conceptual contract, not a claim that all values are currently available from the selected providers. Mark unavailable fields explicitly.

## State Model

The analysis UI should support:
- `idle`
- `validating`
- `loading`
- `complete`
- `partial`
- `error`

Do not mark a progress step complete until the corresponding operation has actually completed. If the backend cannot report granular progress, show an honest indeterminate loader and a descriptive list of work being performed.

## Invariants

1. UI components do not directly implement astronomical or terrain calculations.
2. Raw provider responses are normalized before reaching display components.
3. User coordinates are range-validated before requests are made.
4. Mission date and time are interpreted and displayed explicitly in UTC.
5. Geometric horizon visibility is not presented as terrain-clear visibility.
6. Terrain-clear visibility is not presented as a guaranteed operational communication link.
7. No mock/demo measurement is presented as real NASA/JPL output.
8. External data failures produce explicit partial/error states rather than fabricated values.
9. Map marker coordinates and analysis input always refer to the same selected site.
10. The frontend can be redesigned without rewriting data services or analysis modules.

## Results Page Background Asset — Approved Current Requirement

The Mission Operational Results page uses a dedicated background component. Its approved replacement asset is `Horizon.jpg`, sourced from the developer's local file:

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`

The source must be copied into `public/` using the repository's existing asset convention (for example `public/images/Horizon.jpg`) and referenced with a local browser-safe URL. Never put the Windows filesystem path into browser code.

The background is decorative and must remain isolated from result-card layout and application state. Preserve the full composition as far as each viewport allows: star-filled sky, golden celestial arc, clouded horizon, astronaut, reflective foreground, and golden reflection. Since the image is portrait-oriented, verify whether `contain`, `cover`, or a controlled image layer best preserves the composition. Do not stretch non-uniformly. Record actual cropping honestly.

This asset requirement applies to the Results page background only. Do not replace the landing-page hero asset or other page/video backgrounds as part of this change.

## SIS Assistant — UI and Future Integration Boundaries

### Current Phase 21 scope: UI only
The Results page may contain a floating SIS launcher and an on-demand conversation panel. The Phase 21 implementation is a frontend-only component using local UI state. It does not call an LLM, RAG service, or backend endpoint and does not connect to LiveKit.

The UI may show clearly labelled static preview content. It must not imply that an AI response, voice session, microphone capture, or LiveKit connection is active.

### Future integration architecture
A subsequent integration phase may connect SIS to the existing RAG/LLM backend and existing LiveKit voice system. Before implementation, inspect the actual repository endpoints, schemas, agent/worker, token flow, and session metadata mechanism.

The intended future data flow is:

1. Results page reads the same typed analysis state used by the Power Situation and Terrain & Communication cards.
2. A dedicated context builder creates a compact, versioned mission-context payload from that state.
3. The browser sends the user message and context to an authenticated application backend.
4. The backend validates the payload and passes relevant context to the existing RAG/LLM service.
5. The existing RAG pipeline retrieves scientific references and returns grounded answers with source citations.
6. The existing LiveKit voice agent receives the same validated mission context and SIS behavior policy through its existing secure session mechanism.
7. Typed messages, voice transcripts, and assistant replies are represented in one conversation history.

Do not create duplicate RAG or LiveKit infrastructure if it already exists. Do not expose LLM or LiveKit secrets to the browser.

### Mission context invariants
- Use the exact typed state/source objects that render the Results page; do not scrape DOM text or copy screenshot values.
- Include selected coordinates, epoch, available power/terrain/communication/rover metrics, units, status, provenance, freshness, and known missing fields where actually available.
- Preserve `null`, unavailable, partial, stale, error, and not-evaluated states. Never turn missing data into zero or success.
- Include a context schema version and analysis-run/version identifier where available.
- Refresh context when the selected site, epoch, or analysis run changes.
- Keep mission context separate from RAG documents and conversation history.
- Text and voice must share the same mission-context definition and assistant policy.
- The assistant is decision support, not an autonomous mission authority.

These integration items are future scope and must not be represented as implemented by the Phase 21 UI-only work.

# SIS Voice Agent — End-to-End Architecture and LiveKit Infrastructure

## 1. Product behavior defined by the user's voice-flow diagram

The approved SIS interaction flow is:

1. **Result Context** — collect the current mission results and their validity/provenance state from the Results page's normalized data model.
2. **Provided to LLM via prompt/context** — securely pass the compact result context, conversation state, and scope policy to the existing LLM/RAG service through a backend-controlled request.
3. **Interact via voice agent** — the user speaks to the LiveKit voice agent; the agent transcribes/understands the utterance, invokes the existing LLM/RAG API with the current context, and speaks the resulting answer.
4. **Out-of-scope refusal** — when the question is outside the defined LMP/lunar-mission knowledge scope, or there is insufficient reliable evidence, SIS must politely say it cannot answer reliably and redirect the user to supported topics. It must not improvise an answer.

The diagram's “doesn't answer if its out of scope expertise” requirement is mandatory. Do not interpret it as merely a UI message. It must be enforced in the agent/backend response policy and tested.

## 2. Recommended high-level topology

Keep the existing Next.js application as the user-facing application and control plane. Use LiveKit for realtime audio transport and agent session lifecycle. Keep the existing RAG/LLM service as the knowledge/reasoning API. Do not duplicate the RAG index or replace the existing LLM API without an explicit requirement.

```text
┌──────────────────────────────────────────────────────────────┐
│ Next.js 16 + React — Mission Operational Results             │
│                                                              │
│ Result cards + SIS chat panel + LiveKit voice controls        │
│  - typed conversation messages                               │
│  - voice transcripts                                          │
│  - agent state: connecting/listening/thinking/speaking        │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTPS: authenticated session request
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Next.js server route / application backend                   │
│  - authenticate user/session                                 │
│  - build/validate compact ResultContext                       │
│  - create conversation/session ID                             │
│  - issue short-lived LiveKit participant token                │
│  - never expose LiveKit API secret or LLM key                 │
└──────────────┬─────────────────────────────┬─────────────────┘
               │ LiveKit token/session       │ context handoff
               ▼                             ▼
┌────────────────────────────┐   ┌─────────────────────────────┐
│ LiveKit Cloud or self-host │   │ Existing RAG/LLM API        │
│ LiveKit SFU / WebRTC rooms │   │ - scope/intent check        │
└──────────────┬─────────────┘   │ - retrieve approved sources │
               │                 │ - grounded answer           │
               ▼                 │ - citations/evidence        │
┌────────────────────────────┐   └──────────────▲──────────────┘
│ LiveKit Agents worker      │                  │ HTTPS internal
│ - joins room as agent      │──────────────────┘
│ - receives user audio      │
│ - STT / VAD / turn detect  │
│ - calls RAG/LLM API        │
│ - TTS / publishes audio    │
│ - publishes transcript/text│
│ - scope refusal behavior  │
└──────────────┬─────────────┘
               │ WebRTC audio + realtime data/text
               ▼
       User's browser microphone/speaker
```

The diagram is logical. The existing repository may already contain some of these services. Inspect it before adding new services or duplicating routes.

## 3. LiveKit deployment choice

### Recommended first deployment: LiveKit Cloud

For a time-constrained student project, prefer LiveKit Cloud for the realtime media server and agent dispatch unless the project already has a working self-hosted LiveKit deployment.

LiveKit Cloud provides managed room/media infrastructure and agent deployment/observability. The SIS application still owns the mission context, authorization, scope policy, and RAG/LLM API integration.

### Self-hosted alternative

Self-host only if the team already has the operational capacity to maintain:
- LiveKit server and its network configuration.
- TURN/STUN and UDP connectivity requirements.
- TLS and public WebSocket endpoints.
- Agent worker deployment and autoscaling.
- Redis where required by the chosen LiveKit server deployment mode.
- Metrics, logs, health checks, upgrades, and incident response.

Do not introduce Kubernetes, Redis, or a self-hosted media cluster for a short prototype unless the chosen LiveKit deployment architecture requires them. Confirm requirements against current LiveKit deployment documentation.

## 4. Library and service inventory

Use the following as the intended library map. Before installing, inspect `package.json`, lockfiles, the current voice-agent repository, and the installed LiveKit versions. Reuse compatible existing dependencies. Pin mutually compatible versions in lockfiles; do not blindly install “latest” packages into an existing working voice system.

### A. Next.js / browser frontend

| Package | Purpose | Placement |
|---|---|---|
| `livekit-client` | Browser WebRTC room connection, audio tracks, participant/room events, data/text transport | Next.js client component |
| `@livekit/components-react` | React hooks and UI primitives for LiveKit room/session/agent state | Next.js client component |
| `@livekit/components-styles` | Optional default component styles; use only if compatible with LMP's custom UI | Frontend |
| Existing React state solution | Store panel state, message list, connection state and context version | Reuse project state approach |

Use the custom SIS cream chat panel as the visual shell. LiveKit components/hooks may power its connection and state, but do not replace the approved LMP chat design with a stock LiveKit demo interface.

The browser must not contain LiveKit API secrets, LLM provider keys, RAG credentials, or privileged service tokens.

### B. Next.js server / token and context endpoint

| Package / facility | Purpose |
|---|---|
| `livekit-server-sdk` | Create short-lived LiveKit access tokens and perform server-side LiveKit API operations |
| Next.js Route Handlers | Authenticated endpoint to initialize SIS session and return a limited participant token plus session metadata |
| Existing schema validator | Validate request payload and ResultContext; reuse installed Zod or the repository's existing validator if present |
| Existing auth/session mechanism | Authenticate the user and authorize access to the selected mission result |

Do not add a second authentication system just for SIS.

Suggested server endpoints (adapt to current route conventions; do not create duplicates if equivalent routes already exist):

- `POST /api/sis/session`
  - Authenticate caller.
  - Validate selected result/run ID and context version.
  - Build or retrieve the authoritative ResultContext on the server where possible.
  - Create a unique conversation/session ID.
  - Create a short-lived LiveKit participant token with minimum room/participant grants.
  - Return LiveKit URL, token, room/session ID, agent identity/name, and context version.
- `POST /api/sis/chat` (only if typed chat uses a separate HTTP path)
  - Accept user text, conversation ID, and current context version.
  - Apply the same scope policy and RAG/LLM backend as the voice agent.
  - Return answer text, refusal reason/category if applicable, citations, and context version.

Prefer deriving mission context from a trusted server-side result/run identifier rather than trusting arbitrary client-supplied result values. If the current application only holds results in the browser, validate the complete typed payload and bind it to the authenticated session; do not treat unvalidated client fields as authoritative.

### C. LiveKit agent worker — recommended Python baseline

If the existing voice agent is Python, reuse it. If no agent exists yet and the team is free to choose, Python is a practical baseline for the LiveKit Agents ecosystem and RAG integration.

Core packages:

| Package | Purpose |
|---|---|
| `livekit-agents` | Agent runtime, worker process, sessions, jobs, audio/text orchestration |
| `livekit-plugins-silero` | Voice activity detection (VAD), if not using another supported VAD configuration |
| Provider plugin for selected STT | Speech-to-text; choose the provider already used by the project or LiveKit Inference |
| Provider plugin for selected TTS | Text-to-speech; choose the provider already used by the project or LiveKit Inference |
| Provider integration for LLM | Connect the existing LLM API, or use a supported LiveKit plugin if that is actually the selected model endpoint |
| `httpx` or existing async HTTP client | Secure async calls from the agent worker to the existing RAG/LLM API |
| `pydantic` (where used by the agent stack) | Typed validation of session metadata and tool/API payloads |

Install only the provider plugins needed by the chosen STT/TTS/model providers. Do not install every LiveKit plugin.

### D. Node.js agent alternative

If the existing agent is Node.js, keep it in Node.js rather than creating a parallel Python worker.

Use:
- `@livekit/agents` for the LiveKit Agents Node.js framework.
- The provider packages supported by the selected Node.js agent integration.
- The existing RAG/LLM API client or standard server-side `fetch`.
- Existing validation/types conventions.

Do not run Python and Node.js agent workers for the same SIS assistant unless there is a deliberate multi-agent design.

### E. Managed inference option

LiveKit Inference can provide compatible STT, LLM, TTS, and realtime model choices within LiveKit Cloud. It is an optional model-serving route, not a requirement.

For this project, preserve the existing RAG/LLM API as the source of domain retrieval and answer grounding. If LiveKit Inference is used for STT/TTS, it should not bypass the RAG scope check or the mission-context injection. If a LiveKit Inference LLM is used, it must be integrated with the existing RAG retrieval and policy rather than becoming an ungrounded second assistant.

## 5. End-to-end session lifecycle

1. User opens the Results page and clicks the SIS voice action.
2. Frontend obtains the current result/run identifier and context version from the same typed state used by the result cards.
3. Frontend calls the authenticated `POST /api/sis/session` endpoint.
4. Server validates the user and mission/result access.
5. Server constructs or validates a compact `ResultContext`.
6. Server creates a unique room/session and a short-lived participant JWT with minimum required grants.
7. Server returns only the browser-safe LiveKit URL, participant token, session ID, and context version.
8. Browser connects to the LiveKit room using `livekit-client` / the supported React session APIs.
9. LiveKit dispatches the configured SIS agent worker into the room.
10. Agent receives validated context through secure job/session metadata or fetches it from an authenticated backend context endpoint using a short-lived session credential.
11. Agent initializes the SIS conversation with the context, policy, and conversation ID.
12. User speaks; VAD/turn detection and STT produce a transcript.
13. Agent passes transcript + conversation history + current ResultContext to the scope-check/RAG/LLM orchestration.
14. The backend checks whether the question is within SIS expertise and whether adequate evidence exists.
15. If in scope, retrieve relevant RAG passages and call the configured LLM API with context and instructions.
16. If out of scope or evidence is inadequate, return a concise refusal/clarification rather than a speculative answer.
17. Agent publishes response text/transcript and TTS audio to the room.
18. Frontend renders transcript and assistant text in the same visible conversation history as typed messages.
19. On disconnect, cleanly stop local tracks, leave the room, and expire/release the session according to the existing LiveKit lifecycle.

## 6. ResultContext contract and delivery

Build one canonical typed schema shared by the text chat backend and voice agent.

Suggested conceptual contract:

```ts
export interface ResultContext {
  schemaVersion: "1.0";
  contextId: string;
  analysisRunId: string;
  generatedAt: string;
  freshness: "current" | "stale" | "partial" | "error";
  mission: {
    latitude: number | null;
    longitude: number | null;
    epochUtc: string | null;
    siteLabel?: string;
  };
  power: {
    status: string;
    metrics: Record<string, unknown>;
    units: Record<string, string>;
    assumptions: Record<string, unknown>;
    warnings: string[];
  };
  terrainCommunication: {
    status: string;
    metrics: Record<string, unknown>;
    units: Record<string, string>;
    warnings: string[];
  };
  rover: {
    configuration: Record<string, unknown>;
    route: Record<string, unknown>;
  };
  provenance: {
    sources: string[];
    modelVersions: string[];
    calculatedAt: string | null;
  };
}
```

This is a starting shape only. Replace generic records with the application's actual typed result fields. Do not fabricate fields or fill unavailable metrics with zero.

### Delivery method

Preferred:
- Server validates/builds the context.
- Pass a compact, non-secret context snapshot to the agent using supported LiveKit job/session metadata when size and confidentiality constraints permit.
- For larger or sensitive context, pass only an opaque context ID plus short-lived authorization; agent retrieves the context from a private backend endpoint.
- Bind context to `analysisRunId`, `contextId`, conversation ID, and user/session authorization.
- Never place API keys or long-lived service credentials in room metadata or browser-visible participant attributes.

Do not rely on ephemeral room metadata as the sole durable conversation store. Persist conversation messages in the existing conversation store if one exists; otherwise document the prototype's session-only retention.

### Refresh and stale context

- When a new analysis run completes, the frontend must update the context version.
- Before the next user turn, either refresh the agent context through a supported data/RPC message or restart/reinitialize the voice session with the new context.
- If the active session still has an older context version, show a stale-context warning and do not silently answer as if it has the latest result.
- Every assistant response should carry or be associated with the context version used.

## 7. RAG and LLM orchestration

The LiveKit worker is the realtime voice interface. It is not the authoritative scientific calculation engine.

The agent should call the existing RAG/LLM API through a server-side HTTP client. The RAG/LLM service remains responsible for retrieval and grounded response generation.

Request should contain:
- `conversationId`
- `message`
- `resultContext` or trusted `contextId`
- `contextVersion`
- bounded recent conversation history, if not managed server-side
- modality/source metadata such as `voice`

Response should contain:
- answer text
- answer classification: `ANSWERED`, `OUT_OF_SCOPE`, `INSUFFICIENT_EVIDENCE`, `NEEDS_CLARIFICATION`, or `CONTEXT_STALE`
- citations/retrieved source references
- context version used
- optional concise spoken response text if separate from the detailed UI response

The voice agent should speak the answer and publish the same answer/transcript to the chat UI. It should not independently generate a second answer that bypasses the RAG/LLM API.

## 8. Scope-of-expertise guard — mandatory

The user's flow explicitly requires SIS not to answer questions outside its expertise.

### Supported scope

SIS may answer questions directly related to:
- The current LMP mission result context.
- Lunar south-pole mission planning concepts relevant to LMP.
- Interpretation of the application's Sun/Earth geometry and terrain analysis.
- Solar illumination and rover energy results, within the limits of available inputs and calculations.
- Lunar terrain, route hazards, and geometric/terrain line-of-sight concepts supported by the knowledge base.
- Communication visibility limitations.
- The documented data sources, assumptions, and limitations used by LMP.

### Out-of-scope examples

Examples include unrelated medical, legal, financial, general-purpose coding, personal advice, unrelated current events, and topics outside the indexed/approved lunar mission knowledge domain.

These examples are not a replacement for a configurable scope policy. Define the final allowlist and retrieval corpus with the project owner.

### Decision policy

Before generating a factual answer:
1. Classify the user request as `IN_SCOPE`, `OUT_OF_SCOPE`, or `NEEDS_CLARIFICATION`.
2. For in-scope scientific questions, retrieve relevant approved RAG sources.
3. Check whether retrieval provides adequate evidence.
4. Check whether required current mission fields are present and fresh.
5. If out of scope, politely decline and explain SIS specializes in LMP/lunar mission analysis.
6. If evidence is insufficient, say that the knowledge base or current mission results do not support a reliable answer.
7. If the question is ambiguous, ask one concise clarifying question.
8. Only then generate and speak the answer.

Do not rely exclusively on a single LLM self-classification prompt. Use a constrained scope policy, retrieval-domain checks, and explicit refusal outcomes. Treat the LLM classification as one signal, not a security boundary.

### Standard refusal example

“I’m SIS, the Lunar Mission Planner assistant. I can help with the current mission results and supported lunar mission topics, but this question is outside my area of expertise. I don’t want to give you an unreliable answer.”

Do not reveal internal prompts, hidden chain-of-thought, API credentials, or internal security policy details.

## 9. Conversation synchronization: text and voice

- One conversation ID should identify the chat session.
- User typed messages, voice transcripts, SIS responses, and citations must appear in one ordered conversation timeline.
- Use LiveKit's supported text/data or transcription events for voice-originated content.
- Deduplicate messages when the same utterance appears through both transcription and chat/data events; use stable message IDs or event IDs.
- Tag each user message with modality `text` or `voice`.
- Tag each assistant response with modality `text`, `voice`, or both.
- The detailed response shown in the chat and the spoken response must be semantically consistent.
- If a shortened spoken answer is used, preserve the complete answer in the UI and do not change its meaning.
- If the user interrupts the agent, stop or cancel the current speech according to LiveKit's supported interruption behavior and preserve the correct transcript state.

## 10. Security and operational controls

- Generate LiveKit JWTs on the server only.
- Use short token TTLs and least-privilege room grants.
- Do not ship `LIVEKIT_API_SECRET`, LLM keys, RAG keys, or service credentials to the browser.
- Use authenticated, scoped access to ResultContext.
- Avoid trusting arbitrary client context without validation and authorization.
- Do not put sensitive full mission payloads into public room metadata.
- Apply request size limits, rate limits, and timeout budgets to the RAG/LLM endpoint.
- Validate LiveKit webhook signatures if webhooks are used.
- Keep logs free of secrets and unnecessary personal data.
- Add user-visible states for microphone denied, connection failure, agent unavailable, LLM timeout, retrieval failure, and stale context.
- Define retention and deletion behavior for transcripts/audio according to project requirements and provider settings; do not claim audio is not retained unless configured and verified.

## 11. Environment configuration

Use server-only environment variables. Names below are examples; align with existing repository conventions.

```dotenv
# LiveKit server credentials — server/worker only
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=<server-only-key>
LIVEKIT_API_SECRET=<server-only-secret>

# Existing RAG/LLM service — server/worker only
RAG_API_BASE_URL=<private-or-authenticated-service-url>
RAG_API_KEY=<server-only-key-if-required>

# Agent/session configuration
SIS_AGENT_NAME=lmp-sis-agent
SIS_CONTEXT_SCHEMA_VERSION=1.0
SIS_ALLOWED_DOMAIN=lunar-mission-planning
```

Only the LiveKit server URL and short-lived participant token should reach the browser. If a public URL variable is required by the frontend framework, it must contain only the non-secret LiveKit WebSocket URL, never the API secret.

## 12. Deployment topology

### Minimum prototype deployment
- Next.js application deployed where it currently runs.
- LiveKit Cloud project for rooms/media transport and agent dispatch.
- One LiveKit Agents worker deployed as a separate process/service.
- Existing RAG/LLM API remains deployed at its current location and is reachable securely from the agent worker.
- Existing vector store/knowledge base remains unchanged.
- Existing scientific analysis backend remains the source of mission result calculations.

### Production-minded deployment
- Next.js web application.
- Authenticated application API/token endpoint.
- LiveKit Cloud or maintained self-hosted LiveKit server.
- Horizontally scalable LiveKit Agents worker pool.
- Existing RAG/LLM API with retrieval service and vector database.
- Optional conversation persistence using the database already present in the project.
- Centralized logs/metrics/traces with correlation IDs across web request, room, agent job, and RAG request.

Do not add a new database, vector store, Redis, Kubernetes, or queue unless the existing system or selected deployment mode requires it.

## 13. Observability and evaluation

Capture safe operational metrics:
- Session creation success/failure.
- Time to connect to LiveKit room.
- Agent dispatch/start latency.
- STT latency.
- RAG retrieval latency and source count.
- LLM first-token/response latency.
- TTS start latency.
- End-to-end user-turn latency.
- Disconnect/error reason.
- Scope refusal count and category.
- Context version and freshness used for each answer.

Evaluate:
- In-scope question answered with correct current result context.
- In-scope question with no supporting retrieval refused as insufficient evidence.
- Out-of-scope question declined.
- Missing mission metric not invented.
- Stale context detected after a new analysis run.
- Voice and typed responses remain synchronized.
- Duplicate transcript events do not create duplicate chat messages.
- User interruption stops current speech cleanly.
- Microphone denial and network loss produce recoverable UI states.

## 14. Implementation order

1. Inspect current RAG backend, LiveKit libraries, agent language, token/session endpoint, and existing deployment.
2. Record actual package versions and existing infrastructure; do not assume a clean slate.
3. Define canonical `ResultContext` type from real Results page result models.
4. Implement server-side context validation/building and session authorization.
5. Implement or extend the session/token endpoint using `livekit-server-sdk`.
6. Reuse or implement one LiveKit Agents worker in the repository's existing agent language.
7. Pass validated context securely to the agent.
8. Connect the agent to the existing RAG/LLM API.
9. Implement the scope-of-expertise guard and insufficient-evidence refusal.
10. Connect the existing SIS UI to the LiveKit session and synchronize transcripts/responses.
11. Test stale context, out-of-scope questions, and voice/text synchronization.
12. Deploy the worker separately from the Next.js web process.
13. Add monitoring and record verification evidence.

## 15. Official LiveKit library and architecture references

Use current official documentation as the implementation authority. APIs and package versions change; verify current compatibility before installing.

- LiveKit Agents overview: https://docs.livekit.io/agents/
- LiveKit Agents for Node.js: https://docs.livekit.io/reference/agents-js/
- LiveKit Agents Python voice API: https://docs.livekit.io/reference/python/livekit/agents/voice/
- LiveKit JS client SDK: https://docs.livekit.io/reference/client-sdk-js/
- React frontend quickstart: https://docs.livekit.io/frontends/start/react-quickstart/
- React starter app (Next.js): https://docs.livekit.io/frontends/start/starter-apps/react/
- Building agent frontends/session lifecycle: https://docs.livekit.io/frontends/build/
- LiveKit JS server SDK: https://docs.livekit.io/reference/server-sdk-js/
- LiveKit voice AI quickstart: https://docs.livekit.io/agents/start/voice-ai/
- LiveKit model/inference overview: https://docs.livekit.io/agents/models/
- LiveKit self-hosted deployments: https://docs.livekit.io/deploy/custom/deployments/

The library list is a recommended architecture map, not proof that these packages are installed in the repository. Verify `package.json`, Python dependency files, lockfiles, current agent source, and deployment configuration before changing dependencies.

## 16. Architecture invariants for SIS

1. Results page typed state is the authoritative source of current mission context.
2. The same context schema and policy are used by text and voice interactions.
3. LiveKit transports realtime audio/data and manages agent sessions; it does not replace the RAG knowledge base or scientific analysis engine.
4. The existing RAG/LLM API remains the grounded answer service unless the project explicitly changes it.
5. Scope-of-expertise refusal is mandatory.
6. Insufficient evidence, stale context, and missing metrics produce abstention or clarification, never invented answers.
7. The agent cannot change mission calculations or claim autonomous landing-site certification.
8. Secrets remain server-side.
9. Conversation history is synchronized across text and voice using stable IDs.
10. No new parallel voice, RAG, or vector infrastructure is introduced when equivalent project infrastructure already exists.
