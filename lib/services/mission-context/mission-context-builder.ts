import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";
import {
  type SolarFormValues,
  extractRadioConfig,
  extractRelayConfig,
} from "@/components/mission/solar-energy";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";
import type { SolarPanelConfig } from "@/lib/services/solar/solar-types";
import {
  evaluateSolarIllumination,
  calculateSolarEnergy,
} from "@/lib/services/solar/solar-calculator";
import { evaluateTraverseFeasibility } from "@/lib/services/rover/rover-calculator";
import { analyzeRouteTerrain } from "@/lib/services/terrain/terrain-calculator";
import { evaluateCommunicationLink } from "@/lib/services/communication/communication-calculator";
import type {
  RadioConfig,
  RelayConfig,
} from "@/lib/services/communication/communication-types";
import type {
  LmpMissionContextSnapshot,
  AnalysisStatusSummary,
  SunAnalysisSnapshot,
  EarthAnalysisSnapshot,
  SolarEnergySnapshot,
  RouteTerrainSnapshot,
  RoverTraverseSnapshot,
  CommunicationVisibilitySnapshot,
} from "./mission-context-types";

export interface BuildContextParams {
  latitudeDeg: number;
  longitudeDeg: number;
  missionDate: string;
  missionTimeUtc: string;
  horizonsData?: HorizonsMissionAnalysisResponse | null;
  horizonsError?: string | null;
  solarValues?: SolarFormValues;
  terrainData?: TerrainAnalysisResponse | null;
  radioConfig?: RadioConfig;
  relayConfig?: RelayConfig;
  isStale?: boolean;
  revision: number;
  contextId?: string;
}

/**
 * Builds the canonical LmpMissionContextSnapshot from the exact right-side
 * Mission Analysis sidebar calculation models.
 */
