import { describe, it, expect, vi } from "vitest";
import { buildHorizonsRequestUrl, calculateStopTime } from "@/lib/services/horizons/horizons-request";
import { parseHorizonsApiResponse, HorizonsParseError } from "@/lib/services/horizons/horizons-parser";
import {
  fetchHorizonsTarget,
  queryMissionEphemerides,
} from "@/lib/services/horizons/horizons-client";
import type { LunarCoordinates } from "@/lib/coordinates/lunar-coordinate-types";

// Realistic mock output from Horizons observer table
const MOCK_HORIZONS_SUN_SUCCESS = {
  signature: { source: "NASA/JPL Horizons API", version: "1.2" },
  result: `
*******************************************************************************
 Revised: May 2021                 Sun / (Moon)                              10
*******************************************************************************
Center-site: 'coord@301'
Target body: '10'
*******************************************************************************
$$SOE
 2028-Jan-15 12:00     132.6412   5.2718
 2028-Jan-15 12:01     132.6510   5.2701
$$EOE
*******************************************************************************
`,
};

const MOCK_HORIZONS_EARTH_SUCCESS = {
  signature: { source: "NASA/JPL Horizons API", version: "1.2" },
  result: `
*******************************************************************************
Center-site: 'coord@301'
Target body: '399'
*******************************************************************************
$$SOE
 2028-Jan-15 12:00 *m   45.1824  12.3045
 2028-Jan-15 12:01 *m   45.1825  12.3042
$$EOE
*******************************************************************************
`,
};

