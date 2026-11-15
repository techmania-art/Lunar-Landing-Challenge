"use client";

import React, { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Orbit, ArrowLeft, ArrowRight, Activity, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { PowerSituationCard } from "./power-situation-card";
import { TerrainCommunicationCard } from "./terrain-communication-card";
import { ResultsColorLegend } from "./results-color-legend";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";
import type { SolarFormValues } from "@/components/mission/solar-energy";
import type { RawMissionFormValues } from "@/lib/validation/mission-input-schema";
import { evaluateSolarIllumination, calculateSolarEnergy } from "@/lib/services/solar/solar-calculator";
import { evaluateTraverseFeasibility } from "@/lib/services/rover/rover-calculator";
import { analyzeRouteTerrain } from "@/lib/services/terrain/terrain-calculator";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";
import type { SolarPanelConfig } from "@/lib/services/solar/solar-types";

export interface StoredMissionState {
  formValues?: RawMissionFormValues;
  solarValues?: SolarFormValues;
  mapCoords?: { latitude: number; longitude: number };
  horizonsData?: HorizonsMissionAnalysisResponse | null;
  horizonsError?: string | null;
  isStale?: boolean;
  timestamp?: number;
}

function subscribe(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }
  return () => { };
}

function getActiveStateRaw(): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  return window.sessionStorage.getItem("lunar_mission_active_state");
}

function getConfigRaw(): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  return window.sessionStorage.getItem("lunar_mission_config");
}

const getServerSnapshot = () => null;