export function buildMissionContextSnapshot({
  latitudeDeg,
  longitudeDeg,
  missionDate,
  missionTimeUtc,
  horizonsData,
  horizonsError,
  solarValues,
  terrainData,
  radioConfig,
  relayConfig,
  isStale = false,
  revision,
  contextId,
}: BuildContextParams): LmpMissionContextSnapshot {
  const observationEpoch = `${missionDate || "2028-01-15"} ${missionTimeUtc || "12:00"} UTC`;

  const hasSun = Boolean(
    horizonsData?.sun &&
      typeof horizonsData.sun.azimuthDeg === "number" &&
      typeof horizonsData.sun.elevationDeg === "number" &&
      Number.isFinite(horizonsData.sun.azimuthDeg) &&
      Number.isFinite(horizonsData.sun.elevationDeg)
  );

  const hasEarth = Boolean(
    horizonsData?.earth &&
      typeof horizonsData.earth.azimuthDeg === "number" &&
      typeof horizonsData.earth.elevationDeg === "number" &&
      Number.isFinite(horizonsData.earth.azimuthDeg) &&
      Number.isFinite(horizonsData.earth.elevationDeg)
  );

  const isSuccess = Boolean(horizonsData?.success && hasSun && hasEarth);
  const isPartial = Boolean(
    horizonsData?.status === "partial" ||
      (horizonsData && ((hasSun && !hasEarth) || (!hasSun && hasEarth)))
  );
  const hasError = Boolean(
    horizonsError || (horizonsData && !horizonsData.success && !isPartial)
  );

  // 1. Sun Analysis
  const sunSnapshot: SunAnalysisSnapshot = hasSun
    ? {
        status: "ready",
        azimuthDeg: Number(horizonsData!.sun!.azimuthDeg.toFixed(2)),
        elevationDeg: Number(horizonsData!.sun!.elevationDeg.toFixed(2)),
        geometricStatus:
          horizonsData!.sun!.geometricStatus ||
          (horizonsData!.sun!.elevationDeg > 0 ? "Above horizon" : "Below horizon"),
        observationTimeUtc: horizonsData!.sun!.observationTimeUtc,
        source: `${horizonsData!.sun!.source} (Target 10)`,
        limitation:
          "Local terrain obstruction is evaluated in the Solar Illumination & Energy panel below.",
      }
    : {
        status: hasError ? "error" : "unavailable",
        azimuthDeg: null,
        elevationDeg: null,
        geometricStatus: null,
        observationTimeUtc: null,
        source: "JPL Horizons (Target 10)",
        limitation: "Ephemeris unavailable.",
      };

  // 2. Earth Analysis
  const earthSnapshot: EarthAnalysisSnapshot = hasEarth
    ? {
        status: "ready",
        azimuthDeg: Number(horizonsData!.earth!.azimuthDeg.toFixed(2)),
        elevationDeg: Number(horizonsData!.earth!.elevationDeg.toFixed(2)),
        geometricStatus:
          horizonsData!.earth!.geometricStatus ||
          (horizonsData!.earth!.elevationDeg > 0 ? "Above horizon" : "Below horizon"),
        observationTimeUtc: horizonsData!.earth!.observationTimeUtc,
        source: `${horizonsData!.earth!.source} (Target 399)`,
        limitation:
          "Local terrain obstruction and RF radio link conditions are not included.",
      }
    : {
        status: hasError ? "error" : "unavailable",
        azimuthDeg: null,
        elevationDeg: null,
        geometricStatus: null,
        observationTimeUtc: null,
        source: "JPL Horizons (Target 399)",
        limitation: "Ephemeris unavailable.",
      };

  // 3. Solar Illumination & Energy (Phase 8 calculation)
  const illumination = hasSun
    ? evaluateSolarIllumination(
        latitudeDeg,
        horizonsData!.sun!.azimuthDeg,
        horizonsData!.sun!.elevationDeg,
        horizonsData!.sun!.observationTimeUtc
      )
    : {
        state: "UNAVAILABLE" as const,
        sunAzimuthDeg: 0,
        sunElevationDeg: 0,
        localTerrainHorizonDeg: 0,
        observationTimeUtc: observationEpoch,
        reason: "Sun ephemeris unavailable.",
        terrainDataset: "LOLA DEM (Pending)",
        source: "JPL Horizons (Target 10)",
      };

  const panelConfig: SolarPanelConfig | undefined =
    solarValues?.panelArea &&
    Number(solarValues.panelArea) > 0 &&
    solarValues?.panelEfficiency &&
    Number(solarValues.panelEfficiency) > 0
      ? {
          areaM2: Number(solarValues.panelArea),
          efficiencyPercent: Number(solarValues.panelEfficiency),
          orientation: solarValues.panelOrientation ?? "horizontal",
        }
      : undefined;

  const durationHours =
    solarValues?.analysisDurationHours && Number(solarValues.analysisDurationHours) > 0
      ? Number(solarValues.analysisDurationHours)
      : undefined;

  const solarEnergy = calculateSolarEnergy({
    illumination,
    panel: panelConfig,
    analysisDurationHours: durationHours,
  });

  const solarEnergySnapshot: SolarEnergySnapshot = {
    status:
      solarEnergy.status === "calculated"
        ? "ready"
        : solarEnergy.status === "zero-direct-power"
        ? "zero-direct-power"
        : solarEnergy.status === "panel-unconfigured"
        ? "panel-unconfigured"
        : "unavailable",
    illuminationState: illumination.state,
    sunElevationDeg: hasSun ? Number(illumination.sunElevationDeg.toFixed(2)) : null,
    terrainHorizonMaskDeg: hasSun ? Number(illumination.localTerrainHorizonDeg.toFixed(1)) : null,
    directSolarPowerW:
      solarEnergy.status === "calculated"
        ? (solarEnergy.directSolarPowerW ?? null)
        : solarEnergy.status === "zero-direct-power"
        ? 0
        : null,
    estimatedEnergyWh: solarEnergy.estimatedEnergyWh ?? null,
    analysisDurationHours: durationHours ?? null,
    directIrradianceModel: "ASTM E490 (1361 W/m²)",
    terrainDataset: illumination.terrainDataset,
    message: solarEnergy.message,
    assumptions: solarEnergy.assumptions,
  };

  // 4. Route Terrain Analysis (Phase 11 calculation)
  const destLatNum =
    solarValues?.destLatitude !== undefined && solarValues.destLatitude.trim() !== ""
      ? Number(solarValues.destLatitude)
      : undefined;
  const destLonNum =
    solarValues?.destLongitude !== undefined && solarValues.destLongitude.trim() !== ""
      ? Number(solarValues.destLongitude)
      : undefined;

  const hasRouteCoords =
    destLatNum !== undefined &&
    destLonNum !== undefined &&
    Number.isFinite(destLatNum) &&
    Number.isFinite(destLonNum);

  const calculatedTerrain = hasRouteCoords
    ? analyzeRouteTerrain({
        route: {
          coordinates: [
            { latitude: latitudeDeg, longitude: longitudeDeg },
            { latitude: destLatNum, longitude: destLonNum },
          ],
          corridorWidthMeters: 100,
        },
        rover: { maxSlopeDegrees: 20 },
      })
    : null;

  const activeTerrain = terrainData || calculatedTerrain;

  const routeTerrainSnapshot: RouteTerrainSnapshot =
    activeTerrain && activeTerrain.status !== "UNAVAILABLE" && activeTerrain.route.distanceKm
      ? {
          status: activeTerrain.traversability.status,
          routeDistanceKm: Number((activeTerrain.route.distanceKm ?? 0).toFixed(2)),
          corridorWidthMeters: activeTerrain.route.corridorWidthMeters,
          totalObstacles:
            activeTerrain.obstacleCount.status === "AVAILABLE"
              ? activeTerrain.obstacleCount.value
              : null,
          obstacleStatus: activeTerrain.obstacleCount.status,
          maximumSlopeDeg:
            activeTerrain.maximumSlope.status === "AVAILABLE"
              ? activeTerrain.maximumSlope.value
              : null,
          averageSlopeDeg:
            activeTerrain.averageSlope.status === "AVAILABLE"
              ? activeTerrain.averageSlope.value
              : null,
          roughnessRmsdMeters:
            activeTerrain.roughness.status === "AVAILABLE"
              ? activeTerrain.roughness.value
              : null,
          detectedCraters: activeTerrain.craterCount.value,
          cratersInCorridor: activeTerrain.features.filter((f) => f.intersectsRouteCorridor).length,
          boulderStatus: activeTerrain.boulderCount.status,
          elevationMinMeters: activeTerrain.elevation.minimumMeters ?? null,
          elevationMaxMeters: activeTerrain.elevation.maximumMeters ?? null,
          elevationChangeMeters: activeTerrain.elevation.elevationChangeMeters ?? null,
          elevationModel: "LRO LOLA Polar DEM (100m/px)",
          datum: activeTerrain.elevation.datum || "LOLA Mean Radius",
          reasons: activeTerrain.traversability.reasons,
        }
      : {
          status: "NOT_EVALUATED",
          routeDistanceKm: null,
          corridorWidthMeters: 100,
          totalObstacles: null,
          obstacleStatus: "UNAVAILABLE",
          maximumSlopeDeg: null,
          averageSlopeDeg: null,
          roughnessRmsdMeters: null,
          detectedCraters: null,
          cratersInCorridor: null,
          boulderStatus: "UNAVAILABLE",
          elevationMinMeters: null,
          elevationMaxMeters: null,
          elevationChangeMeters: null,
          elevationModel: "LRO LOLA Polar DEM (100m/px)",
          datum: "LOLA Mean Radius",
          reasons: [
            "Traverse route not evaluated. Enter destination coordinates in Mission Input.",
          ],
        };

  // 5. Rover Traverse Feasibility (Phase 10 calculation)
  const traverseResult = evaluateTraverseFeasibility({
    battery:
      solarValues?.batteryCapacityWh && Number(solarValues.batteryCapacityWh) > 0
        ? {
            nominalCapacityWh: Number(solarValues.batteryCapacityWh),
            maxDepthOfDischargePercent: Number(solarValues.maxDodPercent) || 80,
            initialSocPercent: Number(solarValues.initialSocPercent) || 100,
          }
        : undefined,
    consumption:
      solarValues?.drivePowerW && Number(solarValues.drivePowerW) > 0
        ? {
            drivePowerW: Number(solarValues.drivePowerW),
            idlePowerW: Number(solarValues.idlePowerW) || 0,
            driveSpeedKmH: Number(solarValues.driveSpeedKmH) || 0.5,
            safetyReservePercent: Number(solarValues.safetyReservePercent) || 15,
          }
        : undefined,
    route: hasRouteCoords
      ? {
          startLatitudeDeg: latitudeDeg,
          startLongitudeDeg: longitudeDeg,
          destLatitudeDeg: destLatNum!,
          destLongitudeDeg: destLonNum!,
        }
      : undefined,
    solarEnergyGeneratedWh: solarEnergy.estimatedEnergyWh || 0,
    missionDurationHours: durationHours,
  });

  const roverTraverseSnapshot: RoverTraverseSnapshot = {
    state: traverseResult.state,
    routeDistanceKm:
      traverseResult.routeDistanceKm !== undefined
        ? Number(traverseResult.routeDistanceKm.toFixed(2))
        : null,
    estimatedDriveTimeHours:
      traverseResult.estimatedDriveTimeHours !== undefined
        ? Number(traverseResult.estimatedDriveTimeHours.toFixed(1))
        : null,
    totalEnergyRequiredWh: traverseResult.totalEnergyRequiredWh ?? null,
    availableEnergyWh:
      traverseResult.usableBatteryEnergyWh !== undefined &&
      traverseResult.solarEnergyGeneratedWh !== undefined
        ? traverseResult.usableBatteryEnergyWh + traverseResult.solarEnergyGeneratedWh
        : null,
    netMarginWh: traverseResult.netMarginWh ?? null,
    projectedEndingBatteryEnergyWh: traverseResult.projectedEndingBatteryEnergyWh ?? null,
    explanation: traverseResult.explanation,
    assumptions: traverseResult.assumptions,
  };

  // 6. Communication Visibility (Card 5)
  const communicationVisibilitySnapshot: CommunicationVisibilitySnapshot = {
    geometricStatus: hasEarth
      ? horizonsData!.earth!.elevationDeg > 0.25
        ? "Earth Geometrically Above Horizon"
        : horizonsData!.earth!.elevationDeg < -0.25
        ? "Earth Geometrically Below Horizon"
        : "Near Geometric Horizon"
      : "Geometric Visibility Unavailable",
    earthAboveHorizon: hasEarth ? horizonsData!.earth!.elevationDeg > 0 : null,
    observationEpoch,
    source: "JPL Horizons (Target 399)",
    rfLinkAssessed: false,
    limitation:
      "Geometric visibility only: Operational radio communication availability, link-budget, and antenna coverage have not been evaluated. Line of sight requires separate terrain obstruction analysis.",
  };

  // 7. Phase 28: Communication Link Analysis (4 independent layers)
  const activeRadioConfig = radioConfig ?? extractRadioConfig(solarValues);
  const activeRelayConfig = relayConfig ?? extractRelayConfig(solarValues);

  const communicationLink = evaluateCommunicationLink({
    latitudeDeg,
    longitudeDeg,
    missionEpoch: observationEpoch,
    earthAzimuthDeg: hasEarth ? horizonsData!.earth!.azimuthDeg : null,
    earthElevationDeg: hasEarth ? horizonsData!.earth!.elevationDeg : null,
    radioConfig: activeRadioConfig,
    relayConfig: activeRelayConfig,
    isStale,
  });

  // 8. Overall analysis status
  const analysisStatus: AnalysisStatusSummary = {
    overall: hasError
      ? "error"
      : isPartial
      ? "partial"
      : isSuccess
      ? "complete"
      : "awaiting",
    sun: sunSnapshot.status,
    earth: earthSnapshot.status,
    solarEnergy: solarEnergySnapshot.status,
    routeTerrain:
      routeTerrainSnapshot.status === "NOT_EVALUATED" ? "not-evaluated" : "ready",
    roverTraverse:
      roverTraverseSnapshot.state === "NOT_EVALUATED"
        ? "not-evaluated"
        : roverTraverseSnapshot.state === "INSUFFICIENT_ENERGY"
        ? "insufficient"
        : "ready",
    communicationVisibility: hasEarth ? "ready" : "unavailable",
    communicationLink: communicationLink.status,
    surroundingTerrain: "pending",
  };

  const cid = contextId || `ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    schemaVersion: "1.0.0",
    contextId: cid,
    revision,
    createdAt: new Date().toISOString(),
    mission: {
      latitudeDeg,
      longitudeDeg,
      missionDate,
      missionTimeUtc,
      observationEpoch,
      destination: hasRouteCoords
        ? { latitudeDeg: destLatNum!, longitudeDeg: destLonNum! }
        : null,
    },
    rover: {
      panelAreaM2: panelConfig?.areaM2,
      panelEfficiencyPercent: panelConfig?.efficiencyPercent,
      panelOrientation: panelConfig?.orientation,
      batteryCapacityWh: solarValues?.batteryCapacityWh
        ? Number(solarValues.batteryCapacityWh)
        : undefined,
      maxDodPercent: solarValues?.maxDodPercent
        ? Number(solarValues.maxDodPercent)
        : undefined,
      initialSocPercent: solarValues?.initialSocPercent
        ? Number(solarValues.initialSocPercent)
        : undefined,
      drivePowerW: solarValues?.drivePowerW ? Number(solarValues.drivePowerW) : undefined,
      idlePowerW: solarValues?.idlePowerW ? Number(solarValues.idlePowerW) : undefined,
      driveSpeedKmH: solarValues?.driveSpeedKmH
        ? Number(solarValues.driveSpeedKmH)
        : undefined,
      safetyReservePercent: solarValues?.safetyReservePercent
        ? Number(solarValues.safetyReservePercent)
        : undefined,
      analysisDurationHours: durationHours,
    },
    analysisStatus,
    sun: sunSnapshot,
    earth: earthSnapshot,
    solarEnergy: solarEnergySnapshot,
    routeTerrain: routeTerrainSnapshot,
    roverTraverse: roverTraverseSnapshot,
    communicationVisibility: communicationVisibilitySnapshot,
    communicationLink,
    provenance: {
      generatedAt: new Date().toISOString(),
      isStale,
      models: [
        "NASA JPL Horizons (Targets 10 & 399)",
        "LRO LOLA Polar DEM (100m/px)",
        "ASTM E490 Solar Irradiance (1361 W/m²)",
        "Rover Spherical Great-Circle Mobility Budget",
        "Friis Transmission RF Model (ASTM/ITU-R P.525)",
      ],
      warnings: [
        "Terrain elevation & obstruction evaluated from 100m LOLA DEM.",
        "Radio communication link-budget uses configured transceiver specifications.",
        "Boulder detection is unavailable without sub-meter NAC imagery.",
      ],
    },
  };
}
