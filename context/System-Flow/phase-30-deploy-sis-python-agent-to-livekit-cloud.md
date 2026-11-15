# Phase 30 — Deploy the Existing SIS Python Agent to LiveKit Cloud

**Project:** Lunar Mission Planner (LMP) — Super Intelligent System (SIS)  
**Phase type:** Deployment implementation + verification  
**Target host:** LiveKit Cloud Agent Deployment  
**Primary agent dispatch name:** `lmp-sis-agent`  
**Python project directory:** `lunar-mission-planner/voice-agent/`  
**Status:** Ready for implementation  

---

## 1. Objective

Deploy the **existing, already tested Python SIS agent** from `voice-agent/` to LiveKit Cloud using the official LiveKit CLI deployment workflow.

This phase is only for deploying the Python voice agent. It is not a phase for deploying the Next.js LMP website, moving API routes to another host, cloning another starter project, or rebuilding the agent.

The intended production flow is:

```text
LMP Next.js SIS UI
       |
       | POST /api/sis/livekit/token
       v
LiveKit Cloud Room
       |
       | dispatch: lmp-sis-agent
       v
Deployed Python SIS Agent
       |
       +--> Google Gemini API (LLM)
       +--> configured LiveKit Inference STT/TTS pipeline
       +--> existing RAG / mission-context integrations (only if configured)
```

The LMP frontend and token endpoint must use the **same LiveKit Cloud project** that hosts the deployed Python agent.

## 2. Authoritative LiveKit instructions

Follow LiveKit's current official instructions and CLI command reference:

- Agent deployment quickstart: <https://docs.livekit.io/deploy/agents/quickstart/>
- Agent deployment overview: <https://docs.livekit.io/deploy/agents/>
- LiveKit CLI reference: <https://docs.livekit.io/reference/developer-tools/livekit-cli/>
- Deploy/create commands: <https://docs.livekit.io/reference/developer-tools/livekit-cli/agent/deployment/>
- Secrets management: <https://docs.livekit.io/deploy/agents/secrets/>
- Builds and Dockerfiles: <https://docs.livekit.io/deploy/agents/builds/>
- Deployment management and rollback: <https://docs.livekit.io/deploy/agents/managing-deployments/>
- Agent deployment regions: <https://docs.livekit.io/deploy/admin/regions/agent-deployment/>
- Quotas and limits: <https://docs.livekit.io/deploy/admin/quotas-and-limits/>

Do not substitute outdated commands from old tutorials if current LiveKit docs differ.

## 3. Existing implementation facts to preserve

Use the uploaded Phase 26 reports as the baseline:

- `SIS_CHAT_DEBUG_REPORT.md`
- `SIS_LIVEKIT_UI_INTEGRATION_DEBUG_REPORT.md`

The reports state that the local Python worker has already registered successfully with LiveKit Cloud and that an end-to-end text round-trip with Gemini was verified.

Preserve these implementation facts unless source inspection proves the current files have changed:

- Agent source: `voice-agent/src/agent.py`
- Agent dispatch name in Python: `lmp-sis-agent`
- Python decorator: `@server.rtc_session(agent_name="lmp-sis-agent")`
- LLM provider: `livekit.plugins.google.LLM`
- Gemini model currently reported: `gemini-3.5-flash-lite`
- Google key variable: `GOOGLE_API_KEY`
- Voice STT/TTS are currently configured through the code's LiveKit Inference integrations (inspect the actual imports/configuration; do not assume direct AssemblyAI/Fish Audio API keys are needed if they are accessed through LiveKit Inference).
- The token endpoint is `app/api/sis/livekit/token/route.ts` in the main Next.js repository.
- The token endpoint dispatches the agent by name `lmp-sis-agent`.
- The local project is Windows/PowerShell-based.
- The worker's earlier registration log showed LiveKit project region `India South`. This does not, by itself, prove the agent has a Cloud deployment or determine the immutable agent-compute region.

The reports list passing test results. Re-run the relevant current checks before deployment rather than assuming the report guarantees the current working tree is unchanged.

## 4. Strict scope boundaries

### In scope

