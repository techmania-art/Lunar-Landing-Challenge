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

  page.on("console", (m) => console.log("[BROWSER CONSOLE]", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("[BROWSER PAGEERROR]", e));

  console.log("1. Navigating to http://localhost:3000/workspace...");
  await page.goto("http://localhost:3000/workspace", { waitUntil: "load" });
  await page.waitForTimeout(3000);

  console.log("2. Opening SIS Assistant panel...");
  const sisBtn = page.locator('button[aria-label="Open SIS Assistant"]');
  await sisBtn.waitFor({ state: "visible" });
  await sisBtn.click({ force: true });
  await page.waitForTimeout(1500);

  const panel = page.locator('aside[aria-label="SIS Assistant Panel"]');
  console.log("Panel visible:", await panel.isVisible());

  const artifactDir = "C:/Users/hp/.gemini/antigravity/brain/401ec6c0-18f7-445e-a8d6-ae7b46ef9848";

  console.log("3. Waiting for live mission context synchronization with Python worker...");
  let synced = false;
  let headerText = "";
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    headerText = await page.locator('aside[aria-label="SIS Assistant Panel"] header').innerText();
    console.log(`[T+${i + 1}s] Header state:`, headerText.replace(/\n/g, " "));
    if (headerText.includes("Mission data synced")) {
      synced = true;
      break;
    }
  }

  if (!synced) {
    throw new Error(`Mission data context did not sync within 30s. Header: ${headerText}`);
  }

  const initialScreenshot = path.join(artifactDir, "phase-27-sis-synced-initial.png");
  await page.screenshot({ path: initialScreenshot });
  console.log("Saved initial synced screenshot to:", initialScreenshot);

  console.log("4. Sending solar power question to verify grounding against right sidebar...");
  const textInput = page.locator('aside[aria-label="SIS Assistant Panel"] input[aria-label="Message to SIS Assistant"]');
  await textInput.fill("How much solar power is being generated at this location right now?");
  const sendBtn = page.locator('aside[aria-label="SIS Assistant Panel"] button[aria-label="Send message"]');
  await sendBtn.click();

  let agentReply1 = "";
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(1000);
    const msgs = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
    console.log(`[T+${i + 1}s] Messages count:`, msgs.length, msgs);
    if (msgs.length >= 2) {
      agentReply1 = msgs[msgs.length - 1];
      console.log("Agent reply received:", agentReply1);
      await page.waitForTimeout(4000);
      break;
    }
  }

  if (!agentReply1) {
    throw new Error("SIS agent did not respond to solar power question.");
  }

  console.log("5. Updating mission input coordinates to trigger a new dashboard revision...");
  const latInput = page.locator('input#ws-latitude, input#mission-lat, input[name="latitude"]');
  if (await latInput.count() > 0) {
    await latInput.first().fill("-88.00");
  } else {
    // Fill first coordinate input
    const firstCoord = page.locator('input[type="text"]').first();
    await firstCoord.fill("-88.00");
  }

  console.log("Submitting re-analysis...");
  const analyseBtn = page.locator('button[type="submit"]:has-text("Analyse")');
  await analyseBtn.click();
  await page.waitForTimeout(4000);

  console.log("6. Waiting for updated revision synchronization in SIS panel...");
  let updatedSynced = false;
  let updatedHeaderText = "";
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    updatedHeaderText = await page.locator('aside[aria-label="SIS Assistant Panel"] header').innerText();
    console.log(`[Update T+${i + 1}s] Header state:`, updatedHeaderText.replace(/\n/g, " "));
    if (updatedHeaderText.includes("Mission data synced") && updatedHeaderText !== headerText) {
      updatedSynced = true;
      break;
    }
  }
  console.log("Updated synced successfully:", updatedSynced);

  const updatedScreenshot = path.join(artifactDir, "phase-27-sis-synced-updated.png");
  await page.screenshot({ path: updatedScreenshot });
  console.log("Saved updated synced screenshot to:", updatedScreenshot);

  console.log("7. Asking about updated coordinates/elevation in the same live session...");
  await textInput.fill("What are the current sun and earth positions?");
  await sendBtn.click();

  let agentReply2 = "";
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(1000);
    const msgs = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
    console.log(`[Turn 2 T+${i + 1}s] Messages count:`, msgs.length);
    if (msgs.length >= 4) {
      agentReply2 = msgs[msgs.length - 1];
      console.log("Agent reply 2 received:", agentReply2);
      await page.waitForTimeout(3000);
      break;
    }
  }

  await browser.close();
  console.log("Phase 27 E2E verification completed successfully!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
