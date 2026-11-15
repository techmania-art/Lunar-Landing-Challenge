# Phase 24 (Gemini Reconfiguration) — Complete LiveKit SIS Voice Agent + React Frontend Setup

## Objective

Set up a complete, locally runnable SIS voice stack inside the Lunar Mission Planner repository:

1. A separate **Python LiveKit Agents worker** for SIS.
2. The required Python runtime, LiveKit CLI, package dependencies, provider integration, and downloadable model/plugin assets.
3. A separate **React/Next.js LiveKit frontend** downloaded from `livekit-examples/agent-starter-react`.
4. A safe local environment configuration using `voice-agent/.env` for the Python worker and `voice-agent/frontend/.env.local` for the frontend.
5. A working local voice session that dispatches the Python SIS agent and can later be connected to the existing LMP Analysis-page SIS UI and RAG/LLM backend.

This is a bootstrap and integration task. **Do not deploy to LiveKit Cloud production or overwrite the main LMP application as part of this phase.** First make the separate worker and frontend work locally and pass the verification steps below.

---

## 1. Project constraints and architecture

### Existing application

- Main LMP application: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui.
- Existing Results and Analysis pages, mission analysis services, and SIS UI must remain intact.
- Keep the voice system separate from the main application while bootstrapping it.
- Do not downgrade the main LMP app or merge the React starter's package manifest into the LMP root.

### Required directory layout

Use the actual repository layout and preserve existing files. The target logical structure is:

```text
lunar-mission-planner/
├── app/                         # Existing LMP Next.js 16 app — preserve
├── components/                  # Existing LMP UI — preserve
├── lib/                         # Existing LMP services — preserve
└── voice-agent/
    ├── src/
    │   └── agent.py             # Python LiveKit SIS worker (adapt starter)
    ├── tests/                   # Agent tests/simulations from starter
    ├── .env                     # Local Python worker secrets; never commit
    ├── .env.example             # Placeholder-only template
    ├── .gitignore
    ├── pyproject.toml
    ├── uv.lock
    ├── Dockerfile               # Keep starter's deployment file; do not deploy yet
    ├── README.md
    └── frontend/                # Separate LiveKit React starter app
        ├── app/
        ├── components/
        ├── hooks/
        ├── lib/
        ├── public/
        ├── .env.example
        ├── .env.local            # Local frontend config; never commit
        ├── package.json
        └── pnpm-lock.yaml
```

The Python worker and React frontend are two separate programs. The React starter is **not** the agent worker. The worker joins LiveKit rooms; the frontend creates a user session and connects to the worker through LiveKit.

### Phase supersession

This Gemini-reconfigured Phase 24 supersedes the earlier **base-environment-only Phase 24**, the earlier Cerebras-specific provider selection, and the separate draft for importing the React starter. It consolidates the required environment setup, Python agent bootstrap, Gemini API integration, dependency installation, and React frontend download. Do not install Cerebras dependencies or configure Cerebras keys for this setup.

---

## 2. Reference sources and precedence

### User-provided video

Reference video supplied by the project owner:

- https://youtu.be/Fhm8goKN6rM

The video page/transcript could not be retrieved in the research environment. Do not claim that any command or implementation detail in this file was verified from that video. The coding agent should open the video in its own browser if available, note the actual title/channel and steps shown, and compare them against the official LiveKit documentation before executing them. Do not copy obsolete commands or dependency versions from a video without checking current compatibility.

### Official LiveKit documentation used for the current setup

- Voice AI quickstart: https://docs.livekit.io/agents/start/voice-ai/
- LiveKit CLI: https://docs.livekit.io/reference/developer-tools/livekit-cli/
- Python/Gemini integration: https://docs.livekit.io/agents/models/llm/gemini/
- Gemini API key management: https://ai.google.dev/gemini-api/docs/api-key
- Gemini API models: https://ai.google.dev/gemini-api/docs/models
- Gemini API pricing and free-tier terms: https://ai.google.dev/gemini-api/docs/pricing
- LiveKit Inference: https://docs.livekit.io/agents/models/inference/
- React voice AI quickstart: https://docs.livekit.io/frontends/start/react-quickstart/
- React starter app: https://docs.livekit.io/frontends/start/starter-apps/react/
- Development token server: https://docs.livekit.io/frontends/build/authentication/development-token-server/
- Production token authentication: https://docs.livekit.io/frontends/build/authentication/
- Agent deployment: https://docs.livekit.io/deploy/agents/quickstart/

