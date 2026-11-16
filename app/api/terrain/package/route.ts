import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_TYPES: Record<string, { filename: string; contentType: string }> = {
  manifest: { filename: "terrain-manifest.json", contentType: "application/json" },
  heightmap: { filename: "heightmap-10m.f32", contentType: "application/octet-stream" },
  quality: { filename: "quality-counts-10m.f32", contentType: "application/octet-stream" },
  mask: { filename: "validity-mask-10m.bin", contentType: "application/octet-stream" },
  preview: { filename: "terrain-preview.png", contentType: "image/png" },
};

const DEFAULT_SITE = "site_89_50S_00_00E";

/**
 * Resolves the canonical directory containing processed terrain packages.
 * Checks multiple standard project roots to ensure rock-solid discovery regardless
 * of the server process starting directory (e.g. repo root vs subfolder).
 */
export function resolvePackageDir(site: string): string {
  const customRoot = process.env.LOLA_PROCESSED_DATA_DIR;
  const candidateDirs: string[] = [];

  if (customRoot) {
    candidateDirs.push(path.resolve(customRoot, site));
  }

  candidateDirs.push(
    path.resolve(process.cwd(), "data", "lunar-terrain", "processed", site),
    path.resolve(process.cwd(), "lunar-mission-planner", "data", "lunar-terrain", "processed", site),
  );

  // Additional fallbacks for nested or monorepo execution
  candidateDirs.push(
    path.resolve(process.cwd(), "..", "data", "lunar-terrain", "processed", site),
    path.resolve(process.cwd(), "..", "lunar-mission-planner", "data", "lunar-terrain", "processed", site)
  );

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  // Default to candidate 0 if not yet existing on disk
  return candidateDirs[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "manifest";
  const site = searchParams.get("site") || DEFAULT_SITE;

  // Validate site key format and prevent path traversal
  if (!/^[a-zA-Z0-9_]+$/.test(site) || site.includes("..") || site.length > 64) {
    return NextResponse.json(
      {
        code: "INVALID_SITE_KEY",
        error: "Invalid site identifier format",
        siteKey: site,
      },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const fileConfig = ALLOWED_TYPES[type];
  if (!fileConfig) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST_TYPE",
        error: `Unknown asset type '${type}'. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}`,
        siteKey: site,
      },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const processedDir = resolvePackageDir(site);
  const targetFile = path.join(processedDir, fileConfig.filename);

  // Strict path traversal containment check
  const resolvedTarget = path.resolve(targetFile);
  const resolvedBase = path.resolve(processedDir);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    return NextResponse.json(
      {
        code: "PATH_TRAVERSAL_REJECTED",
        error: "Access denied: target path escapes package directory",
        siteKey: site,
      },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  // Parse site latitude from siteKey if available (e.g. site_09_00S_10_00E -> lat = -9.0)
  let parsedLat: number | null = null;
  const siteMatch = site.match(/^site_(\d{2})_(\d{2})([NS])_/);
  if (siteMatch) {
    const deg = parseInt(siteMatch[1], 10) + parseInt(siteMatch[2], 10) / 100;
    parsedLat = siteMatch[3] === "S" ? -deg : deg;
  }

  // Check file existence
  if (!fs.existsSync(resolvedTarget)) {
    const isManifest = type === "manifest";
    let failureCode = "PACKAGE_NOT_FOUND";
    let explanation = `Terrain package or asset '${fileConfig.filename}' not found for site '${site}'`;

    if (parsedLat !== null && parsedLat > -87.0) {
      failureCode = "OUTSIDE_DATA_COVERAGE";
      explanation = `Site '${site}' (${parsedLat.toFixed(2)}°) is outside the verified NASA South Pole LOLA 87S DEM coverage region (87° S to 90° S).`;
    } else if (isManifest && !fs.existsSync(processedDir)) {
      failureCode = "PACKAGE_NOT_PREPARED";
      explanation = `Local terrain crop has not been prepared for site '${site}'. The verified Phase 34 package is available for site_89_50S_00_00E (-89.50° S, 0.00° E).`;
    } else if (isManifest) {
      failureCode = "MANIFEST_NOT_FOUND";
      explanation = `Package directory exists for '${site}', but terrain-manifest.json was not found.`;
    } else {
      failureCode = "ASSET_NOT_FOUND";
      explanation = `Manifest exists, but referenced asset '${fileConfig.filename}' was not found on disk.`;
    }

    return NextResponse.json(
      {
        code: failureCode,
        error: explanation,
        message: explanation,
        siteKey: site,
        requestedType: type,
        missingFiles: [fileConfig.filename],
        availableTestSite: "site_89_50S_00_00E",
      },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  try {
    const stat = fs.statSync(resolvedTarget);
    const fileSize = stat.size;

    // 1. Process Manifest Request
    if (fileConfig.contentType === "application/json") {
      let jsonContent: Record<string, unknown>;
      try {
        const fileContent = fs.readFileSync(resolvedTarget, "utf-8");
        jsonContent = JSON.parse(fileContent) as Record<string, unknown>;
      } catch (err) {
        return NextResponse.json(
          {
            code: "MANIFEST_INVALID",
            error: "Failed to parse terrain manifest JSON",
            message: err instanceof Error ? err.message : String(err),
            siteKey: site,
          },
          { status: 422, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }

      // Check schema version
      if (jsonContent.schemaVersion !== 1) {
        return NextResponse.json(
          {
            code: "MANIFEST_INVALID",
            error: `Unsupported manifest schema version: ${jsonContent.schemaVersion}`,
            siteKey: site,
          },
          { status: 422, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }

      // Check site identity: reject if requested site does not match manifest site
      const manifestSite = jsonContent.site as { siteKey?: string } | undefined;
      if (manifestSite?.siteKey && manifestSite.siteKey !== site) {
        return NextResponse.json(
          {
            code: "SITE_MISMATCH",
            error: `Manifest siteKey '${manifestSite.siteKey}' does not match requested site '${site}'`,
            siteKey: site,
            manifestSiteKey: manifestSite.siteKey,
          },
          { status: 409, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }

      // Validate referenced heightmap file on disk
      const heightmapFile = path.join(processedDir, "heightmap-10m.f32");
      if (!fs.existsSync(heightmapFile)) {
        return NextResponse.json(
          {
            code: "ASSET_NOT_FOUND",
            error: "Manifest references heightmap-10m.f32, but it is missing on disk",
            siteKey: site,
            missingFiles: ["heightmap-10m.f32"],
          },
          { status: 422, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }

      const gridInfo = jsonContent.browserGrid as { width?: number; height?: number } | undefined;
      if (gridInfo?.width && gridInfo?.height) {
        const expectedBytes = gridInfo.width * gridInfo.height * 4;
        const actualBytes = fs.statSync(heightmapFile).size;
        if (actualBytes !== expectedBytes) {
          return NextResponse.json(
            {
              code: "ASSET_INVALID",
              error: `Heightmap byte size mismatch: expected ${expectedBytes} bytes, got ${actualBytes} bytes`,
              siteKey: site,
            },
            { status: 422, headers: { "Cache-Control": "no-store, max-age=0" } }
          );
        }
      }

      // Tag manifest with verified status
      jsonContent.status = "PACKAGE_AVAILABLE";
      jsonContent.packageStatus = "PACKAGE_AVAILABLE";

      // Sanitize Windows backslashes in all string path values to forward slashes
      const sanitizePaths = (obj: unknown): unknown => {
        if (typeof obj === "string") {
          return obj.replace(/\\/g, "/");
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizePaths);
        }
        if (obj !== null && typeof obj === "object") {
          const res: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            res[k] = sanitizePaths(v);
          }
          return res;
        }
        return obj;
      };

      const sanitizedManifest = sanitizePaths(jsonContent);

      return NextResponse.json(sanitizedManifest, {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    // 2. Process Binary / Image Requests with Byte-Range support
    const rangeHeader = req.headers.get("range");
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (
        isNaN(start) ||
        start < 0 ||
        start >= fileSize ||
        (parts[1] && (isNaN(end) || end < start || end >= fileSize))
      ) {
        return new Response("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkLength = end - start + 1;
      const buffer = Buffer.alloc(chunkLength);
      const fd = fs.openSync(resolvedTarget, "r");
      fs.readSync(fd, buffer, 0, chunkLength, start);
      fs.closeSync(fd);

      return new Response(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkLength.toString(),
          "Content-Type": fileConfig.contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Full file response
    const fileBuffer = fs.readFileSync(resolvedTarget);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": fileConfig.contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error reading terrain file";
    return NextResponse.json(
      { code: "SERVER_ERROR", error: message, siteKey: site },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
