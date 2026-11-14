import type { LunarCoordinates } from "./lunar-coordinate-types";

/**
 * Formats a degree value to a specified number of decimal places with degree symbol.
 * Does NOT alter the underlying numeric value.
 */
export function formatDegrees(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return "N/A";
  return `${value.toFixed(decimals)}°`;
}

/**
 * Returns formatted text for the selected coordinate callout display.
 * Lat: -89.50°
 * Lon: 0.00°
 */
export function formatCoordinateCallout(coords: LunarCoordinates, decimals: number = 2): {
  latText: string;
  lonText: string;
} {
  return {
    latText: `Lat: ${formatDegrees(coords.latitudeDeg, decimals)}`,
    lonText: `Lon: ${formatDegrees(coords.longitudeDeg, decimals)}`,
  };
}

/**
 * Formats coordinates into standard scientific notation (e.g. 89.50° S, 0.00° E).
 */
export function formatHemisphereString(coords: LunarCoordinates, decimals: number = 2): string {
  const latDir = coords.latitudeDeg >= 0 ? "N" : "S";
  const lonDir = coords.longitudeDeg >= 0 ? "E" : "W";
  const absLat = Math.abs(coords.latitudeDeg).toFixed(decimals);
  const absLon = Math.abs(coords.longitudeDeg).toFixed(decimals);
  return `${absLat}° ${latDir}, ${absLon}° ${lonDir}`;
}

