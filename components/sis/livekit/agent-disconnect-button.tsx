/**
 * Adapted from LiveKit Agent Starter React
 * Source: https://github.com/livekit-examples/agent-starter-react
 * Original commit: 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
 * License: MIT (c) LiveKit, Inc.
 */

'use client';

import React, { type ComponentProps } from 'react';
import { PhoneOff } from 'lucide-react';
import { useSessionContext } from '@livekit/components-react';

export interface AgentDisconnectButtonProps extends ComponentProps<'button'> {
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

/**
 * Disconnects from the active LiveKit agent session and releases media resources.
 */
export function AgentDisconnectButton({
  icon,
  label = 'End session',
  className = '',
  onClick,
  ...props
}: AgentDisconnectButtonProps) {
  const { end } = useSessionContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (typeof end === 'function') {
      end();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {icon ?? <PhoneOff className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}

