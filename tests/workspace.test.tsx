import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MissionWorkspace } from "@/components/workspace/mission-workspace";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";
import { MissionAnalysisPanel } from "@/components/workspace/mission-analysis-panel";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}));

describe("Phase 6 Integrated Mission Workspace Tests", () => {
  it("renders all three workspace panels and top navigation", () => {
    render(<MissionWorkspace />);

    // Top navigation
    expect(screen.getByText("Lunar Mission Planner")).toBeDefined();
    expect(screen.getByText("Mission Planner")).toBeDefined();
    expect(screen.getByText("Back to Input")).toBeDefined();

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
    expect(screen.getByText("Evaluating LOLA Terrain")).toBeDefined();
    expect(screen.getByText("Generating Analysis")).toBeDefined();
  });

  it("renders completed analysis cards in completed state with Horizons attribution", () => {
    const mockHorizonsData = {
      success: true,
      status: "success" as const,
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
        geometricStatus: "Above horizon" as const,
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
        geometricStatus: "Above horizon" as const,
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
    expect(screen.getAllByText(/5\.27/)[0]).toBeDefined();

    expect(screen.getByText("Earth Analysis")).toBeDefined();
    expect(screen.getByText("45.18°")).toBeDefined();
    expect(screen.getByText("12.30°")).toBeDefined();

    expect(screen.getByText("Communication Visibility")).toBeDefined();
    expect(screen.getByText("Earth Geometrically Above Horizon")).toBeDefined();

    expect(screen.getByText("Surrounding Terrain")).toBeDefined();
    expect(screen.getByText("Not Yet Analysed")).toBeDefined();
    expect(screen.getByRole("button", { name: /export analysis/i })).toBeDefined();
  });

  it("renders partial state when Sun succeeds but Earth fails without fabricating Earth values", () => {
    const mockPartialData = {
      success: true,
      status: "partial" as const,
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
        geometricStatus: "Above horizon" as const,
        isGeometricAboveHorizon: true,
        observationTimeUtc: "2028-01-15 12:00 UTC",
        retrievedAtUtc: new Date().toISOString(),
        source: "JPL Horizons" as const,
        units: {
          azimuth: "degrees (East of North)" as const,
          elevation: "degrees above local horizon" as const,
        },
      },
      earthError: "JPL Horizons target 399 timed out",
      disclaimer: "Local terrain obstruction not modeled.",
    };

    render(
      <MissionAnalysisPanel
        isLoading={false}
        missionDate="2028-01-15"
        missionTimeUtc="12:00"
        horizonsData={mockPartialData}
      />
    );

    expect(screen.getByText("Partial Ephemerides Retrieved")).toBeDefined();
    expect(screen.getByText("132.64°")).toBeDefined();
    expect(screen.getByText(/Horizons data unavailable. No hardcoded angles displayed./)).toBeDefined();
    expect(screen.getByText("Geometric Visibility Unavailable")).toBeDefined();
  });

  it("renders error/unavailable state honestly without hardcoded angles", () => {
    render(
      <MissionAnalysisPanel
        isLoading={false}
        missionDate="2028-01-15"
        missionTimeUtc="12:00"
        horizonsError="JPL Horizons upstream rate limit (HTTP 429)"
      />
    );

    expect(screen.getByText("Horizons Ephemeris Warning")).toBeDefined();
    expect(screen.getByText(/JPL Horizons upstream rate limit/)).toBeDefined();
    const unavailableList = screen.getAllByText("Unavailable");
    expect(unavailableList.length).toBeGreaterThan(0);
  });

  it("marks inputs as stale when user modifies coordinates after analysis", () => {
    render(<MissionWorkspace />);

    const latInput = screen.getByLabelText("Latitude (°)");
    fireEvent.change(latInput, { target: { value: "-85.00" } });

    expect(screen.getByText("Inputs changed — analyse again")).toBeDefined();
  });

  describe("Phase 8 Solar Illumination & Energy Workspace Tests", () => {
    it("renders the approved decorative cyan lightning pin badge inside Solar Energy heading", () => {
      const { container } = render(<MissionWorkspace />);

      const pin = container.querySelector(".solar-pin");
      expect(pin).not.toBeNull();
      expect(pin?.getAttribute("aria-hidden")).toBe("true");

      const svg = pin?.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
      expect(svg?.querySelector("path")).not.toBeNull();
    });

    it("renders the Solar Energy accordion under Mission Input", () => {
      render(<MissionWorkspace />);

      expect(screen.getByText("Solar Energy")).toBeDefined();
      expect(screen.getByText("Configure rover solar panels and duration (optional)")).toBeDefined();
    });

    it("allows toggling the Solar Energy accordion open and closed", () => {
      render(<MissionWorkspace />);

      const toggleBtn = screen.getByRole("button", { name: /solar energy/i });
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");

      // Expand accordion
      fireEvent.click(toggleBtn);
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

      // Check fields are now visible
      expect(screen.getByLabelText("Panel Area (m²)")).toBeDefined();
      expect(screen.getByLabelText("Efficiency (%)")).toBeDefined();
      expect(screen.getByLabelText("Panel Orientation")).toBeDefined();
      expect(screen.getByLabelText("Analysis Duration (Hours)")).toBeDefined();

      // Collapse accordion
      fireEvent.click(toggleBtn);
      expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
    });

    it("displays calculated solar power in Mission Analysis Card 3 when illuminated", () => {
      const mockHorizonsData = {
        success: true,
        status: "success" as const,
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
          geometricStatus: "Above horizon" as const,
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
          geometricStatus: "Above horizon" as const,
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
          latitudeDeg={-89.5}
          horizonsData={mockHorizonsData}
          solarValues={{
            panelArea: "1.20",
            panelEfficiency: "28.5",
            panelOrientation: "sun-tracking",
            analysisDurationHours: "4.0",
          }}
        />
      );

      expect(screen.getByText("Solar Illumination & Energy")).toBeDefined();
      expect(screen.getByText("Illuminated (Direct Sunlight)")).toBeDefined();
      expect(screen.getByText("395.64 W")).toBeDefined();
      expect(screen.getAllByText("1582.56 Wh").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Active Sun-tracking/)).toBeDefined();
    });

    it("displays verified 0 W when Sun is below geometric horizon", () => {
      const mockDarkData = {
        success: true,
        status: "success" as const,
        observerCoordinates: {
          latitudeDeg: -89.5,
          longitudeDeg: 0.0,
          rawLatitude: "-89.50",
          rawLongitude: "0.00",
        },
        observationTimeUtc: "2028-06-15 12:00 UTC",
        sun: {
          targetId: "10" as const,
          targetName: "Sun" as const,
          azimuthDeg: 180.0,
          elevationDeg: -1.5,
          geometricStatus: "Below horizon" as const,
          isGeometricAboveHorizon: false,
          observationTimeUtc: "2028-06-15 12:00 UTC",
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
          geometricStatus: "Above horizon" as const,
          isGeometricAboveHorizon: true,
          observationTimeUtc: "2028-06-15 12:00 UTC",
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
          missionDate="2028-06-15"
          missionTimeUtc="12:00"
          latitudeDeg={-89.5}
          horizonsData={mockDarkData}
          solarValues={{
            panelArea: "1.20",
            panelEfficiency: "28.5",
            panelOrientation: "horizontal",
            analysisDurationHours: "4.0",
          }}
        />
      );

      expect(screen.getAllByText("Below Geometric Horizon").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("0 W")).toBeDefined();
      expect(screen.getAllByText("0 Wh").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/NO DIRECT SOLAR ENERGY AVAILABLE/)).toBeDefined();
    });
  });

  describe("Phase 10 Rover Configuration & Traverse Feasibility Tests", () => {
    it("renders Rover Configuration inputs and preset selector inside the accordion", () => {
      render(<MissionWorkspace />);

      const toggleBtn = screen.getByRole("button", { name: /solar energy/i });
      fireEvent.click(toggleBtn);

      expect(screen.getByText("Rover Configuration & Traverse")).toBeDefined();
      expect(screen.getByLabelText("Rover Preset")).toBeDefined();
      expect(screen.getByLabelText("Capacity (Wh)")).toBeDefined();
      expect(screen.getByLabelText("Max DoD (%)")).toBeDefined();
      expect(screen.getByLabelText("Initial SOC (%)")).toBeDefined();
      expect(screen.getByLabelText("Drive Power (W)")).toBeDefined();
      expect(screen.getByLabelText("Speed (km/h)")).toBeDefined();
      expect(screen.getByLabelText("Dest Latitude (°)")).toBeDefined();
      expect(screen.getByLabelText("Dest Longitude (°)")).toBeDefined();
    });

    it("populates hypothetical reference values when Generic Lunar Rover preset is chosen", () => {
      render(<MissionWorkspace />);

      const toggleBtn = screen.getByRole("button", { name: /solar energy/i });
      fireEvent.click(toggleBtn);

      const presetSelect = screen.getByLabelText("Rover Preset");
      fireEvent.change(presetSelect, { target: { value: "generic-reference" } });

      const capacityInput = screen.getByLabelText("Capacity (Wh)") as HTMLInputElement;
      expect(capacityInput.value).toBe("600");
    });

    it("displays Rover Energy & Traverse Feasibility Card 4 in Mission Analysis panel", () => {
      render(
        <MissionAnalysisPanel
          isLoading={false}
          missionDate="2028-01-15"
          missionTimeUtc="12:00"
          latitudeDeg={-89.5}
          longitudeDeg={0.0}
          solarValues={{
            panelArea: "1.20",
            panelEfficiency: "28.5",
            batteryCapacityWh: "600",
            maxDodPercent: "80",
            initialSocPercent: "100",
            drivePowerW: "75",
            idlePowerW: "20",
            driveSpeedKmH: "0.5",
            safetyReservePercent: "15",
            destLatitude: "-89.47",
            destLongitude: "0.00",
          }}
        />
      );

      expect(screen.getByText("Rover Energy & Traverse Feasibility")).toBeDefined();
      expect(screen.getByText("Traverse Feasible")).toBeDefined();
      expect(screen.getByText(/Spherical Great-Circle/)).toBeDefined();
      expect(screen.getByText(/Energy Required \(Drive \+ Idle\):/)).toBeDefined();
      expect(screen.getByText(/Does not claim the rover can traverse the Moon as a whole/)).toBeDefined();
    });

    it("displays Not Evaluated state when destination coordinates are omitted", () => {
      render(
        <MissionAnalysisPanel
          isLoading={false}
          missionDate="2028-01-15"
          missionTimeUtc="12:00"
          latitudeDeg={-89.5}
          longitudeDeg={0.0}
          solarValues={{
            panelArea: "1.20",
            panelEfficiency: "28.5",
          }}
        />
      );

      expect(screen.getByText("Rover Energy & Traverse Feasibility")).toBeDefined();
      expect(screen.getAllByText("Not Evaluated").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Traverse assessment not evaluated/)).toBeDefined();
    });
  });

  describe("Phase 11 Route Terrain Analysis Tests", () => {
    it("renders Route Terrain Analysis card in Mission Analysis panel", () => {
      render(
        <MissionAnalysisPanel
          isLoading={false}
          missionDate="2028-01-15"
          missionTimeUtc="12:00"
          latitudeDeg={-89.5}
          longitudeDeg={0.0}
          solarValues={{
            panelArea: "1.20",
            panelEfficiency: "28.5",
          }}
        />
      );

      expect(screen.getByText("Route Terrain Analysis")).toBeDefined();
      expect(screen.getByText(/Traverse route not evaluated/)).toBeDefined();
    });

    it("evaluates route terrain and obstacles when destination coordinates are provided", () => {
      render(
        <MissionAnalysisPanel
          isLoading={false}
          missionDate="2028-01-15"
          missionTimeUtc="12:00"
          latitudeDeg={-89.5}
          longitudeDeg={0.0}
          solarValues={{
            panelArea: "1.20",
            panelEfficiency: "28.5",
            destLatitude: "-89.47",
            destLongitude: "0.00",
          }}
        />
      );

      expect(screen.getByText("Route Terrain Analysis")).toBeDefined();
      expect(screen.getByText("Total Obstacles")).toBeDefined();
      expect(screen.getByText("Max Slope")).toBeDefined();
      expect(screen.getByText("Roughness")).toBeDefined();
      expect(screen.getByText("RMSD Detrended")).toBeDefined();
      expect(screen.getByText("LOLA Elevation Profile (100m/px)")).toBeDefined();
      expect(screen.getByText("Detected Craters:")).toBeDefined();
      expect(screen.getByText("Boulder / Rock Hazards:")).toBeDefined();
    });
  });

  describe("Phase 13 & 15 Mission Results Sidebar Tests", () => {
    it("renders Mission Operational Results launcher card with link to /mission-results", () => {
      render(
        <MissionAnalysisPanel
          isLoading={false}
          missionDate="2028-01-15"
          missionTimeUtc="12:00"
          latitudeDeg={-89.5}
          longitudeDeg={0.0}
        />
      );

      expect(screen.getByText("Mission Operational Results")).toBeDefined();
      const viewResultsLink = screen.getByText("View Results").closest("a");
      expect(viewResultsLink).toBeDefined();
      expect(viewResultsLink?.getAttribute("href")).toBe("/mission-results");
    });
  });
});
