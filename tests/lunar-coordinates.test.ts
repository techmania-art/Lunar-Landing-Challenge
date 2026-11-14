import { describe, it, expect } from "vitest";
import {
  parseLunarCoordinates,
  validateHorizonsCoordinates,
  toHorizonsSiteCoord,
  selectLunarProjection,
} from "@/lib/coordinates/coordinate-transform";
import {
  formatDegrees,
  formatCoordinateCallout,
  formatHemisphereString,
} from "@/lib/coordinates/coordinate-format";

describe("Lunar Coordinate Domain & Transforms", () => {
  it("safely parses finite coordinates and preserves exact raw input strings", () => {
    const res = parseLunarCoordinates("-89.5000", "45.1234");
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.latitudeDeg).toBe(-89.5);
      expect(res.data.longitudeDeg).toBe(45.1234);
      expect(res.data.rawLatitude).toBe("-89.5000");
      expect(res.data.rawLongitude).toBe("45.1234");
    }
  });

  it("rejects non-finite values (NaN, Infinity, -Infinity)", () => {
    expect(parseLunarCoordinates("NaN", "0").success).toBe(false);
    expect(parseLunarCoordinates("0", "Infinity").success).toBe(false);
    expect(parseLunarCoordinates("-Infinity", "0").success).toBe(false);
  });

  it("rejects empty coordinate inputs", () => {
    expect(parseLunarCoordinates("", "0").success).toBe(false);
    expect(parseLunarCoordinates("0", "  ").success).toBe(false);
  });

  it("formats callout strings accurately", () => {
    expect(formatDegrees(-89.5, 2)).toBe("-89.50°");
    expect(formatDegrees(NaN)).toBe("N/A");

    const coords = {
      latitudeDeg: -89.5,
      longitudeDeg: 0,
      rawLatitude: "-89.50",
      rawLongitude: "0.00",
    };
    const callout = formatCoordinateCallout(coords, 2);
    expect(callout.latText).toBe("Lat: -89.50°");
    expect(callout.lonText).toBe("Lon: 0.00°");
  });

  it("formats hemisphere notation correctly", () => {
    const southEast = {
      latitudeDeg: -89.5,
      longitudeDeg: 12.3,
      rawLatitude: "-89.5",
      rawLongitude: "12.3",
    };
    expect(formatHemisphereString(southEast, 1)).toBe("89.5° S, 12.3° E");

    const northWest = {
      latitudeDeg: 25.0,
      longitudeDeg: -45.5,
      rawLatitude: "25.0",
      rawLongitude: "-45.5",
    };
    expect(formatHemisphereString(northWest, 1)).toBe("25.0° N, 45.5° W");
  });

  it("validates Horizons geodetic bounds at service boundary", () => {
    const validCoords = {
      latitudeDeg: -89.5,
      longitudeDeg: 0,
      rawLatitude: "-89.5",
      rawLongitude: "0",
    };
    expect(validateHorizonsCoordinates(validCoords).valid).toBe(true);

    const outOfBoundsLat = {
      latitudeDeg: -95.0,
      longitudeDeg: 0,
      rawLatitude: "-95.0",
      rawLongitude: "0",
    };
    const check = validateHorizonsCoordinates(outOfBoundsLat);
    expect(check.valid).toBe(false);
    expect(check.error).toContain("planetodetic latitude between -90° and +90°");
  });

  it("formats site_coord string for Horizons observer", () => {
    const coords = {
      latitudeDeg: -89.5,
      longitudeDeg: 45.2,
      rawLatitude: "-89.5",
      rawLongitude: "45.2",
    };
    expect(toHorizonsSiteCoord(coords, 0)).toBe("45.2,-89.5,0");
  });

  it("selects appropriate cartographic projection for polar vs equatorial targets", () => {
    const southPole = {
      latitudeDeg: -88.0,
      longitudeDeg: 0,
      rawLatitude: "-88.0",
      rawLongitude: "0",
    };
    expect(selectLunarProjection(southPole).projection).toBe("polar-stereographic-south");

    const northPole = {
      latitudeDeg: 80.0,
      longitudeDeg: 10,
      rawLatitude: "80.0",
      rawLongitude: "10",
    };
    expect(selectLunarProjection(northPole).projection).toBe("polar-stereographic-north");

    const equatorial = {
      latitudeDeg: 0.5,
      longitudeDeg: 23.4,
      rawLatitude: "0.5",
      rawLongitude: "23.4",
    };
    expect(selectLunarProjection(equatorial).projection).toBe("equirectangular");
  });
});
