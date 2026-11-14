import { NextRequest, NextResponse } from "next/server";

const ALLOWED_LAYERS = new Set([
  "luna_wac_global",
  "luna_wac_dtm",
  "luna_wac_normalized_reflectance",
  "luna_clem_ratio",
  "luna_clem750",
  "luna_shaded_relief",
  "luna_lo",
]);

const ALLOWED_SRS = new Set(["EPSG:4326", "EPSG:3857"]);
const ALLOWED_FORMATS = new Set(["image/jpeg", "image/png"]);
const UPSTREAM_WMS_ENDPOINT = "https://wms.im-ldi.com/";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const layer = searchParams.get("LAYERS") ?? searchParams.get("layers") ?? "luna_wac_global";
  const srs = searchParams.get("SRS") ?? searchParams.get("srs") ?? "EPSG:4326";
  const bbox = searchParams.get("BBOX") ?? searchParams.get("bbox");
  const widthStr = searchParams.get("WIDTH") ?? searchParams.get("width") ?? "800";
  const heightStr = searchParams.get("HEIGHT") ?? searchParams.get("height") ?? "600";
  const format = searchParams.get("FORMAT") ?? searchParams.get("format") ?? "image/jpeg";

  if (!ALLOWED_LAYERS.has(layer)) {
    return NextResponse.json(
      {
        error: `Layer '${layer}' is not in the allowlist of verified LROC layers.`,
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_SRS.has(srs)) {
    return NextResponse.json(
      {
        error: `SRS '${srs}' is not supported. Use EPSG:4326.`,
      },
      { status: 400 }
    );
  }

  if (!ALLOWED_FORMATS.has(format)) {
    return NextResponse.json(
      {
        error: `Format '${format}' is not supported. Use image/jpeg or image/png.`,
      },
      { status: 400 }
    );
  }

  const width = Math.min(Math.max(10, Number(widthStr) || 800), 2048);
  const height = Math.min(Math.max(10, Number(heightStr) || 600), 2048);

  const upstreamParams = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: layer,
    STYLES: "",
    SRS: srs,
    BBOX: bbox || "-180,-90,180,90",
    WIDTH: width.toString(),
    HEIGHT: height.toString(),
    FORMAT: format,
  });

  const upstreamUrl = `${UPSTREAM_WMS_ENDPOINT}?${upstreamParams.toString()}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        Accept: format,
        "User-Agent": "LunarMissionPlanner/1.0 (LROC Map Proxy)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: `Upstream LROC server returned status ${upstreamRes.status} (${upstreamRes.statusText})`,
        },
        { status: 502 }
      );
    }

    const contentType = upstreamRes.headers.get("content-type") || format;

    // Check if upstream returned an XML exception or HTML error with HTTP 200
    if (contentType.includes("xml") || contentType.includes("html")) {
      const errText = await upstreamRes.text();
      return NextResponse.json(
        {
          error: "Upstream LROC service returned an XML/HTML exception instead of map image bytes.",
          details: errText.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const imageBytes = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: `Failed to fetch map imagery from LROC upstream: ${(err as Error)?.message}`,
      },
      { status: 504 }
    );
  }
}

