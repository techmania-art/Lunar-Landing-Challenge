import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import SimulationPage from "@/app/3d-simulation/page";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";
import {
  DEFAULT_COORDINATES,
  MOON_TREK_WMTS_METADATA,
  buildMoonTrekTileUrl,
  createSimulationDiagnostics,
  getLunarReferenceRadiusMeters,
  isValidMissionCoordinates,
  readMissionCoordinates,
} from "@/components/simulation/lunar-simulation-page";

describe("Phase 3 3D Moon Simulation Tests", () => {
  it("renders the 3D simulation shell and return navigation on /3d-simulation", () => {
    render(<SimulationPage />);

    const heading = screen.getByRole("heading", { name: "3D Simulation", level: 1 });
    expect(heading).toBeDefined();

    const backLink = screen.getByRole("link", { name: /back to workspace/i });
    expect(backLink).toBeDefined();
    expect(backLink.getAttribute("href")).toBe("/workspace");

    const globalMoonButton = screen.getByRole("button", { name: /global moon/i });
    expect(globalMoonButton).toBeDefined();
    expect(screen.getAllByText(/diagnostics/i).length).toBeGreaterThan(0);
  });

  it("renders the 3D simulation entry button inside the Lunar Map panel", () => {
    render(<LunarMapPanel latitude={-89.5} longitude={0.0} />);

    const simLink = screen.getByRole("link", { name: /navigate to 3d simulation|3d simulation/i });
    expect(simLink).toBeDefined();
    expect(simLink.getAttribute("href")).toBe("/3d-simulation");
    expect(simLink.textContent).toContain("3D Simulation");
  });

  it("uses lunar-scale reference values, verified WMTS metadata, and valid mission-site coordinates", () => {
    const moonRadius = getLunarReferenceRadiusMeters();
    expect(moonRadius).toBeGreaterThan(1_700_000);
    expect(moonRadius).toBeLessThan(1_800_000);

    expect(MOON_TREK_WMTS_METADATA.layer).toBe("LRO_WAC_Mosaic_Global_303ppd_v02");
    expect(MOON_TREK_WMTS_METADATA.tileMatrixSetID).toBe("default028mm");
    expect(MOON_TREK_WMTS_METADATA.format).toBe("image/jpeg");
    expect(buildMoonTrekTileUrl({ tileMatrix: 0, tileRow: 0, tileCol: 0 })).toContain("default/default028mm/0/0/0.jpg");
    expect(buildMoonTrekTileUrl({ tileMatrix: "{z}", tileRow: "{y}", tileCol: "{x}" })).toContain("{z}/{y}/{x}.jpg");
    expect(buildMoonTrekTileUrl({ tileMatrix: "{z}", tileRow: "{y}", tileCol: "{x}" })).not.toContain("service=WMTS");

    expect(isValidMissionCoordinates({ latitude: -89.5, longitude: 0 })).toBe(true);
    expect(isValidMissionCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidMissionCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidMissionCoordinates(DEFAULT_COORDINATES)).toBe(true);
  });

  it("reads the current active mission state and initializes truthful diagnostics", () => {
    window.sessionStorage.setItem(
      "lunar_mission_active_state",
      JSON.stringify({ mapCoords: { latitude: -12.25, longitude: 10.5 } }),
    );

    const missionState = readMissionCoordinates();
    expect(missionState).toEqual({ latitude: -12.25, longitude: 10.5 });

    const diagnostics = createSimulationDiagnostics();
    expect(diagnostics.lolaTerrain.state).toBe("not-applicable");
    expect(diagnostics.viewer.state).toBe("not-checked");
    expect(diagnostics.selectedCoordinates.label).toContain("Selected Site");
  });
});

