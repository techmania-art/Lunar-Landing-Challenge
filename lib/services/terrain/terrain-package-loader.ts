import {
  type TerrainManifest,
  type PreparedTerrainGrid,
  isCoordinateInsideCrop,
} from "./terrain-package-types";

export class TerrainLoadError extends Error {
  code: string;
  constructor(message: string, code = "LOAD_ERROR") {
    super(message);
    this.name = "TerrainLoadError";
    this.code = code;
  }
}

/**
 * Fetch and parse the verified Phase 34 terrain manifest.
 */
export async function fetchTerrainManifest(
  siteKey = "site_89_50S_00_00E",
  signal?: AbortSignal,
): Promise<TerrainManifest> {
  const response = await fetch(`/api/terrain/package?type=manifest&site=${encodeURIComponent(siteKey)}`, {
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new TerrainLoadError(
        `Prepared terrain package unavailable for site '${siteKey}'`,
        "SITE_UNAVAILABLE",
      );
    }
    throw new TerrainLoadError(
      `Failed to load terrain manifest: HTTP ${response.status} ${response.statusText}`,
      "NETWORK_ERROR",
    );
  }

  let manifest: TerrainManifest;
  try {
    manifest = (await response.json()) as TerrainManifest;
  } catch (err) {
    throw new TerrainLoadError(
      `Manifest response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      "INVALID_MANIFEST_JSON",
    );
  }

  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    !manifest.site ||
    typeof manifest.site.siteKey !== "string" ||
    !manifest.crop ||
    !Number.isFinite(manifest.crop.left) ||
    !Number.isFinite(manifest.crop.right) ||
    !manifest.browserGrid ||
    manifest.browserGrid.width <= 0 ||
    manifest.browserGrid.height <= 0 ||
    manifest.browserGrid.actualSpacingMeters <= 0 ||
    !manifest.geodesy ||
    manifest.geodesy.bodyRadiusMeters < 1_700_000
  ) {
    throw new TerrainLoadError(
      "Invalid or corrupted terrain manifest schema: required fields missing or out of valid bounds",
      "INVALID_MANIFEST",
    );
  }

  return manifest;
}

/**
 * Fetch and decode binary elevation and validity samples into a typed PreparedTerrainGrid.
 */
export async function loadPreparedTerrainGrid(
  manifest: TerrainManifest,
  signal?: AbortSignal,
): Promise<PreparedTerrainGrid> {
  const siteKey = manifest.site.siteKey;
  const width = manifest.browserGrid.width;
  const height = manifest.browserGrid.height;
  const expectedBytes = width * height * 4; // Float32: 4 bytes per sample

  // 1. Fetch binary heightmap
  const heightResponse = await fetch(
    `/api/terrain/package?type=heightmap&site=${encodeURIComponent(siteKey)}`,
    { signal },
  );

  if (!heightResponse.ok) {
    throw new TerrainLoadError(
      `Failed to load binary heightmap: HTTP ${heightResponse.status}`,
      "HEIGHTMAP_FETCH_FAILED",
    );
  }

  const heightBuffer = await heightResponse.arrayBuffer();
  if (heightBuffer.byteLength !== expectedBytes) {
    throw new TerrainLoadError(
      `Heightmap byte length mismatch: expected ${expectedBytes} bytes, received ${heightBuffer.byteLength} bytes`,
      "BYTE_LENGTH_MISMATCH",
    );
  }

  // 2. Fetch binary validity mask
  const maskResponse = await fetch(
    `/api/terrain/package?type=mask&site=${encodeURIComponent(siteKey)}`,
    { signal },
  );

  let validityMask: Uint8Array;
  if (maskResponse.ok) {
    const maskBuffer = await maskResponse.arrayBuffer();
    if (maskBuffer.byteLength === width * height) {
      validityMask = new Uint8Array(maskBuffer);
    } else {
      validityMask = new Uint8Array(width * height).fill(1);
    }
  } else {
    validityMask = new Uint8Array(width * height).fill(1);
  }

  // 3. Decode Float32 elevations
  const rawElevations = new Float32Array(heightBuffer);
  const scale = manifest.vertical.scale ?? 1.0;
  const offset = manifest.vertical.offset ?? 0.0;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let validCount = 0;

  for (let i = 0; i < rawElevations.length; i++) {
    let val = rawElevations[i];
    if (Number.isFinite(val) && validityMask[i] === 1) {
      // Apply scale and offset exactly once
      val = val * scale + offset;
      rawElevations[i] = val;
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
      validCount++;
    } else {
      validityMask[i] = 0; // Mark invalid / NoData
      rawElevations[i] = Number.NaN;
    }
  }

  if (validCount === 0) {
    throw new TerrainLoadError(
      "No valid elevation samples found in the prepared crop",
      "NO_VALID_SAMPLES",
    );
  }

  return {
    siteKey,
    siteCoordinates: {
      latitude: manifest.site.latitudeDegrees,
      longitude: manifest.site.longitudeDegrees,
    },
    cropBounds: { ...manifest.crop },
    gridWidth: width,
    gridHeight: height,
    actualSpacingMeters: manifest.browserGrid.actualSpacingMeters,
    elevations: rawElevations,
    validityMask,
    minElevation: min,
    maxElevation: max,
    meanElevation: sum / validCount,
    geodesy: manifest.geodesy,
    sourceProduct: {
      title: manifest.sourceProduct.title,
      version: manifest.sourceProduct.version,
      citation: manifest.sourceProduct.citation,
    },
    warnings: manifest.warnings || [],
  };
}

export { isCoordinateInsideCrop };
