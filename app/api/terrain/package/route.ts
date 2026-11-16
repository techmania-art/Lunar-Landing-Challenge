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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "manifest";
  const site = searchParams.get("site") || DEFAULT_SITE;

  // Prevent path traversal
  if (!/^[a-zA-Z0-9_]+$/.test(site)) {
    return NextResponse.json({ error: "Invalid site identifier" }, { status: 400 });
  }

  const fileConfig = ALLOWED_TYPES[type];
  if (!fileConfig) {
    return NextResponse.json(
      { error: `Unknown type '${type}'. Allowed: ${Object.keys(ALLOWED_TYPES).join(", ")}` },
      { status: 400 }
    );
  }

  const processedDir = path.resolve(process.cwd(), "data", "lunar-terrain", "processed", site);
  const targetFile = path.join(processedDir, fileConfig.filename);

  if (!fs.existsSync(targetFile)) {
    return NextResponse.json(
      { error: `Terrain asset not found for site '${site}' (${fileConfig.filename})` },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = fs.readFileSync(targetFile);

    if (fileConfig.contentType === "application/json") {
      const jsonContent = JSON.parse(fileBuffer.toString("utf-8"));
      return NextResponse.json(jsonContent, {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": fileConfig.contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error reading terrain file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
