import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { AnalysisBackground } from "@/components/analysis/analysis-background";
import { LandingPage } from "@/components/landing/landing-page";
import { MissionWorkspace } from "@/components/workspace/mission-workspace";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}));

describe("Analysis Background Component Replacement with Horizon.jpg", () => {
  it("renders with Horizon.jpg background, cover sizing, centered position, and full-viewport dimensions", () => {
    const { container } = render(<AnalysisBackground />);
    const bgDiv = container.querySelector("div[style*='Horizon.jpg']");

    expect(bgDiv).not.toBeNull();
    const style = bgDiv?.getAttribute("style") || "";
    expect(style).toContain("/images/Horizon.jpg");
    expect(style).toContain("background-size: cover");
    expect(style).toContain("background-position: center");
    expect(style).toContain("background-repeat: no-repeat");
    expect(style).toContain("width: 100vw");
    expect(style).toContain("height: 100vh");
  });

  it("confirms no video or animated background is rendered by AnalysisBackground", () => {
    const { container } = render(<AnalysisBackground />);
    const video = container.querySelector("video");
    expect(video).toBeNull();
  });

  it("verifies the Phase 2 Landing Page does NOT render a video element", () => {
    const { container } = render(<LandingPage />);
    const video = container.querySelector("video");
    expect(video).toBeNull();
  });

  it("verifies MissionWorkspace renders AnalysisBackground with Horizon.jpg behind workspace", () => {
    const { container } = render(<MissionWorkspace />);
    const bgDiv = container.querySelector("div[style*='Horizon.jpg']");
    expect(bgDiv).not.toBeNull();

    // Video must not be rendered anywhere in MissionWorkspace
    const video = container.querySelector("video");
    expect(video).toBeNull();
  });
});
