"use client";

import React from "react";
import { LandingBackground } from "@/components/landing/landing-background";
import { LandingNavigation } from "@/components/landing/landing-navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { MissionConfigurationCard } from "@/components/landing/mission-configuration-card";
import type { MissionInput } from "@/types/mission";

export interface LandingPageProps {
  onMissionSubmit?: (data: MissionInput) => void;
}

export function LandingPage({ onMissionSubmit }: LandingPageProps) {
  const handleMissionSubmit = async (data: MissionInput) => {
    // In Phase 2, this triggers the typed callback without fabricating scientific analysis
    if (onMissionSubmit) {
      onMissionSubmit(data);
    }
  };

  return (
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden text-white font-sans">
      {/* 1. Full-viewport lunar landscape with gradient overlays */}
      <LandingBackground />

      {/* 2. Top Navigation */}
      <LandingNavigation />

      {/* 3. Main Hero & Mission Configuration Layout */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Hero Introduction (~58-60% of layout) */}
          <div className="lg:col-span-7">
            <HeroSection />
          </div>

          {/* Right Column: Mission Configuration Card (~38-40% of layout) */}
          <div className="w-full lg:col-span-5">
            <MissionConfigurationCard onSubmit={handleMissionSubmit} />
          </div>
        </div>
      </main>
    </div>
  );
}