1. Inspect and prepare `voice-agent/` for LiveKit Cloud deployment.
2. Verify the existing Python package lock, Dockerfile, entrypoint, agent name and environment variables.
3. Install/update the LiveKit CLI on Windows if necessary.
4. Authenticate the CLI against the correct existing LiveKit Cloud project.
5. Link the local agent directory to the correct Cloud agent resource.
6. Create the first Cloud deployment only if it does not already exist; otherwise deploy a new version of the existing agent.
7. Upload only the required runtime secrets.
8. Verify status, build logs, runtime logs, dispatch, Gemini response and the LMP UI connection.
9. Document deployment ID, selected compute region, version and verification evidence without exposing secrets.

### Out of scope

- Do not deploy the main LMP website in this phase.
- Do not change Vercel/Railway/Render deployment configuration.
- Do not change the Next.js UI, SIS components, token route or mission dashboard unless a deployment-blocking mismatch is found. If a mismatch exists, stop and report it rather than applying unrelated frontend changes.
- Do not change Gemini models or migrate providers.
- Do not replace STT/TTS providers.
- Do not rewrite RAG, mission-context synchronization, energy analysis, terrain analysis or communication analysis.
- Do not clone or merge the `agent-starter-react` project.
- Do not create a second agent with another dispatch name.
- Do not change the Windows VAD fallback, room connect ordering, or keyterm settings that fixed the verified local agent.

## 5. Expected project layout

Work from this directory only:

```text
lunar-mission-planner/
├── app/                         # Main LMP Next.js app — do not deploy in this phase
├── components/
├── tests/
└── voice-agent/
    ├── src/
    │   └── agent.py
    ├── tests/
    ├── pyproject.toml
    ├── uv.lock
    ├── Dockerfile
    ├── .gitignore
    ├── .env                       # local secrets; never upload as source or commit
    ├── livekit.toml               # generated by LiveKit CLI if linked/created
    └── frontend/                  # React starter reference; do NOT package into Python agent
```

First inspect the actual directory. Do not assume every listed file currently exists. The Python deployment build context must be `voice-agent/`, never the repository root and never `voice-agent/frontend/`.

## 6. Pre-deployment audit

Before running any create/deploy command:

1. Confirm `voice-agent/src/agent.py` is the actual entrypoint and that it contains the dispatch name `lmp-sis-agent`.
2. Confirm `pyproject.toml` and `uv.lock` are consistent and committed/present as required by the Dockerfile.
3. Inspect the Dockerfile. Preserve it if it correctly installs the locked dependencies and launches the Python agent with the production `start` command.
4. Confirm the current Dockerfile build command matches the current `pyproject.toml` and package manager. Do not blindly replace a working Dockerfile with a template from an older SDK release.
5. Confirm `.gitignore` and `.dockerignore` exclude `.env`, `.env.*`, `.venv/`, `venv/`, Python caches, test caches, `node_modules/`, local logs, and generated artifacts not needed at runtime.
6. Confirm the build context does not include `voice-agent/frontend/` unless the Python agent imports a concrete runtime asset from it (it should not).
7. Confirm no Gemini or LiveKit key is hardcoded in source, Dockerfile, tests, shell history, or committed files.
8. Confirm that the Dockerfile does not bake secrets into `ENV`, `ARG`, image layers, or build commands.
9. Confirm the agent does not rely on a Windows-only local path or a local file that will not exist in the container.
10. Confirm all model download steps needed at runtime are performed in the Docker build or supported startup lifecycle and do not depend on a developer's local cache.
11. Confirm `uv.lock` is compatible with the declared Python range and the base image selected in the Dockerfile.
12. Check the final build context size. LiveKit documents a 1 GB build-context limit and a 10-minute build timeout.

### Required local checks

Run in PowerShell from the project root:

```powershell
Set-Location .\voice-agent
uv sync --locked
uv run python -m pytest tests/
```

Run the existing local worker smoke test using the project's established command, for example:

```powershell
uv run src/agent.py dev
```

If the current `.venv`/Python command is the known-good path from the report, it may be used instead. Keep the worker running while performing a local text test. Do not launch multiple local workers with the same agent name against the same project during deployment testing.

Only proceed if the tests pass or any failure is understood, documented and explicitly unrelated to deployment.

## 7. LiveKit CLI setup on Windows

Open PowerShell. Install the CLI only if it is not already installed:

```powershell
winget install LiveKit.LiveKitCLI
```

Verify:

```powershell
lk --version
lk --help
lk agent --help
```

If `lk` is already installed but outdated, inspect the official CLI installation/update instructions and update it using the supported Windows method. Do not install a second copy from an unofficial download source.

If PowerShell cannot find `lk` after installation, open a new terminal and verify the PATH before proceeding.

## 8. Authenticate and select the correct LiveKit project

From the repository root:

```powershell
Set-Location .\voice-agent
lk cloud auth
lk project list
```

If more than one project is linked, select the exact LMP project already used by `app/api/sis/livekit/token/route.ts`:

```powershell
lk project set-default "<exact-existing-LMP-project-name>"
```

Do not create a new LiveKit Cloud project unless the existing project is inaccessible or the user explicitly requests a migration.

Cross-check the selected project against the server-side credentials used by the LMP token endpoint. The project subdomain/URL and API key must belong to the same LiveKit Cloud project that will host `lmp-sis-agent`.

## 9. Prevent duplicate agent creation

This check is mandatory because the local worker previously registered with LiveKit Cloud during local tests.

1. Inspect whether `voice-agent/livekit.toml` exists.
2. Inspect its `[project]` and `[agent]` values without exposing secrets.
3. Run the current CLI's agent listing/status commands and inspect the LiveKit Cloud Agents dashboard for an existing agent with dispatch name `lmp-sis-agent`.
4. Determine whether the existing local registration was only a development worker or whether a Cloud agent resource/deployment already exists.

### Branch A — Existing Cloud agent resource is already linked

If `livekit.toml` contains the correct existing agent ID and project, preserve it and deploy the next version:

```powershell
lk agent status
lk agent deploy
```

### Branch B — No Cloud agent resource exists yet

Only after confirming there is no existing Cloud agent resource for this LMP worker, create and perform the first deployment from the `voice-agent/` directory:

```powershell
lk agent create
```

The official command registers the agent, writes `livekit.toml`, creates a Dockerfile only if one is absent, uploads the agent build context, builds the image and deploys the initial production version.

### Branch C — An agent exists in the Cloud dashboard but this directory has no `livekit.toml`

Do not run `lk agent create` and risk creating a duplicate. Use the current CLI's documented `lk agent config`/configuration workflow to link the existing ID. Inspect `lk agent config --help` and the CLI documentation for the current syntax; confirm the final `livekit.toml` points to the correct existing agent and project before deploying.

### Region selection

The agent compute region is assigned on first creation and cannot be changed in place. The currently documented India agent deployment region is `ap-south` (Mumbai). The prior worker log displayed `India South` for the LiveKit project connection, which is not enough on its own to infer the agent's deployment region.

- Inspect the project's current region and the region prompt/options before choosing.
- For this India-based project, use `ap-south` if it is available and is the intended region for this existing LMP project.
- If the project/account indicates a different fixed region or the region choice is unclear, stop and report the options. Do not create a deployment in a guessed region.
- Do not create another region just to experiment. Multi-region deployment is outside this phase.

## 10. Upload runtime secrets safely

LiveKit Cloud automatically injects these variables for a deployed agent:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Do not manually copy local values for these three variables into the cloud secrets file. They are associated with the selected LiveKit Cloud project and are supplied by LiveKit Cloud to its agent container.

The confirmed SIS LLM key is:

- `GOOGLE_API_KEY`

Inspect the actual current agent source and local `.env` to identify any other secrets the agent truly reads at runtime (for example an existing RAG API URL/key if that integration is enabled). Include only those required values. Do not add guessed provider keys for STT/TTS if the code uses LiveKit Inference.

Create a secrets file **outside the `voice-agent/` deployment build context**, for example:

```text
%TEMP%\lmp-sis-livekit-cloud-secrets.env
```

Populate it locally with one `KEY=value` pair per line, taking the actual value from the existing local `.env` without printing it in console output:

```env
GOOGLE_API_KEY=<copy-the-existing-local-value>
# RAG_API_URL=<only-if-the-agent-currently-uses-it>
# RAG_API_KEY=<only-if-the-agent-currently-uses-it>
```

Never put a placeholder or empty key into the deployed secrets. Never include actual secret values in the implementation report.