**Precedence:** installed project files and lockfiles first, then current official LiveKit docs, then the supplied video as supplementary guidance. Never use the video to override an existing project's actual architecture or a current official security requirement.

---

## 3. Inspect before modifying anything

Start at the LMP repository root. Inspect:

- Whether `voice-agent/` already exists and what it contains.
- Existing `.env`, `.env.example`, `.env.local`, `.gitignore`, `pyproject.toml`, `uv.lock`, Dockerfile, tests, README, and agent source.
- Existing LiveKit worker/session/token routes and RAG API client.
- Whether the React starter already exists under `voice-agent/frontend/`.
- Git status and uncommitted changes.

Do not overwrite or delete existing work. If a `voice-agent/` folder already contains Phase 23 work, **extend it**. If it is empty or absent, initialize it with the official Python starter. If it contains a different working agent, retain that agent and selectively port missing starter capabilities instead of replacing it wholesale.

If the target directory is non-empty and the CLI refuses to initialize into it, generate a temporary starter in a sibling directory such as `voice-agent-bootstrap/`, compare files, and merge only what is missing or needed. Remove the temporary folder only after its relevant files have been incorporated and verified.

---

## 4. Install machine prerequisites

Use supported tools and verify each installation. Do not install a second copy if an appropriate version is already installed.

### Windows PowerShell

LiveKit CLI:

```powershell
winget install LiveKit.LiveKitCLI
lk --version
```

Python package manager `uv` (official installer):

```powershell
irm https://astral.sh/uv/install.ps1 | iex
uv --version
```

Use Python 3.12 for the initial local setup unless the existing lockfile or selected native dependencies require another supported version. The current LiveKit Python starter declares Python `>=3.10, <3.15`.

```powershell
uv python install 3.12
python --version
```

Frontend runtime:

- Install Node.js 24.x to satisfy the inspected React starter's `engines.node` declaration.
- Enable Corepack and activate the exact package-manager version declared in the starter's `package.json`:

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
node --version
pnpm --version
```

Git must be installed and available in the terminal:

```powershell
git --version
```

Do not run machine-wide upgrades or uninstall other versions without first inspecting the developer's current setup.

---

## 5. Authenticate and create the Python LiveKit agent

Authenticate the LiveKit CLI against the intended LiveKit Cloud project:

```powershell
lk cloud auth
```

Then use the official Python agent starter. If `voice-agent/` does not exist:

```powershell
lk agent init voice-agent --template agent-starter-python
```

Choose the intended LiveKit Cloud project when prompted. Allow the CLI to install starter dependencies if offered. If it does not install them automatically, install them in the resulting directory in Section 6.

If `voice-agent/` already contains Phase 23 implementation, do not initialize over it. Use the temporary-bootstrap/compare/merge procedure in Section 3.

The official Python starter currently provides:

- `livekit-agents` 1.8.x baseline.
- LiveKit Inference-based STT/LLM/TTS pipeline example.
- `livekit-plugins-ai-coustics` for the starter's noise-cancellation integration.
- `python-dotenv`.
- Development dependencies including `pytest`, `pytest-asyncio`, and `ruff`.
- An agent entrypoint, Dockerfile, test/scenario structure, and project instructions.

Do not create a second worker or a second unrelated LiveKit project if a compatible worker already exists.

---

## 6. Install Python dependencies and download required runtime assets

From the Python worker root:

```powershell
cd voice-agent
uv sync
```

Use the generated `uv.lock` as the reproducible dependency source. Commit the lockfile, not the `.venv` directory.

### Gemini Developer API integration — use the user's Google AI Studio API key

Use Google's Gemini Developer API directly through LiveKit's official Python Google plugin. Do **not** use LiveKit Inference for the LLM in this configuration: the LLM request must authenticate with the project's `GOOGLE_API_KEY` supplied by the developer.

Install the official plugin extra while preserving the existing LiveKit Agents 1.8.x dependency family used by the Python starter:

```powershell
uv add "livekit-agents[google]~=1.8"
uv lock
uv sync --locked
```

Before changing dependencies, inspect `pyproject.toml` and `uv.lock`. Do not downgrade or replace an existing compatible `livekit-agents` version. Resolve the Google extra against the existing 1.8.x package and let `uv` update the lockfile.

Use the environment variable name required by the LiveKit Google plugin:

```dotenv
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
```

The Google Gemini API also recognizes `GEMINI_API_KEY`, but the LiveKit Google plugin documents `GOOGLE_API_KEY`; use that canonical name in this worker's `.env` to avoid ambiguity. Do not place the key in source code, frontend environment variables, browser bundles, LiveKit room metadata, or logs.

Initialize the LLM through the official plugin, using the configured model value (default shown here is the current stable Gemini Flash model documented by Google):

```python
import os
from livekit.plugins import google

