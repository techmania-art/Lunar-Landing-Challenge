/**
 * Types and contracts for prepared LOLA local 3D terrain packages (Phase 34 / 35).
 */

export interface TerrainManifestSite {
  latitudeDegrees: number;
  longitudeDegrees: number;
  longitudeConvention: string;
  siteKey: string;
  source: string;
}

export interface TerrainManifestCrop {
  widthMeters: number;
  heightMeters: number;
  centreProjectedX: number;
  centreProjectedY: number;
  requestedSiteToCropCentreDistanceMeters: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export interface TerrainManifestGeodesy {
  crsWkt: string;
  projection: string;
  xYUnits: string;
  bodyFrame: string;
  bodyRadiusMeters: number;
  ellipsoid: {
    semiMajorAxisMeters: number;
    semiMinorAxisMeters: number;
  };
  pixelRegistration: string;
  outputTransform: number[];
  outputSpacingMeters: number;
  outputSpacingMetersXY: {
    x: number;
    y: number;
  };
  width: number;
  height: number;
}

export interface TerrainManifestBrowserGrid {
  path: string;
  width: number;
  height: number;
  dtype: string;
  byteOrder: string;
  actualSpacingMeters: number;
  actualSpacingMetersXY: {
    x: number;
    y: number;
  };
  resamplingMethod: string;
  nodataEncoding: string;
  validSampleCount: number;
}

export interface TerrainManifestQuality {
  path: string;
  countMapPresent: boolean;
  status: string;
  alignmentMethod: string;
  countSemantics: string;
  countZeroMeaning: string;
  countNaNMeaning: string;
}

export interface TerrainManifestStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  validSampleCount: number;
  noDataSampleCount: number;
}

export interface TerrainManifestOutputItem {
  key: string;
  path: string;
  sizeBytes: number;
  sha256: string;
}

export interface TerrainManifestIntegrity {
  outputs: TerrainManifestOutputItem[];
}

export interface TerrainManifest {
  schemaVersion: number;
  site: TerrainManifestSite;
  crop: TerrainManifestCrop;
  sourceProduct: {
    title: string;
    version: string;
    page: string;
    demUrl: string;
    countMapUrl: string;
    citation: string;
  };
  geodesy: TerrainManifestGeodesy;
  vertical: {
    units: string;
    sourceNodata: string;
    outputNodata: string;
    scale: number;
    offset: number;
    validSamplePercentage: number;
    noDataPercentage: number;
  };
  browserGrid: TerrainManifestBrowserGrid;
  quality: TerrainManifestQuality;
  statistics: TerrainManifestStatistics;
  integrity: TerrainManifestIntegrity;
  warnings: string[];
  paths: {
    demNativeCrop: string;
    heightmap10m: string;
    qualityCounts10m: string;
    validityMask10m: string;
    previewImage: string;
    manifest: string;
  };
}

export interface PreparedTerrainGrid {
  siteKey: string;
  siteCoordinates: {
    latitude: number;
    longitude: number;
  };
  cropBounds: {
    left: number;
    right: number;
    bottom: number;
    top: number;
    widthMeters: number;
    heightMeters: number;
  };
  gridWidth: number;
  gridHeight: number;
  actualSpacingMeters: number;
  elevations: Float32Array;
  validityMask: Uint8Array;
  minElevation: number;
  maxElevation: number;
  meanElevation: number;
  geodesy: TerrainManifestGeodesy;
  sourceProduct: {
    title: string;
    version: string;
    citation: string;
  };
  warnings: string[];
}

export type TerrainViewMode = "global-moon" | "local-terrain";
export type TerrainLayerStyle = "hillshade" | "elevation-color" | "wireframe";
export type CameraPreset = "top" | "oblique" | "ground";

export interface TerrainStatusState {
  code:
    | "not-loaded"
    | "loading-manifest"
    | "loading-heightmap"
    | "generating-mesh"
    | "ready"
    | "out-of-coverage"
    | "package-not-prepared"
    | "error";
  message: string;
  detail?: string;
}

/**
 * Analytical forward polar stereographic projection on spherical Moon (radius R = 1,737,400 m).
 * Valid for South-polar stereographic with latitude_of_origin = -90, central_meridian = 0.
 */
export function lunarLatLonToProjectedMeters(
  latitudeDegrees: number,
  longitudeDegrees: number,
  bodyRadiusMeters = 1737400.0,
): { x: number; y: number } {
  // Colatitude in radians from South Pole (-90 degrees)
  const colatRad = ((90.0 + latitudeDegrees) * Math.PI) / 180.0;
  const lonRad = (longitudeDegrees * Math.PI) / 180.0;

  // Polar stereographic distance from pole
  const r = 2.0 * bodyRadiusMeters * Math.tan(colatRad / 2.0);

  // With central meridian = 0: x = r * sin(lon), y = r * cos(lon)
  const x = r * Math.sin(lonRad);
  const y = r * Math.cos(lonRad);

  return { x, y };
}

/**
 * Analytical inverse polar stereographic projection from projected meters to lunar lon/lat degrees.
 */
export function projectedMetersToLunarLatLon(
  x: number,
  y: number,
  bodyRadiusMeters = 1737400.0,
): { latitude: number; longitude: number } {
  const r = Math.hypot(x, y);
  if (r === 0) {
    return { latitude: -90.0, longitude: 0.0 };
  }

  const lonRad = Math.atan2(x, y);
  const colatRad = 2.0 * Math.atan(r / (2.0 * bodyRadiusMeters));
  const latRad = colatRad - Math.PI / 2.0;

  let lonDeg = (lonRad * 180.0) / Math.PI;
  // Normalize lonDeg to [-180, 180]
  if (lonDeg > 180.0) lonDeg -= 360.0;
  if (lonDeg < -180.0) lonDeg += 360.0;

  const latDeg = (latRad * 180.0) / Math.PI;

  return { latitude: latDeg, longitude: lonDeg };
}

/**
 * Checks whether a given lunar coordinate falls inside the manifest's crop footprint.
 */
export function isCoordinateInsideCrop(
  latitude: number,
  longitude: number,
  crop: TerrainManifestCrop,
  bodyRadiusMeters = 1737400.0,
): boolean {
  const { x, y } = lunarLatLonToProjectedMeters(latitude, longitude, bodyRadiusMeters);
  return x >= crop.left && x <= crop.right && y >= crop.bottom && y <= crop.top;
}

/**
 * Canonical site key formatter matching the Phase 34 Python implementation:
 * f"site_{abs(latitude):05.2f}{lat_dir}_{abs(longitude):05.2f}{lon_dir}".replace(".", "_").replace("-", "")
 */
export function computeSiteKey(latitude: number, longitude: number): string {
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  const latAbs = Math.abs(latitude).toFixed(2).padStart(5, "0").replace(".", "_");
  const lonAbs = Math.abs(longitude).toFixed(2).padStart(5, "0").replace(".", "_");
  return `site_${latAbs}${latDir}_${lonAbs}${lonDir}`;
}
