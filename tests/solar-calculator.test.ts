import { describe, it, expect } from "vitest";
import {
  SOLAR_CONSTANT_LUNAR_WM2,
  DEFAULT_DERATING_FACTOR,
  calculateSolarIncidenceAngle,
  estimateLocalTerrainHorizon,
  evaluateSolarIllumination,
  calculateSolarEnergy,
} from "@/lib/services/solar/solar-calculator";
import type { SolarIlluminationResult, SolarPanelConfig } from "@/lib/services/solar/solar-types";

describe("solar-calculator service", () => {
  describe("Physical constants", () => {
    it("uses ASTM E490 lunar solar constant 1361 W/m²", () => {
      expect(SOLAR_CONSTANT_LUNAR_WM2).toBe(1361);
    });

    it("uses default derating factor of 0.85", () => {
      expect(DEFAULT_DERATING_FACTOR).toBe(0.85);
    });
  });

  describe("calculateSolarIncidenceAngle", () => {
    it("returns 0 degrees for sun-tracking panels regardless of elevation", () => {
      expect(calculateSolarIncidenceAngle(1.5, "sun-tracking")).toBe(0);
      expect(calculateSolarIncidenceAngle(45, "sun-tracking")).toBe(0);
      expect(calculateSolarIncidenceAngle(-2, "sun-tracking")).toBe(0);
    });

    it("calculates 90 - elevation for horizontal fixed panels", () => {
      // At lunar equator with sun at zenith (90° elevation), incidence angle is 0°
      expect(calculateSolarIncidenceAngle(90, "horizontal")).toBe(0);
      // At polar region with sun at 1.5° elevation, incidence angle is 88.5°
      expect(calculateSolarIncidenceAngle(1.5, "horizontal")).toBe(88.5);
      // At horizon (0° elevation), incidence angle is 90°
      expect(calculateSolarIncidenceAngle(0, "horizontal")).toBe(90);
    });

    it("clamps incidence angles within [0, 180]", () => {
      expect(calculateSolarIncidenceAngle(100, "horizontal")).toBe(0);
      expect(calculateSolarIncidenceAngle(-100, "horizontal")).toBe(180);
    });
  });

  describe("estimateLocalTerrainHorizon", () => {
    it("returns 1.0° elevation mask for deep polar regions (|lat| >= 85°)", () => {
      const southPole = estimateLocalTerrainHorizon(-89.5);
      expect(southPole.horizonAngleDeg).toBe(1.0);
      expect(southPole.dataset).toContain("LOLA Polar");

      const northPole = estimateLocalTerrainHorizon(87.0);
      expect(northPole.horizonAngleDeg).toBe(1.0);
    });

    it("returns 0.5° elevation mask for sub-polar regions (75° <= |lat| < 85°)", () => {
      const subPolar = estimateLocalTerrainHorizon(-78.0);
      expect(subPolar.horizonAngleDeg).toBe(0.5);
    });

    it("returns 0.0° elevation mask for equatorial and mid-latitudes (|lat| < 75°)", () => {
      const equator = estimateLocalTerrainHorizon(0.0);
      expect(equator.horizonAngleDeg).toBe(0.0);
      const midLat = estimateLocalTerrainHorizon(45.0);
      expect(midLat.horizonAngleDeg).toBe(0.0);
    });
  });

  describe("evaluateSolarIllumination", () => {
    it("returns UNAVAILABLE when sun elevation or azimuth is NaN or infinite", () => {
      const res = evaluateSolarIllumination(-89.5, NaN, 1.5, "2028-01-15 12:00 UTC");
      expect(res.state).toBe("UNAVAILABLE");
      expect(res.reason).toContain("unavailable");
    });

    it("returns GEOMETRICALLY_BELOW_HORIZON when sun is below -0.25°", () => {
      const res = evaluateSolarIllumination(-89.5, 180.0, -1.2, "2028-01-15 12:00 UTC");
      expect(res.state).toBe("GEOMETRICALLY_BELOW_HORIZON");
      expect(res.sunElevationDeg).toBe(-1.2);
    });

    it("returns TERRAIN_SHADOWED when sun is geometrically above horizon but below local terrain mask", () => {
      // At -89.5°, terrain horizon is 1.0°. If sun is at 0.4°, it is terrain shadowed.
      const res = evaluateSolarIllumination(-89.5, 180.0, 0.4, "2028-01-15 12:00 UTC");
      expect(res.state).toBe("TERRAIN_SHADOWED");
      expect(res.localTerrainHorizonDeg).toBe(1.0);
      expect(res.reason).toContain("below local terrain horizon");
    });

    it("returns ILLUMINATED when sun is clear of terrain horizon", () => {
      // At -89.5°, sun elevation 1.8° > 1.0°
      const res = evaluateSolarIllumination(-89.5, 180.0, 1.8, "2028-01-15 12:00 UTC");
      expect(res.state).toBe("ILLUMINATED");
      expect(res.reason).toContain("Direct sunlight is clear");
    });
  });

  describe("calculateSolarEnergy", () => {
    const illuminatedSouthPole: SolarIlluminationResult = {
      state: "ILLUMINATED",
      sunAzimuthDeg: 180,
      sunElevationDeg: 1.5,
      localTerrainHorizonDeg: 1.0,
      observationTimeUtc: "2028-01-15 12:00 UTC",
      reason: "Clear direct sunlight",
      terrainDataset: "LOLA Polar Topography Profile (100m/px)",
      source: "JPL Horizons + LOLA DEM",
    };

    const validPanel: SolarPanelConfig = {
      areaM2: 1.2,
      efficiencyPercent: 28.5,
      orientation: "horizontal",
      deratingFactor: 0.85,
    };

    it("returns zero direct power (0 W, 0 Wh) for GEOMETRICALLY_BELOW_HORIZON without assuming rover has zero battery", () => {
      const darkIllumination: SolarIlluminationResult = {
        ...illuminatedSouthPole,
        state: "GEOMETRICALLY_BELOW_HORIZON",
        sunElevationDeg: -2.0,
      };

      const result = calculateSolarEnergy({
        illumination: darkIllumination,
        panel: validPanel,
        analysisDurationHours: 4.0,
      });

      expect(result.status).toBe("zero-direct-power");
      expect(result.directSolarPowerW).toBe(0);
      expect(result.estimatedEnergyWh).toBe(0);
      expect(result.message).toContain("NO DIRECT SOLAR ENERGY AVAILABLE");
      expect(result.assumptions.some((a) => a.includes("stored battery energy is not modeled"))).toBe(true);
    });

    it("returns zero direct power (0 W, 0 Wh) for TERRAIN_SHADOWED", () => {
      const shadowedIllumination: SolarIlluminationResult = {
        ...illuminatedSouthPole,
        state: "TERRAIN_SHADOWED",
        sunElevationDeg: 0.5,
      };

      const result = calculateSolarEnergy({
        illumination: shadowedIllumination,
        panel: validPanel,
        analysisDurationHours: 4.0,
      });

      expect(result.status).toBe("zero-direct-power");
      expect(result.directSolarPowerW).toBe(0);
      expect(result.estimatedEnergyWh).toBe(0);
    });

    it("returns panel-unconfigured when panel specs are missing, never inventing fake watts", () => {
      const result = calculateSolarEnergy({
        illumination: illuminatedSouthPole,
        panel: undefined,
        analysisDurationHours: 4.0,
      });

      expect(result.status).toBe("panel-unconfigured");
      expect(result.directSolarPowerW).toBeUndefined();
      expect(result.estimatedEnergyWh).toBeUndefined();
      expect(result.message).toContain("Configure rover solar panel area");
    });

    it("computes accurate direct power and energy for horizontal fixed panels", () => {
      // P = 1.2 * 0.285 * 1361 * cos(88.5°) * 0.85
      // cos(88.5°) = sin(1.5°) = 0.0261769...
      // P = 1.2 * 0.285 * 1361 * 0.0261769 * 0.85 = 10.36 W
      const result = calculateSolarEnergy({
        illumination: illuminatedSouthPole,
        panel: validPanel,
        analysisDurationHours: 4.0,
      });

      expect(result.status).toBe("calculated");
      expect(result.directSolarPowerW).toBeGreaterThan(10);
      expect(result.directSolarPowerW).toBeLessThan(11);
      // Wh = P * 4.0h
      expect(result.estimatedEnergyWh).toBeCloseTo(result.directSolarPowerW! * 4.0, 1);
      expect(result.panelOrientation).toBe("horizontal");
    });

    it("computes significantly higher power for sun-tracking panels at polar grazing angles", () => {
      const trackingPanel: SolarPanelConfig = {
        ...validPanel,
        orientation: "sun-tracking",
      };

      const result = calculateSolarEnergy({
        illumination: illuminatedSouthPole,
        panel: trackingPanel,
        analysisDurationHours: 4.0,
      });

      // P = 1.2 * 0.285 * 1361 * cos(0°) * 0.85 = 395.64 W
      expect(result.status).toBe("calculated");
      expect(result.directSolarPowerW).toBeCloseTo(395.64, 0);
      expect(result.estimatedEnergyWh).toBeCloseTo(395.64 * 4.0, 0);
      expect(result.incidenceAngleDeg).toBe(0);
    });

    it("returns unavailable status when illumination state is UNAVAILABLE", () => {
      const unavail: SolarIlluminationResult = {
        ...illuminatedSouthPole,
        state: "UNAVAILABLE",
      };

      const result = calculateSolarEnergy({
        illumination: unavail,
        panel: validPanel,
      });

      expect(result.status).toBe("unavailable");
      expect(result.directSolarPowerW).toBeUndefined();
    });
  });
});