# Inside AgentSession(...):
llm=google.LLM(
    model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
)
```

The plugin reads `GOOGLE_API_KEY` from the worker process environment. Keep this LLM initialization server-side in the Python agent. Verify that the chosen model is available to the actual Google AI Studio project/account before testing; do not silently fall back to a different model if the ID is rejected.

Current model note (verified against Google's Gemini API pricing/model pages for this revision): `gemini-3.8-flash` is listed as a stable Gemini API model and shows free input/output token rates on the Free tier. Availability and quotas are account-, region-, and model-dependent and can change. Verify the live Google AI Studio quota for the project before relying on it. Google states that Free-tier content may be used to improve its products; do not send confidential, sensitive, or unpublished mission/user data through the Free tier. Review Google's current data-use and pricing terms before moving beyond test data.

### STT and TTS

Keep the existing LiveKit Inference STT and TTS setup initially, selecting currently supported model identifiers from the LiveKit model catalog. This is intentionally separate from the Google Gemini LLM API key:

- STT converts microphone audio to text. It remains configured through LiveKit Inference or a separately chosen STT provider.
- Gemini Developer API (`GOOGLE_API_KEY`) supplies LLM text generation.
- TTS converts the grounded response into audio. It remains configured through LiveKit Inference or a separately chosen TTS provider.

A Gemini API key used for `google.LLM` does not automatically authenticate LiveKit Inference STT/TTS. Keep the current RAG scope check and mission-context injection. If the account cannot use LiveKit Inference for STT/TTS, select one documented STT provider and one documented TTS provider, then install only those plugins and their exact required environment variables. Do not install every available provider plugin.

### Existing RAG API client

Inspect the actual LMP backend and reuse its existing authenticated RAG/LLM API client. Add `httpx` only if the Python worker needs it and an equivalent async HTTP client is not already present:

```powershell
uv add httpx
uv lock
uv sync --locked
```

Add `pydantic` only if the selected project code does not already include an appropriate validation layer. Do not add duplicate frameworks or unrelated dependencies.

### Download LiveKit plugin/model assets

Run the official LiveKit Agents package asset-download command after dependencies are installed:

```powershell
uv run --module livekit.agents download-files
```

This downloads required plugin/model assets available to the installed package. It is not a download of every LiveKit model in existence. Re-run it after adding/removing plugins when the selected plugin documentation requires it.

### Python validation

```powershell
uv run python --version
uv run pytest
uv run ruff check .
```

Resolve failures caused by this phase. Do not suppress unrelated existing test failures without documenting them.

---

## 7. Configure `voice-agent/.env` safely

The owner explicitly requested a `.env` file in the `voice-agent/` folder. Make `voice-agent/.env` the canonical local environment file for the Python worker.

The official starter may create `.env.local` and its entrypoint initially loads `.env.local`. Preserve any generated values, then migrate/merge them into `.env` carefully and update the Python loader to read `.env` from a deterministic path relative to the worker source file. Do not leave two competing credential files with different values.

For a worker at `voice-agent/src/agent.py`, resolve the env file from the `voice-agent/` project root (for example using `Path(__file__).resolve().parents[1]`). Do not rely only on whichever directory happens to be the current working directory.

### `voice-agent/.env.example`

Create or update the template with placeholders only:

```dotenv
# LiveKit project — Python worker/server only
LIVEKIT_URL=wss://YOUR_PROJECT_SUBDOMAIN.livekit.cloud
LIVEKIT_API_KEY=YOUR_LIVEKIT_API_KEY
LIVEKIT_API_SECRET=YOUR_MATCHING_LIVEKIT_API_SECRET

