import type {
  LunarCoordinates,
  CoordinateParseResult,
  ServiceCoordinateCheck,
} from "./lunar-coordinate-types";

/**
 * Parses user-entered coordinate strings into a typed LunarCoordinates object.
 *
 * IMPORTANT:
 * - Arbitrary project-level min/max thresholds are removed.
 * - Coordinates are NOT clamped, altered, or substituted.
 * - Non-finite numbers (NaN, Infinity, -Infinity) and empty values are safely rejected.
 * - Raw string values are preserved alongside parsed numeric values.
 */
export function parseLunarCoordinates(
  rawLat: string,
  rawLon: string
): CoordinateParseResult {
  const trimmedLat = (rawLat ?? "").trim();
  const trimmedLon = (rawLon ?? "").trim();

  if (trimmedLat === "") {
    return {
      success: false,
      error: "Valid numeric latitude is required",
      field: "latitude",
    };
  }

  if (trimmedLon === "") {
    return {
      success: false,
      error: "Valid numeric longitude is required",
      field: "longitude",
    };
  }

  const latNum = Number(trimmedLat);
  if (!Number.isFinite(latNum)) {
    return {
      success: false,
      error: `Invalid latitude: '${rawLat}' is not a finite number`,
      field: "latitude",
    };
  }

  const lonNum = Number(trimmedLon);
  if (!Number.isFinite(lonNum)) {
    return {
      success: false,
      error: `Invalid longitude: '${rawLon}' is not a finite number`,
      field: "longitude",
    };
  }

  return {
    success: true,
    data: {
      latitudeDeg: latNum,
      longitudeDeg: lonNum,
      rawLatitude: rawLat,
      rawLongitude: rawLon,
    },
  };
}

/**
 * Validates coordinate constraints at the JPL Horizons service boundary.
 *
 * JPL Horizons geodetic coordinate convention for the Moon (body 301):
 * - Center: coord@301
 * - Site coordinates: 'lon,lat,altitude'
 * - Planetodetic latitude must be physically within [-90.0, +90.0] degrees.
 * - Longitude is East-positive (-180°..+180° or 0°..360°).
 */
export function validateHorizonsCoordinates(
  coords: LunarCoordinates
): ServiceCoordinateCheck {
  if (coords.latitudeDeg < -90 || coords.latitudeDeg > 90) {
    return {
      valid: false,
      service: "JPL Horizons",
      error: `JPL Horizons requires lunar planetodetic latitude between -90° and +90° (received ${coords.latitudeDeg}°).`,
    };
  }

  return {
    valid: true,
    service: "JPL Horizons",
  };
}

/**
 * Formats lunar coordinates for JPL Horizons GEODETIC site specification.
 *
 * Format: "longitude,latitude,altitude_km"
 * Longitude is degrees East positive (-180°..+180° or 0°..360°).
 * Altitude is km above the lunar reference sphere (1737.4 km). Default: 0 km.
 */
export function toHorizonsSiteCoord(
  coords: LunarCoordinates,
  altitudeKm: number = 0
): string {
  // Normalize longitude to -180..+180 if needed, or preserve East-positive
  let lon = coords.longitudeDeg;
  if (lon < -180 || lon > 180) {
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
  }
  return `${lon},${coords.latitudeDeg},${altitudeKm}`;
}

export type LunarProjectionType =
  | "polar-stereographic-south"
  | "polar-stereographic-north"
  | "equirectangular";

/**
 * Recommends the appropriate lunar cartographic projection for the coordinates.
 * High-latitude polar regions (|lat| >= 65°) use polar stereographic.
 * Equatorial and mid-latitude regions use equirectangular.
 */
export function selectLunarProjection(coords: LunarCoordinates): {
  projection: LunarProjectionType;
  description: string;
} {
  if (coords.latitudeDeg <= -65) {
    return {
      projection: "polar-stereographic-south",
      description: "Lunar South Pole Polar Stereographic projection",
    };
  }
  if (coords.latitudeDeg >= 65) {
    return {
      projection: "polar-stereographic-north",
      description: "Lunar North Pole Polar Stereographic projection",
    };
  }
  return {
    projection: "equirectangular",
    description: "Lunar Global Equirectangular (Simple Cylindrical) projection",
  };
}
