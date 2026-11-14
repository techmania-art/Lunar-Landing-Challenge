import React from "react";
import { Sun, Globe, Mountain } from "lucide-react";

export function FeatureHighlights() {
  const features = [
    {
      icon: Sun,
      label: "Sun Analysis",
      color: "text-amber-400",
    },
    {
      icon: Globe,
      label: "Earth Analysis",
      color: "text-sky-400",
    },
    {
      icon: Mountain,
      label: "Terrain & Elevation",
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 pt-2 sm:gap-6">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <div
            key={feature.label}
            className="flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 backdrop-blur-sm"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ${feature.color}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-xs font-medium text-white/90 sm:text-sm">
              {feature.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

