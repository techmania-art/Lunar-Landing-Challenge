/**
 * Rover Configuration & Traverse Feasibility Domain Types (Phase 10)
 */

export type TraverseFeasibilityState =
  | "SUFFICIENT_ENERGY"
  | "INSUFFICIENT_ENERGY"
  | "CONDITIONALLY_FEASIBLE"
  | "UNDETERMINED"
  | "NOT_EVALUATED";

export interface RoverBatteryConfig {
  nominalCapacityWh: number; // e.g. 600 Wh
  maxDepthOfDischargePercent: number; // e.g. 80% usable depth
  initialSocPercent: number; // e.g. 100%
  efficiencyFactor?: number; // e.g. 0.92
}

export interface RoverConsumptionConfig {
  drivePowerW: number; // e.g. 75 W
  idlePowerW: number; // e.g. 20 W
  driveSpeedKmH: number; // e.g. 0.5 km/h (~0.14 m/s)
  safetyReservePercent: number; // e.g. 15%
}

export interface TraverseRouteConfig {
  startLatitudeDeg: number;
  startLongitudeDeg: number;
  destLatitudeDeg?: number;
  destLongitudeDeg?: number;
  manualDistanceKm?: number;
}

export interface RoverFormValues {
  // Preset selection
  presetId?: "custom" | "generic-reference";

  // Energy storage
  batteryCapacityWh?: string;
  maxDodPercent?: string;
  initialSocPercent?: string;

  // Consumption
  drivePowerW?: string;
  idlePowerW?: string;
  driveSpeedKmH?: string;
  safetyReservePercent?: string;

  // Route destination
  destLatitude?: string;
  destLongitude?: string;
}

export interface TraverseFeasibilityInput {
  battery?: RoverBatteryConfig;
  consumption?: RoverConsumptionConfig;
  route?: TraverseRouteConfig;
  solarEnergyGeneratedWh?: number;
  missionDurationHours?: number;
}

export interface TraverseFeasibilityResult {
  state: TraverseFeasibilityState;
  routeDistanceKm?: number;
  estimatedDriveTimeHours?: number;
  missionDurationHours?: number;
  driveEnergyWh?: number;
  idleEnergyWh?: number;
  totalEnergyRequiredWh?: number;
  solarEnergyGeneratedWh?: number;
  initialBatteryEnergyWh?: number;
  usableBatteryEnergyWh?: number;
  projectedEndingBatteryEnergyWh?: number;
  requiredReserveWh?: number;
  netMarginWh?: number;
  explanation: string;
  assumptions: string[];
  limitations: string[];
}

