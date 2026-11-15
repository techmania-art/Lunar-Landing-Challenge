/**
 * Adapted from LiveKit Agent Starter React
 * Source: https://github.com/livekit-examples/agent-starter-react
 * Original commit: 9e1fc2f40fd7ceaccbe4a872b21765b49eefea80
 * License: MIT (c) LiveKit, Inc.
 */

'use client';

import React from 'react';
import type { Room } from 'livekit-client';
import {
  RoomAudioRenderer,
  type RoomAudioRendererProps,
  SessionProvider,
  type SessionProviderProps,
  type UseSessionReturn,
} from '@livekit/components-react';

export type AgentSessionProviderProps = SessionProviderProps &
  RoomAudioRendererProps & {
    room?: Room;
    volume?: number;
    muted?: boolean;
    session: UseSessionReturn;
    children: React.ReactNode;
  };

/**
 * Wraps SessionProvider and RoomAudioRenderer for remote agent audio playback.
 */
export function AgentSessionProvider({
  session,
  children,
  ...roomAudioRendererProps
}: AgentSessionProviderProps) {
  return (
    <SessionProvider session={session}>
      {children}
      <RoomAudioRenderer {...roomAudioRendererProps} />
    </SessionProvider>
  );
}

