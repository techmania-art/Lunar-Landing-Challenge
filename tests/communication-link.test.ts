import { describe, it, expect } from "vitest";
import {
  calculateFreeSpacePathLossDb,
  wattsToDbm,
  evaluateCommunicationGeometry,
  evaluateTerrainLos,
  evaluateRfLinkBudget,
  evaluateRelayPath,
  resolveCommunicationStatus,
  evaluateCommunicationLink,
} from "@/lib/services/communication/communication-calculator";
import { buildMissionContextSnapshot } from "@/lib/services/mission-context/mission-context-builder";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";

describe("Phase 28: Communication Link Analysis & Status Resolver", () => {
  describe("RF Link Math & Friis Calculations", () => {
    it("converts transmitter Watts to dBm accurately", () => {
      // 1 W = 30 dBm, 5 W = 36.99 dBm, 10 W = 40 dBm
      expect(wattsToDbm(1)).toBe(30.0);
      expect(wattsToDbm(5)).toBeCloseTo(36.99, 1);
      expect(wattsToDbm(10)).toBe(40.0);
      expect(() => wattsToDbm(0)).toThrow();
      expect(() => wattsToDbm(-5)).toThrow();
    });

    it("calculates Free Space Path Loss (FSPL) in dB", () => {
      // d = 3.844e8 m, f = 2.2 GHz (2.2e9 Hz)
      // FSPL = 20 * log10(4 * pi * d * f / c) ~ 211.0 dB
      const fspl = calculateFreeSpacePathLossDb(384400000, 2.2e9);
      expect(fspl).toBeGreaterThan(210.0);
      expect(fspl).toBeLessThan(212.0);
      expect(() => calculateFreeSpacePathLossDb(-1, 2.2e9)).toThrow();
    });
  });

  describe("Scenario 1: Earth below geometric horizon", () => {
    it("marks direct path unavailable when Earth elevation is negative", () => {
      const geometry = evaluateCommunicationGeometry(352.0, -5.2, "2028-01-15 12:00 UTC");
      expect(geometry.aboveGeometricHorizon).toBe(false);

      const terrainLos = evaluateTerrainLos(-89.5, geometry);
      expect(terrainLos.status).toBe("blocked");

      const rf = evaluateRfLinkBudget({
        isConfigured: true,
        transmitPowerW: 5,
        carrierFrequencyGhz: 2.2,
      });

      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("unavailable");
      expect(resolved.selectedPath).toBe("none");
      expect(resolved.statusReason).toContain("geometrically below reference horizon");
    });
  });

  describe("Scenario 2: Earth above horizon, but terrain LOS is blocked", () => {
    it("marks direct communication unavailable even though Earth is geometrically above horizon", () => {
      // At lat -89.5, terrain horizon mask is 1.0 deg. Earth elevation 0.5 deg is above sphere (0 deg) but below terrain (1.0 deg).
      const geometry = evaluateCommunicationGeometry(180.0, 0.5, "2028-01-15 12:00 UTC");
      expect(geometry.aboveGeometricHorizon).toBe(true);

      const terrainLos = evaluateTerrainLos(-89.5, geometry);
      expect(terrainLos.status).toBe("blocked");
      expect(terrainLos.angularClearanceDeg).toBeLessThan(0);

      const rf = evaluateRfLinkBudget({
        isConfigured: true,
        transmitPowerW: 5,
        carrierFrequencyGhz: 2.2,
        roverAntennaGainDbi: 6,
        groundStationGainDbi: 45,
      });
      expect(rf.status).toBe("pass"); // RF margin itself is fine

      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("unavailable");
      expect(resolved.selectedPath).toBe("none");
      expect(resolved.statusReason).toContain("obstructed by local lunar crater rim terrain");
    });
  });

  describe("Scenario 3: Earth above horizon, terrain LOS unknown", () => {
    it("returns status unknown when terrain LOS data cannot be determined", () => {
      const geometry = evaluateCommunicationGeometry(180.0, 5.0, "2028-01-15 12:00 UTC");
      const terrainLos = {
        status: "unknown" as const,
        obstructionAngleDeg: null,
        angularClearanceDeg: null,
        obstructionDistanceM: null,
        source: null,
        modelVersion: null,
        resolutionM: null,
        warning: "DEM missing",
      };
      const rf = evaluateRfLinkBudget({ isConfigured: true, transmitPowerW: 5, carrierFrequencyGhz: 2.2 });
      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("unknown");
      expect(resolved.selectedPath).toBe("undetermined");
    });
  });

  describe("Scenario 4: Clear LOS, no radio configuration", () => {
    it("reports not_configured without making an RF availability claim", () => {
      const geometry = evaluateCommunicationGeometry(180.0, 6.0, "2028-01-15 12:00 UTC");
      const terrainLos = evaluateTerrainLos(-89.5, geometry);
      expect(terrainLos.status).toBe("clear");

      const rf = evaluateRfLinkBudget({ isConfigured: false, preset: "not-configured" });
      expect(rf.status).toBe("not_configured");

      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("not_configured");
      expect(resolved.selectedPath).toBe("undetermined");
      expect(resolved.statusReason).toContain("radio parameters are not configured");
    });
  });

  describe("Scenario 5: Clear LOS, valid RF budget above required margin", () => {
    it("reports direct path available with positive link margin", () => {
      const geometry = evaluateCommunicationGeometry(180.0, 8.0, "2028-01-15 12:00 UTC");
      const terrainLos = evaluateTerrainLos(-89.5, geometry);
      expect(terrainLos.status).toBe("clear");

      const rf = evaluateRfLinkBudget({
        isConfigured: true,
        transmitPowerW: 5,
        carrierFrequencyGhz: 2.2,
        roverAntennaGainDbi: 6,
        groundStationGainDbi: 45,
        receiverSensitivityDbm: -130,
        requiredMarginDb: 3.0,
      });
      expect(rf.status).toBe("pass");
      expect(rf.linkMarginDb).toBeGreaterThanOrEqual(3.0);

      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("available");
      expect(resolved.selectedPath).toBe("direct");
      expect(resolved.statusReason).toContain("Direct RF link closed with");
    });
  });

  describe("Scenario 6: Clear LOS, RF budget below threshold", () => {
    it("reports limited when margin is positive but below required threshold", () => {
      const geometry = evaluateCommunicationGeometry(180.0, 8.0, "2028-01-15 12:00 UTC");
      const terrainLos = evaluateTerrainLos(-89.5, geometry);
      expect(terrainLos.status).toBe("clear");

      // Low power (0.5W) producing margin between 0 and 5 dB (marginal)
      const rf = evaluateRfLinkBudget({
        isConfigured: true,
        transmitPowerW: 0.5,
        carrierFrequencyGhz: 2.2,
        roverAntennaGainDbi: 4,
        groundStationGainDbi: 45,
        receiverSensitivityDbm: -140,
        requiredMarginDb: 5.0,
      });
      expect(rf.status).toBe("marginal");

      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("limited");
      expect(resolved.selectedPath).toBe("direct");
      expect(resolved.statusReason).toContain("below required safety threshold");
    });

    it("reports unavailable when link budget is negative", () => {
      const geometry = evaluateCommunicationGeometry(180.0, 8.0, "2028-01-15 12:00 UTC");
      const terrainLos = evaluateTerrainLos(-89.5, geometry);

      // Tiny power (0.001W) producing negative margin
      const rf = evaluateRfLinkBudget({
        isConfigured: true,
        transmitPowerW: 0.001,
        carrierFrequencyGhz: 2.2,
        roverAntennaGainDbi: 0,
        groundStationGainDbi: 20,
        receiverSensitivityDbm: -110,
        requiredMarginDb: 3.0,
      });
      expect(rf.status).toBe("fail");

      const relay = evaluateRelayPath({ isConfigured: false });

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("unavailable");
      expect(resolved.selectedPath).toBe("none");
      expect(resolved.statusReason).toContain("Direct RF link budget failed with negative margin");
    });
  });

  describe("Scenario 7 & 8: Relay Path Behavior", () => {
    it("rescues an unavailable direct path when configured relay passes", () => {
      // Direct path is below geometric horizon
      const geometry = evaluateCommunicationGeometry(180.0, -4.0, "2028-01-15 12:00 UTC");
      const terrainLos = evaluateTerrainLos(-89.5, geometry);
      const rf = evaluateRfLinkBudget({ isConfigured: true, transmitPowerW: 5, carrierFrequencyGhz: 2.2 });

      // Relay is configured and available
      const relay = evaluateRelayPath({
        isConfigured: true,
        preset: "lunar-gateway-halo",
        relayName: "Lunar Gateway (Halo Orbit)",
        roverToRelayMarginDb: 7.2,
        relayToEarthMarginDb: 15.0,
      });
      expect(relay.available).toBe(true);

      const resolved = resolveCommunicationStatus(geometry, terrainLos, rf, relay);
      expect(resolved.status).toBe("available");
      expect(resolved.selectedPath).toBe("relay");
      expect(resolved.statusReason).toContain("operational path is available via Lunar Gateway");
    });

    it("accurately reports no relay configured when unconfigured", () => {
      const relay = evaluateRelayPath({ isConfigured: false, preset: "none" });
      expect(relay.configured).toBe(false);
      expect(relay.available).toBeNull();
      expect(relay.warning).toContain("No lunar communications relay configured");
    });

    it("evaluates complete communication link using top-level orchestrator", () => {
      const result = evaluateCommunicationLink({
        latitudeDeg: -89.5,
        longitudeDeg: 0.0,
        missionEpoch: "2028-01-15 12:00 UTC",
        earthAzimuthDeg: 3.43,
        earthElevationDeg: -5.2,
      });
      expect(result.status).toBe("unavailable");
      expect(result.geometry.aboveGeometricHorizon).toBe(false);
      expect(result.selectedPath).toBe("none");
    });
  });

  describe("Integration: Mission Context Snapshot Extension", () => {
    it("embeds communicationLink telemetry in buildMissionContextSnapshot", () => {
      const mockHorizons: HorizonsMissionAnalysisResponse = {
        success: true,
        status: "success",
        observationTimeUtc: "2028-01-15 12:00 UTC",
        sun: {
          targetId: "10",
          targetName: "Sun",
          azimuthDeg: 317.13,
          elevationDeg: 1.66,
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
          elevationDeg: 4.5, // above horizon and terrain
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
        observerCoordinates: {
          latitudeDeg: -88.0,
          longitudeDeg: 0.0,
          rawLatitude: "-88.0",
          rawLongitude: "0.0",
        },
        disclaimer: "JPL Horizons ephemerides",
      };

      const snapshot = buildMissionContextSnapshot({
        latitudeDeg: -88.0,
        longitudeDeg: 0.0,
        missionDate: "2028-01-15",
        missionTimeUtc: "12:00",
        horizonsData: mockHorizons,
        solarValues: {
          radioPreset: "s-band-direct",
          transmitPowerW: "5",
          carrierFrequencyGhz: "2.2",
          roverAntennaGainDbi: "6",
          groundStationGainDbi: "45",
          receiverSensitivityDbm: "-130",
          requiredMarginDb: "3.0",
        },
        revision: 7,
      });

      expect(snapshot.communicationLink).toBeDefined();
      expect(snapshot.communicationLink?.status).toBe("available");
      expect(snapshot.communicationLink?.selectedPath).toBe("direct");
      expect(snapshot.communicationLink?.rfLink.status).toBe("pass");
      expect(snapshot.communicationLink?.rfLink.linkMarginDb).toBeGreaterThanOrEqual(3.0);
      expect(snapshot.analysisStatus.communicationLink).toBe("available");
      expect(snapshot.provenance.models).toContain("Friis Transmission RF Model (ASTM/ITU-R P.525)");
    });
  });
});
