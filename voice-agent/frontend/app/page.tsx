import { App } from '@/components/app/app';

// Token source: LiveKit Cloud development token server (LIVEKIT_TOKEN_SERVER_ID)
// or the included server-side token endpoint (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).
// Fallback to LiveKit homepage agent is intentionally removed to avoid ungrounded responses.
const tokenServerId = process.env.LIVEKIT_TOKEN_SERVER_ID;
const livekitUrl = process.env.LIVEKIT_URL;
const isConfigured = Boolean(tokenServerId || livekitUrl);

export default function Page() {
  if (!isConfigured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-8 font-sans text-neutral-100">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-neutral-900/90 p-6 shadow-xl backdrop-blur-md">
          <div className="mb-4 flex items-center gap-3 text-red-400">
            <span className="text-xl font-bold">⚠️ SIS Configuration Missing</span>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-neutral-300">
            No LiveKit token provider is configured for the SIS Assistant. The default homepage
            agent fallback is disabled to ensure all sessions connect strictly to the grounded SIS
            agent.
          </p>
          <div className="overflow-x-auto rounded bg-neutral-950 p-3 font-mono text-xs text-neutral-400">
            LIVEKIT_URL=wss://...
            <br />
            LIVEKIT_API_KEY=API...
            <br />
            LIVEKIT_API_SECRET=...
            <br />
            AGENT_NAME=lmp-sis-agent
          </div>
        </div>
      </main>
    );
  }

  return (
    <App
      tokenServerId={tokenServerId}
      tokenEndpoint="/api/token"
      agentName={process.env.AGENT_NAME || 'lmp-sis-agent'}
      isVideoInputSupported={true}
    />
  );
}
