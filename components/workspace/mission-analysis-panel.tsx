"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Globe,
  Radio,
  Mountain,
  Download,
  Clock,
  ShieldAlert,
  Zap,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";
import {
  type SolarFormValues,
  extractRadioConfig,
  extractRelayConfig,
} from "@/components/mission/solar-energy";
import {
  evaluateSolarIllumination,
  calculateSolarEnergy,
} from "@/lib/services/solar/solar-calculator";
import { evaluateTraverseFeasibility } from "@/lib/services/rover/rover-calculator";
import { analyzeRouteTerrain } from "@/lib/services/terrain/terrain-calculator";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";
import { RouteTerrainAnalysisCard } from "@/components/analysis/route-terrain-analysis-card";
import { CommunicationLinkCard } from "@/components/analysis/communication-link-card";
import { evaluateCommunicationLink } from "@/lib/services/communication/communication-calculator";
import type { SolarPanelConfig } from "@/lib/services/solar/solar-types";

export interface MissionAnalysisPanelProps {
  isLoading: boolean;
  isStale?: boolean;
  missionDate: string;
  missionTimeUtc: string;
  latitudeDeg?: number;
  longitudeDeg?: number;
  horizonsData?: HorizonsMissionAnalysisResponse | null;
  horizonsError?: string | null;
  solarValues?: SolarFormValues;
  terrainData?: TerrainAnalysisResponse | null;
}

