"use client";

import React from "react";
import { Zap, Radio, ShieldAlert } from "lucide-react";
import type { SolarEnergyResult, SolarIlluminationResult } from "@/lib/services/solar/solar-types";
import type { TraverseFeasibilityResult } from "@/lib/services/rover/rover-types";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";
import type { SolarFormValues } from "@/components/mission/solar-energy";

export interface MissionResultsCardsProps {
  isLoading?: boolean;
  isStale?: boolean;
  solarEnergy?: SolarEnergyResult;
  solarIllumination?: SolarIlluminationResult;
  traverseResult?: TraverseFeasibilityResult | null;
  solarValues?: SolarFormValues;
  hasEarth?: boolean;
  earthElevationDeg?: number;
  earthAzimuthDeg?: number;
  observationEpoch?: string;
  terrainData?: TerrainAnalysisResponse | null;
}

export function MissionResultsCards({
  isLoading = false,
  isStale = false,
  solarEnergy,
  solarIllumination,
  traverseResult,
  solarValues,
  hasEarth = false,
  earthElevationDeg,
  earthAzimuthDeg,
  observationEpoch,
  terrainData,
}: MissionResultsCardsProps) {
  if (isLoading) {
    return null;
  }

  // --- 1. Power Situation State & Metrics ---
  const hasTraverse = Boolean(
    traverseResult && traverseResult.state !== "NOT_EVALUATED" && traverseResult.state !== "UNDETERMINED"
  );

  let powerStatusBadge = "Not Evaluated";
  let powerBadgeClass = "bg-slate-500/20 text-slate-400 border-slate-500/30";

  if (hasTraverse && traverseResult) {
    if (traverseResult.state === "SUFFICIENT_ENERGY") {
      powerStatusBadge = "Sufficient Energy";
      powerBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    } else if (traverseResult.state === "CONDITIONALLY_FEASIBLE") {
      powerStatusBadge = "Conditional Energy";
      powerBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    } else if (traverseResult.state === "INSUFFICIENT_ENERGY") {
      powerStatusBadge = "Insufficient Energy";
      powerBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }
  } else if (solarEnergy && (solarEnergy.status === "calculated" || solarEnergy.status === "zero-direct-power")) {
    if (solarIllumination?.state === "ILLUMINATED") {
      powerStatusBadge = "Solar Generation Active";
      powerBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    } else if (solarIllumination?.state === "GEOMETRICALLY_BELOW_HORIZON") {
      powerStatusBadge = "Below Geometric Horizon";
      powerBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    } else if (solarIllumination?.state === "TERRAIN_SHADOWED") {
      powerStatusBadge = "Terrain Shadowed";
      powerBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
  }

  const directPowerText =
    solarEnergy?.directSolarPowerW !== undefined && solarEnergy.directSolarPowerW !== null
      ? `${solarEnergy.directSolarPowerW.toFixed(1)} W`
      : "Unavailable";

  const totalSolarEnergyText =
    solarEnergy?.estimatedEnergyWh !== undefined && solarEnergy.estimatedEnergyWh !== null
      ? `${solarEnergy.estimatedEnergyWh} Wh`
      : "Unavailable";

  const roverRequiredEnergyText =
    traverseResult?.totalEnergyRequiredWh !== undefined && traverseResult.totalEnergyRequiredWh !== null
      ? `${traverseResult.totalEnergyRequiredWh} Wh`
      : "Not evaluated";

  const netMarginText =
    traverseResult?.netMarginWh !== undefined && traverseResult.netMarginWh !== null
      ? `${traverseResult.netMarginWh >= 0 ? "+" : ""}${traverseResult.netMarginWh} Wh`
      : "Not evaluated";

  const powerExplanation =
    traverseResult?.explanation ||
    solarIllumination?.reason ||
    "Traverse battery assessment not evaluated. Configure destination coordinates and rover battery parameters in Mission Input to evaluate route sufficiency.";

  // --- 2. Terrain & Communication Situation State & Metrics ---
  let commStatusBadge = "Not Evaluated";
  let commBadgeClass = "bg-slate-500/20 text-slate-400 border-slate-500/30";
  let commExplanation = "Terrain line-of-sight communication analysis has not been evaluated.";

  if (hasEarth && earthElevationDeg !== undefined) {
    if (earthElevationDeg < -0.25) {
      commStatusBadge = "Geometric Horizon Blocked";
      commBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";
      commExplanation = `Earth is geometrically below the lunar reference horizon (${earthElevationDeg.toFixed(2)}° elevation). Direct communication line of sight is obstructed by lunar curvature.`;
    } else if (earthElevationDeg <= 0.25) {
      commStatusBadge = "Near Geometric Horizon";
      commBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
      commExplanation = `Earth is near the geometric horizon (${earthElevationDeg.toFixed(2)}° elevation). Local topography may create terrain masking or grazing obstructions.`;
    } else {
      commStatusBadge = "Obstruction: Not Evaluated";
      commBadgeClass = "bg-sky-500/20 text-sky-300 border-sky-500/30";
      commExplanation = `Earth geometric visibility is available (+${earthElevationDeg.toFixed(2)}° elevation), but local terrain line-of-sight ray tracing has not been verified.`;
    }
  } else {
    commStatusBadge = "Communication Undetermined";
    commBadgeClass = "bg-slate-500/20 text-slate-400 border-slate-500/30";
    commExplanation = "Earth ephemeris data is unavailable from JPL Horizons. Geometric line of sight cannot be determined.";
  }

  const earthVisibilityText = hasEarth
    ? earthElevationDeg !== undefined && earthElevationDeg > 0
      ? "Above reference horizon"
      : "Below reference horizon"
    : "Unavailable";

  const earthCoordinatesText =
    hasEarth && earthElevationDeg !== undefined && earthAzimuthDeg !== undefined
      ? `${earthElevationDeg.toFixed(2)}° elev / ${earthAzimuthDeg.toFixed(2)}° az`
      : "Unavailable";

  const terrainObstructionStatusText = hasEarth
    ? earthElevationDeg !== undefined && earthElevationDeg < 0
      ? "Blocked by Lunar Curvature"
      : "Raycast Pending (Not Evaluated)"
    : "Unavailable";

  const corridorHazardsText = terrainData
    ? `${terrainData.obstacleCount.value ?? 0} obstacles (${terrainData.craterCount.value ?? 0} craters)`
    : "Route terrain not evaluated";

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-bold tracking-tight text-white uppercase text-slate-300">
          Mission Operational Results
        </h3>
        {isStale && (
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[9px] font-mono text-amber-300 border border-amber-500/30">
            Inputs Stale
          </span>
        )}
      </div>

      {/* Two-card responsive row: Left = Power Situation, Right = Terrain & Communication */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* =========================================================================
            LEFT CARD: POWER SITUATION (with energy.jpg background)
           ========================================================================= */}
        <div
          className="power-situation-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-500/25 p-3.5 text-white shadow-xl backdrop-blur-md transition-all duration-200"
          style={{
            backgroundImage:
              "linear-gradient(rgba(7, 12, 20, 0.62), rgba(7, 12, 20, 0.82)), url('/assets/energy.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <h4 className="text-xs font-bold tracking-tight text-white">Power Situation</h4>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${powerBadgeClass}`}>
              {powerStatusBadge}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg bg-black/45 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Direct Solar Power</span>
              <span className="font-bold text-amber-300">{directPowerText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">
                Area: {solarValues?.panelArea || "1.2"} m²
              </span>
            </div>

            <div className="rounded-lg bg-black/45 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Total Solar Energy</span>
              <span className="font-bold text-emerald-300">{totalSolarEnergyText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">
                Duration: {solarValues?.analysisDurationHours || "4.0"} h
              </span>
            </div>

            <div className="rounded-lg bg-black/45 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Rover Consumption</span>
              <span className="font-bold text-white">{roverRequiredEnergyText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">Drive + Idle</span>
            </div>

            <div className="rounded-lg bg-black/45 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Net Energy Margin</span>
              <span
                className={`font-bold ${
                  traverseResult?.netMarginWh !== undefined && traverseResult.netMarginWh >= 0
                    ? "text-emerald-300"
                    : traverseResult?.netMarginWh !== undefined
                    ? "text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {netMarginText}
              </span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">Post-Reserve</span>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="mt-2.5 rounded-lg bg-black/35 border border-white/10 p-2 text-[11px] text-slate-300 leading-relaxed">
            {powerExplanation}
          </div>

          {/* Scope Note */}
          <div className="mt-2 pt-1 border-t border-white/5 text-[9px] text-slate-400 flex items-center justify-between">
            <span>Model: LOLA solar incidence + rover energy budget</span>
            <span>R = 1737.4 km</span>
          </div>
        </div>

        {/* =========================================================================
            RIGHT CARD: TERRAIN & COMMUNICATION SITUATION (Clean smooth surface, NO background image)
           ========================================================================= */}
        <div className="terrain-communication-card relative flex flex-col justify-between overflow-hidden rounded-xl border border-sky-500/25 bg-[#091322]/95 p-3.5 text-white shadow-xl backdrop-blur-md transition-all duration-200">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <h4 className="text-xs font-bold tracking-tight text-white">Terrain & Communication Situation</h4>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${commBadgeClass}`}>
              {commStatusBadge}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Geometric Visibility</span>
              <span className="font-bold text-white">{earthVisibilityText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">Lunar Spherical Horizon</span>
            </div>

            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Earth Horizon Angles</span>
              <span className="font-bold text-sky-300">{earthCoordinatesText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">JPL Horizons (Target 399)</span>
            </div>

            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Terrain Obstruction</span>
              <span className="font-bold text-amber-300">{terrainObstructionStatusText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">Local Raycast Line of Sight</span>
            </div>

            <div className="rounded-lg bg-white/5 border border-white/10 p-2">
              <span className="block text-[10px] font-sans text-slate-400">Route Corridor Hazards</span>
              <span className="font-bold text-white">{corridorHazardsText}</span>
              <span className="block text-[9px] font-sans text-slate-400 mt-0.5">LOLA DEM (100m)</span>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="mt-2.5 rounded-lg bg-white/5 border border-white/10 p-2 text-[11px] text-slate-300 leading-relaxed">
            {commExplanation}
          </div>

          {/* Scientific Disclaimer Alert */}
          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/10 p-2 text-[10px] text-slate-300 leading-tight">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong className="text-white">Geometric visibility only:</strong> Operational radio link, antenna pointing, and link-budget have not been evaluated. Terrain line of sight along the Earth vector requires verified micro-DEM ray tracing.
            </span>
          </div>

          {/* Scope Note */}
          <div className="mt-2 pt-1 border-t border-white/5 text-[9px] text-slate-400 flex items-center justify-between">
            <span>Model: Horizons Target 399 + LOLA Polar DEM</span>
            <span>Epoch: {observationEpoch || "Selected Date/Time"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
