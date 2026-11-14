import type { LunarCoordinates } from "@/lib/coordinates/lunar-coordinate-types";

export type { LunarCoordinates };

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

export interface MissionInput {
  latitude: number;
  longitude: number;
  missionDate: string; // YYYY-MM-DD
  missionTimeUtc: string; // HH:mm
  additionalSite?: CoordinatePoint;
  rawCoordinates?: {
    latitude: string;
    longitude: string;
  };
}

export type FormValidationErrors = {
  latitude?: string;
  longitude?: string;
  missionDate?: string;
  missionTimeUtc?: string;
  additionalSite?: string;
  general?: string;
};
