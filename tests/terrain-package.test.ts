import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import {
  type TerrainManifest,
  type PreparedTerrainGrid,
  lunarLatLonToProjectedMeters,
  projectedMetersToLunarLatLon,
  isCoordinateInsideCrop,
  computeSiteKey,
} from "@/lib/services/terrain/terrain-package-types";
import {
  buildTerrainMeshData,
} from "@/lib/services/terrain/terrain-mesh-builder";
import {
  GET,
  resolvePackageDir,
} from "@/app/api/terrain/package/route";

describe("Phase 35: Prepared LOLA Terrain Package and Mesh Builder Unit Tests", () => {
  const manifestPath = path.resolve(
    process.cwd(),
    "data/lunar-terrain/processed/site_89_50S_00_00E/terrain-manifest.json"
  );

  it("loads and validates the verified Phase 34 terrain manifest", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as TerrainManifest;

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.site.latitudeDegrees).toBe(-89.5);
    expect(manifest.site.longitudeDegrees).toBe(0.0);
    expect(manifest.site.siteKey).toBe("site_89_50S_00_00E");
    expect(manifest.crop.widthMeters).toBe(10000.0);
    expect(manifest.crop.heightMeters).toBe(10000.0);
    expect(manifest.browserGrid.width).toBe(1000);
    expect(manifest.browserGrid.height).toBe(1000);
    expect(manifest.browserGrid.actualSpacingMeters).toBe(10.0);
    expect(manifest.browserGrid.dtype).toBe("float32");
    expect(manifest.browserGrid.byteOrder).toBe("little-endian");
    expect(manifest.vertical.units).toBe("metres");
    expect(manifest.vertical.scale).toBe(1.0);
    expect(manifest.vertical.offset).toBe(0.0);
    expect(manifest.vertical.validSamplePercentage).toBe(100.0);
  });

  it("verifies all output files referenced by the manifest exist with exact byte counts", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as TerrainManifest;

    const baseDir = path.resolve(process.cwd());
    for (const item of manifest.integrity.outputs) {
      const fullPath = path.join(baseDir, item.path);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBe(item.sizeBytes);
    }
  });

  it("converts South-Polar Stereographic coordinates with sub-millimeter precision", () => {
    const bodyRadius = 1737400.0;
    // Known center point: (-89.5 degrees, 0.0 degrees)
    const { x, y } = lunarLatLonToProjectedMeters(-89.5, 0.0, bodyRadius);
    expect(x).toBeCloseTo(0.0, 4);
    // At lat = -89.5, colat = 0.5 deg. r = 2 * R * tan(0.25 deg) = 15161.7714 m
    expect(y).toBeCloseTo(15161.7714, 3);

    // Inverse projection check
    const { latitude, longitude } = projectedMetersToLunarLatLon(x, y, bodyRadius);
    expect(latitude).toBeCloseTo(-89.5, 6);
    expect(longitude).toBeCloseTo(0.0, 6);
  });

  it("correctly classifies whether points are inside or outside the 10 km crop footprint", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as TerrainManifest;

    // Center of crop: (-89.5, 0)
    expect(isCoordinateInsideCrop(-89.5, 0.0, manifest.crop)).toBe(true);

    // Just inside edges
    expect(isCoordinateInsideCrop(-89.4, 0.0, manifest.crop)).toBe(true);
    expect(isCoordinateInsideCrop(-89.6, 0.0, manifest.crop)).toBe(true);

    // Completely outside: equatorial point (-12.25, 10.5)
    expect(isCoordinateInsideCrop(-12.25, 10.5, manifest.crop)).toBe(false);

    // Other side of pole
    expect(isCoordinateInsideCrop(-85.0, 0.0, manifest.crop)).toBe(false);
  });

  it("decodes binary elevation buffer and constructs non-flat 3D surface mesh", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as TerrainManifest;

    const heightPath = path.resolve(process.cwd(), manifest.paths.heightmap10m);
    const heightBuf = fs.readFileSync(heightPath);
    expect(heightBuf.byteLength).toBe(1000 * 1000 * 4);

    const elevations = new Float32Array(
      heightBuf.buffer,
      heightBuf.byteOffset,
      heightBuf.byteLength / 4
    );
    const validityMask = new Uint8Array(1000 * 1000).fill(1);

    const grid: PreparedTerrainGrid = {
      siteKey: manifest.site.siteKey,
      siteCoordinates: {
        latitude: manifest.site.latitudeDegrees,
        longitude: manifest.site.longitudeDegrees,
      },
      cropBounds: { ...manifest.crop },
      gridWidth: 1000,
      gridHeight: 1000,
      actualSpacingMeters: 10.0,
      elevations,
      validityMask,
      minElevation: manifest.statistics.min,
      maxElevation: manifest.statistics.max,
      meanElevation: manifest.statistics.mean,
      geodesy: manifest.geodesy,
      sourceProduct: {
        title: manifest.sourceProduct.title,
        version: manifest.sourceProduct.version,
        citation: manifest.sourceProduct.citation,
      },
      warnings: manifest.warnings,
    };

    // Build mesh with stride = 10 (100x100 grid for fast unit test)
    const mesh = buildTerrainMeshData(grid, { stride: 10, chunkSize: 50, verticalExaggeration: 1.0 });

    expect(mesh.totalVertices).toBeGreaterThan(0);
    expect(mesh.totalTriangles).toBeGreaterThan(0);
    expect(mesh.chunks.length).toBeGreaterThan(0);

    // Verify elevations show actual physical relief (non-flat)
    expect(mesh.maxElevation - mesh.minElevation).toBeGreaterThan(500); // Crater relief > 500m

    // Verify all positions, normals, and UVs are finite numbers
    for (const chunk of mesh.chunks) {
      expect(chunk.positions.length).toBeGreaterThan(0);
      expect(chunk.normals.length).toBe(chunk.positions.length);
      expect(chunk.indices.length).toBeGreaterThan(0);

      for (let i = 0; i < chunk.positions.length; i += 3) {
        const px = chunk.positions[i];
        const py = chunk.positions[i + 1];
        const pz = chunk.positions[i + 2];
        expect(Number.isFinite(px)).toBe(true);
        expect(Number.isFinite(py)).toBe(true);
        expect(Number.isFinite(pz)).toBe(true);

        // Distance from Moon center must be close to Moon radius (1,737,400m +/- 2000m)
        const dist = Math.hypot(px, py, pz);
        expect(dist).toBeGreaterThan(1730000);
        expect(dist).toBeLessThan(1745000);

        // Verify normals point outward
        const nx = chunk.normals[i];
        const ny = chunk.normals[i + 1];
        const nz = chunk.normals[i + 2];
        const dot = px * nx + py * ny + pz * nz;
        expect(dot).toBeGreaterThan(0); // Outward facing
      }

      // Check index bounds
      const numVerts = chunk.positions.length / 3;
      for (let j = 0; j < chunk.indices.length; j++) {
        expect(chunk.indices[j]).toBeLessThan(numVerts);
      }
    }
  });

  it("excludes triangles bridging NoData gaps without creating zero-elevation spikes", () => {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as TerrainManifest;

    // Create a small 10x10 mock grid with a NoData hole at center
    const width = 10;
    const height = 10;
    const elevations = new Float32Array(width * height).fill(-700);
    const validityMask = new Uint8Array(width * height).fill(1);

    // Punch a NoData hole
    validityMask[5 * width + 5] = 0;
    elevations[5 * width + 5] = Number.NaN;

    const mockGrid: PreparedTerrainGrid = {
      siteKey: "test",
      siteCoordinates: { latitude: -89.5, longitude: 0 },
      cropBounds: { ...manifest.crop },
      gridWidth: width,
      gridHeight: height,
      actualSpacingMeters: 10.0,
      elevations,
      validityMask,
      minElevation: -750,
      maxElevation: -650,
      meanElevation: -700,
      geodesy: {
        ...manifest.geodesy,
        width,
        height,
        outputTransform: [10, 0, -50, 0, -10, 50, 0, 0, 1],
      },
      sourceProduct: { title: "Test", version: "1.0", citation: "" },
      warnings: [],
    };

    const mesh = buildTerrainMeshData(mockGrid, { stride: 1, chunkSize: 10 });
    // In a 10x10 grid, full quads = 9 * 9 = 81 quads = 162 triangles
    // A single vertex hole touches 4 quads = 8 triangles that must be excluded
    const expectedTriangles = 162 - 8;
    expect(mesh.totalTriangles).toBe(expectedTriangles);
  });

  describe("Site Key Generation & Equivalency Contract", () => {
    it("maps -89.5, 0.0 to site_89_50S_00_00E", () => {
      expect(computeSiteKey(-89.5, 0.0)).toBe("site_89_50S_00_00E");
    });

    it("produces identical keys for equivalent floating-point representations", () => {
      expect(computeSiteKey(-89.500000, 0.000000)).toBe("site_89_50S_00_00E");
      expect(computeSiteKey(-89.501, 0.001)).toBe("site_89_50S_00_00E");
    });

    it("correctly handles various quadrant conventions", () => {
      expect(computeSiteKey(89.5, -45.2)).toBe("site_89_50N_45_20W");
      expect(computeSiteKey(0.0, 0.0)).toBe("site_00_00N_00_00E");
      expect(computeSiteKey(-12.34, 179.99)).toBe("site_12_34S_179_99E");
    });
  });

  describe("API Route: /api/terrain/package Discovery & Delivery", () => {
    it("resolves canonical package directory regardless of process.cwd variation", () => {
      const resolved = resolvePackageDir("site_89_50S_00_00E");
      expect(resolved).toBeDefined();
      expect(fs.existsSync(resolved)).toBe(true);
      expect(fs.existsSync(path.join(resolved, "terrain-manifest.json"))).toBe(true);
    });

    it("serves valid JSON manifest with sanitized forward-slash paths and cache headers", async () => {
      const req = new NextRequest("http://localhost:3000/api/terrain/package?type=manifest&site=site_89_50S_00_00E");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("public");

      const data = await res.json();
      expect(data.schemaVersion).toBe(1);
      expect(data.site.siteKey).toBe("site_89_50S_00_00E");
      // Verify backslashes are sanitized
      expect(data.browserGrid.path).not.toContain("\\");
      expect(data.browserGrid.path).toContain("/");
    });

    it("returns HTTP 404 with PACKAGE_NOT_FOUND for non-existent sites", async () => {
      const req = new NextRequest("http://localhost:3000/api/terrain/package?type=manifest&site=site_00_00N_00_00E");
      const res = await GET(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.code).toBe("PACKAGE_NOT_FOUND");
      expect(data.siteKey).toBe("site_00_00N_00_00E");
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });

    it("returns HTTP 400 with INVALID_SITE_KEY for malformed site identifiers", async () => {
      const req = new NextRequest("http://localhost:3000/api/terrain/package?type=manifest&site=../../etc/passwd");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_SITE_KEY");
    });

    it("returns HTTP 400 with INVALID_REQUEST_TYPE for unsupported asset types", async () => {
      const req = new NextRequest("http://localhost:3000/api/terrain/package?type=unknown_type&site=site_89_50S_00_00E");
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe("INVALID_REQUEST_TYPE");
    });

    it("supports HTTP 206 Partial Content byte-range requests for binary heightmap", async () => {
      const req = new NextRequest("http://localhost:3000/api/terrain/package?type=heightmap&site=site_89_50S_00_00E", {
        headers: {
          Range: "bytes=0-1023",
        },
      });
      const res = await GET(req);

      expect(res.status).toBe(206);
      expect(res.headers.get("Accept-Ranges")).toBe("bytes");
      expect(res.headers.get("Content-Range")).toBe("bytes 0-1023/4000000");
      expect(res.headers.get("Content-Length")).toBe("1024");
      const buf = await res.arrayBuffer();
      expect(buf.byteLength).toBe(1024);
    });
  });
});
