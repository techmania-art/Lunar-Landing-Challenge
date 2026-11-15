import { toHorizonsSiteCoord } from "@/lib/coordinates/coordinate-transform";
import type { HorizonsQueryParams } from "./horizons-types";

export const HORIZONS_BASE_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

/**
 * Calculates a stop time 1 minute after the start time in 'YYYY-MM-DD HH:mm' format.
 */
export function calculateStopTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  const d = new Date(Date.UTC(year, month - 1, day, hour, minute));
  d.setUTCMinutes(d.getUTCMinutes() + 1);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const dt = pad(d.getUTCDate());
  const hr = pad(d.getUTCHours());
  const mn = pad(d.getUTCMinutes());

  return `${y}-${m}-${dt} ${hr}:${mn}`;
}

/**
 * Constructs the official JPL Horizons REST API URL for lunar observer ephemeris.
 */
export function buildHorizonsRequestUrl(params: HorizonsQueryParams): string {
  const startTime = `${params.missionDate} ${params.missionTimeUtc}`;
  const stopTime = calculateStopTime(params.missionDate, params.missionTimeUtc);
  const siteCoord = toHorizonsSiteCoord(params.coordinates);

  const queryParams = new URLSearchParams({
    format: "json",
    COMMAND: `'${params.target}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${siteCoord}'`,
    START_TIME: `'${startTime}'`,
    STOP_TIME: `'${stopTime}'`,
    STEP_SIZE: "'1m'",
    QUANTITIES: "'4'",
    REF_SYSTEM: "'ICRF'",
    CAL_FORMAT: "'CAL'",
    ANG_FORMAT: "'DEG'",
    APPARENT: "'AIRLESS'",
    TIME_DIGITS: "'MINUTES'",
  });

  return `${HORIZONS_BASE_URL}?${queryParams.toString()}`;
}

