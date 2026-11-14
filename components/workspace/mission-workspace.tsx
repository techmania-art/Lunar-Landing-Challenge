"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";
import { MissionInputPanel } from "@/components/workspace/mission-input-panel";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";
import { MissionAnalysisPanel } from "@/components/workspace/mission-analysis-panel";
import { AnalysisBackground } from "@/components/analysis/analysis-background";
import {
  validateMissionForm,
  type RawMissionFormValues,
} from "@/lib/validation/mission-input-schema";
import type { FormValidationErrors } from "@/types/mission";
import type { HorizonsMissionAnalysisResponse } from "@/lib/services/horizons/horizons-types";

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
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [horizonsData, setHorizonsData] = useState<HorizonsMissionAnalysisResponse | null>(null);
  const [horizonsError, setHorizonsError] = useState<string | null>(null);

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
      if (res.ok && json.success) {
        setHorizonsData(json);
        setHorizonsError(null);
      } else {
        setHorizonsData(json);
        setHorizonsError(json.error || "Failed to retrieve ephemerides from JPL Horizons");
      }
    } catch (err: unknown) {
      setHorizonsError(
        (err as Error)?.message || "Network error communicating with ephemerides service"
      );
    } finally {
      setIsLoading(false);
      setIsStale(false);
    }
  }, []);

  // Run initial analysis on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void performAnalysis(formValues);
    }, 0);
    return () => clearTimeout(timer);
  }, [formValues, performAnalysis]);

  // Keep map coordinates synchronized with valid numeric inputs
  const handleFieldChange = (field: keyof RawMissionFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setIsStale(true);

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

  const handleAnalyseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    await performAnalysis(formValues);
  };

  return (
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden text-white font-sans">
      {/* 1. Reusable Looping MP4 Video Background Layer (Phase 3 Component, Unchanged) */}
      <AnalysisBackground />

      {/* 2. Top Navigation */}
      <WorkspaceNavigation />

      {/* 3. Main Three-Panel Workspace Foreground */}
      <main className="mx-auto flex w-full max-w-[1700px] flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 items-stretch min-h-[calc(100svh-5rem)]">
          {/* Left Panel: Mission Input (~21% width -> 3 cols) */}
          <div className="lg:col-span-3 h-full">
            <MissionInputPanel
              formValues={formValues}
              errors={errors}
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
            />
          </div>

          {/* Right Panel: Mission Analysis (~27% width -> 3 cols) */}
          <div className="lg:col-span-3 h-full">
            <MissionAnalysisPanel
              isLoading={isLoading}
              missionDate={formValues.missionDate}
              missionTimeUtc={formValues.missionTimeUtc}
              horizonsData={horizonsData}
              horizonsError={horizonsError}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
