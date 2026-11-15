import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Bot, X, Minus, Sparkles, AlertCircle, Power } from "lucide-react";
import { TokenSource, Track, RoomEvent } from "livekit-client";
import {
  useSession,
  useSessionMessages,
  useAgent,
  useAudioPlayback,
} from "@livekit/components-react";
import { AgentSessionProvider } from "./livekit/agent-session-provider";
import { StartAudioButton } from "./livekit/start-audio-button";
import { AgentDisconnectButton } from "./livekit/agent-disconnect-button";
import { SISMessageBubble } from "./sis-message-bubble";
import { SISComposer } from "./sis-composer";
import {
  type SISMessage,
  SUGGESTED_PROMPTS,
  type SuggestedPrompt,
  type SISMissionContext,
} from "./sis-types";
import {
  type LmpMissionContextSnapshot,
  MISSION_CONTEXT_TOPIC,
  MISSION_CONTEXT_ACK_TOPIC,
} from "@/lib/services/mission-context/mission-context-types";

export interface SISChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  missionContext?: SISMissionContext;
  missionSnapshot?: LmpMissionContextSnapshot;
}

/**
 * Inner component that consumes LiveKit SessionProvider hooks.
 */
function SISChatPanelContent({
  isOpen,
  onClose,
  isMinimized = false,
  onToggleMinimize,
  missionContext,
  missionSnapshot,
  session,
}: SISChatPanelProps & {
  session: ReturnType<typeof useSession>;
}) {
  const { messages: livekitMessages, isSending, send } = useSessionMessages(session);
  const agent = useAgent();
  const { canPlayAudio } = useAudioPlayback(session.room);

  const activeSnapshot = missionSnapshot || missionContext?.snapshot;

  const [draftText, setDraftText] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Phase 27: Mission Context Sync Tracking
  const [syncStatus, setSyncStatus] = useState<
    "uninitialized" | "syncing" | "synced" | "stale" | "error"
  >("uninitialized");
  const [syncedRevision, setSyncedRevision] = useState<number | null>(null);
  const lastPublishedRevisionRef = useRef<number>(-1);
  const ackWaitersRef = useRef<(() => void)[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Automatically initiate session connection on panel open if disconnected
  useEffect(() => {
    if (isOpen && !session.isConnected && session.connectionState === "disconnected") {
      void session.start({
        tracks: {
          microphone: { enabled: false },
        },
      });
    }
  }, [isOpen, session]);

  // Listen for LiveKit context acknowledgements from the Python worker
  useEffect(() => {
    const room = session.room;
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic !== MISSION_CONTEXT_ACK_TOPIC) return;
      try {
        const text = new TextDecoder().decode(payload);
        const ack = JSON.parse(text);
        if (ack.status === "acknowledged") {
          setSyncStatus("synced");
          setSyncedRevision(ack.revision);
          // Unblock any senders waiting for acknowledgement
          while (ackWaitersRef.current.length > 0) {
            const resolve = ackWaitersRef.current.shift();
            if (resolve) resolve();
          }
        } else if (ack.status === "rejected") {
          setSyncStatus("error");
        }
      } catch (err) {
        console.error("[SIS Context Ack Parse Error]:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [session.room]);

  // Publish active mission context snapshot whenever revision updates or agent connects to the room
  useEffect(() => {
    if (
      !activeSnapshot ||
      !session.isConnected ||
      !agent.isConnected ||
      !session.room?.localParticipant
    ) {
      return;
    }
    if (activeSnapshot.revision === lastPublishedRevisionRef.current && syncStatus === "synced") {
      return;
    }

    const publishSnapshot = async () => {
      try {
        console.log(
          `[SIS Context Sync] Publishing snapshot rev ${activeSnapshot.revision} to agent...`
        );
        setSyncStatus("syncing");
        lastPublishedRevisionRef.current = activeSnapshot.revision;
        const bytes = new TextEncoder().encode(JSON.stringify(activeSnapshot));
        await session.room!.localParticipant.publishData(bytes, {
          reliable: true,
          topic: MISSION_CONTEXT_TOPIC,
        });
        console.log(
          `[SIS Context Sync] Published rev ${activeSnapshot.revision} (${bytes.length} bytes)`
        );
      } catch (err) {
        console.error("[SIS Context Publish Error]:", err);
        setSyncStatus("error");
      }
    };

    void publishSnapshot();
  }, [activeSnapshot, session.isConnected, agent.isConnected, session.room, syncStatus]);

  // Monitor local participant microphone state
  useEffect(() => {
    const room = session.room;
    if (!room) return;

    const updateMicState = () => {
      const isPublished = room.localParticipant.isMicrophoneEnabled;
      setIsMicActive(isPublished);
      // Check track muted state if published
      const micTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      setIsMicMuted(micTrack ? micTrack.isMuted : false);
    };

    updateMicState();
    room.on("trackPublished", updateMicState);
    room.on("trackUnpublished", updateMicState);
    room.on("trackMuted", updateMicState);
    room.on("trackUnmuted", updateMicState);

    return () => {
      room.off("trackPublished", updateMicState);
      room.off("trackUnpublished", updateMicState);
      room.off("trackMuted", updateMicState);
      room.off("trackUnmuted", updateMicState);
    };
  }, [session.room]);

  // Map LiveKit session messages to unified SISMessage representation
  const displayMessages: SISMessage[] = useMemo(() => {
    return livekitMessages.map((msg) => {
      const isUser = msg.from?.isLocal ?? false;
      const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      return {
        id: msg.id,
        sender: isUser ? "user" : "sis",
        text: msg.message,
        timestamp: timeStr,
        isVoice: msg.type === "userTranscript",
      };
    });
  }, [livekitMessages]);

  // Auto-scroll on new messages or agent thinking state
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages, agent.state, sessionError]);

  // Determine truthful runtime status
  const connectionState = session.connectionState;
  const isConnected = session.isConnected;
  const isConnecting = connectionState === "connecting";

  // Derive truthful UI status badge
  let statusBadge: { label: string; dotClass: string; containerClass: string } = {
    label: "Disconnected",
    dotClass: "bg-stone-400",
    containerClass: "bg-stone-100 text-stone-600 border-stone-200",
  };

  if (sessionError || agent.state === "failed") {
    statusBadge = {
      label: "Agent Unavailable",
      dotClass: "bg-red-500",
      containerClass: "bg-red-50 text-red-700 border-red-200",
    };
  } else if (isConnecting || agent.state === "connecting") {
    statusBadge = {
      label: "Connecting...",
      dotClass: "bg-amber-500 animate-pulse",
      containerClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  } else if (isConnected) {
    if (!agent.isConnected) {
      // Room is connected, but the Python LiveKit agent has not joined yet
      statusBadge = {
        label: "Waiting for Agent...",
        dotClass: "bg-amber-500 animate-pulse",
        containerClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    } else if (agent.state === "thinking") {
      statusBadge = {
        label: "Thinking...",
        dotClass: "bg-sky-500 animate-pulse",
        containerClass: "bg-sky-50 text-sky-700 border-sky-200",
      };
    } else if (agent.state === "speaking") {
      statusBadge = {
        label: "Speaking...",
        dotClass: "bg-purple-500 animate-pulse",
        containerClass: "bg-purple-50 text-purple-700 border-purple-200",
      };
    } else if (agent.state === "listening" || (isMicActive && !isMicMuted)) {
      statusBadge = {
        label: "Listening...",
        dotClass: "bg-emerald-500 animate-pulse",
        containerClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    } else if (isMicMuted) {
      statusBadge = {
        label: "Muted",
        dotClass: "bg-amber-500",
        containerClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    } else {
      statusBadge = {
        label: "Agent Ready",
        dotClass: "bg-emerald-500",
        containerClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
  }

  // Handle text message submission with pre-flight mission context sync verification
  const handleSendMessage = useCallback(
    async (text: string) => {
      setSessionError(null);
      try {
        if (!session.isConnected) {
          // Connect on-demand on first text message without microphone
          await session.start({
            tracks: {
              microphone: { enabled: false },
            },
          });
          // Buffer for WebRTC data channel handshake
          await new Promise((r) => setTimeout(r, 400));
        }

        // If context is actively syncing, wait up to 1500ms for acknowledgement before dispatching text
        if (syncStatus === "syncing" && activeSnapshot) {
          await Promise.race([
            new Promise<void>((resolve) => {
              ackWaitersRef.current.push(resolve);
            }),
            new Promise<void>((resolve) => setTimeout(resolve, 1500)),
          ]);
        }

        await send(text);
        setDraftText("");
      } catch (err: unknown) {
        console.error("handleSendMessage error details:", err);
        const msg = err instanceof Error ? err.message : "Failed to deliver message to SIS.";
        setSessionError(msg);
      }
    },
    [session, send, syncStatus, activeSnapshot]
  );

  // Handle microphone toggle
  const handleToggleMic = useCallback(async () => {
    setMicError(null);
    setSessionError(null);
    try {
      if (!session.isConnected) {
        await session.start({
          tracks: {
            microphone: { enabled: true },
          },
        });
        setIsMicActive(true);
        setIsMicMuted(false);
        return;
      }

      const room = session.room;
      if (!room) return;

      const currentEnabled = room.localParticipant.isMicrophoneEnabled;
      if (!currentEnabled) {
        // Request browser microphone permission
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMicActive(true);
        setIsMicMuted(false);
      } else {
        // Toggle mute or stop
        const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub && !micPub.isMuted) {
          await micPub.track?.mute();
          setIsMicMuted(true);
        } else if (micPub && micPub.isMuted) {
          await micPub.track?.unmute();
          setIsMicMuted(false);
        } else {
          await room.localParticipant.setMicrophoneEnabled(false);
          setIsMicActive(false);
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Microphone access was denied or unavailable.";
      setMicError(errorMsg);
    }
  }, [session]);

  // Handle speaker toggle
  const handleToggleSpeaker = useCallback(() => {
    setIsSpeakerMuted((prev) => !prev);
  }, []);

  // Handle explicit session disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      if (session.room?.localParticipant.isMicrophoneEnabled) {
        await session.room.localParticipant.setMicrophoneEnabled(false);
      }
      await session.end();
      setIsMicActive(false);
      setIsMicMuted(false);
      setSessionError(null);
    } catch (err: unknown) {
      console.error("[SIS Disconnect Error]:", err);
    }
  }, [session]);

  const handlePromptClick = useCallback(
    (prompt: SuggestedPrompt) => {
      setDraftText(prompt);
      void handleSendMessage(prompt);
    },
    [handleSendMessage]
  );

  if (!isOpen) return null;

  // Minimized Floating Launcher Pill with real status
  if (isMinimized) {
    return (
      <aside
        aria-label="SIS Assistant Minimized"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-[#E7DDD3] bg-[#FFFDF8] px-4 py-2.5 text-stone-800 shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        onClick={onToggleMinimize}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-900">SIS Assistant</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.containerClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClass}`} />
            {statusBadge.label}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="SIS Assistant Panel"
      className="fixed top-[68px] right-3 sm:right-6 z-40 flex h-[620px] max-h-[calc(100vh-84px)] w-[360px] sm:w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-[#E7DDD3] bg-[#FFFDF8] text-stone-900 shadow-2xl shadow-black/40 transition-all animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-[#E7DDD3] bg-[#FAF5EE] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm ring-2 ring-orange-300/40">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold tracking-tight text-stone-900">
                SIS Assistant
              </h2>
              {/* Real Runtime Status Pill */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusBadge.containerClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClass}`} />
                {statusBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] font-medium text-stone-500">
                LMP · Super Intelligent System
              </p>
              {activeSnapshot && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                    activeSnapshot.provenance.isStale
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : syncStatus === "synced"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : syncStatus === "syncing"
                      ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                      : syncStatus === "error"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-stone-100 text-stone-600 border-stone-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeSnapshot.provenance.isStale
                        ? "bg-amber-500"
                        : syncStatus === "synced"
                        ? "bg-emerald-500"
                        : syncStatus === "syncing"
                        ? "bg-amber-500"
                        : syncStatus === "error"
                        ? "bg-rose-500"
                        : "bg-stone-400"
                    }`}
                  />
                  {activeSnapshot.provenance.isStale
                    ? "Mission data stale"
                    : syncStatus === "synced"
                    ? `Mission data synced · Rev ${syncedRevision ?? activeSnapshot.revision}`
                    : syncStatus === "syncing"
                    ? "Mission data syncing..."
                    : syncStatus === "error"
                    ? "Mission data sync failed"
                    : "Mission data awaiting sync"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Controls: Disconnect, Minimize, Close */}
        <div className="flex items-center gap-1">
          {isConnected && (
            <AgentDisconnectButton
              label="End session"
              icon={<Power className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={handleDisconnect}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors p-0"
            />
          )}
          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              aria-label="Minimize SIS Assistant"
              title="Minimize SIS Assistant"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition-colors"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SIS Assistant"
            title="Close SIS Assistant"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/60 hover:text-stone-800 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Autoplay Audio Unlock Banner if required by browser */}
      {!canPlayAudio && isConnected && (
        <div className="flex items-center justify-between bg-sky-50 border-b border-sky-200 px-3.5 py-1.5 text-xs text-sky-900">
          <span className="text-[11px]">Audio output requires browser interaction:</span>
          <StartAudioButton label="Enable Audio" room={session.room} />
        </div>
      )}

      {/* Microphone or Session Error Banner */}
      {(micError || sessionError) && (
        <div
          role="alert"
          className="flex items-center gap-2 bg-amber-50 border-b border-amber-200/70 px-3.5 py-2 text-xs text-amber-900 animate-in slide-in-from-top-1 duration-150"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1 text-[11px] leading-tight">
            {micError || sessionError}
          </span>
          <button
            type="button"
            onClick={() => {
              setMicError(null);
              setSessionError(null);
            }}
            className="text-amber-700 hover:text-amber-950 text-xs font-semibold"
          >
            ×
          </button>
        </div>
      )}

      {/* Conversation Scroll Area */}
      <div
        ref={scrollRef}
        aria-label="SIS conversation"
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FFFDF8]"
      >
        {/* Empty State: Instructional Only with Zero Dummy Messages */}
        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-6 px-3 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100/60 text-orange-600 border border-amber-200/50 shadow-xs">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-800">
                Ask SIS about your lunar mission
              </h3>
              <p className="text-xs text-stone-500 max-w-[280px] leading-relaxed">
                SIS provides verified mission intelligence for solar illumination, Earth line-of-sight,
                crater hazards, and rover traverse energy margins.
              </p>
            </div>

            {/* Mission Context Reference Pill if Available */}
            {(activeSnapshot || missionContext) && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>
                  Site: {(activeSnapshot?.mission.latitudeDeg ?? missionContext?.latitude ?? 0).toFixed(2)}°,{" "}
                  {(activeSnapshot?.mission.longitudeDeg ?? missionContext?.longitude ?? 0).toFixed(2)}° (
                  {activeSnapshot?.mission.observationEpoch ?? missionContext?.missionDate ?? ""}) · Rev{" "}
                  {activeSnapshot?.revision || 1}
                </span>
              </div>
            )}

            {/* Suggested Prompts Section - Shown only in empty state so chips do not clutter active conversation */}
            <div className="w-full pt-3 text-left">
              <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-orange-500" />
                <span>Suggested questions</span>
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className="w-full text-left rounded-xl border border-[#D6C7B8] bg-white px-3 py-2 text-xs text-stone-700 hover:border-orange-400 hover:bg-orange-50/50 hover:text-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <span className="text-[10px] text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Ask →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Real Messages List */}
        {displayMessages.map((msg) => (
          <SISMessageBubble key={msg.id} message={msg} />
        ))}

        {/* Real Agent Thinking State */}
        {agent.state === "thinking" && (
          <div className="flex justify-start gap-2 items-start animate-in fade-in duration-150">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs ring-1 ring-orange-400/40 mt-0.5">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[#F5EFEB] border border-[#E7DDD3] px-3.5 py-2.5 text-xs text-stone-600 shadow-sm flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              <span>SIS is analyzing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Composer with Real Voice and Send Actions */}
      <SISComposer
        draftText={draftText}
        onDraftChange={setDraftText}
        onSendMessage={handleSendMessage}
        onToggleMic={handleToggleMic}
        onToggleSpeaker={handleToggleSpeaker}
        isMicActive={isMicActive}
        isMicMuted={isMicMuted}
        isSpeakerMuted={isSpeakerMuted}
        isSending={isSending}
        disabled={isConnecting}
        micError={micError}
      />
    </aside>
  );
}

/**
 * Top-level SISChatPanel component with stable LiveKit session lifecycle.
 */
export function SISChatPanel(props: SISChatPanelProps) {
  // Stable token source targeting same-origin endpoint
  const tokenSource = useMemo(() => {
    const origin =
      typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null"
        ? window.location.origin
        : "http://localhost:3000";
    return TokenSource.endpoint(`${origin}/api/sis/livekit/token`);
  }, []);

  // Stable session instance pinned to lmp-sis-agent with generous timeout for cold starts
  const session = useSession(tokenSource, {
    agentName: "lmp-sis-agent",
    agentConnectTimeoutMilliseconds: 60000,
  });

  return (
    <AgentSessionProvider session={session} volume={1}>
      <SISChatPanelContent {...props} session={session} />
    </AgentSessionProvider>
  );
}