For first deployment, the CLI supports a `--secrets-file` option on `lk agent create`. For an already registered agent, use the documented `--secrets-file` option on `lk agent deploy` or `lk agent update-secrets` as appropriate. Example for an existing agent:

```powershell
lk agent update-secrets --secrets-file "$env:TEMP\lmp-sis-livekit-cloud-secrets.env"
lk agent deploy
```

If using the create branch, use:

```powershell
lk agent create --secrets-file "$env:TEMP\lmp-sis-livekit-cloud-secrets.env"
```

Do not use `--overwrite` unless the full intended secret set has been audited; by default, update-secrets adds/updates supplied keys while retaining other existing secrets.

After successfully uploading secrets, securely delete the temporary secrets file and ensure it is not committed or copied into the build context. The developer's local `voice-agent/.env` remains local and unchanged.

## 11. Build and deployment requirements

LiveKit Cloud builds the agent image from the `voice-agent/` working directory using its Dockerfile.

- Do not build from the LMP repository root.
- Do not include the Next.js frontend or `voice-agent/frontend/` in the Python agent image.
- Keep the existing locked dependency process (`uv sync --locked`) if the current Dockerfile uses it.
- Keep the existing provider/plugin download step if required by the current LiveKit Agent version.
- Ensure the container runs the agent in production mode (`start`, not local development `dev`).
- Ensure the final process runs as an unprivileged user if required by the Dockerfile best practices.
- Do not bake `GOOGLE_API_KEY` into the image.

LiveKit documents a maximum 10-minute build duration and a 1 GB build-context upload limit. Exclude `.venv/`, `node_modules/`, caches, large datasets, local `.env` files, and non-runtime test artifacts. Keep necessary tests locally even if they are excluded from the runtime image.

## 12. Verify deployment

After create/deploy completes, collect evidence for every check:

```powershell
lk agent status
lk agent list
lk agent logs
```

If build fails:

```powershell
lk agent logs --log-type build
```

If runtime fails, inspect deploy logs and the LiveKit Cloud Agents dashboard. Confirm:

1. The agent is present in the expected project.
2. Dispatch name is exactly `lmp-sis-agent`.
3. Deployment status is healthy/available (use the exact status exposed by CLI/dashboard; do not invent a status string).
4. The expected production deployment is selected.
5. Runtime logs show worker startup and registration, without missing `GOOGLE_API_KEY` errors.
6. The deployed instance receives a room job when the LMP frontend requests an agent.
7. Logs show the incoming text event and Gemini generation lifecycle.
8. A real Gemini answer is returned to the SIS transcript.
9. A real voice turn works end-to-end: microphone → STT → agent/Gemini → TTS → browser audio playback.
10. Agent audio and transcript remain synchronized.

### End-to-end production acceptance test

Use the deployed LMP UI with the token endpoint configured for the same LiveKit Cloud project:

- Open SIS; confirm the frontend establishes its LiveKit room connection.
- Confirm the deployed `lmp-sis-agent` joins the same room.
- Submit a supported lunar-mission question through text.
- Verify a real response appears (not a local fallback or mock response).
- Enable the microphone and ask a supported question.
- Verify transcription, Gemini response, published audio and transcript update.
- Disconnect and reconnect once to validate a new session dispatch.
- Check the Cloud runtime logs for matching room/session activity.

The frontend's room `Connected` status alone is not sufficient proof that the agent worker is available. Verify agent dispatch/worker join separately, following the previous SIS debugging report.

## 13. Free-plan behavior and expected cold starts

If the project is on LiveKit's Build (free) plan:

- Production agents may scale down to zero replicas after sessions end.
- The next user session can experience a documented cold-start delay of roughly 10–20 seconds before the agent joins.
- The Build plan documents up to 5 concurrent agent sessions.
- This cold start is not by itself a failure; the UI should show a truthful `Waiting for Agent`/connecting state and then move to `Agent Ready` when the worker actually joins.

Do not implement artificial fake-online indicators or keepalive loops to mask the plan's cold-start behavior. Report current account quotas/plan limits from the LiveKit dashboard instead of promising unlimited availability.

## 14. Failure handling

### Agent resource already exists

Do not create another one. Link the existing Cloud agent ID into `livekit.toml` using the documented CLI configuration flow, then use `lk agent deploy`.

### Build fails

