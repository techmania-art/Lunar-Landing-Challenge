import { NextResponse } from "next/server";
import { analyzeRouteTerrain } from "@/lib/services/terrain/terrain-calculator";
import type { TerrainAnalysisRequest } from "@/lib/services/terrain/terrain-types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TerrainAnalysisRequest;

    if (!body || !body.route || !Array.isArray(body.route.coordinates)) {
      return NextResponse.json(
        { error: "Invalid request: 'route.coordinates' array is required." },
        { status: 400 }
      );
    }

    const coords = body.route.coordinates;
    if (coords.length < 2) {
      return NextResponse.json(
        { error: "Invalid request: At least two coordinates (start and end) are required." },
        { status: 400 }
      );
    }

    for (const c of coords) {
      if (
        !Number.isFinite(c.latitude) ||
        !Number.isFinite(c.longitude) ||
        c.latitude < -90 ||
        c.latitude > 90 ||
        c.longitude < -180 ||
        c.longitude > 180
      ) {
        return NextResponse.json(
          {
            error: `Malformed coordinate: latitude must be in [-90, 90] and longitude in [-180, 180]. Received (${c.latitude}, ${c.longitude}).`,
          },
          { status: 400 }
        );
      }
    }

    const result = analyzeRouteTerrain(body);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process terrain analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
