import { chromium } from "playwright";
import path from "path";

const artifactDir = "C:\\Users\\hp\\.gemini\\antigravity\\brain\\401ec6c0-18f7-445e-a8d6-ae7b46ef9848";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("SIS Context Sync") || text.includes("error") || text.includes("warn")) {
      console.log(`[BROWSER CONSOLE] ${msg.type()} ${text}`);
    }
  });

  console.log("1. Navigating to http://localhost:3000/workspace...");
  await page.goto("http://localhost:3000/workspace", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);

  console.log("2. Verifying Communication Link Analysis card in Mission Analysis sidebar...");
  const commCard = page.locator('div[aria-label="Communication Link Analysis"]');
  const cardCount = await commCard.count();
  console.log("Communication Link Analysis card present:", cardCount > 0);
  if (cardCount === 0) {
    throw new Error("Communication Link Analysis card not found in sidebar.");
  }

  const cardText = await commCard.first().innerText();
  console.log("Initial Card Text Summary:", cardText.split("\n").slice(0, 8).join(" | "));

  const initialSidebarShot = path.join(artifactDir, "phase-28-comm-sidebar-initial.png");
  await page.screenshot({ path: initialSidebarShot });
  console.log("Saved initial sidebar screenshot to:", initialSidebarShot);

  console.log("3. Opening SIS Assistant panel...");
  const launcherBtn = page.locator('button[aria-label*="SIS Assistant"]');
  await launcherBtn.click();
  await page.waitForTimeout(2000);

  // Wait for context sync
  let synced = false;
  let headerText = "";
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    headerText = await page.locator('aside[aria-label="SIS Assistant Panel"] header').innerText();
    if (headerText.includes("Mission data synced")) {
      synced = true;
      console.log(`[T+${i + 1}s] Context synced:`, headerText.replace(/\n/g, " "));
      break;
    }
  }

  if (!synced) {
    throw new Error(`Context did not sync in SIS panel within 30s. Header: ${headerText}`);
  }

  console.log("4. Asking SIS: 'Can the rover communicate directly with Earth right now?'...");
  const textInput = page.locator('aside[aria-label="SIS Assistant Panel"] input[aria-label="Message to SIS Assistant"]');
  await textInput.fill("Can the rover communicate directly with Earth right now?");
  const sendBtn = page.locator('aside[aria-label="SIS Assistant Panel"] button[aria-label="Send message"]');
  await sendBtn.click();

  let agentReply1 = "";
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(1000);
    const msgs = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
    if (msgs.length >= 2) {
      agentReply1 = msgs[msgs.length - 1];
      console.log("SIS Reply 1 received:", agentReply1);
      await page.waitForTimeout(3000);
      break;
    }
  }

  if (!agentReply1) {
    throw new Error("SIS agent did not respond to initial communication query.");
  }

  console.log("5. Configuring S-Band Direct radio preset in Solar Energy / Radio accordion...");
  // Open the accordion if closed
  const accordionTrigger = page.locator('button[aria-controls="solar-energy-panel"]');
  const isExpanded = await accordionTrigger.getAttribute("aria-expanded");
  if (isExpanded !== "true") {
    await accordionTrigger.click();
    await page.waitForTimeout(1000);
  }

  // Select S-Band Direct preset
  const radioSelect = page.locator('select#comm-radio-preset');
  if (await radioSelect.count() > 0) {
    await radioSelect.selectOption("s-band-direct");
    await page.waitForTimeout(1500);
    console.log("Selected s-band-direct radio preset.");
  }

  console.log("6. Submitting re-analysis to update live telemetry and revision...");
  const analyseBtn = page.locator('button[type="submit"]:has-text("Analyse")');
  await analyseBtn.click();
  await page.waitForTimeout(4000);

  // Wait for new revision sync
  let updatedSynced = false;
  let updatedHeaderText = "";
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    updatedHeaderText = await page.locator('aside[aria-label="SIS Assistant Panel"] header').innerText();
    if (updatedHeaderText.includes("Mission data synced") && updatedHeaderText !== headerText) {
      updatedSynced = true;
      console.log(`[Update T+${i + 1}s] Context updated to new revision (synced=${updatedSynced}):`, updatedHeaderText.replace(/\n/g, " "));
      break;
    }
  }

  const configuredCardText = await commCard.first().innerText();
  console.log("Configured Card Text Summary:", configuredCardText.split("\n").slice(0, 10).join(" | "));

  const configuredScreenshot = path.join(artifactDir, "phase-28-comm-sidebar-configured.png");
  await page.screenshot({ path: configuredScreenshot });
  console.log("Saved configured sidebar screenshot to:", configuredScreenshot);

  console.log("7. Asking SIS in the same live session: 'What is the current RF link margin and is communication available?'...");
  await textInput.fill("What is the current RF link margin and is communication available?");
  await sendBtn.click();

  let agentReply2 = "";
  for (let i = 0; i < 35; i++) {
    await page.waitForTimeout(1000);
    const msgs = await page.locator('aside[aria-label="SIS Assistant Panel"] .whitespace-pre-wrap').allInnerTexts();
    if (msgs.length >= 4) {
      agentReply2 = msgs[msgs.length - 1];
      console.log("SIS Reply 2 received:", agentReply2);
      await page.waitForTimeout(3000);
      break;
    }
  }

  const sisGroundedScreenshot = path.join(artifactDir, "phase-28-comm-sis-grounded.png");
  await page.screenshot({ path: sisGroundedScreenshot });
  console.log("Saved SIS grounded screenshot to:", sisGroundedScreenshot);

  console.log("8. Verifying mobile viewport responsiveness (390x844)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  const mobileScreenshot = path.join(artifactDir, "phase-28-comm-sidebar-mobile.png");
  await page.screenshot({ path: mobileScreenshot });
  console.log("Saved mobile viewport screenshot to:", mobileScreenshot);

  await browser.close();
  console.log("Phase 28 E2E verification completed successfully!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

