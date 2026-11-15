import type { LmpMissionContextSnapshot } from "@/lib/services/mission-context/mission-context-types";

export interface SISMessage {
  id: string;
  sender: "user" | "sis";
  text: string;
  timestamp?: string;
  isVoice?: boolean;
}

export type SISAgentState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "muted"
  | "failed";

export const SUGGESTED_PROMPTS = [
  "Explain the Sun analysis",
  "Why is Earth below the horizon?",
  "Explain the terrain results",
  "What does this mean for the rover?",
] as const;

export type SuggestedPrompt = (typeof SUGGESTED_PROMPTS)[number];

export interface SISMissionContext {
  latitude: number;
  longitude: number;
  missionDate: string;
  missionTimeUtc: string;
  solarElevation?: number;
  solarAzimuth?: number;
  earthElevation?: number;
  earthAzimuth?: number;
  isStale?: boolean;
  snapshot?: LmpMissionContextSnapshot;
}
