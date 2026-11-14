"use client";

import React, { useState } from "react";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";
import { MissionInputPanel } from "@/components/workspace/mission-input-panel";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";
import { MissionAnalysisPanel } from "@/components/workspace/mission-analysis-panel";
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
  const [formValues, setFormValues] = useState<RawMissionFormValues>({
    latitude: initialValues?.latitude || "-89.50",
    longitude: initialValues?.longitude || "0.00",
    missionDate: initialValues?.missionDate || "2028-01-15",
    missionTimeUtc: initialValues?.missionTimeUtc || "12:00",
    additionalSite: initialValues?.additionalSite || "",
  });

  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [horizonsData, setHorizonsData] = useState<HorizonsMissionAnalysisResponse | null>(null);
  const [horizonsError, setHorizonsError] = useState<string | null>(null);

  // Geographic coordinates passed to the Lunar Map
  const [mapCoords, setMapCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: -89.50,
    longitude: 0.00,
  });

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

    const validationResult = validateMissionForm(formValues);
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
  };

  return (
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden bg-[#071321] text-white font-sans">
      {/* Background with Lunar Landscape along the bottom */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-no-repeat bg-[center_bottom] pointer-events-none opacity-40 select-none"
        style={{
          backgroundImage: `url('/images/lunar-mission-background.png')`,
        }}
      />
      {/* Deep Space Atmosphere Gradient */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, 
            rgba(7, 19, 33, 0.90) 0%, 
            rgba(7, 19, 33, 0.70) 50%, 
            rgba(7, 19, 33, 0.85) 100%)`,
        }}
      />

      {/* 1. Top Navigation */}
      <WorkspaceNavigation />

      {/* 2. Main Three-Panel Workspace */}
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
