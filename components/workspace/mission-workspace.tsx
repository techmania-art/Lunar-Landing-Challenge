"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";
import { MissionInputPanel } from "@/components/workspace/mission-input-panel";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";
import { MissionAnalysisPanel } from "@/components/workspace/mission-analysis-panel";
import { AnalysisBackground } from "@/components/analysis/analysis-background";
import { SISChatPanel } from "@/components/sis/sis-chat-panel";
import { buildMissionContextSnapshot } from "@/lib/services/mission-context/mission-context-builder";
import {
  validateMissionForm,
  type RawMissionFormValues,
} from "@/lib/validation/mission-input-schema";
import type { FormValidationErrors } from "@/types/mission";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";
import type { SolarFormValues } from "@/components/mission/solar-energy";
import { analyzeRouteTerrain } from "@/lib/services/terrain/terrain-calculator";

export interface MissionWorkspaceProps {
  initialValues?: Partial<RawMissionFormValues>;
}

export function MissionWorkspace({ initialValues }: MissionWorkspaceProps) {
  const searchParams = useSearchParams();

  const [formValues, setFormValues] = useState<RawMissionFormValues>(() => {
    if (initialValues?.latitude && initialValues?.longitude) {
      return {
        latitude: initialValues.latitude,
        longitude: initialValues.longitude,
        missionDate: initialValues.missionDate || "2028-01-15",
        missionTimeUtc: initialValues.missionTimeUtc || "12:00",
        additionalSite: initialValues.additionalSite || "",
      };
    }

    const urlLat = searchParams?.get("lat");
    const urlLon = searchParams?.get("lon");
    if (urlLat && urlLon) {
      return {
        latitude: urlLat,
        longitude: urlLon,
        missionDate: searchParams?.get("date") || "2028-01-15",
        missionTimeUtc: searchParams?.get("time") || "12:00",
        additionalSite: searchParams?.get("compare") || "",
      };
    }

    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const saved = window.sessionStorage.getItem("lunar_mission_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.latitude !== undefined && parsed.longitude !== undefined) {
            return {
              latitude: String(parsed.latitude),
              longitude: String(parsed.longitude),
              missionDate: parsed.missionDate || "2028-01-15",
              missionTimeUtc: parsed.missionTimeUtc || "12:00",
              additionalSite: parsed.additionalSite
                ? `${parsed.additionalSite.latitude}, ${parsed.additionalSite.longitude}`
                : "",
            };
          }
        }
      } catch {
        // ignore storage errors
      }
    }

    return {
      latitude: "-89.50",
      longitude: "0.00",
      missionDate: "2028-01-15",
      missionTimeUtc: "12:00",
      additionalSite: "",
    };
  });

  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [solarValues, setSolarValues] = useState<SolarFormValues>({
    panelArea: "1.20",
    panelEfficiency: "28.5",
    panelOrientation: "horizontal",
    analysisDurationHours: "4.0",
  });
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [horizonsData, setHorizonsData] = useState<HorizonsMissionAnalysisResponse | null>(null);
  const [horizonsError, setHorizonsError] = useState<string | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const [missionRevision, setMissionRevision] = useState(1);

  // SIS Assistant local UI state (Phase 21)
  const [isSisOpen, setIsSisOpen] = useState(false);
  const [isSisMinimized, setIsSisMinimized] = useState(false);

  // Geographic coordinates passed to the Lunar Map
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number }>(() => ({
    latitude: Number(formValues.latitude) || -89.50,
    longitude: Number(formValues.longitude) || 0.00,
  }));

  const performAnalysis = useCallback(async (values: RawMissionFormValues) => {
    const validationResult = validateMissionForm(values);
    if (!validationResult.success) {
      setErrors(validationResult.errors);
      return;
    }

    const currentRequestId = ++latestRequestIdRef.current;
    setErrors({});
    setIsLoading(true);
    setHorizonsError(null);

    setMapCoords({
      latitude: validationResult.data.latitude,
      longitude: validationResult.data.longitude,
    });

    try {
      const res = await fetch("/api/horizons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: validationResult.data.latitude,
          longitude: validationResult.data.longitude,
          missionDate: validationResult.data.missionDate,
          missionTimeUtc: validationResult.data.missionTimeUtc,
        }),
      });

      const json = await res.json();
      // Drop response if a newer request was dispatched while waiting
      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }

      if (res.ok && (json.success || json.status === "partial")) {
        setHorizonsData(json);
        setHorizonsError(null);
        setMissionRevision((r) => r + 1);
      } else {
        setHorizonsData(json);
        setHorizonsError(json.error || "Failed to retrieve ephemerides from JPL Horizons");
        setMissionRevision((r) => r + 1);
      }
    } catch (err: unknown) {
      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }
      setHorizonsError(
        (err as Error)?.message || "Network error communicating with ephemerides service"
      );
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setIsLoading(false);
        setIsStale(false);
      }
    }
  }, []);

  // Run initial analysis on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void performAnalysis(formValues);
    }, 0);
    return () => clearTimeout(timer);
  }, [formValues, performAnalysis]);

  // Synchronize active mission state to sessionStorage for dedicated results page
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(
          "lunar_mission_active_state",
          JSON.stringify({
            formValues,
            solarValues,
            mapCoords,
            horizonsData,
            horizonsError,
            isStale,
            timestamp: Date.now(),
          })
        );
      } catch {
        // ignore
      }
    }
  }, [formValues, solarValues, mapCoords, horizonsData, horizonsError, isStale]);

  // Keep map coordinates synchronized with valid numeric inputs
  const handleFieldChange = (field: keyof RawMissionFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsStale(true);
    setMissionRevision((r) => r + 1);

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (field === "latitude" || field === "longitude") {
      const latVal = field === "latitude" ? Number(value) : Number(formValues.latitude);
      const lonVal = field === "longitude" ? Number(value) : Number(formValues.longitude);
      if (Number.isFinite(latVal) && Number.isFinite(lonVal)) {
        setMapCoords({ latitude: latVal, longitude: lonVal });
      }
    }
  };

  const handleSolarChange = (field: keyof SolarFormValues, value: string) => {
    setSolarValues((prev) => ({ ...prev, [field]: value }));
    setMissionRevision((r) => r + 1);
  };

  const handleAnalyseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    await performAnalysis(formValues);
  };

  const destLatNum =
    solarValues.destLatitude !== undefined && solarValues.destLatitude.trim() !== ""
      ? Number(solarValues.destLatitude)
      : undefined;
  const destLonNum =
    solarValues.destLongitude !== undefined && solarValues.destLongitude.trim() !== ""
      ? Number(solarValues.destLongitude)
      : undefined;

  const activeTerrain =
    destLatNum !== undefined &&
    destLonNum !== undefined &&
    Number.isFinite(destLatNum) &&
    Number.isFinite(destLonNum) &&
    Number.isFinite(mapCoords.latitude) &&
    Number.isFinite(mapCoords.longitude)
      ? analyzeRouteTerrain({
          route: {
            coordinates: [
              { latitude: mapCoords.latitude, longitude: mapCoords.longitude },
              { latitude: destLatNum, longitude: destLonNum },
            ],
            corridorWidthMeters: 100,
          },
          rover: { maxSlopeDegrees: 20 },
        })
      : null;

  // Phase 27: Monotonically increasing revision for active mission context synchronization
  const missionSnapshot = useMemo(() => {
    return buildMissionContextSnapshot({
      latitudeDeg: mapCoords.latitude,
      longitudeDeg: mapCoords.longitude,
      missionDate: formValues.missionDate,
      missionTimeUtc: formValues.missionTimeUtc,
      horizonsData,
      horizonsError,
      solarValues,
      terrainData: activeTerrain,
      isStale,
      revision: missionRevision,
    });
  }, [
    mapCoords.latitude,
    mapCoords.longitude,
    formValues.missionDate,
    formValues.missionTimeUtc,
    horizonsData,
    horizonsError,
    solarValues,
    activeTerrain,
    isStale,
    missionRevision,
  ]);

  return (
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden text-white font-sans">
      {/* 1. Reusable Looping MP4 Video Background Layer (Phase 3 Component, Unchanged) */}
      <AnalysisBackground />

      {/* 2. Top Navigation */}
      <WorkspaceNavigation
        onToggleSis={() => {
          setIsSisOpen((prev) => !prev);
          setIsSisMinimized(false);
        }}
        isSisOpen={isSisOpen && !isSisMinimized}
      />

      {/* 3. Main Three-Panel Workspace Foreground */}
      <main className="mx-auto flex w-full max-w-[1700px] flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 items-stretch min-h-[calc(100svh-5rem)]">
          {/* Left Panel: Mission Input (~21% width -> 3 cols) */}
          <div className="lg:col-span-3 h-full">
            <MissionInputPanel
              formValues={formValues}
              errors={errors}
              solarValues={solarValues}
              onSolarChange={handleSolarChange}
              isStale={isStale}
              isLoading={isLoading}
              onChange={handleFieldChange}
              onSubmit={handleAnalyseSubmit}
            />
          </div>

          {/* Center Panel: Lunar Map (~52% width -> 6 cols) */}
          <div className="lg:col-span-6 h-full min-h-[480px] lg:min-h-0">
            <LunarMapPanel
              latitude={mapCoords.latitude}
              longitude={mapCoords.longitude}
              rawLatitude={formValues.latitude}
              rawLongitude={formValues.longitude}
              destLatitude={destLatNum}
              destLongitude={destLonNum}
              terrainFeatures={activeTerrain?.features || []}
            />
          </div>

          {/* Right Panel: Mission Analysis (~27% width -> 3 cols) */}
          <div className="lg:col-span-3 h-full">
            <MissionAnalysisPanel
              isLoading={isLoading}
              isStale={isStale}
              missionDate={formValues.missionDate}
              missionTimeUtc={formValues.missionTimeUtc}
              latitudeDeg={mapCoords.latitude}
              longitudeDeg={mapCoords.longitude}
              solarValues={solarValues}
              horizonsData={horizonsData}
              horizonsError={horizonsError}
            />
          </div>
        </div>
      </main>

      {/* 4. SIS Assistant Floating Panel connected to LiveKit SIS Agent */}
      <SISChatPanel
        isOpen={isSisOpen}
        isMinimized={isSisMinimized}
        onClose={() => setIsSisOpen(false)}
        onToggleMinimize={() => setIsSisMinimized((prev) => !prev)}
        missionSnapshot={missionSnapshot}
        missionContext={{
          latitude: mapCoords.latitude,
          longitude: mapCoords.longitude,
          missionDate: formValues.missionDate,
          missionTimeUtc: formValues.missionTimeUtc,
          solarElevation: horizonsData?.sun?.elevationDeg,
          solarAzimuth: horizonsData?.sun?.azimuthDeg,
          earthElevation: horizonsData?.earth?.elevationDeg,
          earthAzimuth: horizonsData?.earth?.azimuthDeg,
          isStale: isStale,
          snapshot: missionSnapshot,
        }}
      />
    </div>
  );
}
