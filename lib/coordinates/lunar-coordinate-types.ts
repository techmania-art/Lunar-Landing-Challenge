/**
 * Lunar Coordinate Types
 *
 * Explicit internal types preserving raw user entries and typed numeric degrees.
 * Ambiguous coordinate tuples (e.g. [lat, lon]) are disallowed.
 */

export interface LunarCoordinates {
  /** Numeric latitude in decimal degrees. North positive, South negative. */
  latitudeDeg: number;
  /** Numeric longitude in decimal degrees. East positive, West negative. */
  longitudeDeg: number;
  /** Exact raw string entered by user for latitude. */
  rawLatitude: string;
  /** Exact raw string entered by user for longitude. */
  rawLongitude: string;
}

export interface CoordinateParseSuccess {
  success: true;
  data: LunarCoordinates;
}

export interface CoordinateParseFailure {
  success: false;
  error: string;
  field?: "latitude" | "longitude";
}

export type CoordinateParseResult = CoordinateParseSuccess | CoordinateParseFailure;

export interface ServiceCoordinateCheck {
  valid: boolean;
  service: string;
  error?: string;
  recommendation?: string;
}

