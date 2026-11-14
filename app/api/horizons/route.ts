import { NextRequest, NextResponse } from "next/server";
import { parseLunarCoordinates } from "@/lib/coordinates/coordinate-transform";
import { queryMissionEphemerides } from "@/lib/services/horizons/horizons-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonStr = searchParams.get("lon") ?? searchParams.get("longitude");
  const dateStr = searchParams.get("date") ?? searchParams.get("missionDate") ?? "2028-01-15";
  const timeStr = searchParams.get("time") ?? searchParams.get("missionTimeUtc") ?? "12:00";

  if (!latStr || !lonStr) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required query parameters: 'lat' and 'lon'.",
      },
      { status: 400 }
    );
  }

  const coordResult = parseLunarCoordinates(latStr, lonStr);
  if (!coordResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: coordResult.error,
      },
      { status: 400 }
    );
  }

  const result = await queryMissionEphemerides(
    coordResult.data,
    dateStr,
    timeStr
  );

  const status = result.success ? 200 : 502;
  return NextResponse.json(result, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const latStr = String(body.latitude ?? body.lat ?? "");
    const lonStr = String(body.longitude ?? body.lon ?? "");
    const dateStr = String(body.missionDate ?? body.date ?? "2028-01-15");
    const timeStr = String(body.missionTimeUtc ?? body.time ?? "12:00");

    const coordResult = parseLunarCoordinates(latStr, lonStr);
    if (!coordResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: coordResult.error,
        },
        { status: 400 }
      );
    }

    const result = await queryMissionEphemerides(
      coordResult.data,
      dateStr,
      timeStr
    );

    const status = result.success ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: `Malformed request payload: ${(err as Error)?.message}`,
      },
      { status: 400 }
    );
  }
}
