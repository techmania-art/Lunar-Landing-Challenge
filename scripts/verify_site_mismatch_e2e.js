/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const path = require("path");

const artifactDir = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848";
const debugArtifactDir = path.resolve(__dirname, "..", "debug-artifacts");

async function main() {
  console.log("=== LOLA Site-Package Mismatch & Local Terrain Loading Verification ===");

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

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[Browser Error]:", msg.text());
    }
  });

  // ==========================================
  // CASE B: Unprepared Equatorial Site (-9.0, 10.0)
  // ==========================================
  console.log("\n--- Testing Case B: Unprepared Site (-9.00, 10.00) ---");
  await page.addInitScript(() => {
    window.sessionStorage.setItem(
      "lunar_mission_active_state",
      JSON.stringify({ mapCoords: { latitude: -9.0, longitude: 10.0 } })
    );
  });

  await page.goto("http://localhost:3000/3d-simulation", { waitUntil: "load" });
  await page.waitForTimeout(4000);

  // Verify honest UI notice is present
  const noticeTitle = await page.textContent("text=Local terrain not prepared for this site").catch(() => null);
  console.log("Notice Title visible:", noticeTitle !== null);

  const noticeBody = await page.textContent("text=The current mission location is 9.00° S, 10.00° E").catch(() => null);
  console.log("Notice Detail visible:", noticeBody !== null);

  const switchButton = page.locator("button:has-text('Use Prepared Test Site')");
  console.log("Use Prepared Test Site button count:", await switchButton.count());

  const caseBPath1 = path.join(artifactDir, "phase-35-case-b-unprepared-site.png");
  await page.screenshot({ path: caseBPath1 });
  await page.screenshot({ path: path.join(debugArtifactDir, "phase-35-case-b-unprepared-site.png") });
  console.log("Saved Screenshot Case B (Unprepared Site):", caseBPath1);

  // Click "Use Prepared Test Site"
  console.log("\nClicking 'Use Prepared Test Site (-89.50° S, 0.00° E)'...");
  await switchButton.click();
  await page.waitForTimeout(5000);

  const caseBPath2 = path.join(artifactDir, "phase-35-case-b-switched-to-prepared.png");
  await page.screenshot({ path: caseBPath2 });
  await page.screenshot({ path: path.join(debugArtifactDir, "phase-35-case-b-switched-to-prepared.png") });
  console.log("Saved Screenshot Case B Switched:", caseBPath2);

  // ==========================================
  // CASE A: Prepared South Pole Site (-89.5, 0.0)
  // ==========================================
  console.log("\n--- Testing Case A: Prepared Site in Local 3D Terrain Mode ---");
  const localModeBtn = page.locator("button:has-text('Local 3D Terrain')");
  if (await localModeBtn.isEnabled()) {
    await localModeBtn.click();
    await page.waitForTimeout(4000);
  }

  const caseAPath = path.join(artifactDir, "phase-35-case-a-prepared-site.png");
  await page.screenshot({ path: caseAPath });
  await page.screenshot({ path: path.join(debugArtifactDir, "phase-35-case-a-prepared-site.png") });
  console.log("Saved Screenshot Case A (Local Terrain Mesh):", caseAPath);

  // Switch back to Global Moon mode
  console.log("Switching back to Global Moon mode...");
  const globalMoonBtn = page.locator("button:has-text('Global Moon')");
  await globalMoonBtn.click();
  await page.waitForTimeout(3000);

  const caseAGlobalPath = path.join(artifactDir, "phase-35-case-a-global-moon-restored.png");
  await page.screenshot({ path: caseAGlobalPath });
  await page.screenshot({ path: path.join(debugArtifactDir, "phase-35-case-a-global-moon-restored.png") });
  console.log("Saved Screenshot Case A (Global Moon Restored):", caseAGlobalPath);

  await browser.close();
  console.log("\n=== All Site Mismatch & Local Terrain Verification Screenshots Captured Successfully ===");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
