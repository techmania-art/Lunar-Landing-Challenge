"use client";

import React from "react";
import { Radio, Globe, Mountain, Compass } from "lucide-react";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";

export interface TerrainCommunicationCardProps {
  hasEarth?: boolean;
  earthElevationDeg?: number;
  earthAzimuthDeg?: number;
  observationEpoch?: string;
  terrainData?: TerrainAnalysisResponse | null;
  isStale?: boolean;
}

export function TerrainCommunicationCard({
  hasEarth = false,
  earthElevationDeg,
  earthAzimuthDeg,
  terrainData,
  isStale = false,
}: TerrainCommunicationCardProps) {
  let commStatusBadge = "Not Evaluated";
  let commBadgeClass = "bg-slate-500/20 text-slate-300 border-slate-500/40";

  if (hasEarth && earthElevationDeg !== undefined) {
    if (earthElevationDeg < -0.25) {
      commStatusBadge = "Geometric Horizon Blocked";
      commBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-400/40";
    } else if (earthElevationDeg <= 0.25) {
      commStatusBadge = "Near Geometric Horizon";
      commBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-400/40";
    } else {
      commStatusBadge = "Obstruction: Not Evaluated";
      commBadgeClass = "bg-sky-500/20 text-sky-300 border-sky-400/40";
    }
  } else {
    commStatusBadge = "Communication Undetermined";
    commBadgeClass = "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }

  const earthVisibilityText = hasEarth
    ? earthElevationDeg !== undefined && earthElevationDeg > 0
      ? "Above reference horizon"
      : "Below reference horizon"
    : "Unavailable";

  const earthCoordinatesText =
    hasEarth && earthElevationDeg !== undefined && earthAzimuthDeg !== undefined
      ? `${earthElevationDeg >= 0 ? "+" : ""}${earthElevationDeg.toFixed(2)}° elev / ${earthAzimuthDeg.toFixed(2)}° az`
      : "Unavailable";

  const terrainObstructionStatusText = hasEarth
    ? earthElevationDeg !== undefined && earthElevationDeg < 0
      ? "Blocked by Lunar Curvature"
      : "Raycast Pending (Not Evaluated)"
    : "Unavailable";

  const corridorHazardsText = terrainData
    ? `${terrainData.obstacleCount?.value ?? 0} obstacles (${terrainData.craterCount?.value ?? 0} craters)`
    : "Route terrain not evaluated";

  return (
    <div className="mission-result-card terrain-communication-card relative flex flex-col justify-between p-5 sm:p-6 text-white">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-[rgba(155,213,239,0.20)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/30">
              <Radio className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Terrain &amp; Communication
              </h3>
              <p className="text-xs text-slate-300">Visibility and route conditions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStale && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/40">
                Stale
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border shadow-sm ${commBadgeClass}`}
            >
              {commStatusBadge}
            </span>
          </div>
        </div>

        {/* 4 Core Metric Tiles in Clean 2x2 Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Tile 1: Geometric Visibility */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Geometric Visibility</span>
              <Globe className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {earthVisibilityText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Lunar spherical reference datum
            </span>
          </div>

          {/* Tile 2: Earth Horizon Angles */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Earth Horizon Angles</span>
              <Compass className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-sky-300">
              {earthCoordinatesText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              JPL Horizons (Target 399)
            </span>
          </div>

          {/* Tile 3: Terrain Obstruction */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Terrain Obstruction</span>
              <Mountain className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-amber-300">
              {terrainObstructionStatusText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Local raycast line of sight
            </span>
          </div>

          {/* Tile 4: Route Corridor Hazards */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Route Corridor Hazards</span>
              <Mountain className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {corridorHazardsText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              LOLA Polar DEM (100m/px)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