# Google Gemini Developer API — server/worker only
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash

# Existing LMP RAG service — align with actual repository API contract
RAG_API_BASE_URL=
RAG_API_KEY=

# SIS configuration
SIS_AGENT_NAME=lmp-sis-agent
SIS_CONTEXT_SCHEMA_VERSION=1.0
SIS_ALLOWED_DOMAIN=lunar-mission-planning
SIS_ENVIRONMENT=development
LOG_LEVEL=INFO
```

`RAG_API_BASE_URL` and `RAG_API_KEY` are the architecture context's proposed names. Confirm the existing API client's actual variables, URL, auth mechanism, and payload contract before relying on them. Do not invent an endpoint or replace the existing RAG service.

### Obtain and validate the Gemini API key

1. Open Google AI Studio: https://aistudio.google.com/api-keys
2. Create or select the Google Cloud project intended for SIS and generate a Gemini API key.
3. Prefer the currently supported authorization-key type. Google's published migration says new AI Studio keys default to authorization keys and the API rejects standard keys from September 2026 onward; the current date for this context is November 15, 2026.
4. Put the key only in `voice-agent/.env` as `GOOGLE_API_KEY=...`. Do not paste the real key into prompts, issue trackers, screenshots, Git commits, or the frontend `.env.local`.
5. Confirm the project has access to `gemini-3.8-flash` and check its rate limits before running tests.

The Gemini API Free tier currently lists selected models with free input/output tokens, but its quotas are limited and the current pricing page says Free-tier submitted content may be used to improve Google's products. Use synthetic/public test context only until the project has reviewed the applicable data-use policy. Recheck pricing, availability, and terms at implementation time.

### Actual `.env`

- Create `voice-agent/.env` only if it does not exist.
- If it exists, make a local backup before editing and merge missing keys without replacing valid values.
- The developer must provide real LiveKit credentials and a Google Gemini API key. Do not invent keys or try to infer them.
- Leave unknown RAG settings blank until the real backend is inspected.
- Never print secret values during validation.

Required secret handling:

- `LIVEKIT_API_SECRET`, `GOOGLE_API_KEY`, `RAG_API_KEY`, and any provider secrets are server/worker-only.
- Never prefix these values with `NEXT_PUBLIC_`.
- Never send them in room metadata, participant attributes, browser props, frontend API responses, logs, screenshots, or commits.
- Rotate a secret if it is exposed.

Ensure the applicable `.gitignore` excludes:

```gitignore
.env
.env.*
!.env.example
.env.backup
.venv/
__pycache__/
*.py[cod]
.pytest_cache/
.ruff_cache/
```

Preserve all existing ignore rules. Confirm that `.env` is ignored by Git before continuing.

---

## 8. Adapt the Python starter into the SIS agent

Preserve the starter's worker/session lifecycle, logging, test harness, noise cancellation, and supported turn handling. Replace only the starter's generic assistant behavior with SIS-specific orchestration.

### Agent identity

Use one canonical agent name:

```text
lmp-sis-agent
```

Read or validate it against `SIS_AGENT_NAME`. The frontend's `AGENT_NAME` must match the worker's registered dispatch name exactly. Avoid a silent mismatch between the Python decorator/server registration and the browser token request.

### SIS responsibilities

The LiveKit worker is the real-time voice transport/orchestration process, not the source of scientific calculations.

For every voice turn:

1. Receive the user's audio through LiveKit.
2. Use STT to produce a transcript.
3. Preserve the same conversation ID used for text chat where available.
4. Validate the current mission result context and its schema/version/freshness.
5. Enforce SIS's LMP/lunar mission scope boundary.
6. Call the existing RAG/LLM backend with the transcript, conversation history, trusted mission context or context ID, context version, and `voice` modality metadata.
7. Require the backend response classification and source/citation information where the existing service supports them.
8. Speak the returned, grounded answer through TTS.
9. Publish the same answer/transcript to the frontend so typed and voice conversations stay synchronized.

The existing RAG/LLM system remains responsible for retrieval and grounded factual response generation. Do not create a parallel vector database, second knowledge base, or independent ungrounded assistant.

### Mission context

Use the existing architecture's `ResultContext` concept and actual Results page data types. At minimum, the trusted context should bind:

- `contextId`, `analysisRunId`, and schema version.
- mission coordinates and UTC epoch.
- freshness/status and generation timestamp.
- Power Situation values, units, assumptions, and warnings.
- Terrain & Communication values, units, source/provenance, and warnings.
- rover configuration and route context when available.
- source/model/version metadata.

Do not hardcode screenshot values or fabricate missing fields. Missing values remain missing/unknown, not zero. Do not accept arbitrary client-supplied results as trusted scientific facts.

### Secure context delivery

Preferred pattern:

- An authenticated LMP backend validates the user and selected analysis run.
- The backend builds or retrieves the authoritative context.
- The agent receives a compact validated context snapshot through a supported secure session/job mechanism, or receives an opaque context ID plus short-lived authorization and fetches the context from a private backend endpoint.
- Bind context to conversation ID, analysis run ID, and context version.
- Refresh context when a new Results run is completed; detect stale contexts rather than answering as if they are current.

Do not place long-lived service credentials, the full private RAG payload, or secrets in public room metadata.

### SIS expertise policy

SIS should answer supported LMP/lunar mission topics only. It must abstain or clarify when:

- the request is outside LMP/lunar-mission scope;
- required mission data is missing or stale;
- RAG retrieval does not provide adequate evidence;
- the requested conclusion exceeds the available scientific or operational evidence.

Use the existing classification outcomes where supported: `ANSWERED`, `OUT_OF_SCOPE`, `INSUFFICIENT_EVIDENCE`, `NEEDS_CLARIFICATION`, and `CONTEXT_STALE`.

Preserve scientific distinctions: geometric visibility is not terrain-clear visibility; terrain clearance is not a verified RF link; solar illumination is not the same as electrical power; landing suitability and rover traverse safety are different evaluations. Do not invent calculations, values, citations, or certainty.

---

## 9. Download the LiveKit React frontend

Download the requested repository into:

```text
voice-agent/frontend/
```

Repository:

- https://github.com/livekit-examples/agent-starter-react
- Clone URL: `https://github.com/livekit-examples/agent-starter-react.git`
- Default branch observed: `main`
- Inspected commit: `9e1fc2f40fd7ceaccbe4a872b21765b49eefea80`
- Commit URL: https://github.com/livekit-examples/agent-starter-react/commit/9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
- License: MIT; retain the repository's `LICENSE` file and attribution.

