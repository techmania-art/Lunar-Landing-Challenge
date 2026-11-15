/**
 * Adapted from LiveKit Agent Starter React
 * Source: https://github.com/livekit-examples/agent-starter-react
 * Original commit: 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
 * License: MIT (c) LiveKit, Inc.
 */

'use client';

import React from 'react';

export interface AgentChatIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

/**
 * Animated pulsing indicator displayed when the LiveKit agent is thinking/processing.
 */
export function AgentChatIndicator({ size = 'md', className = '' }: AgentChatIndicatorProps) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label="Agent processing"
    >
      <span
        className={`${sizeClass} rounded-full bg-amber-600 dark:bg-amber-400 animate-ping opacity-75`}
      />
      <span
        className={`absolute ${sizeClass} rounded-full bg-amber-700 dark:bg-amber-300`}
      />
    </span>
  );
}

