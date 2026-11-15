export type IlluminationState =
  | "ILLUMINATED"
  | "TERRAIN_SHADOWED"
  | "GEOMETRICALLY_BELOW_HORIZON"
  | "UNCERTAIN"
  | "UNAVAILABLE";

export type SolarPanelOrientationKind = "horizontal" | "sun-tracking";

export interface SolarPanelConfig {
  areaM2: number; // m², > 0
  efficiencyPercent: number; // %, 0 < eff <= 100
  orientation: SolarPanelOrientationKind;
  deratingFactor?: number; // fraction 0 < d <= 1, default 0.85
}

export interface SolarEnergyInput {
  panel?: SolarPanelConfig;
  analysisDurationHours?: number; // hours, > 0
}

export interface SolarIlluminationResult {
  state: IlluminationState;
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  localTerrainHorizonDeg: number;
  observationTimeUtc: string;
  reason: string;
  terrainDataset: string;
  source: string;
}

export type SolarEnergyCalculationStatus =
  | "calculated"
  | "zero-direct-power"
  | "panel-unconfigured"
  | "unavailable";

export interface SolarEnergyResult {
  status: SolarEnergyCalculationStatus;
  directSolarPowerW?: number;
  estimatedEnergyWh?: number;
  solarIrradianceWm2: number;
  incidenceAngleDeg?: number;
  analysisDurationHours?: number;
  illuminatedDurationHours?: number;
  panelAreaM2?: number;
  panelEfficiencyPercent?: number;
  panelOrientation?: SolarPanelOrientationKind;
  deratingFactor?: number;
  reason?: string;
  message: string;
  assumptions: string[];
}

