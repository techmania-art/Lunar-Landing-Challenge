import type {
  HorizonsCelestialPosition,
  HorizonsTarget,
  HorizonsRawApiResponse,
  GeometricHorizonStatus,
} from "./horizons-types";

export class HorizonsParseError extends Error {
  constructor(message: string, public readonly rawText?: string) {
    super(message);
    this.name = "HorizonsParseError";
  }
}

/**
 * Evaluates geometric horizon status based on angular elevation and a documented tolerance (default: 0.25°).
 */
export function getGeometricHorizonStatus(
  elevationDeg: number,
  toleranceDeg: number = 0.25
): GeometricHorizonStatus {
  if (!Number.isFinite(elevationDeg)) return "Unknown";
  if (elevationDeg > toleranceDeg) return "Above horizon";
  if (elevationDeg < -toleranceDeg) return "Below horizon";
  return "Near geometric horizon";
}

/**
 * Parses Horizons raw JSON API response and extracts azimuth/elevation.
 */
export function parseHorizonsApiResponse(
  json: HorizonsRawApiResponse,
  targetId: HorizonsTarget,
  targetName: "Sun" | "Earth",
  observationTimeUtc: string
): HorizonsCelestialPosition {
  if (json.error) {
    throw new HorizonsParseError(
      `JPL Horizons API error: ${json.error}${json.message ? ` - ${json.message}` : ""}`
    );
  }

  const rawResult = json.result;
  if (!rawResult || typeof rawResult !== "string") {
    throw new HorizonsParseError("JPL Horizons returned an empty or invalid result field.");
  }

  // Detect explicit API error statements in the result body
  if (
    rawResult.includes("Cannot interpret") ||
    rawResult.includes("No ephemeris") ||
    rawResult.includes("*** ERROR")
  ) {
    const errorSnippet = rawResult.split("\n").slice(0, 10).join(" ").trim();
    throw new HorizonsParseError(`JPL Horizons error in payload: ${errorSnippet}`);
  }

  // Find data between Start-Of-Ephemeris and End-Of-Ephemeris markers
  const soeIdx = rawResult.indexOf("$$SOE");
  const eoeIdx = rawResult.indexOf("$$EOE");

  if (soeIdx === -1 || eoeIdx === -1 || eoeIdx <= soeIdx) {
    throw new HorizonsParseError(
      "Ephemeris data block ($$SOE ... $$EOE) missing from Horizons output."
    );
  }

  const ephemerisBlock = rawResult.substring(soeIdx + 5, eoeIdx).trim();
  const lines = ephemerisBlock.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    throw new HorizonsParseError("Ephemeris table between $$SOE and $$EOE is empty.");
  }

  const firstLine = lines[0];

  // Regex to extract azimuth and elevation:
  // Format: "YYYY-Mmm-DD HH:MM [optional flags] <Azi> <Elev>"
  // Example: "2028-Jan-15 12:00     132.6412   5.2718"
  // Example with flag: "2028-Jan-15 12:00 *m  132.6412   5.2718"
  const tokens = firstLine.split(/\s+/);
  
  // Date is tokens[0], Time is tokens[1]
  // Find the first two numeric values after the time
  const numbersAfterTime: number[] = [];
  for (let i = 2; i < tokens.length; i++) {
    const parsed = Number(tokens[i]);
    if (!isNaN(parsed) && Number.isFinite(parsed)) {
      numbersAfterTime.push(parsed);
    }
  }

  if (numbersAfterTime.length < 2) {
    throw new HorizonsParseError(
      `Failed to parse Azimuth and Elevation from line: "${firstLine}"`
    );
  }

  const azimuth = numbersAfterTime[0];
  const elevation = numbersAfterTime[1];

  // Validate physical angular bounds
  if (azimuth < 0 || azimuth > 360) {
    throw new HorizonsParseError(
      `Parsed azimuth out of bounds [0, 360]: ${azimuth}°`
    );
  }

  if (elevation < -90 || elevation > 90) {
    throw new HorizonsParseError(
      `Parsed elevation out of bounds [-90, +90]: ${elevation}°`
    );
  }

  return {
    targetId,
    targetName,
    azimuthDeg: Number(azimuth.toFixed(4)),
    elevationDeg: Number(elevation.toFixed(4)),
    geometricStatus: getGeometricHorizonStatus(elevation),
    isGeometricAboveHorizon: elevation > 0,
    observationTimeUtc,
    retrievedAtUtc: new Date().toISOString(),
    source: "JPL Horizons",
    units: {
      azimuth: "degrees (East of North)",
      elevation: "degrees above local horizon",
    },
  };
}