The inspected React starter's package manifest declares:

| Package/runtime | Inspected value |
|---|---:|
| Node.js engine | `24.x` |
| package manager | `pnpm@9.15.9` |
| Next.js | `15.5.27` |
| React / React DOM | `^19.0.0` |
| `@livekit/components-react` | `^2.9.24` |
| `livekit-client` | `^2.22.2` |
| `livekit-server-sdk` | `^2.18.0` |

Use the repository's checked-in `package.json` and `pnpm-lock.yaml` as authoritative. Do not manually upgrade packages or replace the lockfile during bootstrap.

### Safe download procedure

If `voice-agent/frontend/` does not exist:

```powershell
git clone https://github.com/livekit-examples/agent-starter-react.git .\voice-agent\frontend

git -C .\voice-agent\frontend checkout 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
```

If the frontend folder already exists, inspect its Git status and remote first. Do not overwrite local changes or reset a folder simply to match the upstream repository.

Because this folder is nested inside the main LMP repository, do not accidentally leave an unmanaged nested `.git` directory that the parent repository cannot track normally. After pinning and verifying the source, choose one deliberate approach:

- vendor the source into the parent LMP repository by removing only `voice-agent/frontend/.git` after retaining the source commit SHA and MIT license in its README; or
- configure it as an intentional Git submodule and document the submodule workflow.

