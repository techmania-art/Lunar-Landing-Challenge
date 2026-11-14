import type { LunarCoordinates } from "@/lib/coordinates/lunar-coordinate-types";

export type HorizonsTarget = "10" | "399"; // 10 = Sun, 399 = Earth

export interface HorizonsQueryParams {
  target: HorizonsTarget;
  targetName: "Sun" | "Earth";
  coordinates: LunarCoordinates;
  missionDate: string; // YYYY-MM-DD
  missionTimeUtc: string; // HH:mm
}

export interface HorizonsCelestialPosition {
  targetId: HorizonsTarget;
  targetName: "Sun" | "Earth";
  azimuthDeg: number;
  elevationDeg: number;
  /**
   * Geometric visibility above the lunar sphere/ellipsoid (elevationDeg > 0).
   * Note: This is NOT terrain-unobstructed visibility; mountains/crater rims can still block the sightline.
   */
  isGeometricAboveHorizon: boolean;
  observationTimeUtc: string;
  retrievedAtUtc: string;
  source: "JPL Horizons";
  units: {
    azimuth: "degrees (East of North)";
    elevation: "degrees above local horizon";
  };
}

export interface HorizonsMissionAnalysisResponse {
  success: boolean;
  observerCoordinates: LunarCoordinates;
  observationTimeUtc: string;
  sun?: HorizonsCelestialPosition;
  earth?: HorizonsCelestialPosition;
  error?: string;
  details?: string;
  upstreamStatus?: number;
  disclaimer: string;
}

export interface HorizonsRawApiResponse {
  result?: string;
  error?: string;
  message?: string;
  signature?: {
    source?: string;
    version?: string;
  };
}

