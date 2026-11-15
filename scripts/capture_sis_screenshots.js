/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const path = require("path");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/workspace...");
  await page.goto("http://localhost:3000/workspace", { waitUntil: "load" });
  await page.waitForTimeout(3000);

  console.log("Clicking SIS button...");
  const sisBtn = page.locator('button[aria-label="Open SIS Assistant"]');
  await sisBtn.waitFor({ state: "visible" });
  await sisBtn.click({ force: true });
  await page.waitForTimeout(1000);

  // Verify status badge
  const statusBadge = page.locator('aside[aria-label="SIS Assistant Panel"]').getByText("Disconnected");
  console.log("Status badge Disconnected visible:", await statusBadge.isVisible());

  // Click prompt chip
  console.log("Clicking prompt chip...");
  const chip = page.getByRole("button", { name: "Explain the Sun analysis" });
  await chip.click();
  await page.waitForTimeout(300);

  const inputVal = await page.getByLabel("Message to SIS Assistant").inputValue();
  console.log("Input value after chip click:", inputVal);

  const artifactDir = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848";
  const panelPath = path.join(artifactDir, "phase-26-sis-live-panel.png");
  await page.screenshot({ path: panelPath, fullPage: false });
  console.log("Saved panel screenshot to:", panelPath);

  // Minimize panel
  console.log("Clicking minimize button...");
  const minBtn = page.getByRole("button", { name: "Minimize SIS Assistant" });
  await minBtn.click();
  await page.waitForTimeout(500);

  const pillPath = path.join(artifactDir, "phase-26-sis-minimized-pill.png");
  await page.screenshot({ path: pillPath, fullPage: false });
  console.log("Saved minimized screenshot to:", pillPath);

  await browser.close();
  console.log("DONE!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
