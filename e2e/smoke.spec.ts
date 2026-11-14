import { test, expect } from "@playwright/test";

test.describe("Phase 1 Shell Smoke Test", () => {
  test("renders shell page with heading and interactive controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Luminar Check")).toBeVisible();
    await expect(page.locator("text=Lunar Mission Planner Shell")).toBeVisible();
    await expect(page.getByLabel("Target Latitude (°N)")).toBeVisible();
    await expect(page.getByRole("button", { name: /initialize site/i })).toBeVisible();
  });
});

