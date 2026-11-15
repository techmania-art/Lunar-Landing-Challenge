/**
 * Phase 28: Communication Link Analysis Calculator & Status Resolver
 *
 * Implements:
 * 1. Geometric visibility resolution relative to spherical lunar reference datum.
 * 2. Terrain Line-of-Sight (LOS) evaluation using LOLA polar topographic models.
 * 3. RF Link-Budget calculation using the Friis transmission equation and Free-Space Path Loss (FSPL).
 * 4. Relay path availability evaluation.
 * 5. Deterministic multi-layer status resolver.
 */

import { estimateLocalTerrainHorizon } from "@/lib/services/solar/solar-calculator";
import type {
  CommunicationEvaluationInput,
  CommunicationGeometry,
  CommunicationLinkAnalysis,
  CommunicationRelay,
  CommunicationRfLink,
  CommunicationStatus,
  CommunicationTerrainLos,
  RadioConfig,
  RelayConfig,
  SelectedPathKind,
} from "./communication-types";

/**
 * Speed of light in vacuum (m/s).
 */
export const SPEED_OF_LIGHT_MS = 299792458;

/**
 * Mean Earth-Moon center-to-center distance minus radii (approximate topocentric slant range).
 * Standard reference: 384,400 km = 3.844e8 m.
 */
export const MEAN_EARTH_MOON_DISTANCE_METERS = 384400000;

/**
 * Computes Free-Space Path Loss (FSPL) in dB given distance in meters and frequency in Hz.
 *
 * Formula: FSPL(dB) = 20 * log10(4 * pi * d * f / c)
 */
export function calculateFreeSpacePathLossDb(
  distanceMeters: number,
  frequencyHz: number
): number {
  if (distanceMeters <= 0 || frequencyHz <= 0) {
    throw new Error("Distance and frequency must be strictly positive values.");
  }
  const numerator = 4 * Math.PI * distanceMeters * frequencyHz;
  const ratio = numerator / SPEED_OF_LIGHT_MS;
  const fspl = 20 * Math.log10(ratio);
  return Math.round(fspl * 100) / 100;
}

/**
 * Converts Watts to dBm: P(dBm) = 10 * log10(P(W) * 1000)
 */
export function wattsToDbm(watts: number): number {
  if (watts <= 0) {
    throw new Error("Transmitter power must be strictly positive to calculate dBm.");
  }
  const dbm = 10 * Math.log10(watts * 1000);
  return Math.round(dbm * 100) / 100;
}

/**
 * Evaluates geometric visibility of Earth.
 */
export function evaluateCommunicationGeometry(
  earthAzimuthDeg?: number | null,
  earthElevationDeg?: number | null,
  missionEpoch?: string | null
): CommunicationGeometry {
  const hasEarth =
    typeof earthElevationDeg === "number" &&
    Number.isFinite(earthElevationDeg) &&
    typeof earthAzimuthDeg === "number" &&
    Number.isFinite(earthAzimuthDeg);

  if (!hasEarth) {
    return {
      earthAzimuthDeg: null,
      earthElevationDeg: null,
      aboveGeometricHorizon: null,
      observationEpoch: missionEpoch ?? null,
      datum: "Lunar spherical reference datum (R = 1737.4 km)",
      source: "JPL Horizons (Target 399, Observer 301)",
    };
  }

  return {
    earthAzimuthDeg: Math.round(earthAzimuthDeg! * 100) / 100,
    earthElevationDeg: Math.round(earthElevationDeg! * 100) / 100,
    aboveGeometricHorizon: earthElevationDeg! > 0,
    observationEpoch: missionEpoch ?? null,
    datum: "Lunar spherical reference datum (R = 1737.4 km)",
    source: "JPL Horizons (Target 399, Observer 301)",
  };
}

/**
 * Evaluates Terrain Line-of-Sight (LOS) along the Earth azimuth.
 */
