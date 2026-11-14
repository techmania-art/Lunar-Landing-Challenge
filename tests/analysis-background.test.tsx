import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { AnalysisBackground } from "@/components/analysis/analysis-background";
import { LandingPage } from "@/components/landing/landing-page";
import AnalysisPage from "@/app/analysis/page";

describe("Phase 3 Analysis Background Component & Video Verification", () => {
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

  it("renders the separate Analysis page with AnalysisBackground", () => {
    const { container, getByText } = render(<AnalysisPage />);
    expect(getByText("Mission Analysis Workspace")).toBeDefined();
    expect(container.querySelector("video")).not.toBeNull();
  });
});

