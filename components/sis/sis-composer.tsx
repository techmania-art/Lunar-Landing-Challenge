import React from "react";
import { Send, Mic, MicOff, Volume2, VolumeX, Keyboard, Loader2 } from "lucide-react";

export interface SISComposerProps {
  draftText: string;
  onDraftChange: (text: string) => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  isMicActive?: boolean;
  isMicMuted?: boolean;
  isSpeakerMuted?: boolean;
  isSending?: boolean;
  disabled?: boolean;
  micError?: string | null;
}

export function SISComposer({
  draftText,
  onDraftChange,
  onSendMessage,
  onToggleMic,
  onToggleSpeaker,
  isMicActive = false,
  isMicMuted = false,
  isSpeakerMuted = false,
  isSending = false,
  disabled = false,
  micError = null,
}: SISComposerProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || isSending || disabled) return;
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isSendDisabled = disabled || isSending || !draftText.trim();

  return (
    <div className="border-t border-[#E7DDD3] bg-[#FFF9F2] p-3 space-y-2">
      {/* Real Voice / Input Controls Row */}
      <div className="flex items-center justify-between px-1 text-xs text-stone-500">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Text mode active"
            title="Text chat active"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-200/60 text-stone-700 transition-colors"
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {isMicActive && !isMicMuted && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Mic listening</span>
            </span>
          )}
          {isMicMuted && (
            <span className="text-[11px] font-medium text-amber-700">
              Mic muted
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Real Microphone Toggle Button */}
          <button
            type="button"
            onClick={onToggleMic}
            disabled={disabled}
            aria-label={
              isMicActive
                ? isMicMuted
                  ? "Unmute microphone"
                  : "Mute microphone"
                : "Turn on microphone"
            }
            title={
              micError
                ? micError
                : isMicActive
                  ? isMicMuted
                    ? "Microphone is muted — click to unmute"
                    : "Microphone is active — click to mute"
                  : "Click to start voice chat"
            }
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all shadow-2xs ${
              isMicActive
                ? isMicMuted
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/20"
                : "border-stone-300 bg-white text-stone-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50"
            }`}
          >
            {isMicActive && isMicMuted ? (
              <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {/* Real Speaker / TTS Output Toggle */}
          <button
            type="button"
            onClick={onToggleSpeaker}
            disabled={disabled}
            aria-label={isSpeakerMuted ? "Unmute audio output" : "Mute audio output"}
            title={isSpeakerMuted ? "Speaker muted — click to unmute" : "Speaker active"}
            className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all shadow-2xs ${
              isSpeakerMuted
                ? "border-stone-300 bg-stone-100 text-stone-400"
                : "border-stone-300 bg-white text-stone-600 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50"
            }`}
          >
            {isSpeakerMuted ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Main Text Input Composer Form */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={draftText}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          placeholder={isSending ? "Sending message to SIS..." : "Ask SIS a question..."}
          aria-label="Message to SIS Assistant"
          className="w-full rounded-xl border border-[#D6C7B8] bg-white px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 shadow-2xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSendDisabled}
          aria-label="Send message"
          className={`absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
            isSendDisabled
              ? "cursor-not-allowed text-stone-300"
              : "bg-orange-500 text-white shadow-xs hover:bg-orange-600 active:scale-95"
          }`}
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}