export function MissionOperationalResultsView() {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const activeRaw = useSyncExternalStore(subscribe, getActiveStateRaw, getServerSnapshot);
  const configRaw = useSyncExternalStore(subscribe, getConfigRaw, getServerSnapshot);

  const missionState = useMemo<StoredMissionState | null>(() => {
    if (!isClient) return null;
    try {
      if (activeRaw) {
        return JSON.parse(activeRaw) as StoredMissionState;
      }
      if (configRaw) {
        const parsed = JSON.parse(configRaw);
        if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
          return {
            formValues: {
              latitude: String(parsed.latitude),
              longitude: String(parsed.longitude),
              missionDate: parsed.missionDate || "2028-01-15",
              missionTimeUtc: parsed.missionTimeUtc || "12:00",
              additionalSite: "",
            },
            mapCoords: {
              latitude: Number(parsed.latitude),
              longitude: Number(parsed.longitude),
            },
          };
        }
      }
    } catch {
      // ignore JSON parse error
    }
    return null;
  }, [isClient, activeRaw, configRaw]);

  const formValues = missionState?.formValues;
  const solarValues = missionState?.solarValues;
  const mapCoords = missionState?.mapCoords || {
    latitude: Number(formValues?.latitude ?? -89.5),
    longitude: Number(formValues?.longitude ?? 0.0),
  };
  const horizonsData = missionState?.horizonsData;
  const horizonsError = missionState?.horizonsError;
  const isStale = Boolean(missionState?.isStale);

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

  const observationEpoch = `${formValues?.missionDate || "2028-01-15"} ${formValues?.missionTimeUtc || "12:00"} UTC`;

  // Solar calculations
  const illumination = hasSun
    ? evaluateSolarIllumination(
      mapCoords.latitude,
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

  // Rover feasibility calculation
  const hasRoverInputs = Boolean(
    solarValues?.batteryCapacityWh &&
    Number(solarValues.batteryCapacityWh) > 0 &&
    solarValues?.drivePowerW &&
    Number(solarValues.drivePowerW) > 0
  );

  const hasDestCoords = Boolean(
    solarValues?.destLatitude &&
    solarValues?.destLongitude &&
    Number.isFinite(Number(solarValues.destLatitude)) &&
    Number.isFinite(Number(solarValues.destLongitude))
  );

  const traverseResult = evaluateTraverseFeasibility({
    battery: hasRoverInputs
      ? {
        nominalCapacityWh: Number(solarValues!.batteryCapacityWh),
        maxDepthOfDischargePercent: Number(solarValues?.maxDodPercent || 80),
        initialSocPercent: Number(solarValues?.initialSocPercent || 100),
      }
      : undefined,
    consumption: hasRoverInputs
      ? {
        drivePowerW: Number(solarValues!.drivePowerW),
        idlePowerW: Number(solarValues?.idlePowerW || 20),
        driveSpeedKmH: Number(solarValues?.driveSpeedKmH || 0.5),
        safetyReservePercent: Number(solarValues?.safetyReservePercent || 15),
      }
      : undefined,
    route:
      hasDestCoords && Number.isFinite(mapCoords.latitude) && Number.isFinite(mapCoords.longitude)
        ? {
          startLatitudeDeg: mapCoords.latitude,
          startLongitudeDeg: mapCoords.longitude,
          destLatitudeDeg: Number(solarValues!.destLatitude),
          destLongitudeDeg: Number(solarValues!.destLongitude),
        }
        : undefined,
    solarEnergyGeneratedWh: solarEnergy.estimatedEnergyWh || 0,
    missionDurationHours: durationHours,
  });

  // Terrain corridor calculation
  const terrainData: TerrainAnalysisResponse | null = hasDestCoords
    ? analyzeRouteTerrain({
      route: {
        coordinates: [
          { latitude: mapCoords.latitude, longitude: mapCoords.longitude },
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

  return (
    <div
      className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden text-white font-sans"
      style={{
        backgroundImage: "url('/images/Horizon.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Top Header Navigation */}
      <header className="w-full border-b border-[rgba(155,213,239,0.20)] bg-[#071321]/80 backdrop-blur-md sticky top-0 z-30">
        <nav
          aria-label="Mission Results Navigation"
          className="mx-auto flex max-w-[1700px] items-center justify-between px-6 py-3.5 sm:px-8"
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Orbit className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Lunar Mission Planner
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/workspace"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Mission Planner
            </Link>
            <Link
              href="/workspace#mission-analysis-heading"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Analysis
            </Link>
            <span
              className="rounded-full bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-200 ring-1 ring-sky-400/50 shadow-sm"
              aria-current="page"
            >
              Results
            </span>
            <Link
              href="/3d-simulation"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Simulation
            </Link>
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Workspace</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area - Moved upward with reduced vertical spacing */}
      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-4 pt-3 pb-8 sm:px-6 sm:pt-4 lg:px-8">
        {/* Centered Page Title & Subtitle */}
        <div className="text-center space-y-1.5 mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(155,213,239,0.30)] bg-[rgba(9,22,36,0.65)] px-3.5 py-1 text-[11px] font-mono text-sky-300 shadow-sm backdrop-blur-md">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span>Site: {mapCoords.latitude.toFixed(2)}°, {mapCoords.longitude.toFixed(2)}°</span>
            <span className="text-slate-500">•</span>
            <span>Epoch: {observationEpoch}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider text-white uppercase drop-shadow-md">
            Mission Operational Results
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Lunar Rover Mission Assessment — Executive power generation sufficiency and terrain-horizon communication line of sight.
          </p>

          {/* Operational Status Pill */}
          <div className="pt-1 flex justify-center">
            {isStale ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                <span>Inputs Stale — Analysis Outdated</span>
              </div>
            ) : hasError ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 shadow-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Ephemeris Service Unavailable</span>
              </div>
            ) : isPartial ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Partial Ephemerides Retrieved</span>
              </div>
            ) : isSuccess ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Analysis Verified & Complete</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/40 bg-slate-500/20 px-3 py-1 text-xs font-semibold text-slate-300 shadow-sm">
                <Activity className="h-3.5 w-3.5" />
                <span>Awaiting Workspace Analysis Execution</span>
              </div>
            )}
          </div>
        </div>

        {/* Empty State when no analysis has been executed yet */}
        {isClient && !horizonsData && (
          <div className="mission-result-card max-w-xl mx-auto p-8 text-center space-y-4 my-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/40 mx-auto shadow-lg">
              <Activity className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white">No Active Analysis Results</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Operational mission results require live ephemerides and terrain modeling. Configure coordinates and execute an analysis in the Mission Workspace to view operational results.
            </p>
            <div className="pt-2">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-blue-500 transition-all"
              >
                <span>Go to Mission Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Phase 17 Three-Column Layout: Power (~40%), Terrain (~40%), and Result Colors Legend (~20%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 items-start w-full">
          {/* Left Panel: Power Situation (~40% on xl) */}
          <div className="lg:col-span-1 xl:col-span-5 h-full flex flex-col">
            <PowerSituationCard
              solarEnergy={solarEnergy}
              solarIllumination={illumination}
              traverseResult={traverseResult}
              solarValues={solarValues}
              observationEpoch={observationEpoch}
              isStale={isStale}
            />
          </div>

          {/* Center Panel: Terrain & Communication Situation (~40% on xl) */}
          <div className="lg:col-span-1 xl:col-span-5 h-full flex flex-col">
            <TerrainCommunicationCard
              hasEarth={hasEarth}
              earthElevationDeg={horizonsData?.earth?.elevationDeg}
              earthAzimuthDeg={horizonsData?.earth?.azimuthDeg}
              observationEpoch={observationEpoch}
              terrainData={terrainData}
              isStale={isStale}
            />
          </div>

          {/* Right Panel: Result Colors & Meaning Legend (~20% on xl, full-width row on lg, stacked on mobile) */}
          <div className="lg:col-span-2 xl:col-span-2 w-full">
            <ResultsColorLegend />
          </div>
        </div>
      </main>
    </div>
  );
}