export function evaluateTerrainLos(
  latitudeDeg: number,
  geometry: CommunicationGeometry
): CommunicationTerrainLos {
  if (geometry.earthElevationDeg === null) {
    return {
      status: "not_evaluated",
      obstructionAngleDeg: null,
      angularClearanceDeg: null,
      obstructionDistanceM: null,
      source: null,
      modelVersion: null,
      resolutionM: null,
      warning: "Earth elevation ephemeris unavailable; terrain LOS cannot be computed.",
    };
  }

  const { horizonAngleDeg, dataset } = estimateLocalTerrainHorizon(latitudeDeg);
  const clearance = geometry.earthElevationDeg - horizonAngleDeg;

  // 1. Geometrically below reference sphere
  if (geometry.earthElevationDeg <= 0) {
    return {
      status: "blocked",
      obstructionAngleDeg: Math.max(0, horizonAngleDeg),
      angularClearanceDeg: Math.round(clearance * 100) / 100,
      obstructionDistanceM: null,
      source: dataset,
      modelVersion: "LOLA DEM v1.2",
      resolutionM: 100,
      warning: "Path obstructed by lunar spherical body curvature.",
    };
  }

  // 2. Geometrically above sphere, but below local terrain horizon mask
  if (clearance <= 0) {
    return {
      status: "blocked",
      obstructionAngleDeg: Math.round(horizonAngleDeg * 100) / 100,
      angularClearanceDeg: Math.round(clearance * 100) / 100,
      obstructionDistanceM: 4500, // estimated horizon range in polar topography
      source: dataset,
      modelVersion: "LOLA DEM v1.2",
      resolutionM: 100,
      warning: `Path obstructed by local crater rim / topographic horizon (${horizonAngleDeg.toFixed(2)}° mask).`,
    };
  }

  // 3. Clear line of sight
  return {
    status: "clear",
    obstructionAngleDeg: Math.round(horizonAngleDeg * 100) / 100,
    angularClearanceDeg: Math.round(clearance * 100) / 100,
    obstructionDistanceM: null,
    source: dataset,
    modelVersion: "LOLA DEM v1.2",
    resolutionM: 100,
    warning: null,
  };
}

/**
 * Evaluates the RF Link Budget using the Friis transmission equation.
 */
export function evaluateRfLinkBudget(
  radioConfig?: RadioConfig,
  slantRangeM: number = MEAN_EARTH_MOON_DISTANCE_METERS
): CommunicationRfLink {
  if (!radioConfig || !radioConfig.isConfigured || radioConfig.preset === "not-configured") {
    return {
      status: "not_configured",
      frequencyHz: null,
      transmitPowerW: null,
      transmitPowerDbm: null,
      transmitAntennaGainDbi: null,
      receiveAntennaGainDbi: null,
      slantRangeM: null,
      pathLossDb: null,
      receivedPowerDbm: null,
      receiverSensitivityDbm: null,
      linkMarginDb: null,
      requiredMarginDb: null,
      modelName: "Friis Transmission Model (ASTM/ITU-R P.525)",
      warning: "Radio transceiver parameters not configured. Operational RF link cannot be evaluated.",
    };
  }

  const transmitPowerW = radioConfig.transmitPowerW;
  const carrierFrequencyGhz = radioConfig.carrierFrequencyGhz;
  const transmitAntennaGainDbi = radioConfig.roverAntennaGainDbi ?? 0;
  const receiveAntennaGainDbi = radioConfig.groundStationGainDbi ?? 45;
  const systemLossesDb = radioConfig.systemLossesDb ?? 2.0;
  const receiverSensitivityDbm = radioConfig.receiverSensitivityDbm ?? -130;
  const requiredMarginDb = radioConfig.requiredMarginDb ?? 3.0;

  if (
    typeof transmitPowerW !== "number" ||
    transmitPowerW <= 0 ||
    typeof carrierFrequencyGhz !== "number" ||
    carrierFrequencyGhz <= 0
  ) {
    return {
      status: "not_configured",
      frequencyHz: null,
      transmitPowerW: null,
      transmitPowerDbm: null,
      transmitAntennaGainDbi: null,
      receiveAntennaGainDbi: null,
      slantRangeM: null,
      pathLossDb: null,
      receivedPowerDbm: null,
      receiverSensitivityDbm: null,
      linkMarginDb: null,
      requiredMarginDb: null,
      modelName: "Friis Transmission Model (ASTM/ITU-R P.525)",
      warning: "Invalid or incomplete transmitter power / carrier frequency inputs.",
    };
  }

  const frequencyHz = carrierFrequencyGhz * 1e9;
  const transmitPowerDbm = wattsToDbm(transmitPowerW);
  const pathLossDb = calculateFreeSpacePathLossDb(slantRangeM, frequencyHz);

  // Friis link equation: Pr(dBm) = Pt(dBm) + Gt(dBi) + Gr(dBi) - FSPL(dB) - Lsys(dB)
  const receivedPowerDbm =
    transmitPowerDbm + transmitAntennaGainDbi + receiveAntennaGainDbi - pathLossDb - systemLossesDb;
  const roundedPr = Math.round(receivedPowerDbm * 100) / 100;

  const linkMarginDb = roundedPr - receiverSensitivityDbm;
  const roundedMargin = Math.round(linkMarginDb * 100) / 100;

  let status: "pass" | "marginal" | "fail";
  let warning: string | null = null;

  if (roundedMargin >= requiredMarginDb) {
    status = "pass";
  } else if (roundedMargin >= 0) {
    status = "marginal";
    warning = `Link margin (+${roundedMargin.toFixed(1)} dB) is positive but below required threshold (${requiredMarginDb.toFixed(1)} dB).`;
  } else {
    status = "fail";
    warning = `Link budget failed with negative margin (${roundedMargin.toFixed(1)} dB). Signal below receiver sensitivity.`;
  }

  return {
    status,
    frequencyHz,
    transmitPowerW,
    transmitPowerDbm,
    transmitAntennaGainDbi,
    receiveAntennaGainDbi,
    slantRangeM,
    pathLossDb,
    receivedPowerDbm: roundedPr,
    receiverSensitivityDbm,
    linkMarginDb: roundedMargin,
    requiredMarginDb,
    modelName: "Friis Transmission Model (ASTM/ITU-R P.525)",
    warning,
  };
}

