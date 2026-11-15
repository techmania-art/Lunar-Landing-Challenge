import { describe, it, expect } from "vitest";
import {
  sampleLolaElevationMeters,
  analyzeRouteTerrain,
} from "@/lib/services/terrain/terrain-calculator";
import { POST } from "@/app/api/terrain-analysis/route";

describe("Route Terrain Analysis Service (Phase 11)", () => {
  describe("sampleLolaElevationMeters", () => {
    it("returns realistic negative elevation inside South Pole SPA crater depression", () => {
      const elev = sampleLolaElevationMeters(-89.5, 0.0);
      expect(elev).toBeLessThan(0);
      expect(elev).toBeGreaterThan(-7000);
    });

    it("samples lower elevation inside Shackleton crater bowl compared to rim", () => {
      const rimElev = sampleLolaElevationMeters(-89.7, 0.0);
      const bowlElev = sampleLolaElevationMeters(-89.9, 0.0);
      expect(bowlElev).toBeLessThan(rimElev);
    });
  });

  describe("analyzeRouteTerrain", () => {
    it("returns UNAVAILABLE status when route coordinates are missing or identical", () => {
      const res = analyzeRouteTerrain({
        route: {
          coordinates: [
            { latitude: -89.5, longitude: 0.0 },
            { latitude: -89.5, longitude: 0.0 },
          ],
        },
      });

      expect(res.status).toBe("UNAVAILABLE");
      expect(res.obstacleCount.status).toBe("UNAVAILABLE");
    });

    it("computes complete terrain analysis along a valid polar route", () => {
      const res = analyzeRouteTerrain({
        route: {
          coordinates: [
            { latitude: -89.5, longitude: 0.0 },
            { latitude: -89.47, longitude: 0.0 },
          ],
          corridorWidthMeters: 100,
        },
        rover: {
          maxSlopeDegrees: 20,
        },
      });

      expect(res.status).toBe("COMPLETE");
      expect(res.route.distanceMeters).toBeGreaterThan(800);
      expect(res.elevation.samples.length).toBe(21);
      expect(res.maximumSlope.status).toBe("AVAILABLE");
      expect(res.maximumSlope.value).toBeGreaterThan(0);
      expect(res.averageSlope.status).toBe("AVAILABLE");
      expect(res.roughness.status).toBe("AVAILABLE");
      expect(res.roughness.unit).toBe("m RMSD");
      expect(res.obstacleCount.status).toBe("AVAILABLE");

      // Boulder detection must be honestly marked UNAVAILABLE (zero fabrication)
      expect(res.boulderCount.status).toBe("UNAVAILABLE");
      expect(res.boulderCount.value).toBeNull();
      expect(res.boulderCount.message?.toLowerCase()).toContain("sub-meter");

      // Provenance
      expect(res.provenance.some((p) => p.name.includes("LOLA"))).toBe(true);
    });

    it("evaluates EXCEEDS_CONFIGURED_LIMITS when slope exceeds rover capability", () => {
      const res = analyzeRouteTerrain({
        route: {
          coordinates: [
            { latitude: -89.8, longitude: 0.0 },
            { latitude: -89.9, longitude: 0.0 }, // Steep descent into Shackleton
          ],
        },
        rover: {
          maxSlopeDegrees: 5, // Unrealistic low limit for testing
        },
      });

      expect(res.traversability.status).toBe("EXCEEDS_CONFIGURED_LIMITS");
      expect(res.traversability.reasons.some((r) => r.includes("exceeds"))).toBe(true);
    });
  });

  describe("API Route POST /api/terrain-analysis", () => {
    it("returns HTTP 400 when coordinates are invalid or out of range", async () => {
      const req = new Request("http://localhost:3000/api/terrain-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: {
            coordinates: [
              { latitude: 95.0, longitude: 0.0 }, // Latitude > 90
              { latitude: -89.0, longitude: 0.0 },
            ],
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Malformed coordinate");
    });

    it("returns HTTP 200 with full structured terrain analysis for valid request", async () => {
      const req = new Request("http://localhost:3000/api/terrain-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route: {
            coordinates: [
              { latitude: -89.5, longitude: 0.0 },
              { latitude: -89.47, longitude: 0.0 },
            ],
            corridorWidthMeters: 100,
          },
          rover: {
            maxSlopeDegrees: 20,
          },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("COMPLETE");
      expect(json.elevation.samples.length).toBe(21);
      expect(json.maximumSlope.value).toBeGreaterThan(0);
    });
  });
});
