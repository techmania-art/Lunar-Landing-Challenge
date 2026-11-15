"use client";

import React from "react";
import { Zap, SunMedium, BatteryCharging, Gauge } from "lucide-react";
import type { SolarEnergyResult, SolarIlluminationResult } from "@/lib/services/solar/solar-types";
import type { TraverseFeasibilityResult } from "@/lib/services/rover/rover-types";
import type { SolarFormValues } from "@/components/mission/solar-energy";

export interface PowerSituationCardProps {
  solarEnergy?: SolarEnergyResult;
  solarIllumination?: SolarIlluminationResult;
  traverseResult?: TraverseFeasibilityResult | null;
  solarValues?: SolarFormValues;
  observationEpoch?: string;
  isStale?: boolean;
}

export function PowerSituationCard({
  solarEnergy,
  solarIllumination,
  traverseResult,
  solarValues,
  observationEpoch,
  isStale = false,
}: PowerSituationCardProps) {
  const hasTraverse = Boolean(
    traverseResult && traverseResult.state !== "NOT_EVALUATED" && traverseResult.state !== "UNDETERMINED"
  );

  let powerStatusBadge = "Not Evaluated";
  let powerBadgeClass = "bg-slate-500/20 text-slate-300 border-slate-500/40";

  if (hasTraverse && traverseResult) {
    if (traverseResult.state === "SUFFICIENT_ENERGY") {
      powerStatusBadge = "Sufficient Energy";
      powerBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
    } else if (traverseResult.state === "CONDITIONALLY_FEASIBLE") {
      powerStatusBadge = "Conditional Energy";
      powerBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-400/40";
    } else if (traverseResult.state === "INSUFFICIENT_ENERGY") {
      powerStatusBadge = "Insufficient Energy";
      powerBadgeClass = "bg-rose-500/20 text-rose-300 border-rose-400/40";
    }
  } else if (solarEnergy && (solarEnergy.status === "calculated" || solarEnergy.status === "zero-direct-power")) {
    if (solarIllumination?.state === "ILLUMINATED") {
      powerStatusBadge = "Solar Generation Active";
      powerBadgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-400/40";
    } else if (solarIllumination?.state === "GEOMETRICALLY_BELOW_HORIZON") {
      powerStatusBadge = "Below Geometric Horizon";
      powerBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-400/40";
    } else if (solarIllumination?.state === "TERRAIN_SHADOWED") {
      powerStatusBadge = "Terrain Shadowed";
      powerBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-400/40";
    }
  }

  // 1. Direct Solar Power
  const directPowerText =
    solarEnergy?.directSolarPowerW !== undefined && solarEnergy.directSolarPowerW !== null
      ? `${solarEnergy.directSolarPowerW.toFixed(1)} W`
      : "Unavailable";

  // 2. Total Solar Energy (shown only when valid time integration exists)
  const totalSolarEnergyText =
    solarEnergy?.estimatedEnergyWh !== undefined && solarEnergy.estimatedEnergyWh !== null
      ? `${solarEnergy.estimatedEnergyWh.toFixed(1)} Wh`
      : "Unavailable";

  const panelAreaText = solarValues?.panelArea ? `${solarValues.panelArea} m²` : "1.20 m²";
  const panelEffText = solarValues?.panelEfficiency ? `${solarValues.panelEfficiency}%` : "28.5%";
  const durationText = solarValues?.analysisDurationHours
    ? `${solarValues.analysisDurationHours} h`
    : "4.0 h";

  // 3. Rover Consumption
  const roverRequiredEnergyText =
    traverseResult?.totalEnergyRequiredWh !== undefined && traverseResult.totalEnergyRequiredWh !== null
      ? `${traverseResult.totalEnergyRequiredWh.toFixed(1)} Wh`
      : "Not evaluated";

  // 4. Net Energy Margin
  const netMarginText =
    traverseResult?.netMarginWh !== undefined && traverseResult.netMarginWh !== null
      ? `${traverseResult.netMarginWh >= 0 ? "+" : ""}${traverseResult.netMarginWh.toFixed(1)} Wh`
      : "Not evaluated";

  // Supporting single concise explanation
  const powerExplanation =
    traverseResult?.explanation ||
    solarIllumination?.reason ||
    "Traverse battery assessment not evaluated. Configure destination coordinates and rover battery parameters in Mission Input to evaluate route sufficiency.";

  return (
    <div className="mission-result-card power-situation-card relative flex flex-col justify-between p-5 sm:p-6 text-white">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-[rgba(155,213,239,0.20)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30">
              <Zap className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Power Situation
              </h3>
              <p className="text-xs text-slate-300">Solar energy and rover power</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStale && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/40">
                Stale
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border shadow-sm ${powerBadgeClass}`}
            >
              {powerStatusBadge}
            </span>
          </div>
        </div>

        {/* 4 Core Metric Tiles in Clean 2x2 Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Metric 1: Direct Solar Power */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Direct Solar Power</span>
              <SunMedium className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-sky-300">
              {directPowerText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Panel: {panelAreaText} • {panelEffText} eff
            </span>
          </div>

          {/* Metric 2: Total Solar Energy */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Solar Energy</span>
              <BatteryCharging className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-sky-300">
              {totalSolarEnergyText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Duration: {durationText} modeled window
            </span>
          </div>

          {/* Metric 3: Rover Consumption */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Rover Consumption</span>
              <Gauge className="h-3.5 w-3.5 text-slate-300" />
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {roverRequiredEnergyText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Drive ({solarValues?.drivePowerW ? `${solarValues.drivePowerW}W` : "75W"}) + idle demand
            </span>
          </div>

          {/* Metric 4: Net Energy Margin */}
          <div className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Net Energy Margin</span>
              <BatteryCharging className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <div
              className={`mt-1 font-mono text-lg font-bold ${
                traverseResult?.netMarginWh !== undefined && traverseResult.netMarginWh >= 0
                  ? "text-emerald-300"
                  : traverseResult?.netMarginWh !== undefined
                  ? "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {netMarginText}
            </div>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Post-safety reserve margin
            </span>
          </div>
        </div>

        {/* Single Concise Explanation Note */}
        <div className="mt-3.5 rounded-xl bg-[rgba(10,22,36,0.55)] border border-[rgba(155,213,239,0.15)] p-3 text-xs text-slate-200 leading-relaxed">
          {powerExplanation}
        </div>
      </div>

      {/* Provenance Footer */}
      <div className="mt-4 pt-3 border-t border-[rgba(155,213,239,0.15)] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <span>Model: LOLA Solar Incidence + Rover Energy Budget</span>
        <span>Epoch: {observationEpoch || "Configured Time"}</span>
        <span>Datum: R = 1737.4 km</span>
      </div>
    </div>
  );
}
