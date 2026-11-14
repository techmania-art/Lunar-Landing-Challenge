import React from "react";
import { Rocket } from "lucide-react";
import { FeatureHighlights } from "@/components/landing/feature-highlights";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="flex flex-col justify-center space-y-6 lg:max-w-xl"
    >
      {/* 1. Outlined Badge */}
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/50 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-sky-300 backdrop-blur-md">
        <Rocket className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
        <span>NASA SPACE APPS CHALLENGE</span>
      </div>

      {/* 2. Main Heading */}
      <h1
        id="hero-heading"
        className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
      >
        <span className="block text-white drop-shadow-sm">Plan Your</span>
        <span className="block text-sky-300 drop-shadow-sm">Lunar Mission</span>
      </h1>

      {/* 3. Description */}
      <p className="max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
        Explore landing locations and evaluate lunar environmental conditions.
      </p>

      {/* 4. Feature Highlights */}
      <FeatureHighlights />
    </section>
  );
}

