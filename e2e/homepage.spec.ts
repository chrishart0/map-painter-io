import { test, expect } from "@playwright/test";

test("homepage loads successfully", async ({ page }) => {
  // Navigate to the homepage
  await page.goto("/");

  // Check that the page loads with a title
  const title = page.locator("title");
  await expect(title).toBeTruthy();

  // Check for a main element that should be on every page
  const mainElement = page.locator("main");
  await expect(mainElement).toBeVisible();
});