- Capture the full build error and `lk agent logs --log-type build` output.
- Check Python version, `uv.lock`, Dockerfile commands, plugin compatibility and large build context.
- Fix only the confirmed issue and retry.

### Runtime starts but Google model fails

- Verify the cloud secret name is exactly `GOOGLE_API_KEY`.
- Verify the deployed Python code reads the same variable name.
- Verify the Gemini model configured in source is available to the user's Google API account.
- Do not print the key value or switch model/provider without authorization.

### Agent deploys but is not dispatched

- Compare `@server.rtc_session(agent_name="lmp-sis-agent")` with the token endpoint's agent dispatch name.
- Confirm the token endpoint and agent worker are using the same LiveKit Cloud project.
- Confirm the deployed agent is in the correct deployment and region.
- Inspect worker registration and room dispatch logs.
- Do not change the frontend's dispatch name as a guess.

### Frontend says connected but SIS does not respond

Use the Phase 26 debug sequence: room connection → agent worker join → text event delivery → Gemini response → response publication → frontend transcript rendering. The frontend room connection does not prove an agent joined.

## 15. Rollback and recovery

Before deployment, record the current agent version/ID and retain the working local source state.

- On paid plans, use `lk agent rollback` only after verifying the target previous version and that rollback is supported for the account.
- LiveKit documents instant rollback as a paid-plan feature.
- On the free Build plan, revert the agent source to the last known-good commit and run `lk agent deploy` again.
- Do not delete the production agent to troubleshoot.
- Do not run `lk agent delete` without an explicit user request; deleting without a deployment argument deletes the entire agent.

## 16. Required output report

Create:

```text
voice-agent/DEPLOYMENT_REPORT.md
```

Include:

1. Date/time of deployment.
2. LiveKit project name and subdomain (no keys/secrets).
3. Agent ID and dispatch name.
4. Agent compute region selected.
5. Deployment target (production or named deployment).
6. CLI version and Python/LiveKit Agents package versions.
7. Source commit SHA or working-tree state deployed.
8. Dockerfile and build result.
9. Secret variable names configured (never secret values).
10. `lk agent status` summary.
11. Build and runtime log excerpts with sensitive values redacted.
12. Text smoke-test result.
13. Voice smoke-test result.
14. LMP frontend dispatch/connection result.
15. Cold-start behavior observed, if applicable.
16. Any remaining limitation or deployment blocker.
17. Exact files changed and confirmation that no unrelated LMP code was modified.

Mark an item `PASSED` only when there is actual command/log/test evidence. Use `BLOCKED` or `NOT VERIFIED` when access, credentials, quota or environment prevents verification.

## 17. Completion criteria

Phase 30 is complete only when:

- Existing Python SIS agent is deployed to LiveKit Cloud.
- Agent is registered under the expected dispatch name `lmp-sis-agent`.
- Correct Gemini secret is present in Cloud runtime environment.
- The container starts successfully and passes LiveKit health checks.
- LMP token endpoint and deployed worker point to the same LiveKit Cloud project.
- Real text and voice round-trip tests succeed through the deployed worker.
- Deployment report exists and contains evidence.
- Existing local development workflow remains usable.
- No Next.js website deployment or unrelated feature changes were made.

If the account's plan does not allow deployment, stop at the exact plan/quotas blocker and report it; do not migrate to Render, Railway, Vercel, or another host as an unapproved workaround.

---

## LiveKit official source references

1. <https://docs.livekit.io/deploy/agents/quickstart/> — first deployment using `lk cloud auth`, `lk agent create`, status and logs.
2. <https://docs.livekit.io/reference/developer-tools/livekit-cli/agent/deployment/> — current `create` and `deploy` command options.
3. <https://docs.livekit.io/deploy/agents/secrets/> — secure cloud secrets and automatic LiveKit environment variables.
4. <https://docs.livekit.io/deploy/agents/builds/> — build context, Dockerfile, build timeout and size limits.
5. <https://docs.livekit.io/deploy/agents/managing-deployments/> — version deploy, health checks, rolling deployment and rollback.
6. <https://docs.livekit.io/deploy/admin/regions/agent-deployment/> — immutable agent deployment region and `ap-south` India region.
7. <https://docs.livekit.io/deploy/admin/quotas-and-limits/> — Build plan concurrency and cold starts.
