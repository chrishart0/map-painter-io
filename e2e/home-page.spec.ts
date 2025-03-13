import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for the Map Painter.io home page.
 * These tests validate the basic functionality of the home page,
 * including navigation, UI components, and theme toggling.
 */

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto("/");
  });

  /**
   * Test that verifies the home page loads with all required components.
   * This ensures the basic structure of the landing page is intact.
   */
  test("should load the home page with correct components", async ({
    page,
  }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Map Painter\.io/);

    // Check that the header contains the app name
    const header = page.locator("h1").first();
    await expect(header).toHaveText("Map Painter.io");

    // Check that the about section is visible
    const aboutSection = page.locator('h2:has-text("About Map Painter.io")');
    await expect(aboutSection).toBeVisible();

    // Check that the theme toggle is visible
    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeToggle).toBeVisible();
  });

  /**
   * Test that verifies navigation from the home page to the map page.
   * This tests the core navigation functionality of the application.
   */
  test("should navigate to map page when clicking on map link", async ({
    page,
  }) => {
    // Find and click on a link to the map page
    const mapLink = page.locator('a[href="/map"]');
    await mapLink.click();

    // Check that we've navigated to the map page
    await expect(page).toHaveURL(/\/map/);
  });

  /**
   * Test that verifies the theme toggle functionality.
   * This tests the application's dark/light mode switching capability.
   */
  test("should toggle theme when clicking theme button", async ({ page }) => {
    // Get the initial theme
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    });

    // Click the theme toggle button
    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    await themeToggle.click();

    // Check that the theme has changed
    const newTheme = await page.evaluate(() => {
      return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    });

    expect(newTheme).not.toEqual(initialTheme);
  });
});
