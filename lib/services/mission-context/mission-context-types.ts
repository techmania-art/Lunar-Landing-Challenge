/**
 * Phase 27 & Phase 28: Shared Mission Context Snapshot Contract
 * Defines the canonical data structures flowing from the LMP Mission Analysis
 * sidebar to the SIS (Super Intelligent System) LiveKit agent.
 */

import type {
  CommunicationLinkAnalysis,
  CommunicationStatus,
  RadioConfig,
  RelayConfig,
} from "../communication/communication-types";

export type {
  CommunicationLinkAnalysis,
  CommunicationStatus,
  RadioConfig,
  RelayConfig,
};

export interface MetricSnapshot<T = number | string | null> {
  key: string;
  label: string;
  value: T;
  unit?: string;
  status: "ready" | "calculated" | "unavailable" | "pending" | "error" | "stale";
  source?: string;
  asOf?: string;
  note?: string | null;
}

export interface MissionCoordinates {
  latitudeDeg: number;
  longitudeDeg: number;
  missionDate: string;
  missionTimeUtc: string;
  observationEpoch: string;
  destination?: {
    latitudeDeg: number;
    longitudeDeg: number;
  } | null;
}

export interface RoverConfiguration {
  panelAreaM2?: number;
  panelEfficiencyPercent?: number;
  panelOrientation?: string;
  batteryCapacityWh?: number;
  maxDodPercent?: number;
  initialSocPercent?: number;
  drivePowerW?: number;
  idlePowerW?: number;
  driveSpeedKmH?: number;
  safetyReservePercent?: number;
  analysisDurationHours?: number;
}

export interface SunAnalysisSnapshot {
  status: "ready" | "unavailable" | "error";
  azimuthDeg: number | null;
  elevationDeg: number | null;
  geometricStatus: string | null;
  observationTimeUtc: string | null;
  source: string;
  limitation: string;
}

export interface EarthAnalysisSnapshot {
  status: "ready" | "unavailable" | "error";
  azimuthDeg: number | null;
  elevationDeg: number | null;
  geometricStatus: string | null;
  observationTimeUtc: string | null;
  source: string;
  limitation: string;
}

export interface SolarEnergySnapshot {
  status: "ready" | "zero-direct-power" | "panel-unconfigured" | "unavailable";
  illuminationState: "ILLUMINATED" | "TERRAIN_SHADOWED" | "GEOMETRICALLY_BELOW_HORIZON" | "UNAVAILABLE" | "UNCERTAIN";
  sunElevationDeg: number | null;
  terrainHorizonMaskDeg: number | null;
  directSolarPowerW: number | null;
  estimatedEnergyWh: number | null;
  analysisDurationHours: number | null;
  directIrradianceModel: string;
  terrainDataset: string;
  message: string;
  assumptions: string[];
}

export interface RouteTerrainSnapshot {
  status: "PASSES_CONFIGURED_LIMITS" | "WARNINGS_REVIEW_ROUTE" | "EXCEEDS_CONFIGURED_LIMITS" | "NOT_EVALUATED" | "UNDETERMINED" | "UNAVAILABLE";
  routeDistanceKm: number | null;
  corridorWidthMeters: number | null;
  totalObstacles: number | null;
  obstacleStatus: string;
  maximumSlopeDeg: number | null;
  averageSlopeDeg: number | null;
  roughnessRmsdMeters: number | null;
  detectedCraters: number | null;
  cratersInCorridor: number | null;
  boulderStatus: string;
  elevationMinMeters: number | null;
  elevationMaxMeters: number | null;
  elevationChangeMeters: number | null;
  elevationModel: string;
  datum: string;
  reasons: string[];
}

export interface RoverTraverseSnapshot {
  state: "SUFFICIENT_ENERGY" | "CONDITIONALLY_FEASIBLE" | "INSUFFICIENT_ENERGY" | "NOT_EVALUATED" | "UNDETERMINED";
  routeDistanceKm: number | null;
  estimatedDriveTimeHours: number | null;
  totalEnergyRequiredWh: number | null;
  availableEnergyWh: number | null;
  netMarginWh: number | null;
  projectedEndingBatteryEnergyWh: number | null;
  explanation: string;
  assumptions: string[];
}

export interface CommunicationVisibilitySnapshot {
  geometricStatus: string;
  earthAboveHorizon: boolean | null;
  observationEpoch: string;
  source: string;
  rfLinkAssessed: false;
  limitation: string;
}

export interface AnalysisStatusSummary {
  overall: "complete" | "partial" | "error" | "awaiting";
  sun: "ready" | "unavailable" | "error";
  earth: "ready" | "unavailable" | "error";
  solarEnergy: "ready" | "zero-direct-power" | "panel-unconfigured" | "unconfigured" | "unavailable";
  routeTerrain: "ready" | "not-evaluated" | "unavailable";
  roverTraverse: "ready" | "not-evaluated" | "insufficient" | "unavailable";
  communicationVisibility: "ready" | "unavailable";
  communicationLink?: CommunicationStatus;
  surroundingTerrain: "pending";
}

export interface LmpMissionContextSnapshot {
  schemaVersion: "1.0.0";
  contextId: string;
  revision: number;
  createdAt: string;
  mission: MissionCoordinates;
  rover: RoverConfiguration;
  analysisStatus: AnalysisStatusSummary;
  sun: SunAnalysisSnapshot;
  earth: EarthAnalysisSnapshot;
  solarEnergy: SolarEnergySnapshot;
  routeTerrain: RouteTerrainSnapshot;
  roverTraverse: RoverTraverseSnapshot;
  communicationVisibility: CommunicationVisibilitySnapshot;
  communicationLink?: CommunicationLinkAnalysis;
  provenance: {
    generatedAt: string;
    isStale: boolean;
    models: string[];
    warnings: string[];
  };
}

export interface LmpMissionContextAck {
  contextId: string;
  revision: number;
  status: "acknowledged" | "rejected";
  timestamp: string;
  error?: string;
}

export const MISSION_CONTEXT_TOPIC = "lmp.sis.mission-context.v1";
export const MISSION_CONTEXT_ACK_TOPIC = "lmp.sis.mission-context.ack.v1";
