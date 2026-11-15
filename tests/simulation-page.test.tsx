import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import SimulationPage from "@/app/3d-simulation/page";
import { LunarMapPanel } from "@/components/workspace/lunar-map-panel";

describe("Phase 12 3D Simulation Entry & Empty Page Tests", () => {
  it("renders 3D Simulation heading and back navigation on /3d-simulation", () => {
    render(<SimulationPage />);

    // Heading must be 3D Simulation
    const heading = screen.getByRole("heading", { name: "3D Simulation", level: 1 });
    expect(heading).toBeDefined();

    // Must have return navigation to /workspace
    const backLink = screen.getByRole("link", { name: /back to workspace/i });
    expect(backLink).toBeDefined();
    expect(backLink.getAttribute("href")).toBe("/workspace");

    // Must NOT contain 3D canvas or WebGL elements in this phase
    const canvases = document.querySelectorAll("canvas");
    expect(canvases.length).toBe(0);
  });

  it("renders 3D Simulation entry button inside Lunar Map panel", () => {
    render(<LunarMapPanel latitude={-89.5} longitude={0.0} />);

    // Button / link labeled "3D Simulation" with accessible name
    const simLink = screen.getByRole("link", { name: /navigate to 3d simulation|3d simulation/i });
    expect(simLink).toBeDefined();
    expect(simLink.getAttribute("href")).toBe("/3d-simulation");
    expect(simLink.textContent).toContain("3D Simulation");
  });
});

