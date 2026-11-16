/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const path = require("path");

const artifactDir = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848";

async function main() {
  console.log("=== Phase 35 Local 3D Lunar Terrain Playwright Verification ===");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=default",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Listen to browser console logs and uncaught errors
  page.on("console", (msg) => {
    console.log(`[Browser ${msg.type()}]:`, msg.text());
  });
  page.on("pageerror", (err) => {
    console.log("[Browser Uncaught Exception]:", err.message, err.stack);
  });

  console.log("1. Navigating to http://localhost:3000/3d-simulation with South Pole site (-89.5, 0.0)...");
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "lunar_mission_active_state",
      JSON.stringify({ mapCoords: { latitude: -89.5, longitude: 0.0 } })
    );
  });

  await page.goto("http://localhost:3000/3d-simulation", { waitUntil: "load" });
  await page.waitForTimeout(4000);

  // 1. Screenshot Global Moon mode
  const globalMoonPath = path.join(artifactDir, "phase-35-1-global-moon.png");
  await page.screenshot({ path: globalMoonPath });
  console.log("Saved Screenshot 1 (Global Moon):", globalMoonPath);

  // 2. Switch to Local 3D Terrain mode
  console.log("2. Switching to Local 3D Terrain mode...");
  const localTerrainBtn = page.locator('button:has-text("Local 3D Terrain")');
  await localTerrainBtn.click();
  await page.waitForTimeout(3000);

  // Check top nadir preset
  console.log("3. Selecting Top (Nadir) Camera Preset...");
  const topPresetBtn = page.locator('button:has-text("Top (Nadir)")');
  await topPresetBtn.click();
  await page.waitForTimeout(2500);

  const topPath = path.join(artifactDir, "phase-35-2-local-terrain-top.png");
  await page.screenshot({ path: topPath });
  console.log("Saved Screenshot 2 (Local Terrain Top):", topPath);

  // 3. Select Oblique Camera Preset to show crater elevation relief
  console.log("4. Selecting Oblique Camera Preset to display 3D relief...");
  const obliqueBtn = page.locator('button:has-text("Oblique")');
  await obliqueBtn.click();
  await page.waitForTimeout(2500);

  const obliquePath = path.join(artifactDir, "phase-35-3-local-terrain-oblique.png");
  await page.screenshot({ path: obliquePath });
  console.log("Saved Screenshot 3 (Local Terrain Oblique):", obliquePath);

  // 4. Select Ground Horizon Preset
  console.log("5. Selecting Ground Camera Preset...");
  const groundBtn = page.locator('button:has-text("Ground")');
  await groundBtn.click();
  await page.waitForTimeout(2500);

  const groundPath = path.join(artifactDir, "phase-35-4-local-terrain-ground.png");
  await page.screenshot({ path: groundPath });
  console.log("Saved Screenshot 4 (Local Terrain Ground):", groundPath);

  // 5. Test Out-of-Coverage State
  console.log("6. Testing Out-of-Coverage State with equatorial coordinate (-12.25, 10.5)...");
  await page.evaluate(() => {
    window.sessionStorage.setItem(
      "lunar_mission_active_state",
      JSON.stringify({ mapCoords: { latitude: -12.25, longitude: 10.5 } })
    );
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(3000);

  const outOfCoveragePath = path.join(artifactDir, "phase-35-5-out-of-coverage.png");
  await page.screenshot({ path: outOfCoveragePath });
  console.log("Saved Screenshot 5 (Out of Coverage):", outOfCoveragePath);

  await browser.close();
  console.log("=== All 5 Visual Verification Screenshots Captured Successfully ===");
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