Do not remove the main LMP repository's root `.git` directory.

### Install all frontend dependencies

```powershell
cd voice-agent\frontend
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile
```

The checked-in lockfile installs the starter's complete dependency tree, including LiveKit UI components, `livekit-client`, `livekit-server-sdk`, Next.js, React, shadcn/Radix UI dependencies, Tailwind, and supporting libraries. Do not separately add duplicate dependencies that are already present.

Verify:

```powershell
node --version
pnpm --version
pnpm build
```

Start the frontend on port 3001 so it does not conflict with the main LMP app's usual development port:

```powershell
pnpm dev -- --port 3001
```

---

## 10. Configure the frontend environment and dispatch to SIS

The React starter supports a LiveKit Cloud Development Token Server or its included Next.js token route. Its README explicitly describes both as development setup options; the included route is not production-secure without authentication.

Create `voice-agent/frontend/.env.example` with the non-secret development configuration shape:

```dotenv
# Preferred for local development only; obtain ID from LiveKit Cloud project settings
LIVEKIT_TOKEN_SERVER_ID=

# Explicit dispatch: must exactly match the Python worker registration
AGENT_NAME=lmp-sis-agent

# Use these only if the included server-side token route is selected.
# They must remain server-side and must not be prefixed with NEXT_PUBLIC_.
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Create `voice-agent/frontend/.env.local` locally from this template, if absent.

### Local development choice

For the first local test, prefer the LiveKit Cloud Development Token Server:

1. Open the intended LiveKit Cloud project settings.
2. Enable **Development token server**.
3. Copy its token server ID.
4. Set `LIVEKIT_TOKEN_SERVER_ID` in `voice-agent/frontend/.env.local`.
5. Set `AGENT_NAME=lmp-sis-agent`.
6. Ensure the Python worker is running with the same LiveKit project and matching registered agent name.

The Development Token Server is for development/testing only. Do not ship it as the production authentication solution.

### Important starter fallback

The inspected `app/page.tsx` falls back to the LiveKit homepage agent if both `LIVEKIT_TOKEN_SERVER_ID` and `LIVEKIT_URL` are missing. Do not leave this fallback silently active for SIS. Add fail-fast configuration validation so the UI shows a clear configuration error when no SIS token source is configured. Never mistake a successful connection to the LiveKit homepage agent for a successful SIS connection.

### Included token endpoint

The starter includes `app/api/token/route.ts`. The inspected implementation intentionally throws outside development/allowed preview mode because it has no real authentication layer. It must not be exposed as an unauthenticated production token-minting endpoint.

For production, build or reuse an authenticated LMP token/session endpoint. It must authenticate the user, authorize the selected mission result, mint a short-lived participant token with least-privilege grants, and return only browser-safe connection details. The API secret stays on the server.

### SIS branding and UI

Keep the starter's useful LiveKit session UI, including:

- connect/disconnect/session states;
- microphone/audio controls;
- agent speaking/listening state;
- audio visualizer;
- text transcript and chat display;
- responsive behavior.

Apply restrained SIS/LMP branding only inside `voice-agent/frontend/` during this phase. Do not replace or refactor the main LMP Analysis page, Results page, or existing SIS launcher. The separate frontend is a working integration/test surface and can be used as a source for a later controlled embedding of LiveKit session components into the existing LMP SIS panel.

---

## 11. Run the worker and frontend together

Use two terminals from the LMP repository root.

### Terminal A — Python agent

```powershell
cd voice-agent
uv sync --locked
uv run --module livekit.agents download-files
lk agent dev
```

Use the console or agent-development URL printed by the CLI. Do not deploy the worker in this phase.

### Terminal B — React frontend

```powershell
cd voice-agent\frontend
pnpm install --frozen-lockfile
pnpm dev -- --port 3001
```

Open `http://localhost:3001`. Connect and verify that the selected agent is `lmp-sis-agent`, not the LiveKit homepage agent.

