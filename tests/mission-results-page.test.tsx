import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import MissionResultsPage from "@/app/mission-results/page";
import { PowerSituationCard } from "@/components/mission-results/power-situation-card";
import { TerrainCommunicationCard } from "@/components/mission-results/terrain-communication-card";
import { ResultsColorLegend } from "@/components/mission-results/results-color-legend";
import type { TerrainAnalysisResponse } from "@/lib/services/terrain/terrain-types";

describe("Phase 17 Simplified Mission Results Page & Legend Tests", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders page header, title, Horizon.jpg background, and empty state when no analysis is cached", async () => {
    render(<MissionResultsPage />);

    // Centered title & subtitle
    expect(
      screen.getByRole("heading", { name: /Mission Operational Results/i, level: 1 })
    ).toBeDefined();
    expect(screen.getByText(/Lunar Rover Mission Assessment/)).toBeDefined();

    // Top Navigation items
    expect(screen.getByText("Lunar Mission Planner")).toBeDefined();
    expect(screen.getByRole("link", { name: "Mission Planner" })).toBeDefined();
    expect(screen.getByText("Results")).toBeDefined();

    // Background style contains Horizon.jpg
    const container = document.querySelector("div[style*='Horizon.jpg']");
    expect(container).toBeDefined();

    // Empty state card (client-hydrated)
    await waitFor(() => {
      expect(screen.getByText("No Active Analysis Results")).toBeDefined();
    });
    expect(screen.getByText("Go to Mission Workspace")).toBeDefined();

    // Result Colors & Meaning legend is also present
    expect(screen.getByRole("complementary", { name: /Result Colors & Meaning/i })).toBeDefined();
  });

  it("renders 3-column layout with Power, Terrain, and Colors Legend with live session state", async () => {
    const mockState = {
      formValues: {
        missionDate: "2028-01-15",
        missionTimeUtc: "12:00",
        latitude: "-89.5",
        longitude: "0.0",
      },
      solarValues: {
        panelArea: "1.20",
        panelEfficiency: "28.5",
        analysisDurationHours: "24",
        batteryCapacityWh: "600",
        drivePowerW: "75",
        idlePowerW: "20",
        driveSpeedKmH: "0.5",
        destLatitude: "-89.47",
        destLongitude: "0.00",
      },
      mapCoords: { latitude: -89.5, longitude: 0.0 },
      horizonsData: {
        success: true,
        status: "complete",
        sun: {
          azimuthDeg: 45.2,
          elevationDeg: 1.5,
          observationTimeUtc: "2028-01-15 12:00 UTC",
        },
        earth: {
          azimuthDeg: 12.4,
          elevationDeg: 6.8,
          observationTimeUtc: "2028-01-15 12:00 UTC",
        },
      },
      horizonsError: null,
      isStale: false,
    };

    sessionStorage.setItem("lunar_mission_active_state", JSON.stringify(mockState));

    render(<MissionResultsPage />);

    // Verification status badge
    await waitFor(() => {
      expect(screen.getByText("Analysis Verified & Complete")).toBeDefined();
    });

    // All 3 panels must be rendered
    expect(screen.getByText("Power Situation")).toBeDefined();
    expect(screen.getByText(/Terrain & Communication/)).toBeDefined();
    expect(screen.getByRole("complementary", { name: /Result Colors & Meaning/i })).toBeDefined();

    // Cards use the approved mission-result-card glassmorphism style
    const cards = document.querySelectorAll(".mission-result-card");
    expect(cards.length).toBeGreaterThanOrEqual(3);

    // Right card MUST NOT have background image
    const commCard = document.querySelector(".terrain-communication-card");
    expect(commCard).toBeDefined();
    expect(commCard?.getAttribute("style") || "").not.toContain("terrain.jpg");
    expect(commCard?.getAttribute("style") || "").not.toContain("url(");
  });

  it("PowerSituationCard renders 4 core metric tiles, units, and provenance footer", () => {
    render(
      <PowerSituationCard
        solarEnergy={{
          status: "calculated",
          directSolarPowerW: 465.12,
          estimatedEnergyWh: 11162.88,
          solarIrradianceWm2: 1361,
          analysisDurationHours: 24,
          panelAreaM2: 1.20,
          panelEfficiencyPercent: 28.5,
          message: "Calculated successfully",
          assumptions: [],
        }}
        solarIllumination={{
          state: "ILLUMINATED",
          sunAzimuthDeg: 45.2,
          sunElevationDeg: 1.5,
          localTerrainHorizonDeg: 0.5,
          observationTimeUtc: "2028-01-15 12:00 UTC",
          reason: "Sun is 1.00° above local terrain horizon",
          terrainDataset: "LOLA Polar DEM",
          source: "JPL Horizons",
        }}
        traverseResult={{
          state: "SUFFICIENT_ENERGY",
          routeDistanceKm: 0.91,
          estimatedDriveTimeHours: 1.82,
          driveEnergyWh: 136.5,
          idleEnergyWh: 443.6,
          totalEnergyRequiredWh: 580.1,
          usableBatteryEnergyWh: 480,
          netMarginWh: 10582.78,
          explanation: "Solar generation and battery capacity are sufficient for the traverse.",
          assumptions: [],
          limitations: [],
        }}
        solarValues={{
          panelArea: "1.20",
          panelEfficiency: "28.5",
          analysisDurationHours: "24",
          batteryCapacityWh: "600",
          drivePowerW: "75",
          idlePowerW: "20",
        }}
        observationEpoch="2028-01-15 12:00 UTC"
        isStale={false}
      />
    );

    expect(screen.getByText("Power Situation")).toBeDefined();
    expect(screen.getByText("Solar energy and rover power")).toBeDefined();
    expect(screen.getByText("Sufficient Energy")).toBeDefined();
    expect(screen.getByText("Direct Solar Power")).toBeDefined();
    expect(screen.getByText("465.1 W")).toBeDefined();
    expect(screen.getByText("Total Solar Energy")).toBeDefined();
    expect(screen.getByText("11162.9 Wh")).toBeDefined();
    expect(screen.getByText("Rover Consumption")).toBeDefined();
    expect(screen.getByText("580.1 Wh")).toBeDefined();
    expect(screen.getByText("Net Energy Margin")).toBeDefined();
    expect(screen.getByText("+10582.8 Wh")).toBeDefined();
    expect(screen.getByText(/LOLA Solar Incidence/)).toBeDefined();
  });

  it("TerrainCommunicationCard renders 4 core metrics without redundant explanatory or footer sections", () => {
    const mockTerrainData: TerrainAnalysisResponse = {
      analysisId: "test-analysis-1",
      status: "COMPLETE",
      route: {
        distanceMeters: 910,
        distanceKm: 0.91,
        corridorWidthMeters: 100,
        sampleSpacingMeters: 25,
        startPoint: { latitude: -89.5, longitude: 0.0 },
        endPoint: { latitude: -89.47, longitude: 0.0 },
      },
      coverage: {
        percentage: 100,
        status: "COMPLETE",
      },
      obstacleCount: { status: "AVAILABLE", value: 0 },
      craterCount: { status: "AVAILABLE", value: 0 },
      boulderCount: { status: "AVAILABLE", value: 0 },
      maximumSlope: { status: "AVAILABLE", value: 8.5 },
      averageSlope: { status: "AVAILABLE", value: 4.2 },
      roughness: { status: "AVAILABLE", value: 0.22 },
      elevation: {
        status: "AVAILABLE",
        unit: "meters",
        samples: [],
        minimumMeters: -2000,
        maximumMeters: -1980,
        elevationChangeMeters: 20,
      },
      features: [],
      traversability: {
        status: "PASSES_CONFIGURED_LIMITS",
        reasons: [],
        missingRequirements: [],
      },
      provenance: [],
      warnings: [],
      generatedAt: "2028-01-15 12:00 UTC",
    };

    render(
      <TerrainCommunicationCard
        hasEarth={true}
        earthElevationDeg={6.8}
        earthAzimuthDeg={12.4}
        observationEpoch="2028-01-15 12:00 UTC"
        terrainData={mockTerrainData}
        isStale={false}
      />
    );

    expect(screen.getByText(/Terrain & Communication/)).toBeDefined();
    expect(screen.getByText("Visibility and route conditions")).toBeDefined();
    expect(screen.getByText("Obstruction: Not Evaluated")).toBeDefined();
    expect(screen.getByText("Geometric Visibility")).toBeDefined();
    expect(screen.getByText("Earth Horizon Angles")).toBeDefined();
    expect(screen.getByText("+6.80° elev / 12.40° az")).toBeDefined();
    expect(screen.getByText("Terrain Obstruction")).toBeDefined();
    expect(screen.getByText("Route Corridor Hazards")).toBeDefined();
    expect(screen.getByText("0 obstacles (0 craters)")).toBeDefined();

    // Verify Phase 18 removals:
    // 1. No explanatory paragraph
    expect(screen.queryByText(/Earth geometric visibility is available/)).toBeNull();
    // 2. No amber warning panel
    expect(screen.queryByText(/Geometric visibility only:/)).toBeNull();
    // 3. No metadata/provenance footer
    expect(screen.queryByText(/Model: JPL Horizons Target 399/)).toBeNull();

    // Verify clean glass surface - NO background image
    const cardEl = document.querySelector(".terrain-communication-card");
    expect(cardEl).toBeDefined();
    expect(cardEl?.getAttribute("style") || "").not.toContain("terrain.jpg");
    expect(cardEl?.getAttribute("style") || "").not.toContain("url(");
  });

  it("ResultsColorLegend renders all 5 required semantic colors and meanings without footer rule notice", () => {
    render(<ResultsColorLegend />);

    expect(screen.getByText(/Result Colors & Meaning/)).toBeDefined();
    expect(screen.getByText("Active / OK")).toBeDefined();
    expect(screen.getByText("Caution")).toBeDefined();
    expect(screen.getByText("Blocked / Critical")).toBeDefined();
    expect(screen.getByText("Measurement")).toBeDefined();
    expect(screen.getByText("Information / Not Evaluated")).toBeDefined();

    expect(screen.getByText(/A validated favorable condition or active system state/)).toBeDefined();
    expect(screen.getByText(/A constraint, warning, partial result/)).toBeDefined();
    expect(screen.getByText(/A verified condition that prevents the stated operation/)).toBeDefined();
    expect(screen.getByText(/A computed scientific value or measurement/)).toBeDefined();
    expect(screen.getByText(/Informational, pending, unavailable/)).toBeDefined();

    // Verify Phase 18 removal:
    // 4. No footer rule notice
    expect(screen.queryByText(/Status communicates validated operational states/)).toBeNull();
  });
});
