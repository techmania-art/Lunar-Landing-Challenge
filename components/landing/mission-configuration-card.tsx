"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  MapPin,
  Calendar,
  Clock,
  Layers,
  Play,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import {
  validateMissionForm,
  type RawMissionFormValues,
} from "@/lib/validation/mission-input-schema";
import type { MissionInput, FormValidationErrors } from "@/types/mission";

export interface MissionConfigurationCardProps {
  onSubmit?: (data: MissionInput) => Promise<void> | void;
  isLoading?: boolean;
}

export function MissionConfigurationCard({
  onSubmit,
  isLoading = false,
}: MissionConfigurationCardProps) {
  // Lazily restore saved mission configuration if returning to input page
  const [formValues, setFormValues] = useState<RawMissionFormValues>(() => {
    const defaultValues: RawMissionFormValues = {
      latitude: "",
      longitude: "",
      missionDate: "",
      missionTimeUtc: "12:00",
      additionalSite: "",
    };
    if (typeof window !== "undefined" && window.sessionStorage) {
      const saved = window.sessionStorage.getItem("lunar_mission_config");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            latitude: parsed.latitude !== undefined ? String(parsed.latitude) : "",
            longitude: parsed.longitude !== undefined ? String(parsed.longitude) : "",
            missionDate: parsed.missionDate ? String(parsed.missionDate) : "",
            missionTimeUtc: parsed.missionTimeUtc ? String(parsed.missionTimeUtc) : "12:00",
            additionalSite: parsed.additionalSite
              ? `${parsed.additionalSite.latitude}, ${parsed.additionalSite.longitude}`
              : "",
          };
        } catch {
          // ignore parse error
        }
      }
    }
    return defaultValues;
  });

  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [submittedData, setSubmittedData] = useState<MissionInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof RawMissionFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || isLoading) return;

    const validationResult = validateMissionForm(formValues);
    if (!validationResult.success) {
      setErrors(validationResult.errors);
      setSubmittedData(null);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(
          "lunar_mission_config",
          JSON.stringify(validationResult.data)
        );
      }
      if (onSubmit) {
        await onSubmit(validationResult.data);
      }
      setSubmittedData(validationResult.data);
    } catch {
      setErrors({ general: "Unable to process mission submission. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = isSubmitting || isLoading;

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-md transition-all sm:p-8 text-slate-900">
      {/* Card Header */}
      <div className="mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5 text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Mission Configuration
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          Enter mission details to analyse lunar conditions.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* General Form Error Alert */}
        {errors.general && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200"
          >
            {errors.general}
          </div>
        )}

        {/* Section 1: Landing Location (Latitude & Longitude) */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-900">
              Landing Location
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="latitude"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Latitude (°)
              </label>
              <input
                id="latitude"
                name="latitude"
                type="text"
                placeholder="e.g. -89.5"
                value={formValues.latitude}
                onChange={(e) => handleChange("latitude", e.target.value)}
                disabled={busy}
                aria-invalid={!!errors.latitude}
                aria-describedby={errors.latitude ? "latitude-error" : undefined}
                className={`w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.latitude
                    ? "border-red-400 focus:border-red-500 focus:ring-red-400/20"
                    : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/20"
                }`}
              />
              {errors.latitude && (
                <p
                  id="latitude-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 font-medium"
                >
                  {errors.latitude}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="longitude"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Longitude (°)
              </label>
              <input
                id="longitude"
                name="longitude"
                type="text"
                placeholder="e.g. 0.0"
                value={formValues.longitude}
                onChange={(e) => handleChange("longitude", e.target.value)}
                disabled={busy}
                aria-invalid={!!errors.longitude}
                aria-describedby={errors.longitude ? "longitude-error" : undefined}
                className={`w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.longitude
                    ? "border-red-400 focus:border-red-500 focus:ring-red-400/20"
                    : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/20"
                }`}
              />
              {errors.longitude && (
                <p
                  id="longitude-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 font-medium"
                >
                  {errors.longitude}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Mission Date */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <label
              htmlFor="missionDate"
              className="text-sm font-semibold text-slate-900 cursor-pointer"
            >
              Mission Date
            </label>
          </div>
          <p className="mb-2 text-xs text-slate-500">Target lunar arrival epoch</p>
          <input
            id="missionDate"
            name="missionDate"
            type="date"
            value={formValues.missionDate}
            onChange={(e) => handleChange("missionDate", e.target.value)}
            disabled={busy}
            aria-invalid={!!errors.missionDate}
            aria-describedby={errors.missionDate ? "date-error" : undefined}
            className={`w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              errors.missionDate
                ? "border-red-400 focus:border-red-500 focus:ring-red-400/20"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/20"
            }`}
          />
          {errors.missionDate && (
            <p
              id="date-error"
              role="alert"
              className="mt-1 text-xs text-red-600 font-medium"
            >
              {errors.missionDate}
            </p>
          )}
        </div>

        {/* Section 3: Mission Time (UTC) */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <label
              htmlFor="missionTimeUtc"
              className="text-sm font-semibold text-slate-900 cursor-pointer"
            >
              Mission Time (UTC)
            </label>
          </div>
          <input
            id="missionTimeUtc"
            name="missionTimeUtc"
            type="time"
            value={formValues.missionTimeUtc}
            onChange={(e) => handleChange("missionTimeUtc", e.target.value)}
            disabled={busy}
            aria-invalid={!!errors.missionTimeUtc}
            aria-describedby={errors.missionTimeUtc ? "time-error" : undefined}
            className={`w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              errors.missionTimeUtc
                ? "border-red-400 focus:border-red-500 focus:ring-red-400/20"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/20"
            }`}
          />
          {errors.missionTimeUtc && (
            <p
              id="time-error"
              role="alert"
              className="mt-1 text-xs text-red-600 font-medium"
            >
              {errors.missionTimeUtc}
            </p>
          )}
        </div>

        {/* Section 4: Additional Site (Optional) */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <label
              htmlFor="additionalSite"
              className="text-sm font-semibold text-slate-900 cursor-pointer"
            >
              Additional Site (Optional)
            </label>
          </div>
          <p className="mb-2 text-xs text-slate-500">
            Add another location to compare (lat, lon)
          </p>
          <input
            id="additionalSite"
            name="additionalSite"
            type="text"
            placeholder="e.g. -88.8, 12.4"
            value={formValues.additionalSite}
            onChange={(e) => handleChange("additionalSite", e.target.value)}
            disabled={busy}
            aria-invalid={!!errors.additionalSite}
            aria-describedby={errors.additionalSite ? "additional-error" : undefined}
            className={`w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              errors.additionalSite
                ? "border-red-400 focus:border-red-500 focus:ring-red-400/20"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/20"
            }`}
          />
          {errors.additionalSite && (
            <p
              id="additional-error"
              role="alert"
              className="mt-1 text-xs text-red-600 font-medium"
            >
              {errors.additionalSite}
            </p>
          )}
        </div>

        {/* Primary CTA Button */}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-blue-800 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-sky-600 hover:via-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4 fill-white text-white" aria-hidden="true" />
          <span>
            {busy ? "Validating & Analysing..." : "Analyse Mission Conditions"}
          </span>
        </button>

        {/* Validated payload confirmation */}
        {submittedData && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Mission configuration validated ({submittedData.latitude}°,{" "}
                {submittedData.longitude}° at {submittedData.missionDate}{" "}
                {submittedData.missionTimeUtc} UTC).
              </span>
            </div>
            <a
              href={`/workspace?lat=${encodeURIComponent(submittedData.latitude)}&lon=${encodeURIComponent(submittedData.longitude)}&date=${encodeURIComponent(submittedData.missionDate)}&time=${encodeURIComponent(submittedData.missionTimeUtc)}${submittedData.additionalSite ? `&compare=${encodeURIComponent(`${submittedData.additionalSite.latitude},${submittedData.additionalSite.longitude}`)}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors w-fit"
            >
              <span>Open Mission Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </form>
    </div>
  );
}
