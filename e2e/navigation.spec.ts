import { test, expect } from "@playwright/test";

test("navigation works correctly", async ({ page }) => {
  // Start at the homepage
  await page.goto("/");

  // Assuming there's a navigation element. If not, this can be adjusted.
  const nav = page.locator("nav");
  await expect(nav).toBeVisible();

  // Check if we can click a navigation link, adjust selector as needed based on app structure
  // Look for any link in the navigation
  const navLinks = nav.locator("a");

  // If there are navigation links, test clicking the first one
  const count = await navLinks.count();
  if (count > 0) {
    // Get the href of the first link
    const linkHref = await navLinks.first().getAttribute("href");

    // Click the link
    await navLinks.first().click();

    // Verify we navigated to the expected URL
    if (linkHref) {
      // If the href is a full URL, we check that page.url() includes it
      // If it's a relative path, we check that page.url() ends with it
      await expect(page).toHaveURL(new RegExp(linkHref.replace(/^\//, "")));
    }
  }
});
