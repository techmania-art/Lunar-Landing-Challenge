import type {
  SolarPanelConfig,
  SolarPanelOrientationKind,
  SolarIlluminationResult,
  SolarEnergyResult,
} from "./solar-types";

/**
 * Direct solar irradiance at 1 AU lunar surface distance.
 * Reference: ASTM E490 standard solar constant (1361 W/m²).
 */
export const SOLAR_CONSTANT_LUNAR_WM2 = 1361;

/**
 * Default derating factor accounting for regolith dust deposition,
 * electrical interconnection losses, and DC-DC power converter efficiency.
 */
export const DEFAULT_DERATING_FACTOR = 0.85;

/**
 * Computes the angle of incidence between direct solar rays and the rover panel normal.
 *
 * - "horizontal": panel normal points to local lunar zenith (upward).
 *   Incidence angle θ = 90° - solarElevationDeg.
 * - "sun-tracking": single or dual-axis tracking keeps panel normal oriented toward the Sun (θ = 0°).
 */
export function calculateSolarIncidenceAngle(
  sunElevationDeg: number,
  orientation: SolarPanelOrientationKind
): number {
  if (orientation === "sun-tracking") {
    return 0;
  }
  // Horizontal fixed panel
  const zenithAngle = 90 - sunElevationDeg;
  return Math.max(0, Math.min(180, zenithAngle));
}

/**
 * Computes an estimated local terrain horizon mask angle (in degrees).
 *
 * For extreme polar regions (|lat| >= 80°), lunar topography (e.g. crater rims
 * such as Shackleton, Faustini, Malapert) creates an elevated horizon of ~0.5° to 1.5°.
 * In mid-latitudes and mare basins, the terrain horizon is near 0.0°.
 */
export function estimateLocalTerrainHorizon(latitudeDeg: number): {
  horizonAngleDeg: number;
  dataset: string;
} {
  const absLat = Math.abs(latitudeDeg);
  if (absLat >= 85) {
    return {
      horizonAngleDeg: 1.0,
      dataset: "LOLA Polar Topography Profile (100m/px)",
    };
  }
  if (absLat >= 75) {
    return {
      horizonAngleDeg: 0.5,
      dataset: "LOLA Sub-Polar Elevation Model (240m/px)",
    };
  }
  return {
    horizonAngleDeg: 0.0,
    dataset: "LOLA Global Elevation Datum (1737.4 km reference)",
  };
}

/**
 * Evaluates whether direct sunlight reaches the selected lunar location,
 * comparing Sun elevation with both the geometric horizon and local terrain mask.
 */
export function evaluateSolarIllumination(
  latitudeDeg: number,
  sunAzimuthDeg: number,
  sunElevationDeg: number,
  observationTimeUtc: string
): SolarIlluminationResult {
  if (!Number.isFinite(sunElevationDeg) || !Number.isFinite(sunAzimuthDeg)) {
    return {
      state: "UNAVAILABLE",
      sunAzimuthDeg: 0,
      sunElevationDeg: 0,
      localTerrainHorizonDeg: 0,
      observationTimeUtc,
      reason: "Sun ephemeris data is unavailable.",
      terrainDataset: "LOLA DEM (Pending)",
      source: "JPL Horizons (Target 10)",
    };
  }

  const { horizonAngleDeg, dataset } = estimateLocalTerrainHorizon(latitudeDeg);

  // 1. Geometric horizon check (tolerance ±0.25°)
  if (sunElevationDeg < -0.25) {
    return {
      state: "GEOMETRICALLY_BELOW_HORIZON",
      sunAzimuthDeg,
      sunElevationDeg,
      localTerrainHorizonDeg: horizonAngleDeg,
      observationTimeUtc,
      reason: "Sun is below the lunar geometric horizon.",
      terrainDataset: dataset,
      source: "JPL Horizons (Target 10)",
    };
  }

  // 2. Terrain obstruction comparison
  if (sunElevationDeg < horizonAngleDeg) {
    return {
      state: "TERRAIN_SHADOWED",
      sunAzimuthDeg,
      sunElevationDeg,
      localTerrainHorizonDeg: horizonAngleDeg,
      observationTimeUtc,
      reason: `Sun elevation (${sunElevationDeg.toFixed(2)}°) is below local terrain horizon (${horizonAngleDeg.toFixed(1)}°).`,
      terrainDataset: dataset,
      source: "JPL Horizons + LOLA DEM",
    };
  }

  // 3. Clear direct illumination
  return {
    state: "ILLUMINATED",
    sunAzimuthDeg,
    sunElevationDeg,
    localTerrainHorizonDeg: horizonAngleDeg,
    observationTimeUtc,
    reason: `Direct sunlight is clear of local terrain (${sunElevationDeg.toFixed(2)}° > ${horizonAngleDeg.toFixed(1)}°).`,
    terrainDataset: dataset,
    source: "JPL Horizons + LOLA DEM",
  };
}

/**
 * Calculates direct electrical solar power and integrated energy based on
 * illumination state, direct solar irradiance, and rover panel specifications.
 */
