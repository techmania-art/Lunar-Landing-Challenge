"use client";

import React, { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

export interface ColorMeaningItem {
  colorName: string;
  meaning: string;
  use: string;
  dotClass: string;
  badgeClass: string;
}

export const COLOR_MEANINGS: ColorMeaningItem[] = [
  {
    colorName: "Green",
    meaning: "Active / OK",
    use: "A validated favorable condition or active system state.",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    badgeClass: "border-emerald-400/40 bg-emerald-500/20 text-emerald-300",
  },
  {
    colorName: "Yellow / Amber",
    meaning: "Caution",
    use: "A constraint, warning, partial result, or condition requiring attention.",
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    badgeClass: "border-amber-400/40 bg-amber-500/20 text-amber-300",
  },
  {
    colorName: "Red",
    meaning: "Blocked / Critical",
    use: "A verified condition that prevents the stated operation or represents a critical failure.",
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
    badgeClass: "border-rose-400/40 bg-rose-500/20 text-rose-300",
  },
  {
    colorName: "Cyan",
    meaning: "Measurement",
    use: "A computed scientific value or measurement, such as an angle, energy value, or coordinate.",
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    badgeClass: "border-sky-400/40 bg-sky-500/20 text-sky-300",
  },
  {
    colorName: "Neutral",
    meaning: "Information / Not Evaluated",
    use: "Informational, pending, unavailable, or not-yet-evaluated state.",
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-500/40 bg-slate-500/20 text-slate-300",
  },
];

export function ResultsColorLegend() {
  const [isOpenMobile, setIsOpenMobile] = useState(true);

  return (
    <aside
      aria-label="Result Colors & Meaning"
      className="mission-result-card relative flex flex-col justify-between p-5 text-white"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(155,213,239,0.20)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 ring-1 ring-sky-400/40">
              <Info className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Result Colors &amp; Meaning
              </h3>
              <p className="text-[11px] text-slate-300">Semantic status key</p>
            </div>
          </div>

          {/* Toggle for smaller screens */}
          <button
            type="button"
            onClick={() => setIsOpenMobile((prev) => !prev)}
            aria-expanded={isOpenMobile}
            aria-label="Toggle status key visibility"
            className="xl:hidden flex items-center gap-1 rounded-lg border border-[rgba(155,213,239,0.25)] bg-[rgba(14,28,44,0.65)] px-2 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            <span>{isOpenMobile ? "Hide" : "Show"}</span>
            {isOpenMobile ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Legend List */}
        <div className={`mt-3.5 space-y-3 ${isOpenMobile ? "block" : "hidden xl:block"}`}>
          {COLOR_MEANINGS.map((item) => (
            <div
              key={item.colorName}
              className="rounded-xl bg-[rgba(14,28,44,0.65)] border border-[rgba(155,213,239,0.18)] p-2.5 backdrop-blur-sm space-y-1 transition-colors hover:border-[rgba(155,213,239,0.35)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.dotClass}`}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold text-white tracking-tight">
                    {item.meaning}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider border ${item.badgeClass}`}
                >
                  {item.colorName.split(" / ")[0]}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-normal pl-4.5">
                {item.use}
              </p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