describe("JPL Horizons Service & API Contract", () => {
  const coords: LunarCoordinates = {
    latitudeDeg: -89.5,
    longitudeDeg: 0.0,
    rawLatitude: "-89.50",
    rawLongitude: "0.00",
  };

  it("calculates stop time exactly 1 minute later", () => {
    expect(calculateStopTime("2028-01-15", "12:00")).toBe("2028-01-15 12:01");
    expect(calculateStopTime("2028-01-15", "23:59")).toBe("2028-01-16 00:00");
  });

  it("constructs valid Horizons request URL with proper observer parameters", () => {
    const url = buildHorizonsRequestUrl({
      target: "10",
      targetName: "Sun",
      coordinates: coords,
      missionDate: "2028-01-15",
      missionTimeUtc: "12:00",
    });

    expect(url).toContain("https://ssd.jpl.nasa.gov/api/horizons.api");
    expect(url).toContain("format=json");
    expect(url).toContain("COMMAND=%2710%27");
    expect(url).toContain("CENTER=%27coord%40301%27");
    expect(url).toContain("COORD_TYPE=%27GEODETIC%27");
    expect(url).toContain("SITE_COORD=%270%2C-89.5%2C0%27");
    expect(url).toContain("QUANTITIES=%274%27");
  });

  it("parses valid Horizons success response into typed celestial position", () => {
    const pos = parseHorizonsApiResponse(
      MOCK_HORIZONS_SUN_SUCCESS,
      "10",
      "Sun",
      "2028-01-15 12:00 UTC"
    );

    expect(pos.targetId).toBe("10");
    expect(pos.targetName).toBe("Sun");
    expect(pos.azimuthDeg).toBe(132.6412);
    expect(pos.elevationDeg).toBe(5.2718);
    expect(pos.isGeometricAboveHorizon).toBe(true);
    expect(pos.source).toBe("JPL Horizons");
  });

  it("handles flagged output row (e.g. '*m' marker) and parses Earth position", () => {
    const pos = parseHorizonsApiResponse(
      MOCK_HORIZONS_EARTH_SUCCESS,
      "399",
      "Earth",
      "2028-01-15 12:00 UTC"
    );

    expect(pos.targetId).toBe("399");
    expect(pos.targetName).toBe("Earth");
    expect(pos.azimuthDeg).toBe(45.1824);
    expect(pos.elevationDeg).toBe(12.3045);
    expect(pos.isGeometricAboveHorizon).toBe(true);
  });

  it("surfaces permanent HTTP errors without endless retries (HTTP 400)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid parameter COMMAND",
      headers: new Headers(),
    });

    await expect(
      fetchHorizonsTarget(
        {
          target: "10",
          targetName: "Sun",
          coordinates: coords,
          missionDate: "2028-01-15",
          missionTimeUtc: "12:00",
        },
        { fetchFn: mockFetch as unknown as typeof fetch, timeoutMs: 1000 }
      )
    ).rejects.toThrow("JPL Horizons HTTP 400");

    // Permanent 400 error should NOT be retried
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles HTTP 429 rate limit with backoff and retry", async () => {
    const mockFetch = vi
      .fn()
      // First attempt: 429
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "Retry-After": "0" }),
      })
      // Second attempt: 200 success
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => MOCK_HORIZONS_SUN_SUCCESS,
      });

    const pos = await fetchHorizonsTarget(
      {
        target: "10",
        targetName: "Sun",
        coordinates: coords,
        missionDate: "2028-01-15",
        missionTimeUtc: "12:00",
      },
      { fetchFn: mockFetch as unknown as typeof fetch, timeoutMs: 2000 }
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(pos.azimuthDeg).toBe(132.6412);
  });

  it("retries transient 500/503 errors and succeeds", async () => {
    const mockFetch = vi
      .fn()
      // First attempt: 503 Service Unavailable
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "Upstream gateway busy",
        headers: new Headers(),
      })
      // Second attempt: 200
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => MOCK_HORIZONS_SUN_SUCCESS,
      });

    const pos = await fetchHorizonsTarget(
      {
        target: "10",
        targetName: "Sun",
        coordinates: coords,
        missionDate: "2028-01-15",
        missionTimeUtc: "12:00",
      },
      { fetchFn: mockFetch as unknown as typeof fetch, timeoutMs: 2000 }
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(pos.azimuthDeg).toBe(132.6412);
  });

  it("detects Horizons error in success HTTP payload", () => {
    const errorPayload = {
      result: "Cannot interpret 'coord@999' as valid center.",
    };

    expect(() =>
      parseHorizonsApiResponse(
        errorPayload,
        "10",
        "Sun",
        "2028-01-15 12:00 UTC"
      )
    ).toThrow(HorizonsParseError);
  });

  it("handles missing $$SOE/$$EOE ephemeris table", () => {
    const noTablePayload = {
      result: "Header info without table data",
    };

    expect(() =>
      parseHorizonsApiResponse(
        noTablePayload,
        "10",
        "Sun",
        "2028-01-15 12:00 UTC"
      )
    ).toThrow("Ephemeris data block ($$SOE ... $$EOE) missing");
  });

  it("rejects parsed angles that exceed physical bounds", () => {
    const badAnglePayload = {
      result: `
$$SOE
 2028-Jan-15 12:00     450.0000   150.0000
$$EOE
`,
    };

    expect(() =>
      parseHorizonsApiResponse(
        badAnglePayload,
        "10",
        "Sun",
        "2028-01-15 12:00 UTC"
      )
    ).toThrow("Parsed azimuth out of bounds");
  });

  it("queries both Sun and Earth positions concurrently from same observer", async () => {
    const mockFetch = vi
      .fn()
      .mockImplementation(async (url: string) => {
        if (url.includes("COMMAND=%2710%27")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => MOCK_HORIZONS_SUN_SUCCESS,
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => MOCK_HORIZONS_EARTH_SUCCESS,
        };
      });

    const res = await queryMissionEphemerides(
      coords,
      "2028-01-15",
      "12:00",
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(res.success).toBe(true);
    expect(res.sun?.azimuthDeg).toBe(132.6412);
    expect(res.earth?.azimuthDeg).toBe(45.1824);
    expect(res.disclaimer).toContain("Local terrain obstruction (e.g. crater rims or mountain peaks) is not modeled");
  });

  it("does not fabricate values when upstream service fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

    const res = await queryMissionEphemerides(
      coords,
      "2028-01-15",
      "12:00",
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(res.success).toBe(false);
    expect(res.sun).toBeUndefined();
    expect(res.earth).toBeUndefined();
    expect(res.error).toContain("Network connection dropped");
  });

  it("handles partial failure gracefully when Sun succeeds but Earth fails", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("COMMAND=%2710%27")) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => MOCK_HORIZONS_SUN_SUCCESS,
        };
      }
      return {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Horizons service error for Earth target",
        headers: new Headers(),
      };
    });

    const res = await queryMissionEphemerides(
      coords,
      "2028-01-15",
      "12:00",
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(res.success).toBe(true);
    expect(res.status).toBe("partial");
    expect(res.sun).toBeDefined();
    expect(res.sun?.azimuthDeg).toBe(132.6412);
    expect(res.sun?.geometricStatus).toBe("Above horizon");
    expect(res.earth).toBeUndefined();
    expect(res.earthError).toBeDefined();
  });

  it("sanitizes HTML error bodies so raw HTML never leaks into errors (HOR-UI-001)", async () => {
    const html404 = "<html><head><title>404 Not Found</title></head><body><center><h1>404 Not Found</h1></center><hr><center>nginx</center></body></html>";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => html404,
      headers: new Headers(),
    });

    const res = await queryMissionEphemerides(
      coords,
      "2028-01-15",
      "12:00",
      { fetchFn: mockFetch as unknown as typeof fetch }
    );

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
    expect(res.error).not.toContain("<html");
    expect(res.error).not.toContain("<body>");
    expect(res.error).toContain("404 (Not Found)");
  });
});

