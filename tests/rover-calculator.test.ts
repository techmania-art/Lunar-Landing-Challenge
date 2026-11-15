import { describe, it, expect } from "vitest";
import {
  LUNAR_MEAN_RADIUS_KM,
  calculateLunarGreatCircleDistanceKm,
  evaluateTraverseFeasibility,
} from "@/lib/services/rover/rover-calculator";
import type { TraverseFeasibilityInput } from "@/lib/services/rover/rover-types";

describe("rover-calculator service (Phase 10)", () => {
  describe("Physical constants & distance calculations", () => {
    it("uses standard IAU lunar mean radius of 1737.4 km", () => {
      expect(LUNAR_MEAN_RADIUS_KM).toBe(1737.4);
    });

    it("returns 0 km for identical start and destination coordinates", () => {
      expect(calculateLunarGreatCircleDistanceKm(-89.5, 0.0, -89.5, 0.0)).toBe(0);
    });

    it("computes accurate great-circle surface distance across the lunar sphere", () => {
      // 1 degree of latitude on Moon: (PI / 180) * 1737.4 = ~30.323 km
      const oneDegreeLatKm = calculateLunarGreatCircleDistanceKm(0.0, 0.0, 1.0, 0.0);
      expect(oneDegreeLatKm).toBeCloseTo(30.32, 1);

      // Shackleton rim to nearby ridge (from -89.50, 0.0 to -89.20, 10.0)
      const polarTraverseKm = calculateLunarGreatCircleDistanceKm(-89.5, 0.0, -89.2, 10.0);
      expect(polarTraverseKm).toBeGreaterThan(9);
      expect(polarTraverseKm).toBeLessThan(12);
    });
  });

  describe("evaluateTraverseFeasibility", () => {
    const baseValidInput: TraverseFeasibilityInput = {
      battery: {
        nominalCapacityWh: 600,
        maxDepthOfDischargePercent: 80,
        initialSocPercent: 100,
      },
      consumption: {
        drivePowerW: 75,
        idlePowerW: 20,
        driveSpeedKmH: 0.5,
        safetyReservePercent: 15,
      },
      route: {
        startLatitudeDeg: -89.5,
        startLongitudeDeg: 0.0,
        destLatitudeDeg: -89.47,
        destLongitudeDeg: 0.0, // ~0.03 deg = ~0.91 km
      },
      solarEnergyGeneratedWh: 150,
      missionDurationHours: 4.0,
    };

    it("returns NOT_EVALUATED when route or destination is not specified", () => {
      const res = evaluateTraverseFeasibility({
        ...baseValidInput,
        route: undefined,
      });

      expect(res.state).toBe("NOT_EVALUATED");
      expect(res.explanation).toContain("No destination coordinates");
    });

    it("returns UNDETERMINED when route distance is 0 km", () => {
      const res = evaluateTraverseFeasibility({
        ...baseValidInput,
        route: {
          startLatitudeDeg: -89.5,
          startLongitudeDeg: 0.0,
          destLatitudeDeg: -89.5,
          destLongitudeDeg: 0.0,
        },
      });

      expect(res.state).toBe("UNDETERMINED");
      expect(res.explanation).toContain("Route distance is zero");
    });

    it("returns UNDETERMINED when battery capacity is missing or 0", () => {
      const res = evaluateTraverseFeasibility({
        ...baseValidInput,
        battery: undefined,
      });

      expect(res.state).toBe("UNDETERMINED");
      expect(res.explanation).toContain("battery capacity or rover consumption loads are missing");
    });

    it("evaluates SUFFICIENT_ENERGY when available energy exceeds required load + reserve", () => {
      // Distance is ~0.91 km. At 0.5 km/h, drive time is ~1.82 h.
      // Drive energy: 75 W * 1.82 h = 136.5 Wh.
      // Idle energy: 20 W * (4.0 - 1.82 h) = 43.6 Wh.
      // Total required: 180.1 Wh. Safety reserve (15%): ~27 Wh. Total required + reserve: ~207 Wh.
      // Usable battery: 600 * 0.8 = 480 Wh. Solar: 150 Wh. Total available: 630 Wh >> 207 Wh.
      const res = evaluateTraverseFeasibility(baseValidInput);

      expect(res.state).toBe("SUFFICIENT_ENERGY");
      expect(res.netMarginWh).toBeGreaterThan(0);
      expect(res.explanation).toContain("sufficient");
      expect(res.explanation).toContain("This result applies only to the selected route");
      expect(res.limitations.some((l) => l.includes("Does not claim the rover can traverse the Moon as a whole"))).toBe(true);
    });

    it("evaluates INSUFFICIENT_ENERGY when battery + solar cannot cover traverse load", () => {
      const highDrainInput: TraverseFeasibilityInput = {
        ...baseValidInput,
        battery: {
          nominalCapacityWh: 100, // Small 100 Wh battery
          maxDepthOfDischargePercent: 80, // 80 Wh usable
          initialSocPercent: 50, // 40 Wh usable
        },
        solarEnergyGeneratedWh: 0, // Shadowed / unlit epoch
      };

      const res = evaluateTraverseFeasibility(highDrainInput);

      expect(res.state).toBe("INSUFFICIENT_ENERGY");
      expect(res.explanation).toContain("falls below the required reserve");
    });

    it("evaluates CONDITIONALLY_FEASIBLE when energy completes traverse but penetrates safety reserve", () => {
      // Configure battery to cover demand (~180 Wh) but not demand + reserve (~207 Wh)
      const marginalInput: TraverseFeasibilityInput = {
        ...baseValidInput,
        battery: {
          nominalCapacityWh: 200,
          maxDepthOfDischargePercent: 95,
          initialSocPercent: 100, // Usable = 190 Wh
        },
        solarEnergyGeneratedWh: 0, // 0 solar contribution
      };

      const res = evaluateTraverseFeasibility(marginalInput);

      expect(res.state).toBe("CONDITIONALLY_FEASIBLE");
      expect(res.explanation).toContain("Conditionally feasible");
    });

    it("strictly refuses to claim whole Moon traversal in disclosures", () => {
      const res = evaluateTraverseFeasibility(baseValidInput);
      expect(res.limitations).toContain(
        "Does not claim the rover can traverse the Moon as a whole."
      );
    });
  });
});

