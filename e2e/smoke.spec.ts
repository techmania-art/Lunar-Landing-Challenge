import { test, expect } from "@playwright/test";

test.describe("Phase 2 Landing Page E2E Smoke & Visual Flow", () => {
  test("renders full landing page, hero, highlights, and interactive form", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify Navigation
    await expect(page.getByText("Lunar Mission Planner")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mission Planner" })).toBeVisible();
    await expect(page.getByRole("link", { name: "About" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Documentation" })).toBeVisible();

    // Verify Hero Section
    await expect(page.getByText("NASA SPACE APPS CHALLENGE")).toBeVisible();
    await expect(page.getByText("Plan Your", { exact: true })).toBeVisible();
    await expect(page.getByText("Lunar Mission", { exact: true })).toBeVisible();
    await expect(page.getByText("Sun Analysis")).toBeVisible();
    await expect(page.getByText("Earth Analysis")).toBeVisible();
    await expect(page.getByText("Terrain & Elevation")).toBeVisible();

    // Verify that landing page does NOT render a video element
    const landingVideos = await page.locator("video").count();
    expect(landingVideos).toBe(0);

    // Verify Mission Configuration Card
    await expect(page.getByText("Mission Configuration")).toBeVisible();
    await expect(page.getByLabel("Latitude (°)")).toBeVisible();
    await expect(page.getByLabel("Longitude (°)")).toBeVisible();
    await expect(page.getByLabel("Mission Date")).toBeVisible();
    await expect(page.getByLabel("Mission Time (UTC)")).toHaveValue("12:00");

    // Test form validation: submit empty form
    const submitBtn = page.getByRole("button", {
      name: /analyse mission conditions/i,
    });
    await submitBtn.click();

    // Verify inline errors
    await expect(page.getByText("Valid numeric latitude is required")).toBeVisible();
    await expect(page.getByText("Valid numeric longitude is required")).toBeVisible();
    await expect(page.getByText("Mission date is required")).toBeVisible();

    // Fill valid mission coordinates and date
    await page.getByLabel("Latitude (°)").fill("-89.5");
    await page.getByLabel("Longitude (°)").fill("0.0");
    await page.getByLabel("Mission Date").fill("2026-12-15");
    await page.getByLabel("Additional Site (Optional)").fill("-88.8, 12.4");

    // Submit valid form
    await submitBtn.click();

    // Verify confirmation badge & workspace link
    await expect(
      page.getByText("Mission configuration validated (-89.5°, 0° at 2026-12-15 12:00 UTC).")
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /open mission workspace/i })).toBeVisible();
  });

  test("responsive viewport check on mobile without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Verify elements are visible and mobile friendly
    await expect(page.getByText("Plan Your", { exact: true })).toBeVisible();
    await expect(page.getByText("Mission Configuration")).toBeVisible();

    // Check no horizontal scrollbar / overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

test.describe("Phase 6 Integrated Workspace with Looping MP4 Background", () => {
  test("redirects /analysis to /workspace with video playing behind all 3 panels", async ({
    page,
  }) => {
    let videoStatus = 0;
    page.on("response", (res) => {
      if (res.url().includes("analysis-background.mp4")) {
        videoStatus = res.status();
      }
    });

    // Accessing old standalone analysis route redirects to canonical /workspace route
    await page.goto("/analysis");
    await expect(page).toHaveURL(/\/workspace/);

    if (videoStatus > 0) {
      expect(videoStatus).toBeLessThan(400);
    }

    // Verify video element attributes
    const video = page.locator("video");
    await expect(video).toBeAttached();
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");

    // Verify source tags
    const source = page.locator("video source").first();
    await expect(source).toHaveAttribute("src", "/animations/analysis-background.mp4");

    // Verify static fallback layer exists
    const fallback = page.locator("div[style*='lunar-mission-background.png']");
    await expect(fallback).toBeAttached();

    // Verify all 3 panels render on the same integrated workspace page
    await expect(page.getByRole("heading", { name: "Mission Input" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lunar Map" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mission Analysis" })).toBeVisible();
  });

  test("respects prefers-reduced-motion by hiding video and displaying static fallback", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/workspace");

    const video = page.locator("video");
    await expect(video).toBeHidden();

    const fallback = page.locator("div[style*='lunar-mission-background.png']");
    await expect(fallback).toBeAttached();
  });

  test("renders three-panel layout, interactive map, overlay callout, and analysis state", async ({
    page,
  }) => {
    await page.goto("/workspace?lat=-89.50&lon=0.00&date=2028-01-15&time=12:00");

    // Navigation check
    await expect(page.getByText("Lunar Mission Planner")).toBeVisible();
    await expect(page.getByText("Mission Planner", { exact: true })).toBeVisible();
    await expect(page.getByText("Back to Input")).toBeVisible();

    // Three panel headers
    await expect(page.getByRole("heading", { name: "Mission Input" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lunar Map" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mission Analysis" })).toBeVisible();

    // Map controls & layer selector
    await expect(page.getByText("LROC WAC Global (100m)")).toBeVisible();
    await expect(page.getByLabel("Zoom in")).toBeVisible();
    await expect(page.getByLabel("Zoom out")).toBeVisible();
    await expect(page.getByLabel("Recenter on coordinates")).toBeVisible();

    // Selected location red overlay callout
    await expect(page.locator("text=Lat: -89.50°").first()).toBeVisible();
    await expect(page.locator("text=Lon: 0.00°").first()).toBeVisible();

    // Completed state cards (either live JPL success or graceful upstream warning)
    await expect(page.getByText(/Analysis Complete|Horizons Ephemeris Warning/)).toBeVisible();
    await expect(page.getByText("Sun Analysis")).toBeVisible();
    await expect(page.getByText("Earth Analysis")).toBeVisible();
    await expect(page.getByText("Communication Visibility")).toBeVisible();
    await expect(page.getByText("Surrounding Terrain")).toBeVisible();

    // Modify coordinate to test stale state
    await page.getByLabel("Latitude (°)").fill("-86.00");
    await expect(page.getByText("Inputs changed — analyse again")).toBeVisible();

    // Click Analyse to trigger loading state
    const analyseBtn = page.getByRole("button", { name: /analyse mission conditions/i });
    await analyseBtn.click();

    // Capture visual reference screenshots across viewports for Phase 6
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-6-integrated-workspace-desktop.png" });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: "test-results/phase-6-integrated-workspace-tablet.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/phase-6-integrated-workspace-mobile.png" });
  });

  test("Phase 6 API health and horizons endpoint verification", async ({ request }) => {
    // 1. App health endpoint
    const healthRes = await request.get("/api/health");
    expect(healthRes.status()).toBe(200);
    const healthJson = await healthRes.json();
    expect(healthJson.status).toBe("ok");
    expect(healthJson.service).toBe("Lunar Mission Planner");

    // 2. Controlled upstream diagnostics
    const diagRes = await request.get("/api/health?diagnostics=true");
    expect(diagRes.status()).toBe(200);
    const diagJson = await diagRes.json();
    expect(diagJson.upstreamDiagnostics).toBeDefined();
    expect(diagJson.upstreamDiagnostics.application).toBe("healthy");

    // 3. Horizons API observer query endpoint
    const horizonsRes = await request.post("/api/horizons", {
      data: {
        latitude: -89.5,
        longitude: 0.0,
        missionDate: "2028-01-15",
        missionTimeUtc: "12:00",
      },
    });

    expect([200, 502]).toContain(horizonsRes.status());
    const horizonsJson = await horizonsRes.json();
    expect(horizonsJson.observerCoordinates).toBeDefined();
    expect(horizonsJson.disclaimer).toContain("Local terrain obstruction");
  });
});