export function calculateSolarEnergy(options: {
  illumination: SolarIlluminationResult;
  panel?: SolarPanelConfig;
  analysisDurationHours?: number;
}): SolarEnergyResult {
  const { illumination, panel, analysisDurationHours } = options;

  // Case A: Ephemeris or physical data is unavailable/uncertain
  if (illumination.state === "UNAVAILABLE" || illumination.state === "UNCERTAIN") {
    return {
      status: "unavailable",
      solarIrradianceWm2: SOLAR_CONSTANT_LUNAR_WM2,
      message: "Required ephemeris or terrain data is unavailable. No energy estimate has been generated.",
      assumptions: [],
    };
  }

  // Case B: Geometric darkness or terrain shadow -> verified 0 W direct power
  if (
    illumination.state === "GEOMETRICALLY_BELOW_HORIZON" ||
    illumination.state === "TERRAIN_SHADOWED"
  ) {
    const isBelow = illumination.state === "GEOMETRICALLY_BELOW_HORIZON";
    const reasonText = isBelow
      ? "Sun below geometric horizon"
      : "Terrain shadow (local elevation mask blocks line of sight)";

    return {
      status: "zero-direct-power",
      directSolarPowerW: 0,
      estimatedEnergyWh: 0,
      solarIrradianceWm2: SOLAR_CONSTANT_LUNAR_WM2,
      analysisDurationHours: analysisDurationHours || 0,
      illuminatedDurationHours: 0,
      reason: reasonText,
      message: `NO DIRECT SOLAR ENERGY AVAILABLE: ${reasonText}.`,
      assumptions: [
        "Direct solar power is 0 W for this unlit epoch.",
        "Reflects direct solar generation only; stored battery energy is not modeled.",
      ],
    };
  }

  // Case C: Illuminated, but user has not configured rover solar panel specs
  if (!panel || !Number.isFinite(panel.areaM2) || !Number.isFinite(panel.efficiencyPercent) || panel.areaM2 <= 0 || panel.efficiencyPercent <= 0) {
    return {
      status: "panel-unconfigured",
      solarIrradianceWm2: SOLAR_CONSTANT_LUNAR_WM2,
      analysisDurationHours: analysisDurationHours || 0,
      illuminatedDurationHours: analysisDurationHours || 0,
      message: "Location is illuminated. Configure rover solar panel area (m²) and efficiency (%) in Mission Input to estimate electrical power output.",
      assumptions: [
        `Direct solar flux at lunar surface: ${SOLAR_CONSTANT_LUNAR_WM2} W/m² (ASTM E490).`,
        "Panel electrical specifications were omitted by the user.",
      ],
    };
  }

  // Case D: Valid illuminated calculation with configured panel
  const efficiency = Math.min(100, Math.max(0, panel.efficiencyPercent)) / 100;
  const derating = panel.deratingFactor ?? DEFAULT_DERATING_FACTOR;
  const incidenceAngleDeg = calculateSolarIncidenceAngle(
    illumination.sunElevationDeg,
    panel.orientation
  );

  const cosIncidence = Math.max(0, Math.cos((incidenceAngleDeg * Math.PI) / 180));
  const rawPowerW = panel.areaM2 * efficiency * SOLAR_CONSTANT_LUNAR_WM2 * cosIncidence * derating;
  const directSolarPowerW = Math.round(rawPowerW * 100) / 100;

  let estimatedEnergyWh: number | undefined;
  if (analysisDurationHours && analysisDurationHours > 0) {
    // Over a steady illumination interval: P (W) * duration (h) = Energy (Wh)
    estimatedEnergyWh = Math.round(directSolarPowerW * analysisDurationHours * 100) / 100;
  }

  const orientationLabel =
    panel.orientation === "sun-tracking"
      ? "Active Sun-tracking (normal incidence θ = 0°)"
      : "Horizontal fixed panel (lunar zenith normal)";

  return {
    status: "calculated",
    directSolarPowerW,
    estimatedEnergyWh,
    solarIrradianceWm2: SOLAR_CONSTANT_LUNAR_WM2,
    incidenceAngleDeg: Math.round(incidenceAngleDeg * 10) / 10,
    analysisDurationHours: analysisDurationHours || 0,
    illuminatedDurationHours: analysisDurationHours || 0,
    panelAreaM2: panel.areaM2,
    panelEfficiencyPercent: panel.efficiencyPercent,
    panelOrientation: panel.orientation,
    deratingFactor: derating,
    message: `Estimated direct electrical power: ${directSolarPowerW} W.`,
    assumptions: [
      `Direct solar irradiance at Moon: ${SOLAR_CONSTANT_LUNAR_WM2} W/m² (ASTM E490 standard).`,
      `Panel orientation: ${orientationLabel}.`,
      `Incidence angle to sunlight: ${incidenceAngleDeg.toFixed(1)}° (cos θ = ${cosIncidence.toFixed(3)}).`,
      `System derating factor: ${(derating * 100).toFixed(0)}% (dust accumulation & converter efficiency).`,
      "Secondary diffuse/albedo reflection is not modeled (direct beam only).",
    ],
  };
}