export function MissionAnalysisPanel({
  isLoading,
  isStale = false,
  missionDate,
  missionTimeUtc,
  latitudeDeg = -89.5,
  longitudeDeg = 0.0,
  horizonsData,
  horizonsError,
  solarValues,
  terrainData,
}: MissionAnalysisPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Connecting JPL Horizons", sub: "coord@301" },
    { title: "Querying Sun Ephemeris", sub: "Target 10" },
    { title: "Evaluating LOLA Terrain", sub: "Elevation mask" },
    { title: "Generating Analysis", sub: "Solar energy model" },
  ];

  // Progress cycle during loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    return () => {
      clearInterval(interval);
      setCurrentStep(0);
    };
  }, [isLoading]);

  const hasSun = Boolean(
    horizonsData?.sun &&
      typeof horizonsData.sun.azimuthDeg === "number" &&
      typeof horizonsData.sun.elevationDeg === "number" &&
      Number.isFinite(horizonsData.sun.azimuthDeg) &&
      Number.isFinite(horizonsData.sun.elevationDeg)
  );

  const hasEarth = Boolean(
    horizonsData?.earth &&
      typeof horizonsData.earth.azimuthDeg === "number" &&
      typeof horizonsData.earth.elevationDeg === "number" &&
      Number.isFinite(horizonsData.earth.azimuthDeg) &&
      Number.isFinite(horizonsData.earth.elevationDeg)
  );

  const isSuccess = Boolean(horizonsData?.success && hasSun && hasEarth);
  const isPartial = Boolean(
    horizonsData?.status === "partial" ||
      (horizonsData && ((hasSun && !hasEarth) || (!hasSun && hasEarth)))
  );
  const hasError = Boolean(
    horizonsError || (horizonsData && !horizonsData.success && !isPartial)
  );

  const observationEpoch = `${missionDate || "2028-01-15"} ${missionTimeUtc || "12:00"} UTC`;

  // Phase 8: Solar Illumination and Energy Calculation
  const illumination = hasSun
    ? evaluateSolarIllumination(
        latitudeDeg,
        horizonsData!.sun!.azimuthDeg,
        horizonsData!.sun!.elevationDeg,
        horizonsData!.sun!.observationTimeUtc
      )
    : {
        state: "UNAVAILABLE" as const,
        sunAzimuthDeg: 0,
        sunElevationDeg: 0,
        localTerrainHorizonDeg: 0,
        observationTimeUtc: observationEpoch,
        reason: "Sun ephemeris unavailable.",
        terrainDataset: "LOLA DEM (Pending)",
        source: "JPL Horizons (Target 10)",
      };

  const panelConfig: SolarPanelConfig | undefined =
    solarValues?.panelArea &&
    Number(solarValues.panelArea) > 0 &&
    solarValues?.panelEfficiency &&
    Number(solarValues.panelEfficiency) > 0
      ? {
          areaM2: Number(solarValues.panelArea),
          efficiencyPercent: Number(solarValues.panelEfficiency),
          orientation: solarValues.panelOrientation ?? "horizontal",
        }
      : undefined;

  const durationHours =
    solarValues?.analysisDurationHours && Number(solarValues.analysisDurationHours) > 0
      ? Number(solarValues.analysisDurationHours)
      : undefined;

  const solarEnergy = calculateSolarEnergy({
    illumination,
    panel: panelConfig,
    analysisDurationHours: durationHours,
  });

  const traverseResult = evaluateTraverseFeasibility({
    battery:
      solarValues?.batteryCapacityWh && Number(solarValues.batteryCapacityWh) > 0
        ? {
            nominalCapacityWh: Number(solarValues.batteryCapacityWh),
            maxDepthOfDischargePercent: Number(solarValues.maxDodPercent) || 80,
            initialSocPercent: Number(solarValues.initialSocPercent) || 100,
          }
        : undefined,
    consumption:
      solarValues?.drivePowerW && Number(solarValues.drivePowerW) > 0
        ? {
            drivePowerW: Number(solarValues.drivePowerW),
            idlePowerW: Number(solarValues.idlePowerW) || 0,
            driveSpeedKmH: Number(solarValues.driveSpeedKmH) || 0.5,
            safetyReservePercent: Number(solarValues.safetyReservePercent) || 15,
          }
        : undefined,
    route:
      solarValues?.destLatitude &&
      solarValues?.destLongitude &&
      Number.isFinite(Number(solarValues.destLatitude)) &&
      Number.isFinite(Number(solarValues.destLongitude))
        ? {
            startLatitudeDeg: latitudeDeg,
            startLongitudeDeg: longitudeDeg,
            destLatitudeDeg: Number(solarValues.destLatitude),
            destLongitudeDeg: Number(solarValues.destLongitude),
          }
        : undefined,
    solarEnergyGeneratedWh: solarEnergy.estimatedEnergyWh || 0,
    missionDurationHours: durationHours,
  });

  const hasRouteCoords = Boolean(
    solarValues?.destLatitude &&
      solarValues?.destLongitude &&
      Number.isFinite(Number(solarValues.destLatitude)) &&
      Number.isFinite(Number(solarValues.destLongitude))
  );

  const calculatedTerrain = hasRouteCoords
    ? analyzeRouteTerrain({
        route: {
          coordinates: [
            { latitude: latitudeDeg, longitude: longitudeDeg },
            {
              latitude: Number(solarValues!.destLatitude),
              longitude: Number(solarValues!.destLongitude),
            },
          ],
          corridorWidthMeters: 100,
        },
        rover: {
          maxSlopeDegrees: 20,
        },
      })
    : null;

  const activeTerrainData = terrainData || calculatedTerrain;

  // Phase 28: Dedicated Multi-Layer Communication Link Analysis
  const radioConfig = extractRadioConfig(solarValues);
  const relayConfig = extractRelayConfig(solarValues);
  const commLink = evaluateCommunicationLink({
    latitudeDeg,
    longitudeDeg,
    missionEpoch: observationEpoch,
    earthAzimuthDeg: hasEarth ? horizonsData!.earth!.azimuthDeg : null,
    earthElevationDeg: hasEarth ? horizonsData!.earth!.elevationDeg : null,
    radioConfig,
    relayConfig,
    isStale,
  });

  return (
    <section
      aria-labelledby="mission-analysis-heading"
      className="flex flex-col h-full rounded-2xl border border-sky-500/20 bg-[#0c1524]/85 shadow-2xl backdrop-blur-md overflow-hidden text-white"
    >
      {/* Panel Header */}
      <div className="border-b border-white/10 px-5 py-3.5 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="mission-analysis-heading" className="text-sm font-bold tracking-tight text-white">
              Mission Analysis
            </h2>
            <p className="text-[11px] text-slate-400">
              {isLoading
                ? "Computing astronomical and lunar conditions..."
                : "Ephemeris & solar energy calculations powered by NASA JPL Horizons & LOLA DEM"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          /* 1. Loading / Processing State */
          <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center">
            {/* Decorative Moon Visual with Blue Orbital Ring */}
            <div className="relative flex items-center justify-center h-44 w-44">
              <div
                className="absolute inset-0 rounded-full border border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] animate-[spin_12s_linear_infinite] motion-reduce:animate-none"
                aria-hidden="true"
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_8px_#38bdf8]" />
              </div>

              <div
                className="absolute inset-3 rounded-full border border-sky-500/20 animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />

              <div
                className="relative h-24 w-24 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] overflow-hidden bg-[#d9e2ec]"
                aria-hidden="true"
              >
                <div className="absolute inset-0 bg-cover opacity-80 mix-blend-multiply bg-[radial-gradient(#94a3b8_20%,transparent_20%)] [background-size:12px_12px]" />
                <div className="absolute top-4 left-6 h-4 w-4 rounded-full bg-slate-400/40" />
                <div className="absolute bottom-6 right-5 h-6 w-6 rounded-full bg-slate-400/35" />
                <div className="absolute top-10 right-4 h-3 w-3 rounded-full bg-slate-400/40" />

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-sky-100/40 animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-wide text-white">
                Analysing mission data...
              </h3>
              <p className="text-xs text-sky-300/80 font-mono">
                {steps[currentStep]?.title || "Calculating ephemerides..."}
              </p>
            </div>

            {/* Horizontal 4-Stage Progress Tracker */}
            <div className="w-full pt-2">
              <div className="grid grid-cols-4 gap-2 text-center relative">
                <div
                  className="absolute top-3 left-6 right-6 h-0.5 bg-white/10 -z-0"
                  aria-hidden="true"
                />

                {steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isDone = idx < currentStep;

                  return (
                    <div key={step.title} className="flex flex-col items-center relative z-10">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border transition-colors ${
                          isDone
                            ? "border-sky-400 bg-sky-500 text-white"
                            : isActive
                            ? "border-sky-300 bg-sky-500/30 text-sky-200 ring-2 ring-sky-400/30"
                            : "border-white/20 bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span className="mt-1.5 text-[10px] font-medium text-slate-300 leading-tight">
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* 2. Analysis Content State */
          <div className="space-y-3.5">
            {/* Top Status Alert */}
            {isStale && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Inputs Changed</p>
                  <p className="text-[11px] text-amber-300/80">
                    Coordinates or epoch were modified. Displaying previous calculation until re-analysed.
                  </p>
                </div>
              </div>
            )}

            {hasError ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Horizons Ephemeris Warning</p>
                  <p className="text-[11px] text-amber-300/80">
                    {horizonsError || horizonsData?.error || "Could not retrieve live ephemerides from JPL Horizons."}
                  </p>
                </div>
              </div>
            ) : isPartial ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
                <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Partial Ephemerides Retrieved</p>
                  <p className="text-[11px] text-sky-300/80">
                    {hasSun
                      ? "Sun ephemeris successfully retrieved; Earth ephemeris is unavailable."
                      : "Earth ephemeris successfully retrieved; Sun ephemeris is unavailable."}
                  </p>
                </div>
              </div>
            ) : isSuccess ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Analysis Complete</p>
                  <p className="text-[11px] text-emerald-300/80">
                    NASA JPL Horizons ephemerides verified for {observationEpoch}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                <Activity className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Awaiting Mission Analysis</p>
                  <p className="text-[11px] text-slate-400">
                    Submit coordinates to query NASA JPL Horizons for live ephemeris data.
                  </p>
                </div>
              </div>
            )}

            {/* Card 1: Sun Analysis */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sun className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Sun Analysis</span>
                </div>
                {hasSun ? (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    Live Horizons Data
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-500/30">
                    Unavailable
                  </span>
                )}
              </div>

              {hasSun ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[10px] font-sans text-slate-400">Sun Azimuth</span>
                      <span className="text-white font-bold">{horizonsData!.sun!.azimuthDeg.toFixed(2)}°</span>
                      <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">East of North</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[10px] font-sans text-slate-400">Sun Elevation</span>
                      <span className="text-white font-bold">{horizonsData!.sun!.elevationDeg.toFixed(2)}°</span>
                      <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">Geometric Horizon</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px]">
                    <span className="text-slate-400">Geometric Status:</span>
                    <span
                      className={`font-semibold ${
                        horizonsData!.sun!.elevationDeg > 0.25
                          ? "text-emerald-300"
                          : horizonsData!.sun!.elevationDeg < -0.25
                          ? "text-slate-400"
                          : "text-amber-300"
                      }`}
                    >
                      {horizonsData!.sun!.geometricStatus ||
                        (horizonsData!.sun!.elevationDeg > 0 ? "Above horizon" : "Below horizon")}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {horizonsData!.sun!.elevationDeg > 0.25
                      ? "The Sun is geometrically above the reference horizon."
                      : horizonsData!.sun!.elevationDeg < -0.25
                      ? "The Sun is geometrically below the reference horizon."
                      : "The Sun is near the geometric horizon within ±0.25° tolerance."}
                  </p>

                  <div className="space-y-1 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Observation:</span>
                      <span className="font-mono text-slate-300">{horizonsData!.sun!.observationTimeUtc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Source:</span>
                      <span className="text-slate-300">{horizonsData!.sun!.source} (Target 10)</span>
                    </div>
                    <p className="pt-1 text-[10px] text-slate-400/90 leading-tight">
                      <span className="text-amber-300/90 font-medium">Limitation:</span> Local terrain obstruction is evaluated in the Solar Illumination & Energy panel below.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 py-1">
                  <p className="text-xs text-slate-400 italic">
                    Horizons data unavailable. No hardcoded angles displayed.
                  </p>
                  {horizonsData?.sunError && (
                    <p className="text-[10px] text-amber-300/80 font-mono">
                      Target 10 error: {horizonsData.sunError}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Source: JPL Horizons (Target 10)
                  </p>
                </div>
              )}
            </div>

            {/* Card 2: Earth Analysis */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Earth Analysis</span>
                </div>
                {hasEarth ? (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    Live Horizons Data
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-500/30">
                    Unavailable
                  </span>
                )}
              </div>

              {hasEarth ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[10px] font-sans text-slate-400">Earth Azimuth</span>
                      <span className="text-white font-bold">{horizonsData!.earth!.azimuthDeg.toFixed(2)}°</span>
                      <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">East of North</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[10px] font-sans text-slate-400">Earth Elevation</span>
                      <span className="text-white font-bold">{horizonsData!.earth!.elevationDeg.toFixed(2)}°</span>
                      <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">Geometric Horizon</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[11px]">
                    <span className="text-slate-400">Geometric Status:</span>
                    <span
                      className={`font-semibold ${
                        horizonsData!.earth!.elevationDeg > 0.25
                          ? "text-sky-300"
                          : horizonsData!.earth!.elevationDeg < -0.25
                          ? "text-slate-400"
                          : "text-amber-300"
                      }`}
                    >
                      {horizonsData!.earth!.geometricStatus ||
                        (horizonsData!.earth!.elevationDeg > 0 ? "Above horizon" : "Below horizon")}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {horizonsData!.earth!.elevationDeg > 0.25
                      ? "Earth is geometrically above the reference horizon."
                      : horizonsData!.earth!.elevationDeg < -0.25
                      ? "Earth is geometrically below the reference horizon."
                      : "Earth is near the geometric horizon within ±0.25° tolerance."}
                  </p>

                  <div className="space-y-1 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Observation:</span>
                      <span className="font-mono text-slate-300">{horizonsData!.earth!.observationTimeUtc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Source:</span>
                      <span className="text-slate-300">{horizonsData!.earth!.source} (Target 399)</span>
                    </div>
                    <p className="pt-1 text-[10px] text-slate-400/90 leading-tight">
                      <span className="text-sky-300/90 font-medium">Limitation:</span> Local terrain obstruction and RF radio link conditions are not included.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 py-1">
                  <p className="text-xs text-slate-400 italic">
                    Horizons data unavailable. No hardcoded angles displayed.
                  </p>
                  {horizonsData?.earthError && (
                    <p className="text-[10px] text-amber-300/80 font-mono">
                      Target 399 error: {horizonsData.earthError}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Source: JPL Horizons (Target 399)
                  </p>
                </div>
              )}
            </div>

            {/* Card 3: Phase 8 Solar Illumination & Energy Availability */}
            <div className="rounded-xl border border-sky-500/20 bg-white/[0.03] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <Zap className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-semibold text-white">Solar Illumination & Energy</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    illumination.state === "ILLUMINATED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : illumination.state === "TERRAIN_SHADOWED"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : illumination.state === "GEOMETRICALLY_BELOW_HORIZON"
                      ? "bg-slate-500/20 text-slate-300 border-slate-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {illumination.state === "ILLUMINATED"
                    ? "Illuminated (Direct Sunlight)"
                    : illumination.state === "TERRAIN_SHADOWED"
                    ? "Terrain Shadowed"
                    : illumination.state === "GEOMETRICALLY_BELOW_HORIZON"
                    ? "Below Geometric Horizon"
                    : "Unable to Determine"}
                </span>
              </div>

              {/* Illumination & Terrain Horizon Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="block text-[10px] font-sans text-slate-400">Sun Elevation</span>
                  <span className="text-white font-bold">
                    {hasSun ? `${illumination.sunElevationDeg.toFixed(2)}°` : "N/A"}
                  </span>
                  <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">
                    Geometric Horizon
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="block text-[10px] font-sans text-slate-400">Terrain Horizon Mask</span>
                  <span className="text-white font-bold">
                    {hasSun ? `${illumination.localTerrainHorizonDeg.toFixed(1)}°` : "N/A"}
                  </span>
                  <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">
                    LOLA DEM Elevation Mask
                  </span>
                </div>
              </div>

              {/* Power & Energy Result Section */}
              <div className="rounded-lg bg-black/25 border border-white/10 p-2.5 space-y-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[11px] font-medium text-slate-300">
                    Direct Solar Power:
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      solarEnergy.status === "calculated"
                        ? "text-emerald-400"
                        : solarEnergy.status === "zero-direct-power"
                        ? "text-slate-400"
                        : "text-amber-300"
                    }`}
                  >
                    {solarEnergy.status === "calculated"
                      ? `${solarEnergy.directSolarPowerW} W`
                      : solarEnergy.status === "zero-direct-power"
                      ? "0 W"
                      : solarEnergy.status === "panel-unconfigured"
                      ? "Unconfigured"
                      : "N/A"}
                  </span>
                </div>

                {solarEnergy.estimatedEnergyWh !== undefined && (
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Estimated Energy ({solarEnergy.analysisDurationHours}h):
                    </span>
                    <span className="font-mono text-xs font-bold text-sky-300">
                      {solarEnergy.estimatedEnergyWh} Wh
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {solarEnergy.message}
                </p>

                {solarEnergy.assumptions.length > 0 && (
                  <ul className="space-y-0.5 pt-1 text-[10px] text-slate-400 list-disc list-inside">
                    {solarEnergy.assumptions.map((assump, idx) => (
                      <li key={idx} className="leading-tight">
                        {assump}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Terrain Dataset:</span>
                  <span className="text-slate-300">{illumination.terrainDataset}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direct Irradiance Model:</span>
                  <span className="text-slate-300">ASTM E490 (1361 W/m²)</span>
                </div>
                <p className="pt-1 text-[10px] text-slate-400/90 leading-tight">
                  <strong className="text-slate-300">Physical scope:</strong> Direct solar generation only. Does not reflect rover battery state-of-charge or secondary diffuse reflections.
                </p>
              </div>
            </div>

            {/* Phase 11: Route Terrain Analysis Card (Immediately below Solar Energy) */}
            <RouteTerrainAnalysisCard
              terrainData={activeTerrainData}
              isLoading={isLoading}
              isStale={isStale}
            />

            {/* Card 4: Phase 10 Rover Energy & Traverse Feasibility */}
            <div className="rounded-xl border border-sky-500/20 bg-white/[0.03] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400">
                  <Compass className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">
                    Rover Energy & Traverse Feasibility
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    traverseResult.state === "SUFFICIENT_ENERGY"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : traverseResult.state === "CONDITIONALLY_FEASIBLE"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : traverseResult.state === "INSUFFICIENT_ENERGY"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {traverseResult.state === "SUFFICIENT_ENERGY"
                    ? "Traverse Feasible"
                    : traverseResult.state === "CONDITIONALLY_FEASIBLE"
                    ? "Conditionally Feasible"
                    : traverseResult.state === "INSUFFICIENT_ENERGY"
                    ? "Insufficient Energy"
                    : traverseResult.state === "UNDETERMINED"
                    ? "Undetermined"
                    : "Not Evaluated"}
                </span>
              </div>

              {traverseResult.state !== "NOT_EVALUATED" ? (
                <>
                  {/* Route & Motion Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[10px] font-sans text-slate-400">Route Distance</span>
                      <span className="text-white font-bold">
                        {traverseResult.routeDistanceKm !== undefined
                          ? `${traverseResult.routeDistanceKm.toFixed(2)} km`
                          : "N/A"}
                      </span>
                      <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">
                        Spherical Great-Circle
                      </span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[10px] font-sans text-slate-400">Drive Time</span>
                      <span className="text-white font-bold">
                        {traverseResult.estimatedDriveTimeHours !== undefined
                          ? `${traverseResult.estimatedDriveTimeHours.toFixed(1)} h`
                          : "N/A"}
                      </span>
                      <span className="block text-[9px] font-sans text-slate-400/80 mt-0.5">
                        @ {solarValues?.driveSpeedKmH || 0.5} km/h speed
                      </span>
                    </div>
                  </div>

                  {/* Energy Balance Table */}
                  <div className="rounded-lg bg-black/25 border border-white/10 p-2.5 space-y-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-slate-400 text-[11px]">Energy Required (Drive + Idle):</span>
                        <span className="font-mono text-white font-semibold text-[11px]">
                          {traverseResult.totalEnergyRequiredWh !== undefined
                            ? `${traverseResult.totalEnergyRequiredWh} Wh`
                            : "N/A"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-slate-400 text-[11px]">Available Energy (Battery + Solar):</span>
                        <span className="font-mono text-emerald-300 font-semibold text-[11px]">
                          {traverseResult.usableBatteryEnergyWh !== undefined &&
                          traverseResult.solarEnergyGeneratedWh !== undefined
                            ? `${traverseResult.usableBatteryEnergyWh + traverseResult.solarEnergyGeneratedWh} Wh`
                            : "N/A"}
                        </span>
                      </div>

                      {traverseResult.netMarginWh !== undefined && (
                        <div className="flex justify-between items-center border-b border-white/5 pb-1">
                          <span className="text-slate-400 text-[11px]">Net Margin (Post-Reserve):</span>
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              traverseResult.netMarginWh >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {traverseResult.netMarginWh >= 0
                              ? `+${traverseResult.netMarginWh} Wh`
                              : `${traverseResult.netMarginWh} Wh`}
                          </span>
                        </div>
                      )}

                      {traverseResult.projectedEndingBatteryEnergyWh !== undefined && (
                        <div className="flex justify-between items-center pb-0.5">
                          <span className="text-slate-400 text-[11px]">Projected Battery End:</span>
                          <span className="font-mono text-sky-300 text-[11px]">
                            {traverseResult.projectedEndingBatteryEnergyWh} Wh
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/5">
                      {traverseResult.explanation}
                    </p>

                    {traverseResult.assumptions.length > 0 && (
                      <ul className="space-y-0.5 pt-1 text-[10px] text-slate-400 list-disc list-inside">
                        {traverseResult.assumptions.map((assump, idx) => (
                          <li key={idx} className="leading-tight">
                            {assump}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white/5 p-2.5 rounded-lg text-xs space-y-1">
                  <p className="text-slate-300 text-[11px]">
                    Traverse assessment not evaluated. Configure destination coordinates and rover battery parameters in Mission Input to evaluate route sufficiency.
                  </p>
                </div>
              )}

              <div className="space-y-1 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                <p className="leading-tight">
                  <strong className="text-slate-300">Model scope:</strong> Applies strictly to the proposed route under modeled loads. Does not claim the rover can traverse the Moon as a whole.
                </p>
              </div>
            </div>

            {/* Phase 28: Dedicated Multi-Layer Communication Link Analysis Card */}
            <CommunicationLinkCard
              commLink={commLink}
              isLoading={isLoading}
              isStale={isStale}
            />

            {/* Card 5: Communication Visibility (Geometric Visibility Only) */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Radio className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Communication Visibility</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    hasEarth && horizonsData!.earth!.elevationDeg > 0.25
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                      : hasEarth && horizonsData!.earth!.elevationDeg >= -0.25
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {hasEarth
                    ? horizonsData!.earth!.elevationDeg > 0.25
                      ? "Earth Geometrically Above Horizon"
                      : horizonsData!.earth!.elevationDeg < -0.25
                      ? "Earth Geometrically Below Horizon"
                      : "Near Geometric Horizon"
                    : "Geometric Visibility Unavailable"}
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Geometric Visibility:</span>
                  <span className="font-mono text-white text-[11px]">
                    {hasEarth
                      ? horizonsData!.earth!.elevationDeg > 0
                        ? "Earth above reference horizon"
                        : "Earth below reference horizon"
                      : "Unavailable / cannot determine"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Observation Epoch:</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {observationEpoch}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Data Source:</span>
                  <span className="text-slate-300 text-[11px]">JPL Horizons (Target 399)</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-[10px] text-slate-400/90 leading-tight">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-300">Geometric visibility only:</strong> Operational radio communication availability, link-budget, and antenna coverage have not been evaluated. Line of sight requires separate terrain obstruction analysis.
                </span>
              </div>
            </div>

            {/* Card 5: Surrounding Terrain */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Mountain className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Surrounding Terrain</span>
                </div>
                <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-500/30">
                  Not Yet Analysed
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="block text-[10px] font-sans text-slate-400">Elevation Dataset</span>
                  <span className="text-slate-300 font-semibold text-[11px]">LOLA DEM (Pending)</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="block text-[10px] font-sans text-slate-400">Terrain Obstruction</span>
                  <span className="text-slate-300 font-semibold text-[11px]">Raycast Pending</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400/90 leading-relaxed">
                Do not infer elevation or obstruction from Horizons position. Detailed radial horizon DEM obstruction modeling (LOLA DEM / LROC WAC DTM) is scheduled in the Phase 8 roadmap.
              </p>
            </div>

            {/* Phase 15: Mission Operational Results Launcher */}
            <div className="rounded-xl border border-sky-400/30 bg-sky-950/30 p-4 space-y-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                      Mission Operational Results
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Dedicated executive assessment for Power Situation and Terrain &amp; Communication Situation.
                  </p>
                </div>
              </div>

              <Link
                href="/mission-results"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all group"
              >
                <span>View Results</span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>

            {/* Export PDF Action */}
            <button
              type="button"
              onClick={() => alert("Analysis report PDF generation is scheduled for Phase 9.")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-xs font-semibold text-sky-300 shadow-md hover:bg-sky-500/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Analysis (PDF)</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