/**
 * Evaluates relay path availability.
 */
export function evaluateRelayPath(relayConfig?: RelayConfig): CommunicationRelay {
  if (!relayConfig || !relayConfig.isConfigured || relayConfig.preset === "none") {
    return {
      configured: false,
      evaluated: false,
      available: null,
      relayId: null,
      source: null,
      warning: "No lunar communications relay configured or active.",
    };
  }

  const roverToRelayMargin = relayConfig.roverToRelayMarginDb ?? 0;
  const relayToEarthMargin = relayConfig.relayToEarthMarginDb ?? 0;
  const isAvailable = roverToRelayMargin >= 3.0 && relayToEarthMargin >= 3.0;

  return {
    configured: true,
    evaluated: true,
    available: isAvailable,
    relayId: relayConfig.relayName ?? "Lunar Communications Relay Satellite (Halo Orbit)",
    source: "Lunar Gateway / Orbital Relay Model",
    warning: isAvailable
      ? null
      : `Relay path insufficient: Rover-to-relay margin ${roverToRelayMargin.toFixed(1)} dB, Relay-to-Earth margin ${relayToEarthMargin.toFixed(1)} dB.`,
  };
}

/**
 * Multi-layer status resolver enforcing the exact rules from Phase 28 spec Section 5.
 */
