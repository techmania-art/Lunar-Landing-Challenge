import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MissionWorkspace } from "@/components/workspace/mission-workspace";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";
import { MissionAnalysisPanel } from "@/components/workspace/mission-analysis-panel";

describe("Phase 5 Mission Workspace Tests", () => {
  it("renders all three workspace panels and top navigation", () => {
    render(<MissionWorkspace />);

    // Top navigation
    expect(screen.getByText("Lunar Mission Planner")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mission Planner" })).toBeDefined();

    // Left Panel: Mission Input
    expect(screen.getByText("Mission Input")).toBeDefined();
    expect(screen.getByLabelText("Latitude (°)")).toBeDefined();
    expect(screen.getByLabelText("Longitude (°)")).toBeDefined();
    expect(screen.getByLabelText("Mission Date")).toBeDefined();
    expect(screen.getByLabelText("Mission Time (UTC)")).toBeDefined();

    // Center Panel: Lunar Map with real LROC layer
    expect(screen.getByText("Lunar Map")).toBeDefined();
    expect(screen.getByText("Explore terrain, imagery and elevation")).toBeDefined();
    expect(screen.getByText("LROC WAC Global (100m)")).toBeDefined();

    // Right Panel: Mission Analysis
    expect(screen.getByText("Mission Analysis")).toBeDefined();
  });

  it("displays red selection box and coordinate callout on Lunar Map", () => {
    render(<LunarMapPanel latitude={-89.5} longitude={0.0} />);

    // Verify coordinate callout
    expect(screen.getByText("Lat: -89.50°")).toBeDefined();
    expect(screen.getByText("Lon: 0.00°")).toBeDefined();

    // Verify scale bar and bottom coordinate chip
    expect(screen.getByText(/Scale: 0 —/i)).toBeDefined();
    expect(screen.getByText(/Selected: -89.50°, 0.00°/i)).toBeDefined();
  });

  it("handles map zoom and recenter controls", () => {
    render(<LunarMapPanel latitude={-89.5} longitude={0.0} />);

    const zoomInBtn = screen.getByLabelText("Zoom in");
    const zoomOutBtn = screen.getByLabelText("Zoom out");
    const recenterBtn = screen.getByLabelText("Recenter on coordinates");

    expect(zoomInBtn).toBeDefined();
    expect(zoomOutBtn).toBeDefined();
    expect(recenterBtn).toBeDefined();

    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);
    fireEvent.click(recenterBtn);
  });

  it("renders the specified progress stages in loading state", () => {
    render(
      <MissionAnalysisPanel
        isLoading={true}
        missionDate="2028-01-15"
        missionTimeUtc="12:00"
      />
    );

    expect(screen.getByText("Analysing mission data...")).toBeDefined();
    expect(screen.getAllByText("Connecting JPL Horizons").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Querying Sun Ephemeris")).toBeDefined();
    expect(screen.getByText("Computing Earth Vector")).toBeDefined();
    expect(screen.getByText("Generating Analysis")).toBeDefined();
  });

  it("renders completed analysis cards in completed state with Horizons attribution", () => {
    const mockHorizonsData = {
      success: true,
      observerCoordinates: {
        latitudeDeg: -89.5,
        longitudeDeg: 0.0,
        rawLatitude: "-89.50",
        rawLongitude: "0.00",
      },
      observationTimeUtc: "2028-01-15 12:00 UTC",
      sun: {
        targetId: "10" as const,
        targetName: "Sun" as const,
        azimuthDeg: 132.64,
        elevationDeg: 5.27,
        isGeometricAboveHorizon: true,
        observationTimeUtc: "2028-01-15 12:00 UTC",
        retrievedAtUtc: new Date().toISOString(),
        source: "JPL Horizons" as const,
        units: {
          azimuth: "degrees (East of North)" as const,
          elevation: "degrees above local horizon" as const,
        },
      },
      earth: {
        targetId: "399" as const,
        targetName: "Earth" as const,
        azimuthDeg: 45.18,
        elevationDeg: 12.3,
        isGeometricAboveHorizon: true,
        observationTimeUtc: "2028-01-15 12:00 UTC",
        retrievedAtUtc: new Date().toISOString(),
        source: "JPL Horizons" as const,
        units: {
          azimuth: "degrees (East of North)" as const,
          elevation: "degrees above local horizon" as const,
        },
      },
      disclaimer: "Local terrain obstruction not modeled.",
    };

    render(
      <MissionAnalysisPanel
        isLoading={false}
        missionDate="2028-01-15"
        missionTimeUtc="12:00"
        horizonsData={mockHorizonsData}
      />
    );

    expect(screen.getByText("Analysis Complete")).toBeDefined();
    expect(screen.getByText("Sun Analysis")).toBeDefined();
    expect(screen.getByText("132.64°")).toBeDefined();
    expect(screen.getByText("5.27°")).toBeDefined();

    expect(screen.getByText("Earth Analysis")).toBeDefined();
    expect(screen.getByText("45.18°")).toBeDefined();
    expect(screen.getByText("12.30°")).toBeDefined();

    expect(screen.getByText("Communication Visibility")).toBeDefined();
    expect(screen.getByText("Direct Link Active")).toBeDefined();

    expect(screen.getByText("Surrounding Terrain")).toBeDefined();
    expect(screen.getByRole("button", { name: /export analysis/i })).toBeDefined();
  });

  it("marks inputs as stale when user modifies coordinates after analysis", () => {
    render(<MissionWorkspace />);

    const latInput = screen.getByLabelText("Latitude (°)");
    fireEvent.change(latInput, { target: { value: "-85.00" } });

    expect(screen.getByText("Inputs changed — analyse again")).toBeDefined();
  });
});
