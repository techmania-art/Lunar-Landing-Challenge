/**
 * Adapted from LiveKit Agent Starter React
 * Source: https://github.com/livekit-examples/agent-starter-react
 * Original commit: 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
 * License: MIT (c) LiveKit, Inc.
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { AgentDisconnectButton } from './agent-disconnect-button';

export interface AgentControlBarProps {
  draftText: string;
  onDraftChange: (text: string) => void;
  onSend: (text: string) => void;
  isSending?: boolean;
  isConnected?: boolean;
  isMicActive?: boolean;
  isMicMuted?: boolean;
  isSpeakerMuted?: boolean;
  micError?: string | null;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onDisconnect?: () => void;
  className?: string;
}

/**
 * Control bar adapted from LiveKit agent-control-bar, restyled for the SIS warm cream panel.
 * Combines text composer, microphone toggle, speaker mute, and session disconnect.
 */
export function AgentControlBar({
  draftText,
  onDraftChange,
  onSend,
  isSending = false,
  isConnected = false,
  isMicActive = false,
  isMicMuted = false,
  isSpeakerMuted = false,
  micError,
  onToggleMic,
  onToggleSpeaker,
  onDisconnect,
  className = '',
}: AgentControlBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 100px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [draftText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draftText.trim() && !isSending) {
        onSend(draftText.trim());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftText.trim() && !isSending) {
      onSend(draftText.trim());
    }
  };

  return (
    <div
      className={`p-3 bg-[#fdfbf7] dark:bg-[#1a1918] border-t border-[#e7e5e4] dark:border-[#2e2d2b] space-y-2.5 ${className}`}
    >
      {/* Microphone status or error warning */}
      {micError && (
        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
          {micError}
        </div>
      )}

      {/* Main text input form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="relative flex-1 bg-white dark:bg-[#252422] rounded-xl border border-[#d6d3d1] dark:border-[#3d3b38] focus-within:border-amber-600 focus-within:ring-1 focus-within:ring-amber-600 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? 'Ask SIS about lunar mission parameters...'
                : 'Connect to ask SIS about lunar mission parameters...'
            }
            rows={1}
            disabled={isSending}
            aria-label="Message to SIS Assistant"
            className="w-full bg-transparent text-xs text-[#292524] dark:text-[#f5f5f4] placeholder-[#a8a29e] dark:placeholder-[#78716c] px-3 py-2.5 focus:outline-hidden resize-none max-h-[100px] leading-relaxed"
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!draftText.trim() || isSending}
          aria-label="Send message"
          className="p-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 text-white shrink-0 transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Controls row: Mic toggle, Speaker toggle, Disconnect button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {/* Microphone toggle */}
          <button
            type="button"
            onClick={onToggleMic}
            title={
              !isMicActive
                ? 'Start voice / microphone'
                : isMicMuted
                ? 'Unmute microphone'
                : 'Mute microphone'
            }
            aria-label={
              !isMicActive
                ? 'Start voice / microphone'
                : isMicMuted
                ? 'Unmute microphone'
                : 'Mute microphone'
            }
            className={`p-2 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${
              isMicActive && !isMicMuted
                ? 'bg-emerald-600 text-white shadow-2xs'
                : isMicActive && isMicMuted
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                : 'bg-[#f0ede6] hover:bg-[#e7e3da] text-[#57534e] dark:bg-[#282725] dark:hover:bg-[#33312e] dark:text-[#d6d3d1]'
            }`}
          >
            {isMicActive && !isMicMuted ? (
              <Mic className="w-3.5 h-3.5" />
            ) : (
              <MicOff className="w-3.5 h-3.5" />
            )}
            <span className="text-[10px] font-medium hidden sm:inline">
              {!isMicActive ? 'Mic' : isMicMuted ? 'Muted' : 'Live'}
            </span>
          </button>

          {/* Speaker toggle */}
          <button
            type="button"
            onClick={onToggleSpeaker}
            title={isSpeakerMuted ? 'Unmute SIS voice' : 'Mute SIS voice'}
            aria-label={isSpeakerMuted ? 'Unmute SIS voice' : 'Mute SIS voice'}
            className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
              isSpeakerMuted
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                : 'bg-[#f0ede6] hover:bg-[#e7e3da] text-[#57534e] dark:bg-[#282725] dark:hover:bg-[#33312e] dark:text-[#d6d3d1]'
            }`}
          >
            {isSpeakerMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Disconnect / End session button */}
        {isConnected && (
          <AgentDisconnectButton
            label="Disconnect"
            onClick={onDisconnect}
          />
        )}
      </div>
    </div>
  );
}

