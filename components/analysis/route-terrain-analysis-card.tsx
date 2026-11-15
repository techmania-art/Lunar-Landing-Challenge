"use client";

import React, { useState } from "react";
import { Mountain, ChevronDown } from "lucide-react";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";

export interface RouteTerrainAnalysisCardProps {
  terrainData?: TerrainAnalysisResponse | null;
  isLoading?: boolean;
  isStale?: boolean;
}

export function RouteTerrainAnalysisCard({
  terrainData,
  isLoading = false,
  isStale = false,
}: RouteTerrainAnalysisCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-[#091220]/90 p-4 text-white shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 text-sky-400">
          <Mountain className="h-4 w-4 animate-pulse" />
          <h3 className="text-xs font-semibold text-white">Route Terrain Analysis</h3>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Analyzing LOLA topographic DEM, corridor slopes, roughness, and crater hazards...
        </p>
      </div>
    );
  }

  if (!terrainData || terrainData.status === "UNAVAILABLE" || !terrainData.route.distanceKm) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-[#091220]/80 p-4 text-white shadow-md"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10, 18, 30, 0.82), rgba(10, 18, 30, 0.92)), url('/assets/terrain.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Mountain className="h-4 w-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white">Route Terrain Analysis</h3>
          </div>
          <span className="rounded-full border border-slate-500/30 bg-slate-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
            Not Evaluated
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed">
          Traverse route not evaluated. Enter destination coordinates in Mission Input to compute
          topographic elevation profiles, slope limits, and corridor hazards.
        </p>
      </div>
    );
  }

  const {
    route,
    obstacleCount,
    craterCount,
    boulderCount,
    maximumSlope,
    averageSlope,
    roughness,
    elevation,
    features,
    traversability,
  } = terrainData;

  const travStatus = traversability.status;

  // Elevation Profile SVG computation
  const samples = elevation.samples || [];
  const minElev = elevation.minimumMeters ?? 0;
  const maxElev = elevation.maximumMeters ?? 1;
  const elevRange = Math.max(1, maxElev - minElev);

  const chartWidth = 320;
  const chartHeight = 65;

  const pointsString =
    samples.length > 1
      ? samples
          .map((s, idx) => {
            const x = (idx / (samples.length - 1)) * chartWidth;
            const y =
              chartHeight - (((s.elevationMeters ?? minElev) - minElev) / elevRange) * (chartHeight - 10) - 5;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : "";

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-sky-500/25 p-4 text-white shadow-xl backdrop-blur-md transition-all duration-200"
      style={{
        backgroundImage:
          "linear-gradient(rgba(7, 15, 27, 0.72), rgba(7, 15, 27, 0.86)), url('/assets/terrain.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
            <Mountain className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Route Terrain Analysis</h3>
            <span className="block text-[10px] text-slate-400">
              Corridor ({route.corridorWidthMeters}m): {route.distanceKm?.toFixed(2)} km
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStale && (
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-500/30">
              Stale
            </span>
          )}
          {/* Traversability Badge */}
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
              travStatus === "PASSES_CONFIGURED_LIMITS"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : travStatus === "WARNINGS_REVIEW_ROUTE"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : travStatus === "EXCEEDS_CONFIGURED_LIMITS"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
            }`}
          >
            {travStatus === "PASSES_CONFIGURED_LIMITS"
              ? "Passes Limits"
              : travStatus === "WARNINGS_REVIEW_ROUTE"
              ? "Route Warnings"
              : travStatus === "EXCEEDS_CONFIGURED_LIMITS"
              ? "Exceeds Limits"
              : "Undetermined"}
          </span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {/* Total Obstacles Metric */}
        <div className="rounded-lg bg-black/40 border border-white/10 p-2">
          <span className="block text-[10px] font-sans text-slate-400">Total Obstacles</span>
          <span
            className={`font-mono text-sm font-bold ${
              (obstacleCount.value ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {obstacleCount.status === "AVAILABLE" ? obstacleCount.value : "Unable to determine"}
          </span>
          <span className="block text-[9px] text-slate-400 mt-0.5">Corridor Intersects</span>
        </div>

        {/* Maximum Slope */}
        <div className="rounded-lg bg-black/40 border border-white/10 p-2">
          <span className="block text-[10px] font-sans text-slate-400">Max Slope</span>
          <span className="font-mono text-sm font-bold text-white">
            {maximumSlope.status === "AVAILABLE" ? `${maximumSlope.value}°` : "N/A"}
          </span>
          <span className="block text-[9px] text-slate-400 mt-0.5">
            Avg: {averageSlope.value ?? 0}°
          </span>
        </div>

        {/* Roughness (RMSD) */}
        <div className="rounded-lg bg-black/40 border border-white/10 p-2">
          <span className="block text-[10px] font-sans text-slate-400">Roughness</span>
          <span className="font-mono text-sm font-bold text-sky-300">
            {roughness.status === "AVAILABLE" ? `${roughness.value}m` : "N/A"}
          </span>
          <span className="block text-[9px] text-slate-400 mt-0.5">RMSD Detrended</span>
        </div>
      </div>

      {/* Hazard Breakdown: Craters & Boulders */}
      <div className="mt-2.5 rounded-lg bg-black/30 border border-white/10 p-2.5 space-y-1.5 text-xs">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-300">Detected Craters:</span>
          <span className="font-mono text-white font-semibold">
            {craterCount.value ?? 0} features ({features.filter((f) => f.intersectsRouteCorridor).length} in corridor)
          </span>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-300">Boulder / Rock Hazards:</span>
          <span className="text-slate-400 font-sans italic text-[10px]">
            {boulderCount.status === "UNAVAILABLE" ? "Unable to determine" : boulderCount.value}{" "}
            <span className="text-slate-500">
              ({boulderCount.message || "requires <0.5m/px NAC"})
            </span>
          </span>
        </div>
      </div>

      {/* Elevation Profile Chart */}
      <div className="mt-2.5 rounded-lg bg-black/40 border border-white/10 p-2.5 space-y-1.5">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-semibold text-slate-300">LOLA Elevation Profile (100m/px)</span>
          <span className="font-mono text-slate-400">
            Δz: {elevation.elevationChangeMeters}m ({minElev.toFixed(0)}m to {maxElev.toFixed(0)}m)
          </span>
        </div>

        {pointsString ? (
          <div className="relative h-16 w-full pt-1">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
              aria-label="Route elevation profile chart"
            >
              <defs>
                <linearGradient id="terrainElevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Area under curve */}
              <polygon
                points={`0,${chartHeight} ${pointsString} ${chartWidth},${chartHeight}`}
                fill="url(#terrainElevGrad)"
              />

              {/* Profile line */}
              <polyline
                points={pointsString}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div className="py-2 text-center text-[10px] text-slate-500">No profile samples</div>
        )}

        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span>0 km (Start)</span>
          <span>{(route.distanceKm ?? 0).toFixed(2)} km (End)</span>
        </div>
      </div>

      {/* Traversability Verdict Description */}
      <div className="mt-2.5 rounded-lg bg-black/25 border border-white/10 p-2.5 text-[11px] text-slate-300 leading-relaxed">
        <p className="font-semibold text-white">Traversability Assessment:</p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-300 text-[10px]">
          {traversability.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Toggleable Details & Provenance */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowDetails((p) => !p)}
          className="flex w-full items-center justify-between text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
        >
          <span>Data Provenance & Scientific Constraints</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              showDetails ? "rotate-180" : ""
            }`}
          />
        </button>

        {showDetails && (
          <div className="mt-2 space-y-1.5 rounded-lg bg-black/40 p-2 text-[10px] text-slate-400">
            <div className="flex justify-between">
              <span>Elevation Model:</span>
              <span className="text-slate-300">LRO LOLA Polar DEM (100m/px)</span>
            </div>
            <div className="flex justify-between">
              <span>Crater Catalog:</span>
              <span className="text-slate-300">IAU/USGS Lunar Crater Nomenclature</span>
            </div>
            <div className="flex justify-between">
              <span>Vertical Datum:</span>
              <span className="text-slate-300">{elevation.datum || "LOLA Mean Radius"}</span>
            </div>
            <div className="flex justify-between">
              <span>Boulder Detection:</span>
              <span className="text-amber-400/90">Unavailable (requires sub-meter imagery)</span>
            </div>
            <p className="pt-1 text-[9px] text-slate-400/90 leading-tight border-t border-white/5">
              <strong className="text-slate-300">Scientific scope:</strong> Evaluated strictly for the configured corridor using 100m LOLA DEM elevation samples. Does not simulate terramechanic wheel slip or granular regolith sinkage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
