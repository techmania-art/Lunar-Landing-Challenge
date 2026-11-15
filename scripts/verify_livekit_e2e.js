/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");
const path = require("path");

async function main() {
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
  await page.waitForTimeout(2000);

  console.log("2. Opening SIS Assistant panel...");
  const sisBtn = page.locator('button[aria-label="Open SIS Assistant"]');
  await sisBtn.waitFor({ state: "visible" });
  await sisBtn.click({ force: true });
  await page.waitForTimeout(1000);

  const panel = page.locator('aside[aria-label="SIS Assistant Panel"]');
  console.log("Panel visible:", await panel.isVisible());

  const artifactDir = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848";
  const emptyScreenshot = path.join(artifactDir, "phase-26-sis-empty-state.png");
  await page.screenshot({ path: emptyScreenshot });
  console.log("Saved empty state screenshot to:", emptyScreenshot);

  // Check no dummy messages exist
  const dummyText = await page.locator('text="Is the selected site suitable for a 4-hour rover mission"').count();
  console.log("Dummy text count (must be 0):", dummyText);

  // Check suggested prompt chips exist in empty state
  const roverChip = page.locator('button:has-text("What does this mean for the rover?")');
  const chipVisible = await roverChip.isVisible();
  console.log("Suggested prompt chip 'What does this mean for the rover?' visible:", chipVisible);

  console.log("3. Invoking real send path via suggested question chip: 'What does this mean for the rover?'...");
  await roverChip.click();
  console.log("Chip clicked. Waiting for live agent response from LiveKit Cloud and Gemini...");

  let answered = false;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000);
    const messages = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
    const statusText = await page.locator('aside[aria-label="SIS Assistant Panel"] header').innerText();
    console.log(`[T+${i + 1}s] Messages count:`, messages.length, messages, "Header:", statusText.replace(/\n/g, ' '));
    if (messages.length > 1) {
      console.log("Agent response received:", messages);
      answered = true;
      // Wait for response text stream to settle
      await page.waitForTimeout(4000);
      break;
    }
  }

  // Verify that suggested question chips are no longer cluttering the active conversation
  const chipsAfterCount = await page.locator('aside[aria-label="SIS Assistant Panel"] button:has-text("Suggested questions")').count();
  console.log("Suggested questions header in active chat (should be 0):", chipsAfterCount);

  const convoScreenshot = path.join(artifactDir, "phase-26-sis-real-conversation.png");
  await page.screenshot({ path: convoScreenshot });
  console.log("Saved conversation screenshot to:", convoScreenshot);

  console.log("4. Testing minimize pill...");
  const minBtn = page.locator('button[aria-label="Minimize SIS Assistant"]');
  await minBtn.click();
  await page.waitForTimeout(800);

  const pill = page.locator('aside[aria-label="SIS Assistant Minimized"]');
  console.log("Pill visible:", await pill.isVisible());
  const pillScreenshot = path.join(artifactDir, "phase-26-sis-minimized.png");
  await page.screenshot({ path: pillScreenshot });
  console.log("Saved minimized screenshot to:", pillScreenshot);

  await browser.close();
  console.log("Verification completed successfully. Agent answered:", answered);
  if (!answered) {
    throw new Error("SIS agent failed to respond within timeout window.");
  }
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
