/**
 * Adapted from LiveKit Agent Starter React
 * Source: https://github.com/livekit-examples/agent-starter-react
 * Original commit: 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
 * License: MIT (c) LiveKit, Inc.
 */

'use client';

import React, { type ComponentProps } from 'react';
import type { Room } from 'livekit-client';
import { useEnsureRoom, useStartAudio } from '@livekit/components-react';
import { Volume2 } from 'lucide-react';

export interface StartAudioButtonProps extends ComponentProps<'button'> {
  room?: Room;
  label?: string;
  className?: string;
}

/**
 * Handles browser autoplay audio blocking via explicit user gesture.
 * Only rendered when browser autoplay policy blocks the remote audio context.
 */
export function StartAudioButton({
  room,
  label = 'Click to enable SIS voice audio',
  className = '',
  ...props
}: StartAudioButtonProps) {
  const roomEnsured = useEnsureRoom(room);
  const baseClass = `inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors cursor-pointer ${className}`;
  const { mergedProps } = useStartAudio({ room: roomEnsured, props: { ...props, className: baseClass } });

  return (
    <button
      type="button"
      {...mergedProps}
    >
      <Volume2 className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
