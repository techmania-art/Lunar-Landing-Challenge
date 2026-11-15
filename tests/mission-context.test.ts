import { describe, it, expect } from "vitest";
import { buildMissionContextSnapshot } from "@/lib/services/mission-context/mission-context-builder";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";
import type { SolarFormValues } from "@/components/mission/solar-energy";

describe("Phase 27: Mission Context Builder & Contract Serialization", () => {
  const mockHorizonsData: HorizonsMissionAnalysisResponse = {
    success: true,
    status: "success",
    disclaimer: "NASA JPL Horizons ephemerides are computed relative to reference lunar sphere.",
    observerCoordinates: {
      latitudeDeg: -89.5,
      longitudeDeg: 0.0,
      rawLatitude: "-89.50",
      rawLongitude: "0.00",
    },
    observationTimeUtc: "2028-01-15 12:00 UTC",
    sun: {
      targetId: "10",
      targetName: "Sun",
      azimuthDeg: 317.07,
      elevationDeg: 3.13,
      geometricStatus: "Above horizon",
      isGeometricAboveHorizon: true,
      observationTimeUtc: "2028-01-15 12:00 UTC",
      retrievedAtUtc: "2028-01-15T12:00:00Z",
      source: "JPL Horizons",
      units: {
        azimuth: "degrees (East of North)",
        elevation: "degrees above local horizon",
      },
    },
    earth: {
      targetId: "399",
      targetName: "Earth",
      azimuthDeg: 3.43,
      elevationDeg: -0.56,
      geometricStatus: "Below horizon",
      isGeometricAboveHorizon: false,
      observationTimeUtc: "2028-01-15 12:00 UTC",
      retrievedAtUtc: "2028-01-15T12:00:00Z",
      source: "JPL Horizons",
      units: {
        azimuth: "degrees (East of North)",
        elevation: "degrees above local horizon",
      },
    },
  };

  const mockSolarValues: SolarFormValues = {
    panelArea: "1.20",
    panelEfficiency: "28.5",
    panelOrientation: "horizontal",
    analysisDurationHours: "4.0",
    batteryCapacityWh: "1200",
    maxDodPercent: "80",
    initialSocPercent: "100",
    drivePowerW: "150",
    idlePowerW: "30",
    driveSpeedKmH: "0.5",
    safetyReservePercent: "15",
    destLatitude: "-89.00",
    destLongitude: "0.00",
  };

  it("builds a canonical LmpMissionContextSnapshot with exact right-side dashboard metrics", () => {
    const snapshot = buildMissionContextSnapshot({
      latitudeDeg: -89.5,
      longitudeDeg: 0.0,
      missionDate: "2028-01-15",
      missionTimeUtc: "12:00",
      horizonsData: mockHorizonsData,
      solarValues: mockSolarValues,
      revision: 1,
    });

    expect(snapshot.schemaVersion).toBe("1.0.0");
    expect(snapshot.revision).toBe(1);
    expect(snapshot.contextId).toBeDefined();

    // Mission coordinates
    expect(snapshot.mission.latitudeDeg).toBe(-89.5);
    expect(snapshot.mission.longitudeDeg).toBe(0.0);
    expect(snapshot.mission.observationEpoch).toBe("2028-01-15 12:00 UTC");

    // Sun Analysis
    expect(snapshot.sun.status).toBe("ready");
    expect(snapshot.sun.azimuthDeg).toBe(317.07);
    expect(snapshot.sun.elevationDeg).toBe(3.13);
    expect(snapshot.sun.geometricStatus).toBe("Above horizon");
    expect(snapshot.sun.source).toContain("Target 10");

    // Earth Analysis
    expect(snapshot.earth.status).toBe("ready");
    expect(snapshot.earth.azimuthDeg).toBe(3.43);
    expect(snapshot.earth.elevationDeg).toBe(-0.56);
    expect(snapshot.earth.geometricStatus).toBe("Below horizon");
    expect(snapshot.earth.source).toContain("Target 399");

    // Solar Illumination & Energy
    expect(snapshot.solarEnergy.status).toBe("ready");
    expect(snapshot.solarEnergy.illuminationState).toBe("ILLUMINATED");
    expect(snapshot.solarEnergy.directSolarPowerW).toBeGreaterThan(0);
    expect(snapshot.solarEnergy.estimatedEnergyWh).toBeGreaterThan(0);
    expect(snapshot.solarEnergy.directIrradianceModel).toBe("ASTM E490 (1361 W/m²)");

    // Route Terrain Analysis
    expect(snapshot.routeTerrain.routeDistanceKm).toBeGreaterThan(0);
    expect(snapshot.routeTerrain.elevationModel).toContain("LOLA Polar DEM");
    expect(snapshot.routeTerrain.detectedCraters).toBeDefined();

    // Rover Traverse Feasibility
    expect(snapshot.roverTraverse.state).toBeDefined();
    expect(snapshot.roverTraverse.totalEnergyRequiredWh).toBeGreaterThan(0);
    expect(snapshot.roverTraverse.availableEnergyWh).toBeGreaterThan(0);

    // Communication Visibility
    expect(snapshot.communicationVisibility.earthAboveHorizon).toBe(false);
    expect(snapshot.communicationVisibility.rfLinkAssessed).toBe(false);
    expect(snapshot.communicationVisibility.limitation).toContain("radio communication availability");
  });

  it("handles unavailable and zero values distinctly without guessing or conflation", () => {
    const snapshot = buildMissionContextSnapshot({
      latitudeDeg: -89.5,
      longitudeDeg: 0.0,
      missionDate: "2028-01-15",
      missionTimeUtc: "12:00",
      horizonsData: null,
      horizonsError: "Target 10 service timeout",
      solarValues: undefined,
      revision: 2,
    });

    expect(snapshot.revision).toBe(2);
    expect(snapshot.sun.status).toBe("error");
    expect(snapshot.sun.azimuthDeg).toBeNull();
    expect(snapshot.sun.elevationDeg).toBeNull();

    expect(snapshot.earth.status).toBe("error");
    expect(snapshot.earth.azimuthDeg).toBeNull();
    expect(snapshot.earth.elevationDeg).toBeNull();

    // When Sun is unavailable, solar energy status is unavailable
    expect(snapshot.solarEnergy.status).toBe("unavailable");
    expect(snapshot.solarEnergy.directSolarPowerW).toBeNull();

    // When destination is unconfigured, route terrain is NOT_EVALUATED
    expect(snapshot.routeTerrain.status).toBe("NOT_EVALUATED");
    expect(snapshot.routeTerrain.routeDistanceKm).toBeNull();

    // Rover traverse is NOT_EVALUATED
    expect(snapshot.roverTraverse.state).toBe("NOT_EVALUATED");
    expect(snapshot.roverTraverse.totalEnergyRequiredWh).toBeNull();
  });

  it("supports monotonic revision incrementation across consecutive updates", () => {
    const snap1 = buildMissionContextSnapshot({
      latitudeDeg: -89.5,
      longitudeDeg: 0.0,
      missionDate: "2028-01-15",
      missionTimeUtc: "12:00",
      horizonsData: mockHorizonsData,
      revision: 1,
    });

    const snap2 = buildMissionContextSnapshot({
      latitudeDeg: -88.0,
      longitudeDeg: 45.0,
      missionDate: "2028-01-16",
      missionTimeUtc: "14:00",
      horizonsData: mockHorizonsData,
      revision: 2,
    });

    expect(snap2.revision).toBeGreaterThan(snap1.revision);
    expect(snap2.mission.latitudeDeg).toBe(-88.0);
    expect(snap2.mission.longitudeDeg).toBe(45.0);
  });
});
