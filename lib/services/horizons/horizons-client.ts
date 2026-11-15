import type { LunarCoordinates } from "@/lib/coordinates/lunar-coordinate-types";
import { validateHorizonsCoordinates } from "@/lib/coordinates/coordinate-transform";
import type {
  HorizonsQueryParams,
  HorizonsCelestialPosition,
  HorizonsMissionAnalysisResponse,
  HorizonsRawApiResponse,
} from "./horizons-types";
import { buildHorizonsRequestUrl } from "./horizons-request";
import { parseHorizonsApiResponse } from "./horizons-parser";

const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeProviderError(status: number, statusText: string, rawBody: string): string {
  if (rawBody.includes("<") && rawBody.includes(">")) {
    const textOnly = rawBody
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const cleanSnippet = textOnly.slice(0, 80);
    return `JPL Horizons returned HTTP ${status} (${statusText})${cleanSnippet ? `: ${cleanSnippet}` : ""}`;
  }
  return `JPL Horizons HTTP ${status} (${statusText}): ${rawBody.slice(0, 120).trim()}`;
}

export interface FetchHorizonsOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Fetches apparent azimuth and elevation for a single celestial target from JPL Horizons.
 */
export async function fetchHorizonsTarget(
  params: HorizonsQueryParams,
  options: FetchHorizonsOptions = {}
): Promise<HorizonsCelestialPosition> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const customFetch = options.fetchFn ?? fetch;
  const url = buildHorizonsRequestUrl(params);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await customFetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "LunarMissionPlanner/1.0 (NASA Space Apps Challenge; JPL Horizons client)",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Handle HTTP status
      if (!response.ok) {
        // Check for rate limit
        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryAfterSec = Number(response.headers.get("Retry-After")) || 1;
          const backoff = retryAfterSec * 1000 + Math.random() * 200;
          await sleep(backoff);
          continue;
        }

        // Retry transient 5xx errors
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const backoff = Math.pow(2, attempt) * 500 + Math.random() * 200;
          await sleep(backoff);
          continue;
        }

        let errorDetails = "";
        try {
          const errText = await response.text();
          errorDetails = errText.slice(0, 300);
        } catch {
          // ignore text extraction error
        }

        throw new Error(sanitizeProviderError(response.status, response.statusText, errorDetails));
      }

      // Check content type
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
        // Some responses return text/plain with JSON body, attempt parse
      }

      const json = (await response.json()) as HorizonsRawApiResponse;
      const observationTime = `${params.missionDate} ${params.missionTimeUtc} UTC`;

      return parseHorizonsApiResponse(
        json,
        params.target,
        params.targetName,
        observationTime
      );
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";
      const errorObj = isAbort
        ? new Error(`JPL Horizons request timed out after ${timeoutMs}ms`)
        : (err as Error);

      lastError = errorObj;

      // Only retry network errors / aborts if attempts remain
      if (attempt < MAX_RETRIES && (isAbort || (err as Error)?.name === "TypeError")) {
        const backoff = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await sleep(backoff);
        continue;
      }

      break;
    }
  }

  throw lastError ?? new Error("Failed to fetch Horizons data after retries.");
}

/**
 * Queries JPL Horizons for both Sun and Earth positions concurrently from the same lunar observer location.
 */
export async function queryMissionEphemerides(
  coordinates: LunarCoordinates,
  missionDate: string,
  missionTimeUtc: string,
  options: FetchHorizonsOptions = {}
): Promise<HorizonsMissionAnalysisResponse> {
  const observationTimeUtc = `${missionDate} ${missionTimeUtc} UTC`;
  const disclaimer =
    "JPL Horizons calculates the geometric positions of celestial objects as seen from the specified lunar location. Local terrain obstruction (e.g. crater rims or mountain peaks) is not modeled.";

  // Boundary check at Horizons service level
  const boundaryCheck = validateHorizonsCoordinates(coordinates);
  if (!boundaryCheck.valid) {
    return {
      success: false,
      status: "unavailable",
      observerCoordinates: coordinates,
      observationTimeUtc,
      error: boundaryCheck.error,
      disclaimer,
    };
  }

  const [sunResult, earthResult] = await Promise.allSettled([
    fetchHorizonsTarget(
      {
        target: "10",
        targetName: "Sun",
        coordinates,
        missionDate,
        missionTimeUtc,
      },
      options
    ),
    fetchHorizonsTarget(
      {
        target: "399",
        targetName: "Earth",
        coordinates,
        missionDate,
        missionTimeUtc,
      },
      options
    ),
  ]);

  const sunPos = sunResult.status === "fulfilled" ? sunResult.value : undefined;
  const earthPos = earthResult.status === "fulfilled" ? earthResult.value : undefined;
  const sunError =
    sunResult.status === "rejected"
      ? (sunResult.reason as Error)?.message || "Failed to query Sun ephemeris"
      : undefined;
  const earthError =
    earthResult.status === "rejected"
      ? (earthResult.reason as Error)?.message || "Failed to query Earth ephemeris"
      : undefined;

  if (sunPos && earthPos) {
    return {
      success: true,
      status: "success",
      observerCoordinates: coordinates,
      observationTimeUtc,
      sun: sunPos,
      earth: earthPos,
      disclaimer,
    };
  }

  if (sunPos || earthPos) {
    return {
      success: true,
      status: "partial",
      observerCoordinates: coordinates,
      observationTimeUtc,
      sun: sunPos,
      earth: earthPos,
      sunError,
      earthError,
      error: `Partial ephemeris retrieved: ${sunError || earthError}`,
      disclaimer,
    };
  }

  const errorMsg = `Ephemerides query failed. Sun: ${sunError}; Earth: ${earthError}`;
  return {
    success: false,
    status: "error",
    observerCoordinates: coordinates,
    observationTimeUtc,
    sunError,
    earthError,
    error: errorMsg,
    disclaimer,
  };
}

