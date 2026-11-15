"use client";

import React from "react";
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import type {
  CommunicationLinkAnalysis,
  CommunicationStatus,
} from "@/lib/services/communication/communication-types";

export interface CommunicationLinkCardProps {
  commLink: CommunicationLinkAnalysis;
  isLoading?: boolean;
  isStale?: boolean;
}

export function CommunicationLinkCard({
  commLink,
}: CommunicationLinkCardProps) {
  const statusStyles: Record<
    CommunicationStatus,
    { badge: string; border: string; text: string; label: string; icon: React.ReactNode }
  > = {
    available: {
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      label: "Link Available",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    limited: {
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      border: "border-amber-500/30",
      text: "text-amber-400",
      label: "Link Limited",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    unavailable: {
      badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      border: "border-rose-500/30",
      text: "text-rose-400",
      label: "Link Unavailable",
      icon: <XCircle className="h-3 w-3" />,
    },
    unknown: {
      badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
      border: "border-slate-500/30",
      text: "text-slate-400",
      label: "Status Unknown",
      icon: <HelpCircle className="h-3 w-3" />,
    },
    not_configured: {
      badge: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      border: "border-white/10",
      text: "text-slate-400",
      label: "Not Configured",
      icon: <HelpCircle className="h-3 w-3" />,
    },
    pending: {
      badge: "bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse",
      border: "border-sky-500/30",
      text: "text-sky-400",
      label: "Analysis Pending",
      icon: <Clock className="h-3 w-3 animate-spin" />,
    },
    error: {
      badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      border: "border-rose-500/30",
      text: "text-rose-400",
      label: "Analysis Error",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const style = statusStyles[commLink.status] ?? statusStyles.unknown;

  return (
    <div
      aria-label="Communication Link Analysis"
      className={`rounded-xl border ${style.border} bg-white/[0.03] p-3.5 space-y-3 transition-all duration-200`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-indigo-400">
          <Radio className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-semibold text-white tracking-wide">
            Communication Link Analysis
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Active Path Pill */}
          {commLink.selectedPath !== "undetermined" && (
            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-mono text-slate-300 uppercase">
              Path: {commLink.selectedPath}
            </span>
          )}

          {/* Semantic Status Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${style.badge}`}
          >
            {style.icon}
            <span>{style.label}</span>
          </span>
        </div>
      </div>

      {/* Status Reason Callout */}
      <div className="rounded-lg bg-black/30 border border-white/10 p-2.5 space-y-1">
        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Assessment Verdict
          </span>
          <span className="font-mono text-slate-400">
            {commLink.missionEpoch ?? "Epoch Pending"}
          </span>
        </div>
        <p className="text-xs text-slate-200 font-medium leading-relaxed">
          {commLink.statusReason}
        </p>
      </div>

      {/* Four Independent Evaluation Layers Grid */}
      <div className="space-y-2">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Four Evaluation Layers
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Layer 1: Geometric Earth Visibility */}
          <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-sky-400">1. Geometry</span>
              <span
                className={`text-[9px] font-semibold rounded px-1.5 py-0.2 border ${
                  commLink.geometry.aboveGeometricHorizon
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : commLink.geometry.aboveGeometricHorizon === false
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                }`}
              >
                {commLink.geometry.aboveGeometricHorizon ? "Above Horizon" : "Below Horizon"}
              </span>
            </div>
            <div className="font-mono text-[11px] text-white">
              {commLink.geometry.earthElevationDeg !== null
                ? `${commLink.geometry.earthElevationDeg > 0 ? "+" : ""}${commLink.geometry.earthElevationDeg.toFixed(2)}° elev`
                : "N/A"}{" "}
              <span className="text-slate-400 text-[10px]">
                ({commLink.geometry.earthAzimuthDeg?.toFixed(1) ?? "--"}° az)
              </span>
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              Datum: Lunar sphere (R=1737.4 km)
            </p>
          </div>

          {/* Layer 2: Terrain Line of Sight (LOS) */}
          <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-emerald-400">2. Terrain LOS</span>
              <span
                className={`text-[9px] font-semibold rounded px-1.5 py-0.2 border ${
                  commLink.terrainLos.status === "clear"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : commLink.terrainLos.status === "blocked"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                }`}
              >
                {commLink.terrainLos.status.toUpperCase()}
              </span>
            </div>
            <div className="font-mono text-[11px] text-white">
              {commLink.terrainLos.angularClearanceDeg !== null
                ? `${commLink.terrainLos.angularClearanceDeg > 0 ? "+" : ""}${commLink.terrainLos.angularClearanceDeg.toFixed(2)}° clear`
                : "Undetermined"}
              {commLink.terrainLos.obstructionAngleDeg !== null && (
                <span className="text-slate-400 text-[10px]">
                  {" "}({commLink.terrainLos.obstructionAngleDeg.toFixed(1)}° mask)
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              Model: LOLA Polar DEM (100m)
            </p>
          </div>

          {/* Layer 3: RF Link Budget */}
          <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-amber-400">3. RF Link Budget</span>
              <span
                className={`text-[9px] font-semibold rounded px-1.5 py-0.2 border ${
                  commLink.rfLink.status === "pass"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : commLink.rfLink.status === "marginal"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : commLink.rfLink.status === "fail"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                }`}
              >
                {commLink.rfLink.status === "pass"
                  ? "PASS"
                  : commLink.rfLink.status === "marginal"
                  ? "MARGINAL"
                  : commLink.rfLink.status === "fail"
                  ? "FAIL"
                  : "NOT CONFIGURED"}
              </span>
            </div>
            <div className="font-mono text-[11px] text-white">
              {commLink.rfLink.linkMarginDb !== null
                ? `${commLink.rfLink.linkMarginDb >= 0 ? "+" : ""}${commLink.rfLink.linkMarginDb.toFixed(1)} dB margin`
                : "Not configured"}
              {commLink.rfLink.requiredMarginDb !== null && (
                <span className="text-slate-400 text-[10px]">
                  {" "}(req {commLink.rfLink.requiredMarginDb} dB)
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              {commLink.rfLink.pathLossDb !== null
                ? `FSPL: ${commLink.rfLink.pathLossDb} dB · Pr: ${commLink.rfLink.receivedPowerDbm} dBm`
                : "Configure radio in Mission Input"}
            </p>
          </div>

          {/* Layer 4: Relay Path Availability */}
          <div className="bg-white/5 p-2 rounded-lg border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-violet-400">4. Relay Path</span>
              <span
                className={`text-[9px] font-semibold rounded px-1.5 py-0.2 border ${
                  commLink.relay.available === true
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : commLink.relay.configured
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                }`}
              >
                {commLink.relay.available === true
                  ? "AVAILABLE"
                  : commLink.relay.configured
                  ? "UNAVAILABLE"
                  : "NO RELAY"}
              </span>
            </div>
            <div className="font-mono text-[11px] text-white truncate">
              {commLink.relay.relayId ?? "No relay configured"}
            </div>
            <p className="text-[9px] text-slate-400 leading-tight">
              {commLink.relay.available === true
                ? "Operational path closed via orbital relay"
                : "Direct-to-Earth primary path"}
            </p>
          </div>
        </div>
      </div>

      {/* Scientific Caveat / Model Boundaries */}
      <div className="flex items-start gap-1.5 text-[10px] text-slate-400/90 leading-tight pt-1 border-t border-white/5">
        <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-slate-300">Operational Invariant:</strong> Geometric Earth visibility does not guarantee operational communications. Link closure requires clear terrain line-of-sight and a verified positive RF link budget.
        </span>
      </div>
    </div>
  );
}
