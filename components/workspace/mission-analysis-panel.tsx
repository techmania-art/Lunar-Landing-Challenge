"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Globe,
  Radio,
  Mountain,
  Download,
  Info,
} from "lucide-react";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";

export interface MissionAnalysisPanelProps {
  isLoading: boolean;
  missionDate: string;
  missionTimeUtc: string;
  horizonsData?: HorizonsMissionAnalysisResponse | null;
  horizonsError?: string | null;
}

export function MissionAnalysisPanel({
  isLoading,
  missionDate,
  missionTimeUtc,
  horizonsData,
  horizonsError,
}: MissionAnalysisPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "Connecting JPL Horizons", sub: "coord@301" },
    { title: "Querying Sun Ephemeris", sub: "Target 10" },
    { title: "Computing Earth Vector", sub: "Target 399" },
    { title: "Generating Analysis", sub: "Geometric horizon" },
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

  const hasEphemeris = horizonsData && horizonsData.success && horizonsData.sun && horizonsData.earth;

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
                : "Ephemeris calculations powered by NASA JPL Horizons"}
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
              {/* Outer Blue Orbital Ring with Glow */}
              <div
                className="absolute inset-0 rounded-full border border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] animate-[spin_12s_linear_infinite] motion-reduce:animate-none"
                aria-hidden="true"
              >
                {/* Orbiting Satellite Marker */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-sky-300 shadow-[0_0_8px_#38bdf8]" />
              </div>

              {/* Inner Pulsing Ring */}
              <div
                className="absolute inset-3 rounded-full border border-sky-500/20 animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />

              {/* Moon Sphere with illuminated appearance from gibbous to full */}
              <div
                className="relative h-24 w-24 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] overflow-hidden bg-[#d9e2ec]"
                aria-hidden="true"
              >
                {/* Crater Textures */}
                <div className="absolute inset-0 bg-cover opacity-80 mix-blend-multiply bg-[radial-gradient(#94a3b8_20%,transparent_20%)] [background-size:12px_12px]" />
                <div className="absolute top-4 left-6 h-4 w-4 rounded-full bg-slate-400/40" />
                <div className="absolute bottom-6 right-5 h-6 w-6 rounded-full bg-slate-400/35" />
                <div className="absolute top-10 right-4 h-3 w-3 rounded-full bg-slate-400/40" />

                {/* Animated Light Sweep (Gibbous to Full) */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-sky-100/40 animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none"
                />
              </div>
            </div>

            {/* Loading Status Text */}
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
                {/* Connecting Horizontal Line */}
                <div
                  className="absolute top-3 left-6 right-6 h-0.5 bg-white/10 -z-0"
                  aria-hidden="true"
                />

                {steps.map((step, idx) => {
                  const isDone = idx < currentStep;
                  const isCurrent = idx === currentStep;

                  return (
                    <div key={step.title} className="flex flex-col items-center relative z-10">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                          isDone
                            ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            : isCurrent
                            ? "bg-sky-500 text-white ring-4 ring-sky-500/25 animate-pulse"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          idx + 1
                        )}
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
          /* 2. Completed Analysis State */
          <div className="space-y-3.5">
            {/* Status Banner */}
            {horizonsError || (horizonsData && !horizonsData.success) ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Horizons Ephemeris Warning</p>
                  <p className="text-[11px] text-amber-300/80">
                    {horizonsError || horizonsData?.error || "Could not retrieve live ephemerides from JPL Horizons."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Analysis Complete</p>
                  <p className="text-[11px] text-emerald-300/80">
                    NASA JPL Horizons ephemerides verified for {missionDate || "15 Jan 2028"},{" "}
                    {missionTimeUtc || "12:00"} UTC
                  </p>
                </div>
              </div>
            )}

            {/* Card 1: Sun Analysis */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Sun className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Sun Analysis</span>
                </div>
                {hasEphemeris ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      horizonsData.sun!.isGeometricAboveHorizon
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                    }`}
                  >
                    {horizonsData.sun!.isGeometricAboveHorizon ? "Sunlit (Geometric)" : "In Shadow"}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-500/30">
                    Awaiting Horizons
                  </span>
                )}
              </div>

              {hasEphemeris ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="block text-[10px] font-sans text-slate-400">Azimuth</span>
                    <span className="text-white font-bold">{horizonsData.sun!.azimuthDeg.toFixed(2)}°</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="block text-[10px] font-sans text-slate-400">Elevation</span>
                    <span className="text-white font-bold">{horizonsData.sun!.elevationDeg.toFixed(2)}°</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-1">
                  Horizons data unavailable. No hardcoded angles displayed.
                </div>
              )}

              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0 text-sky-400" />
                <span>Source: JPL Horizons (target 10). Local terrain obstruction not modeled.</span>
              </p>
            </div>

            {/* Card 2: Earth Analysis */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-400">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Earth Analysis</span>
                </div>
                {hasEphemeris ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      horizonsData.earth!.isGeometricAboveHorizon
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                    }`}
                  >
                    {horizonsData.earth!.isGeometricAboveHorizon ? "Visible (Geometric)" : "Below Horizon"}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-500/30">
                    Awaiting Horizons
                  </span>
                )}
              </div>

              {hasEphemeris ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="block text-[10px] font-sans text-slate-400">Azimuth</span>
                    <span className="text-white font-bold">{horizonsData.earth!.azimuthDeg.toFixed(2)}°</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="block text-[10px] font-sans text-slate-400">Elevation</span>
                    <span className="text-white font-bold">{horizonsData.earth!.elevationDeg.toFixed(2)}°</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-1">
                  Horizons data unavailable. No hardcoded angles displayed.
                </div>
              )}

              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0 text-sky-400" />
                <span>Source: JPL Horizons (target 399). Local terrain obstruction not modeled.</span>
              </p>
            </div>

            {/* Card 3: Communication Visibility */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Radio className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Communication Visibility</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                    hasEphemeris && horizonsData.earth!.isGeometricAboveHorizon
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                      : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                  }`}
                >
                  {hasEphemeris && horizonsData.earth!.isGeometricAboveHorizon
                    ? "Direct Link Active"
                    : "No Direct Link"}
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Visibility State:</span>
                  <span className="font-mono text-white">
                    {hasEphemeris && horizonsData.earth!.isGeometricAboveHorizon
                      ? "Earth geometric LOS clear"
                      : "Earth below horizon"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Observation Epoch:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {missionDate} {missionTimeUtc} UTC
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Surrounding Terrain */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Mountain className="h-4 w-4" />
                  <span className="text-xs font-semibold text-white">Surrounding Terrain</span>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 border border-white/10">
                  LOLA Reference
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="block text-[10px] font-sans text-slate-400">Elevation Datum</span>
                  <span className="text-white font-bold">1737.4 km</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="block text-[10px] font-sans text-slate-400">Obstruction</span>
                  <span className="text-white font-bold">Raycast Pending</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Detailed radial horizon DEM obstruction calculation is scheduled in Phase 5 roadmap.
              </p>
            </div>

            {/* Export PDF Action */}
            <button
              type="button"
              onClick={() => alert("Analysis report PDF generation is scheduled for Phase 5.")}
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
