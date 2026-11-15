/**
 * Phase 28: Communication Link Analysis Types & Data Contracts
 *
 * Distinguishes four independent evaluation layers:
 * 1. Geometric visibility (Earth ephemeris relative to spherical lunar reference datum)
 * 2. Terrain Line of Sight (LOLA Polar DEM horizon obstruction)
 * 3. RF Link Budget (Friis transmission equation, free-space path loss, receive sensitivity, link margin)
 * 4. Relay Path Availability (configured orbital/surface relay nodes)
 */

export type CommunicationStatus =
  | "available"
  | "limited"
  | "unavailable"
  | "unknown"
  | "not_configured"
  | "pending"
  | "error";

export type TerrainLosStatus = "clear" | "blocked" | "unknown" | "not_evaluated";

export type RfLinkStatus = "pass" | "marginal" | "fail" | "not_configured" | "not_evaluated";

export type SelectedPathKind = "direct" | "relay" | "none" | "undetermined";

export interface RadioConfig {
  preset?: "not-configured" | "s-band-direct" | "x-band-direct" | "custom";
  isConfigured: boolean;
  transmitPowerW?: number;
  carrierFrequencyGhz?: number;
  roverAntennaGainDbi?: number;
  groundStationGainDbi?: number;
  systemLossesDb?: number;
  receiverSensitivityDbm?: number;
  requiredMarginDb?: number;
}

export interface RelayConfig {
  preset?: "none" | "lunar-gateway-halo" | "custom";
  isConfigured: boolean;
  relayName?: string;
  relayElevationDeg?: number;
  roverToRelayMarginDb?: number;
  relayToEarthMarginDb?: number;
}

export interface CommunicationGeometry {
  earthAzimuthDeg: number | null;
  earthElevationDeg: number | null;
  aboveGeometricHorizon: boolean | null;
  observationEpoch: string | null;
  datum: string;
  source: string;
}

export interface CommunicationTerrainLos {
  status: TerrainLosStatus;
  obstructionAngleDeg: number | null;
  angularClearanceDeg: number | null;
  obstructionDistanceM: number | null;
  source: string | null;
  modelVersion: string | null;
  resolutionM: number | null;
  warning: string | null;
}

export interface CommunicationRfLink {
  status: RfLinkStatus;
  frequencyHz: number | null;
  transmitPowerW: number | null;
  transmitPowerDbm: number | null;
  transmitAntennaGainDbi: number | null;
  receiveAntennaGainDbi: number | null;
  slantRangeM: number | null;
  pathLossDb: number | null;
  receivedPowerDbm: number | null;
  receiverSensitivityDbm: number | null;
  linkMarginDb: number | null;
  requiredMarginDb: number | null;
  modelName: string | null;
  warning: string | null;
}

export interface CommunicationRelay {
  configured: boolean;
  evaluated: boolean;
  available: boolean | null;
  relayId: string | null;
  source: string | null;
  warning: string | null;
}

export interface CommunicationProvenance {
  sources: string[];
  calculationVersion: string;
  warnings: string[];
  isStale: boolean;
}

export interface CommunicationLinkAnalysis {
  status: CommunicationStatus;
  statusReason: string;
  selectedPath: SelectedPathKind;
  evaluatedAt: string | null;
  missionEpoch: string | null;
  geometry: CommunicationGeometry;
  terrainLos: CommunicationTerrainLos;
  rfLink: CommunicationRfLink;
  relay: CommunicationRelay;
  provenance: CommunicationProvenance;
}

export interface CommunicationEvaluationInput {
  latitudeDeg: number;
  longitudeDeg: number;
  missionEpoch: string;
  earthAzimuthDeg?: number | null;
  earthElevationDeg?: number | null;
  radioConfig?: RadioConfig;
  relayConfig?: RelayConfig;
  isStale?: boolean;
}

