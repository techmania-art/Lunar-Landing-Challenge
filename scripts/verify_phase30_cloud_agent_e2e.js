/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const path = require("path");

async function main() {
  console.log("=== Phase 30 LiveKit Cloud Agent End-to-End Verification ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();

  console.log("1. Navigating to http://localhost:3000/workspace...");
  await page.goto("http://localhost:3000/workspace", { waitUntil: "load" });
  await page.waitForTimeout(2500);

  console.log("2. Opening SIS Assistant panel...");
  const sisBtn = page.locator('button[aria-label="Open SIS Assistant"]');
  await sisBtn.waitFor({ state: "visible" });
  await sisBtn.click({ force: true });
  await page.waitForTimeout(1000);

  const panel = page.locator('aside[aria-label="SIS Assistant Panel"]');
  console.log("Panel visible:", await panel.isVisible());

  // Wait for initial connection setup
  await page.waitForTimeout(2000);

  console.log("3. Triggering test question to Cloud Agent: 'What does this mean for the rover?'...");
  const roverChip = page.locator('button:has-text("What does this mean for the rover?")');
  const chipVisible = await roverChip.isVisible();
  console.log("Suggested prompt chip visible:", chipVisible);

  if (chipVisible) {
    await roverChip.click();
  } else {
    // Alternatively type into input
    const input = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"]');
    await input.fill("What does this mean for the rover?");
    await page.keyboard.press("Enter");
  }

  console.log("Waiting for Cloud Agent response (allowing up to 60s for serverless replica cold start)...");

  let answered = false;
  let finalMessages = [];

  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const messages = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
    const headerText = await page.locator('aside[aria-label="SIS Assistant Panel"] header').innerText();
    const cleanHeader = headerText.replace(/\n/g, ' ');

    if (i % 5 === 0 || messages.length > 1) {
      console.log(`[T+${i + 1}s] Msg Count: ${messages.length} | Header: ${cleanHeader}`);
    }

    if (messages.length > 1) {
      console.log("✓ Cloud Agent response received! Waiting for text completion...");
      answered = true;
      // Wait for response streaming to finish
      await page.waitForTimeout(8000);
      finalMessages = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
      break;
    }
  }

  const artifactDir = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848";
  const chatScreenshot = path.join(artifactDir, "phase-30-cloud-agent-sis-chat.png");
  await page.screenshot({ path: chatScreenshot });
  console.log("Saved chat verification screenshot to:", chatScreenshot);

  await browser.close();

  if (!answered) {
    console.error("❌ Cloud Agent failed to respond within 60 seconds.");
    process.exit(1);
  }

  console.log("=== Verification Successful! ===");
  console.log("Assistant Response Preview:\n", finalMessages[1] || "(empty)");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

