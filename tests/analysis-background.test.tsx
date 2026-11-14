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

describe("Phase 6 Analysis Background Integration in Mission Workspace", () => {
  it("renders video element with autoPlay, muted, loop, and playsInline attributes", () => {
    const { container } = render(<AnalysisBackground />);
    const video = container.querySelector("video");

    expect(video).not.toBeNull();
    expect(video?.hasAttribute("autoplay")).toBe(true);
    expect(video?.hasAttribute("loop")).toBe(true);
    expect(video?.hasAttribute("playsinline")).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.getAttribute("aria-hidden")).toBe("true");
  });

  it("points video source to local MP4 asset", () => {
    const { container } = render(<AnalysisBackground />);
    const sources = container.querySelectorAll("video source");

    expect(sources.length).toBeGreaterThanOrEqual(1);
    const srcList = Array.from(sources).map((s) => s.getAttribute("src"));
    expect(srcList).toContain("/animations/analysis-background.mp4");
  });

  it("includes static fallback layer for reduced-motion and loading fallback", () => {
    const { container } = render(<AnalysisBackground />);
    const fallback = container.querySelector(
      "div[style*='lunar-mission-background.png']"
    );
    expect(fallback).not.toBeNull();
  });

  it("verifies the Phase 2 Landing Page does NOT render a video element", () => {
    const { container } = render(<LandingPage />);
    const video = container.querySelector("video");
    expect(video).toBeNull();
  });

  it("verifies MissionWorkspace renders AnalysisBackground with looping video behind workspace", () => {
    const { container } = render(<MissionWorkspace />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.hasAttribute("loop")).toBe(true);
    expect(video?.hasAttribute("autoplay")).toBe(true);
  });
});