If the local console/session fails, inspect:

- whether the worker uses the same LiveKit project URL/key pair as the frontend token source;
- whether the registered agent name and `AGENT_NAME` match exactly;
- whether the worker is running in `dev` mode and listening for dispatch;
- whether STT, LLM, and TTS model identifiers are currently supported;
- whether API keys are set in the worker environment;
- whether the browser granted microphone permission;
- LiveKit worker logs and frontend network/console errors.

Do not print or share secret values while diagnosing.

---

## 12. Connect the SIS agent to the existing LMP RAG service

Inspect the actual LMP repository before implementing the RAG call. Reuse the existing RAG/LLM service and its actual request/response schema. Do not assume a URL, route, authentication format, or JSON field that the repository does not contain.

The voice worker should call the existing server-side RAG/LLM API, not a second assistant endpoint and not a new vector store. The RAG layer supplies approved lunar science references and grounded answers; the LiveKit worker supplies real-time voice transport, speech orchestration, and transcript synchronization.

The expected logical request contains:

- `conversationId`;
- transcribed user `message`;
- trusted `resultContext` or opaque `contextId`;
- `contextVersion`;
- bounded conversation history if not maintained by the RAG backend;
- `modality: "voice"`.

The expected logical response carries answer text, classification, citations/source references, and the context version used. Adapt this to the real service contract.

The same answer must appear in the frontend transcript and be spoken by TTS. Avoid a second answer path in which the voice agent bypasses the RAG service and independently improvises a factual answer.

Do not change the main LMP API/data pipeline unless required and explicitly in scope. If the existing app does not yet expose a secure session/context endpoint, document the missing contract and implement only what can be safely grounded in the actual project.

---

## 13. Dependency policy — do not install everything indiscriminately

"Install all dependencies" means install the complete declared dependency set for both selected starter projects from their lockfiles, plus the explicitly selected Google Gemini plugin extra and any genuinely missing RAG HTTP client. It does **not** mean install every LiveKit plugin/provider or every optional model package.

### Python

- Use `uv sync` / `uv sync --locked` from `pyproject.toml` and `uv.lock`.
- Add the LiveKit Google plugin extra (`livekit-agents[google]`) after checking version compatibility.
- Retain the starter's chosen LiveKit inference STT/TTS initially.
- Add `httpx` only if no equivalent async client already exists and the actual RAG service integration needs it.
- Add only selected STT/TTS provider plugins when there is a documented reason.

### React frontend

- Use `pnpm install --frozen-lockfile` from the starter's `package.json` and `pnpm-lock.yaml`.
- Do not run `npm install` or `yarn install` in the same project.
- Do not merge its `package.json` into the Next.js 16 LMP application.
- Do not upgrade the starter's packages during this bootstrap.

### Downloaded runtime assets

- Run `uv run --module livekit.agents download-files` for Python plugin/model files as required by the installed worker dependencies.
- Let pnpm fetch frontend package dependencies using the existing lockfile.
- Do not download large model files or add caches to Git unless the selected provider explicitly requires them.

---

## 14. Required verification checklist

### Repository integrity

- [ ] Main LMP app still uses its existing Next.js 16 setup.
- [ ] No unrelated main app files were modified.
- [ ] Existing `.env`, source files, and tests were preserved.
- [ ] React starter source is under `voice-agent/frontend/`.
- [ ] Python worker is under `voice-agent/`.
- [ ] MIT `LICENSE` from the React starter is retained.
- [ ] The inspected React commit SHA is recorded.
- [ ] No unintended nested `.git` directory remains; vendoring or submodule choice is documented.

### Python worker

