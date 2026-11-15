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

test.describe("Workspace Background Component Replacement with Horizon.jpg", () => {
  test("redirects /analysis to /workspace with Horizon.jpg cover background and no video element", async ({
    page,
  }) => {
    // Accessing old standalone analysis route redirects to canonical /workspace route
    await page.goto("/analysis");
    await expect(page).toHaveURL(/\/workspace/);

    // Verify public asset /images/Horizon.jpg returns HTTP 200
    const assetResponse = await page.request.get("/images/Horizon.jpg");
    expect(assetResponse.status()).toBe(200);

    // Verify background component uses Horizon.jpg with full-viewport cover
    const bg = page.locator("div[style*='Horizon.jpg']").first();
    await expect(bg).toBeAttached();
    const style = await bg.getAttribute("style");
    expect(style || "").toContain("/images/Horizon.jpg");
    expect(style || "").toMatch(/background-size:\s*cover/);
    expect(style || "").toMatch(/background-position:\s*center/);
    expect(style || "").toMatch(/background-repeat:\s*no-repeat/);

    // Verify NO animated video element is rendered
    const videoCount = await page.locator("video").count();
    expect(videoCount).toBe(0);

    // Verify all 3 panels render on the same integrated workspace page above background
    await expect(page.getByRole("heading", { name: "Mission Input" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lunar Map" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mission Analysis" })).toBeVisible();

    // Capture Workspace screenshots with Horizon.jpg background at target viewports
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: "test-results/horizon-component-workspace-1920x1080.png" });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({ path: "test-results/horizon-component-workspace-1366x768.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/horizon-component-workspace-390x844.png" });
  });

  test("maintains static Horizon.jpg background under prefers-reduced-motion without video", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/workspace");

    const videoCount = await page.locator("video").count();
    expect(videoCount).toBe(0);

    const bg = page.locator("div[style*='Horizon.jpg']").first();
    await expect(bg).toBeAttached();
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

    // Completed state cards (either live JPL success, partial retrieval, or graceful upstream warning)
    await expect(page.getByText(/Analysis Complete|Horizons Ephemeris Warning|Partial Ephemerides Retrieved/)).toBeVisible();
    await expect(page.getByText("Sun Analysis")).toBeVisible();
    await expect(page.getByText("Earth Analysis")).toBeVisible();
    await expect(page.getByText("Communication Visibility")).toBeVisible();
    await expect(page.getByText("Surrounding Terrain")).toBeVisible();

    // Modify coordinate to test stale state
    await page.getByLabel("Latitude (°)").fill("-86.00");
    await expect(page.getByText("Inputs changed — analyse again")).toBeVisible();

    // Click Analyse to trigger calculation
    const analyseBtn = page.getByRole("button", { name: /analyse mission conditions/i });
    const responsePromise = page.waitForResponse((res) => res.url().includes("/api/horizons"), { timeout: 20000 }).catch(() => null);
    await analyseBtn.click();
    await responsePromise;

    // Wait for results to populate
    await expect(page.getByText(/Analysis Complete|Horizons Ephemeris Warning|Partial Ephemerides Retrieved/)).toBeVisible({ timeout: 15000 });

    // Capture visual reference screenshots across viewports for Phase 7
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-7-horizons-analysis-desktop.png" });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: "test-results/phase-7-horizons-analysis-tablet.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/phase-7-horizons-analysis-mobile.png" });
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

  test("Phase 8 Solar Illumination & Energy Availability E2E Flow", async ({ page }) => {
    await page.goto("/workspace");

    // 1. Verify Solar Energy Accordion presence under Mission Input
    const solarToggle = page.getByRole("button", { name: /solar energy/i });
    await expect(solarToggle).toBeVisible();

    // Verify Phase 9 cyan lightning pin badge is visible inside heading
    const solarPin = page.locator(".solar-pin");
    await expect(solarPin).toBeVisible();

    // Verify canvas is present within the card
    const lightningCanvas = page.locator("canvas[role='presentation']");
    await expect(lightningCanvas).toBeAttached();

    // 2. Expand Solar Energy Accordion
    await solarToggle.click();
    await expect(page.getByLabel("Panel Area (m²)")).toBeVisible();
    await expect(page.getByLabel("Efficiency (%)")).toBeVisible();
    await expect(page.getByLabel("Panel Orientation")).toBeVisible();
    await expect(page.getByLabel("Analysis Duration (Hours)")).toBeVisible();

    // 3. Configure realistic rover panel parameters
    await page.getByLabel("Panel Area (m²)").fill("1.50");
    await page.getByLabel("Efficiency (%)").fill("30.0");
    await page.getByLabel("Panel Orientation").selectOption("sun-tracking");
    await page.getByLabel("Analysis Duration (Hours)").fill("6.0");

    // Wait for Horizons ephemeris analysis results to settle
    await expect(
      page.getByText(/Analysis Complete|Horizons Ephemeris Warning|Partial Ephemerides Retrieved/)
    ).toBeVisible({ timeout: 15000 });

    // 4. Verify Phase 8 Card 3 (Solar Illumination & Energy)
    await expect(page.getByText("Solar Illumination & Energy", { exact: true })).toBeVisible();
    await expect(page.getByText(/Illuminated \(Direct Sunlight\)|Below Geometric Horizon|Terrain Shadowed|Unable to Determine/).first()).toBeVisible();
    await expect(page.getByText("Direct Solar Power:")).toBeVisible();

    // 5. Capture Phase 8 & 9 multi-viewport visual artifacts
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-8-solar-workspace-desktop.png" });
    await page.screenshot({ path: "test-results/phase-9-solar-pin-desktop.png" });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: "test-results/phase-8-solar-workspace-tablet.png" });
    await page.screenshot({ path: "test-results/phase-9-solar-pin-tablet.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/phase-8-solar-workspace-mobile.png" });
    await page.screenshot({ path: "test-results/phase-9-solar-pin-mobile.png" });
  });

  test("Phase 10 Rover Configuration & Traverse Feasibility E2E Flow", async ({ page }) => {
    await page.goto("/workspace");

    // 1. Open Solar Energy accordion
    const solarToggle = page.getByRole("button", { name: /solar energy/i });
    await solarToggle.click();

    // 2. Select Generic Lunar Rover preset
    await expect(page.getByLabel("Rover Preset")).toBeVisible();
    await page.getByLabel("Rover Preset").selectOption("generic-reference");

    // Verify fields populated
    await expect(page.getByLabel("Capacity (Wh)")).toHaveValue("600");
    await expect(page.getByLabel("Drive Power (W)")).toHaveValue("75");

    // 3. Set Destination coordinates (~1 km traverse from -89.50, 0.00 to -89.47, 0.00)
    await page.getByLabel("Dest Latitude (°)").fill("-89.47");
    await page.getByLabel("Dest Longitude (°)").fill("0.00");

    // Wait for analysis to populate
    await expect(
      page.getByText(/Analysis Complete|Horizons Ephemeris Warning|Partial Ephemerides Retrieved/)
    ).toBeVisible({ timeout: 15000 });

    // 4. Verify Card 4: Rover Energy & Traverse Feasibility
    await expect(
      page.getByText("Rover Energy & Traverse Feasibility", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(/Traverse Feasible|Conditionally Feasible|Insufficient Energy/)
    ).toBeVisible();
    await expect(page.getByText("Spherical Great-Circle")).toBeVisible();
    await expect(page.getByText("Energy Required (Drive + Idle):")).toBeVisible();

    // 5. Capture Phase 10 multi-viewport visual artifacts
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-10-rover-traverse-desktop.png" });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: "test-results/phase-10-rover-traverse-tablet.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/phase-10-rover-traverse-mobile.png" });
  });

  test("Phase 11 Route Terrain Analysis & Obstacle Detection E2E Flow", async ({ page }) => {
    await page.goto("/workspace");

    // 1. Initially Route Terrain Analysis displays Not Evaluated
    await expect(page.getByText("Route Terrain Analysis")).toBeVisible();
    await expect(page.getByText(/Traverse route not evaluated/)).toBeVisible();

    // 2. Open Solar Energy / Traverse accordion and supply destination coordinates
    const solarToggle = page.getByRole("button", { name: /solar energy/i });
    await solarToggle.click();

    await page.getByLabel("Dest Latitude (°)").fill("-89.47");
    await page.getByLabel("Dest Longitude (°)").fill("0.00");

    // 3. Verify Route Terrain Analysis updates with computed topographic metrics
    await expect(page.getByText("Total Obstacles")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Max Slope", { exact: true })).toBeVisible();
    await expect(page.getByText("Roughness", { exact: true })).toBeVisible();
    await expect(page.getByText("RMSD Detrended")).toBeVisible();
    await expect(page.getByText("LOLA Elevation Profile (100m/px)")).toBeVisible();
    await expect(page.getByText("Detected Craters:")).toBeVisible();
    await expect(page.getByText("Boulder / Rock Hazards:")).toBeVisible();
    await expect(page.getByText("Unable to determine").first()).toBeVisible();

    // 4. Verify Route Corridor & Destination Pin are rendered on Lunar Map
    await expect(page.locator("line[stroke='#38bdf8']")).toBeAttached();
    await expect(page.getByText(/Dest: -89.47/)).toBeVisible();

    // 5. Capture Phase 11 multi-viewport visual artifacts
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-11-terrain-analysis-desktop.png" });

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: "test-results/phase-11-terrain-analysis-tablet.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/phase-11-terrain-analysis-mobile.png" });
  });

  test("Phase 12 3D Simulation Entry Button and Empty Page E2E Flow", async ({ page }) => {
    // 1. Visit workspace
    await page.goto("/workspace");

    // 2. Verify 3D Simulation entry button inside Lunar Map container
    const simButton = page.getByRole("link", { name: /3d simulation/i });
    await expect(simButton).toBeVisible();

    // Capture screenshot of workspace with the entry button in place
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-12-3d-simulation-button-desktop.png" });

    // 3. Click the 3D Simulation button and verify navigation to /3d-simulation
    await simButton.click();
    await page.waitForURL("/3d-simulation");
    expect(page.url()).toContain("/3d-simulation");

    // 4. Verify 3D Simulation page title and visible heading
    const heading = page.getByRole("heading", { name: "3D Simulation", level: 1 });
    await expect(heading).toBeVisible();

    // Capture visual artifacts of the 3D simulation page
    await page.setViewportSize({ width: 1912, height: 911 });
    await page.screenshot({ path: "test-results/phase-12-3d-simulation-page-desktop.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "test-results/phase-12-3d-simulation-page-mobile.png" });

    // 5. Verify direct load and refresh of /3d-simulation works without 404
    await page.reload();
    await expect(heading).toBeVisible();

    // 6. Test Back to Workspace return navigation
    const backBtn = page.getByRole("link", { name: /back to workspace/i });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await page.waitForURL("/workspace");
    expect(page.url()).toContain("/workspace");
  });

  test("Phase 17 Simplified Mission Results UI: 3-column layout, Final.jpg background, and semantic color legend", async ({ page }) => {
    // 1. Visit workspace and wait for initial analysis
    await page.goto("/workspace");

    await expect(
      page.getByText(/Analysis Complete|Horizons Ephemeris Warning|Partial Ephemerides Retrieved/)
    ).toBeVisible({ timeout: 15000 });

    // 2. Verify workspace launcher card is present
    await expect(page.getByText("Mission Operational Results")).toBeVisible();
    const viewResultsLink = page.getByRole("link", { name: /View Results/i });
    await expect(viewResultsLink).toBeVisible();

    // 3. Click "View Results" and navigate to /mission-results
    await viewResultsLink.click();
    await page.waitForURL("/mission-results");
    expect(page.url()).toContain("/mission-results");

    // 4. Verify Dedicated Page Header & Centered Title
    const resultsHeading = page.getByRole("heading", { name: /Mission Operational Results/i, level: 1 });
    await expect(resultsHeading).toBeVisible();
    await expect(page.getByText(/Lunar Rover Mission Assessment/)).toBeVisible();

    // 5. Verify Navigation Active State
    const resultsNav = page.getByRole("navigation", { name: "Mission Results Navigation" }).locator("span[aria-current='page']");
    await expect(resultsNav).toHaveText("Results");

    // 6. Verify Left Card: Power Situation
    const powerHeading = page.getByRole("heading", { name: "Power Situation" });
    await expect(powerHeading).toBeVisible();
    await expect(page.getByText("Direct Solar Power", { exact: true })).toBeVisible();
    await expect(page.getByText("Total Solar Energy", { exact: true })).toBeVisible();
    await expect(page.getByText("Rover Consumption", { exact: true })).toBeVisible();
    await expect(page.getByText("Net Energy Margin", { exact: true })).toBeVisible();

    // 7. Verify Center Card: Terrain & Communication
    const commHeading = page.getByRole("heading", { name: /Terrain & Communication/ });
    await expect(commHeading).toBeVisible();

    const commCard = page.locator(".terrain-communication-card");
    await expect(commCard).toBeVisible();
    const commStyle = await commCard.getAttribute("style");
    // Right card MUST NOT have background-image
    expect(commStyle || "").not.toContain("terrain.jpg");
    expect(commStyle || "").not.toContain("url(");

    // 8. Verify Right Panel: Result Colors & Meaning legend
    const legend = page.getByRole("complementary", { name: /Result Colors & Meaning/i });
    await expect(legend).toBeVisible();
    await expect(page.getByText("Active / OK")).toBeVisible();
    await expect(page.getByText("Caution")).toBeVisible();
    await expect(page.getByText("Blocked / Critical")).toBeVisible();
    await expect(page.getByText("Measurement", { exact: true })).toBeVisible();
    await expect(page.getByText("Information / Not Evaluated")).toBeVisible();

    // 9. Verify background uses Horizon.jpg
    const bgContainer = page.locator("div[style*='Horizon.jpg']").first();
    await expect(bgContainer).toBeVisible();

    // Verify public asset /images/Horizon.jpg returns HTTP 200
    const assetResponse = await page.request.get("/images/Horizon.jpg");
    expect(assetResponse.status()).toBe(200);

    // 10. Phase 18 Cleanup Verifications: Confirm removed explanatory sections are hidden
    await expect(page.getByText(/Geometric visibility only:/)).toBeHidden();
    await expect(page.getByText(/Model: JPL Horizons Target 399/)).toBeHidden();
    await expect(page.getByText(/Status communicates validated operational states/)).toBeHidden();

    // 11. Phase 20 Multi-Viewport Verification & Screenshot Capture (7 Viewports)
    const viewports = [
      { width: 1920, height: 1080, name: "desktop-1920x1080" },
      { width: 1600, height: 900, name: "desktop-1600x900" },
      { width: 1440, height: 900, name: "desktop-1440x900" },
      { width: 1366, height: 768, name: "desktop-1366x768" },
      { width: 1024, height: 768, name: "tablet-1024x768" },
      { width: 768, height: 1024, name: "tablet-portrait-768x1024" },
      { width: 390, height: 844, name: "mobile-390x844" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);
      await page.screenshot({ path: `test-results/phase-20-${vp.name}.png` });
    }

    // 12. Verify direct reload of /mission-results works
    await page.reload();
    await expect(resultsHeading).toBeVisible();
  });

  test("Phase 21 SIS Assistant Interface E2E Flow and Multi-Viewport Screenshots", async ({ page }) => {
    // 1. Visit workspace
    await page.goto("/workspace");

    // 2. Locate SIS launcher button in top navigation
    const sisBtn = page.getByRole("button", { name: "Open SIS Assistant" });
    await expect(sisBtn).toBeVisible();

    // 3. Click launcher to open SIS Chat Panel
    await sisBtn.click();

    // 4. Verify panel header contents
    const sisPanel = page.getByRole("complementary", { name: "SIS Assistant Panel" });
    await expect(sisPanel).toBeVisible();
    await expect(sisPanel.getByRole("heading", { name: "SIS Assistant" })).toBeVisible();
    await expect(sisPanel.getByText("LMP · Super Intelligent System")).toBeVisible();
    await expect(sisPanel.getByText("UI preview", { exact: true })).toBeVisible();

    // 5. Verify conversation area, greeting, and suggested prompts
    await expect(sisPanel.getByText(/Hi! I'm SIS, your Lunar Mission Assistant/i)).toBeVisible();
    const promptChip = sisPanel.getByRole("button", { name: "Explain the Sun analysis" });
    await expect(promptChip).toBeVisible();

    // 6. Click prompt chip to populate composer
    await promptChip.click();
    const composerInput = sisPanel.getByLabel("Message to SIS Assistant");
    await expect(composerInput).toHaveValue("Explain the Sun analysis");

    // 7. Click send button and verify preview response
    const sendBtn = sisPanel.getByRole("button", { name: "Send message" });
    await sendBtn.click();
    await expect(sisPanel.getByText(/Live assistant connection is not enabled in this phase/i)).toBeVisible();

    // 8. Click microphone placeholder and verify voice notice
    const micBtn = sisPanel.getByRole("button", { name: /Microphone input/i });
    await micBtn.click();
    await expect(sisPanel.getByText(/Voice interaction will be connected in a later integration phase/i)).toBeVisible();

    // 9. Capture screenshots across the 6 required viewports
    const sisViewports = [
      { width: 1920, height: 1080, name: "desktop-1920x1080" },
      { width: 1440, height: 900, name: "desktop-1440x900" },
      { width: 1366, height: 768, name: "desktop-1366x768" },
      { width: 1024, height: 768, name: "tablet-1024x768" },
      { width: 768, height: 1024, name: "tablet-portrait-768x1024" },
      { width: 390, height: 844, name: "mobile-390x844" },
    ];

    for (const vp of sisViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(100);
      await page.screenshot({ path: `test-results/phase-21-sis-${vp.name}.png` });
    }

    // 10. Test minimize and close functionality
    const minimizeBtn = sisPanel.getByRole("button", { name: "Minimize SIS Assistant" });
    await minimizeBtn.click();
    await expect(sisPanel).toBeHidden();

    const minimizedPill = page.getByRole("complementary", { name: "SIS Assistant Minimized" });
    await expect(minimizedPill).toBeVisible();

    // Click to restore
    await minimizedPill.click();
    await expect(sisPanel).toBeVisible();

    // Click close
    const closeBtn = sisPanel.getByRole("button", { name: "Close SIS Assistant" });
    await closeBtn.click();
    await expect(sisPanel).toBeHidden();
  });
});
