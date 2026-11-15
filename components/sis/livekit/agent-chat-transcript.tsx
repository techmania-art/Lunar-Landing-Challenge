/**
 * Adapted from LiveKit Agent Starter React
 * Source: https://github.com/livekit-examples/agent-starter-react
 * Original commit: 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
 * License: MIT (c) LiveKit, Inc.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { AgentState, ReceivedMessage } from '@livekit/components-react';
import { Bot, User, Sparkles } from 'lucide-react';
import { AgentChatIndicator } from './agent-chat-indicator';
import { SUGGESTED_PROMPTS, type SuggestedPrompt } from '../sis-types';

export interface AgentChatTranscriptProps {
  messages?: ReceivedMessage[];
  agentState?: AgentState;
  onSelectPrompt?: (prompt: string) => void;
  className?: string;
}

/**
 * Chat transcript component that renders LiveKit session messages, timestamps,
 * speech vs text indicators, empty state guidance, and the active thinking indicator.
 */
export function AgentChatTranscript({
  messages = [],
  agentState,
  onSelectPrompt,
  className = '',
}: AgentChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, agentState]);

  const isEmpty = messages.length === 0;

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0 ${className}`}
    >
      {isEmpty && (
        <div className="py-6 px-2 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-[#f0ede6] dark:bg-[#252422] flex items-center justify-center text-[#78716c] mb-3 border border-[#e7e5e4] dark:border-[#333]">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h4 className="text-sm font-semibold text-[#292524] dark:text-[#f5f5f4] mb-1">
            Super Intelligent System (SIS)
          </h4>
          <p className="text-xs text-[#78716c] dark:text-[#a8a29e] max-w-[280px] leading-relaxed mb-5">
            Ask SIS about your lunar landing coordinates, solar power budget, line of sight, or rover feasibility.
          </p>

          {/* Quick suggested prompt chips */}
          <div className="w-full space-y-1.5 text-left">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#a8a29e] dark:text-[#78716c] block mb-1">
              Suggested queries
            </span>
            {SUGGESTED_PROMPTS.map((prompt: SuggestedPrompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSelectPrompt?.(prompt)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs bg-[#fdfbf7] dark:bg-[#1f1e1d] hover:bg-[#f5f2eb] dark:hover:bg-[#2a2927] border border-[#e7e5e4] dark:border-[#383735] text-[#44403c] dark:text-[#d6d3d1] transition-all duration-150 flex items-center justify-between group shadow-2xs cursor-pointer"
              >
                <span>{prompt}</span>
                <span className="text-[10px] text-[#a8a29e] opacity-0 group-hover:opacity-100 transition-opacity">
                  Insert →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Render actual session messages */}
      {messages.map((msg) => {
        const isUser = msg.from?.isLocal ?? false;
        const time = msg.timestamp ? new Date(msg.timestamp) : new Date();
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                isUser
                  ? 'bg-[#292524] text-white dark:bg-[#f5f5f4] dark:text-[#1c1917]'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs leading-relaxed ${
                isUser
                  ? 'bg-[#292524] text-[#f5f5f4] rounded-tr-xs'
                  : 'bg-white dark:bg-[#242321] text-[#292524] dark:text-[#f5f5f4] border border-[#e7e5e4] dark:border-[#383735] rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.message}</div>
              <div
                className={`mt-1.5 flex items-center gap-1.5 text-[9px] ${
                  isUser ? 'text-stone-400 justify-end' : 'text-[#a8a29e] justify-start'
                }`}
              >
                <span>{timeStr}</span>
                {msg.type === 'userTranscript' && (
                  <span className="italic font-medium text-amber-500">• Voice</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Real agent thinking indicator */}
      {agentState === 'thinking' && (
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-amber-600 text-white">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div className="bg-white dark:bg-[#242321] text-[#78716c] dark:text-[#a8a29e] border border-[#e7e5e4] dark:border-[#383735] rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs text-xs flex items-center gap-2">
            <AgentChatIndicator size="sm" />
            <span className="italic">SIS is analyzing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