- [ ] LiveKit CLI is installed and `lk --version` works.
- [ ] `uv` and supported Python are available.
- [ ] `uv sync --locked` completes successfully.
- [ ] Google Gemini plugin extra is installed and compatible with the resolved LiveKit Agents version.
- [ ] `GEMINI_MODEL` is a verified Gemini API model ID for the current Google AI Studio project/account.
- [ ] STT and TTS model identifiers are valid and selected intentionally.
- [ ] Plugin/model asset download command completes.
- [ ] Agent loads `voice-agent/.env` from a deterministic path.
- [ ] Agent registration name matches `SIS_AGENT_NAME`.
- [ ] `pytest` and `ruff` complete; report existing failures separately.
- [ ] `lk agent dev` starts and receives a test session.

### React frontend

- [ ] Node 24.x and pnpm 9.15.9 are active.
- [ ] `pnpm install --frozen-lockfile` completes.
- [ ] `pnpm build` completes or any upstream failure is documented precisely.
- [ ] Frontend starts on port 3001 without conflicting with LMP.
- [ ] `LIVEKIT_TOKEN_SERVER_ID` or a valid server-side token endpoint is configured.
- [ ] `AGENT_NAME` matches the Python worker.
- [ ] Missing token configuration fails clearly; there is no silent homepage-agent fallback.
- [ ] Browser microphone permission and audio round-trip are tested.
- [ ] Transcript and spoken response correspond to the same SIS response.

### Security

- [ ] `.env`, `.env.local`, `.env.backup`, and other secret files are ignored by Git.
- [ ] No server secret is exposed through a `NEXT_PUBLIC_` variable or browser bundle.
- [ ] The development token server is labelled development-only.
- [ ] The included unauthenticated starter token route is not treated as production-safe.
- [ ] Logs redact API keys and tokens.
- [ ] User mission context is validated server-side and tied to the authenticated analysis run.

### LMP/SIS behavior

- [ ] Voice answers use the same RAG and scope policy as text SIS.
- [ ] The current Results context is passed securely and versioned.
- [ ] Stale or incomplete result context causes a warning/abstention.
- [ ] Out-of-scope requests are refused politely.
- [ ] No scientific measurements, citations, mission statuses, or safety conclusions are invented.

---

### Provider configuration used by this revision

- LiveKit Gemini LLM integration: https://docs.livekit.io/agents/models/llm/gemini/
- Gemini API key handling and key-type migration: https://ai.google.dev/gemini-api/docs/api-key
- Gemini API model IDs: https://ai.google.dev/gemini-api/docs/models
- Gemini API current pricing/free-tier terms: https://ai.google.dev/gemini-api/docs/pricing

The LiveKit Google plugin documents `GOOGLE_API_KEY` and the Python `google.LLM(...)` interface. Google's current pricing page lists `gemini-3.8-flash` with free-tier input and output rates, subject to project quotas and data-use terms. Confirm all model and quota details again when executing this setup.

## 15. Deliverables and completion report

At the end of this phase, report:

1. Files and folders created, updated, or preserved.
2. Python starter/template source and resolved LiveKit dependency versions.
3. Frontend repository commit SHA and resolved package-manager version.
4. All install/download commands actually run and their pass/fail results.
5. Whether the local LiveKit worker started successfully.
6. Whether the React frontend connected to the correct SIS worker and a voice round-trip passed.
7. Which `.env` keys still need values from the developer (list names only; never values).
8. Any missing RAG endpoint/auth contract or provider account restriction.
9. Any test/build failures, with exact files/commands and concise diagnostics.
10. A list of modified files confirming the main LMP app was not unintentionally changed.

Do not claim that dependencies were installed, the repository was downloaded, microphone access worked, or the agent was tested unless the relevant command or browser test was actually performed.

### Deployment is out of scope

Do not leave Cerebras imports, dependencies, environment variables, model names, or configuration in the active SIS agent. The selected LLM provider for this phase is Google Gemini Developer API through `livekit.plugins.google`; LiveKit Inference remains only the initial STT/TTS path. Do not run `lk agent create`, `lk agent deploy`, or publish the frontend to a public host without explicit approval. Local development must pass first. Production deployment requires a reviewed token-authentication design, environment secrets, agent availability, logging/monitoring, and a deliberate deployment plan.