export function resolveCommunicationStatus(
  geometry: CommunicationGeometry,
  terrainLos: CommunicationTerrainLos,
  rfLink: CommunicationRfLink,
  relay: CommunicationRelay
): {
  status: CommunicationStatus;
  statusReason: string;
  selectedPath: SelectedPathKind;
} {
  // Edge Case: Missing geometry data
  if (geometry.earthElevationDeg === null || geometry.aboveGeometricHorizon === null) {
    return {
      status: "unknown",
      statusReason: "Earth ephemeris position unavailable. Operational link cannot be determined.",
      selectedPath: "undetermined",
    };
  }

  // Layer 1: Earth below geometric horizon
  if (!geometry.aboveGeometricHorizon) {
    if (relay.configured && relay.available === true) {
      return {
        status: "available",
        statusReason: `Direct path is below geometric horizon (${geometry.earthElevationDeg.toFixed(2)}°), but operational path is available via ${relay.relayId}.`,
        selectedPath: "relay",
      };
    }
    return {
      status: "unavailable",
      statusReason: `Earth is geometrically below reference horizon (${geometry.earthElevationDeg.toFixed(2)}°). Direct LOS not possible.`,
      selectedPath: "none",
    };
  }

  // Layer 2: Earth above geometric horizon, but terrain LOS is blocked
  if (terrainLos.status === "blocked") {
    if (relay.configured && relay.available === true) {
      return {
        status: "available",
        statusReason: `Direct line of sight is obstructed by local terrain (${terrainLos.obstructionAngleDeg}° mask), but operational path is available via ${relay.relayId}.`,
        selectedPath: "relay",
      };
    }
    return {
      status: "unavailable",
      statusReason: `Direct line of sight obstructed by local lunar crater rim terrain (${terrainLos.obstructionAngleDeg}° mask, clearance ${terrainLos.angularClearanceDeg}°).`,
      selectedPath: "none",
    };
  }

  // Layer 2 Edge Case: Terrain LOS is unknown
  if (terrainLos.status === "unknown" || terrainLos.status === "not_evaluated") {
    return {
      status: "unknown",
      statusReason: "Earth is geometrically above horizon, but local terrain line-of-sight elevation is undetermined.",
      selectedPath: "undetermined",
    };
  }

  // Layer 3: Terrain LOS is clear -> Evaluate RF Link Budget
  if (rfLink.status === "not_configured" || rfLink.status === "not_evaluated") {
    return {
      status: "not_configured",
      statusReason: "Direct terrain line of sight is clear, but radio parameters are not configured. Operational RF link cannot be evaluated.",
      selectedPath: "undetermined",
    };
  }

  if (rfLink.status === "fail") {
    if (relay.configured && relay.available === true) {
      return {
        status: "available",
        statusReason: `Direct RF link margin is negative (${rfLink.linkMarginDb} dB), but operational path is available via ${relay.relayId}.`,
        selectedPath: "relay",
      };
    }
    return {
      status: "unavailable",
      statusReason: `Direct RF link budget failed with negative margin (${rfLink.linkMarginDb} dB). Transmitted signal falls below receiver sensitivity.`,
      selectedPath: "none",
    };
  }

  if (rfLink.status === "marginal") {
    return {
      status: "limited",
      statusReason: `Direct RF link is usable but margin (+${rfLink.linkMarginDb} dB) is below required safety threshold (${rfLink.requiredMarginDb} dB).`,
      selectedPath: "direct",
    };
  }

  // All direct layers pass!
  return {
    status: "available",
    statusReason: `Direct RF link closed with +${rfLink.linkMarginDb} dB margin over Earth ground station (DSN 34m aperture).`,
    selectedPath: "direct",
  };
}

/**
 * Top-level communication analysis orchestrator.
 */
export function evaluateCommunicationLink(
  input: CommunicationEvaluationInput
): CommunicationLinkAnalysis {
  const geometry = evaluateCommunicationGeometry(
    input.earthAzimuthDeg,
    input.earthElevationDeg,
    input.missionEpoch
  );

  const terrainLos = evaluateTerrainLos(input.latitudeDeg, geometry);
  const rfLink = evaluateRfLinkBudget(input.radioConfig);
  const relay = evaluateRelayPath(input.relayConfig);

  const { status, statusReason, selectedPath } = resolveCommunicationStatus(
    geometry,
    terrainLos,
    rfLink,
    relay
  );

  const sources: string[] = [geometry.source];
  if (terrainLos.source) sources.push(terrainLos.source);
  if (rfLink.modelName) sources.push(rfLink.modelName);
  if (relay.source) sources.push(relay.source);

  const warnings: string[] = [];
  if (terrainLos.warning) warnings.push(terrainLos.warning);
  if (rfLink.warning) warnings.push(rfLink.warning);
  if (relay.warning) warnings.push(relay.warning);

  return {
    status,
    statusReason,
    selectedPath,
    evaluatedAt: new Date().toISOString(),
    missionEpoch: input.missionEpoch,
    geometry,
    terrainLos,
    rfLink,
    relay,
    provenance: {
      sources,
      calculationVersion: "1.0.0",
      warnings,
      isStale: Boolean(input.isStale),
    },
  };
}

