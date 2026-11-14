import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runDiagnostics = searchParams.get("diagnostics") === "true";

  const basicHealth = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "Lunar Mission Planner",
  };

  if (!runDiagnostics) {
    return NextResponse.json(basicHealth, { status: 200 });
  }

  // Controlled, bounded upstream diagnostic checks
  const checkHorizons = async (): Promise<"reachable" | "unavailable"> => {
    try {
      const res = await fetch("https://ssd-api.jpl.nasa.gov/horizons.api?format=json", {
        signal: AbortSignal.timeout(3000),
      });
      return res.status < 500 ? "reachable" : "unavailable";
    } catch {
      return "unavailable";
    }
  };

  const checkLroc = async (): Promise<"reachable" | "unavailable"> => {
    try {
      const res = await fetch("https://wms.im-ldi.com/?SERVICE=WMS&REQUEST=GetCapabilities", {
        signal: AbortSignal.timeout(3000),
      });
      return res.status < 500 ? "reachable" : "unavailable";
    } catch {
      return "unavailable";
    }
  };

  const [horizonsStatus, lrocStatus] = await Promise.all([
    checkHorizons(),
    checkLroc(),
  ]);

  return NextResponse.json(
    {
      ...basicHealth,
      upstreamDiagnostics: {
        application: "healthy",
        horizons: horizonsStatus,
        lunarMap: lrocStatus,
      },
    },
    { status: 200 }
  );
}
