"use client";

import React from "react";
import {
  SlidersHorizontal,
  MapPin,
  Calendar,
  Clock,
  Layers,
  Play,
  AlertCircle,
} from "lucide-react";
import { SolarEnergy, type SolarFormValues } from "@/components/mission/solar-energy";
import type { RawMissionFormValues } from "@/lib/validation/mission-input-schema";
import type { FormValidationErrors } from "@/types/mission";

export interface MissionInputPanelProps {
  formValues: RawMissionFormValues;
  errors: FormValidationErrors;
  solarValues?: SolarFormValues;
  solarErrors?: Partial<Record<keyof SolarFormValues, string>>;
  isStale: boolean;
  isLoading: boolean;
  onChange: (field: keyof RawMissionFormValues, value: string) => void;
  onSolarChange?: (field: keyof SolarFormValues, value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function MissionInputPanel({
  formValues,
  errors,
  solarValues = {},
  solarErrors = {},
  isStale,
  isLoading,
  onChange,
  onSolarChange = () => {},
  onSubmit,
}: MissionInputPanelProps) {
  return (
    <section
      aria-labelledby="mission-input-heading"
      className="flex flex-col h-full rounded-2xl border border-sky-500/20 bg-[#0c1524]/85 p-5 shadow-2xl backdrop-blur-md text-white"
    >
      {/* Panel Header */}
      <div className="mb-4 flex items-center gap-2.5 border-b border-white/10 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </div>
        <h2 id="mission-input-heading" className="text-base font-bold tracking-tight text-white">
          Mission Input
        </h2>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col flex-1 justify-between space-y-4">
        <div className="space-y-4">
          {/* Landing Location */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-sky-400">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-200">
                Landing Location
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="ws-latitude" className="block text-[11px] font-medium text-slate-400 mb-0.5">
                  Latitude (°)
                </label>
                <input
                  id="ws-latitude"
                  name="latitude"
                  type="text"
                  value={formValues.latitude}
                  onChange={(e) => onChange("latitude", e.target.value)}
                  placeholder="-89.50"
                  disabled={isLoading}
                  className={`w-full rounded-lg border bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
                    errors.latitude
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-white/15 focus:border-sky-400 focus:ring-sky-400"
                  }`}
                />
                {errors.latitude && (
                  <p className="mt-0.5 text-[10px] text-rose-400 font-medium">
                    {errors.latitude}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="ws-longitude" className="block text-[11px] font-medium text-slate-400 mb-0.5">
                  Longitude (°)
                </label>
                <input
                  id="ws-longitude"
                  name="longitude"
                  type="text"
                  value={formValues.longitude}
                  onChange={(e) => onChange("longitude", e.target.value)}
                  placeholder="0.00"
                  disabled={isLoading}
                  className={`w-full rounded-lg border bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
                    errors.longitude
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-white/15 focus:border-sky-400 focus:ring-sky-400"
                  }`}
                />
                {errors.longitude && (
                  <p className="mt-0.5 text-[10px] text-rose-400 font-medium">
                    {errors.longitude}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mission Date */}
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-sky-400">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <label htmlFor="ws-missionDate" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Mission Date
              </label>
            </div>
            <input
              id="ws-missionDate"
              name="missionDate"
              type="date"
              value={formValues.missionDate}
              onChange={(e) => onChange("missionDate", e.target.value)}
              disabled={isLoading}
              className={`w-full rounded-lg border bg-white/5 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 ${
                errors.missionDate
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-white/15 focus:border-sky-400 focus:ring-sky-400"
              }`}
            />
            {errors.missionDate && (
              <p className="mt-0.5 text-[10px] text-rose-400 font-medium">
                {errors.missionDate}
              </p>
            )}
          </div>

          {/* Mission Time (UTC) */}
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-sky-400">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <label htmlFor="ws-missionTimeUtc" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Mission Time (UTC)
              </label>
            </div>
            <input
              id="ws-missionTimeUtc"
              name="missionTimeUtc"
              type="time"
              value={formValues.missionTimeUtc}
              onChange={(e) => onChange("missionTimeUtc", e.target.value)}
              disabled={isLoading}
              className={`w-full rounded-lg border bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 ${
                errors.missionTimeUtc
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-white/15 focus:border-sky-400 focus:ring-sky-400"
              }`}
            />
            {errors.missionTimeUtc && (
              <p className="mt-0.5 text-[10px] text-rose-400 font-medium">
                {errors.missionTimeUtc}
              </p>
            )}
          </div>

          {/* Compare Location (Optional) */}
          <div>
            <div className="mb-0.5 flex items-center gap-1.5 text-sky-400">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <label htmlFor="ws-additionalSite" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Compare Location (Optional)
              </label>
            </div>
            <p className="mb-1 text-[10px] text-slate-400">
              Add comparison coordinates (lat, lon)
            </p>
            <input
              id="ws-additionalSite"
              name="additionalSite"
              type="text"
              value={formValues.additionalSite}
              onChange={(e) => onChange("additionalSite", e.target.value)}
              placeholder="e.g. -88.8, 12.4"
              disabled={isLoading}
              className={`w-full rounded-lg border bg-white/5 px-2.5 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 ${
                errors.additionalSite
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-white/15 focus:border-sky-400 focus:ring-sky-400"
              }`}
            />
            {errors.additionalSite && (
              <p className="mt-0.5 text-[10px] text-rose-400 font-medium">
                {errors.additionalSite}
              </p>
            )}
          </div>

          {/* Solar Energy Configuration (Phase 8 Accordion with Lightning) */}
          <SolarEnergy
            values={solarValues}
            onChange={onSolarChange}
            errors={solarErrors}
          />
        </div>

        {/* Footer actions */}
        <div className="space-y-2 pt-2">
          {isStale && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[11px] text-amber-300">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Inputs changed — analyse again</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/20 hover:from-sky-600 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
            <span>{isLoading ? "Computing..." : "Analyse Mission Conditions"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

