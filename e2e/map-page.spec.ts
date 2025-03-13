import { test, expect } from "@playwright/test";

/**
 * End-to-end tests for the Map Painter.io application.
 * These tests validate the core functionality of the application's map page,
 * including game joining, chat functionality, and resource management.
 */

test.describe("Map Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the map page before each test
    await page.goto("/map");
  });

  /**
   * Test that verifies the map page loads with all required components.
   * This ensures the basic structure of the page is intact.
   */
  test("should load the map page with correct components", async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Map Painter\.io/);

    // Check that the header contains the app name
    const header = page.locator("header h1");
    await expect(header).toHaveText("Map Painter.io");

    // Check that the map component is visible
    const mapComponent = page
      .locator("main div")
      .filter({ hasText: /MapWrapper/ });
    await expect(mapComponent).toBeVisible();

    // Check that the game join panel is visible
    const joinPanel = page
      .locator("div")
      .filter({ hasText: /Join Game/ })
      .first();
    await expect(joinPanel).toBeVisible();

    // Check that the chat component is visible
    const chatComponent = page
      .locator("div")
      .filter({ hasText: /Game Chat/ })
      .first();
    await expect(chatComponent).toBeVisible();
  });

  /**
   * Test that verifies the resource counter is visible.
   * The resource counter is a key game element that shows the player's current resources.
   */
  test("should show resource counter", async ({ page }) => {
    // Check that the resource counter is visible
    const resourceCounter = page
      .locator("div")
      .filter({ hasText: /Resources/ })
      .first();
    await expect(resourceCounter).toBeVisible();
  });

  /**
   * Test that verifies the game joining functionality.
   * This tests the core functionality of connecting to a game session.
   */
  test("should allow joining a game", async ({ page }) => {
    // Fill in the game ID and player name
    await page.fill('input[placeholder="Enter game ID"]', "test-game");
    await page.fill('input[placeholder="Enter your name"]', "TestPlayer");

    // Click the join button
    await page.click('button:has-text("Join Game")');

    // Check that the game connected panel is visible after joining
    const connectedPanel = page
      .locator("div")
      .filter({ hasText: /Game Connected/ })
      .first();
    await expect(connectedPanel).toBeVisible({ timeout: 5000 });

    // Check that the player name is displayed
    const playerInfo = page
      .locator("div")
      .filter({ hasText: /Playing as TestPlayer/ })
      .first();
    await expect(playerInfo).toBeVisible();
  });

  /**
   * Test that verifies the chat functionality after joining a game.
   * This tests the real-time communication features of the application.
   */
  test("should allow sending chat messages after joining a game", async ({
    page,
  }) => {
    // Join a game first
    await page.fill('input[placeholder="Enter game ID"]', "test-game");
    await page.fill('input[placeholder="Enter your name"]', "TestPlayer");
    await page.click('button:has-text("Join Game")');

    // Wait for connection
    await page.waitForSelector('div:has-text("Game Connected")', {
      timeout: 5000,
    });

    // Send a chat message
    const testMessage = "Hello, this is a test message!";
    await page.fill('input[placeholder="Type a message..."]', testMessage);
    await page.click('button:has-text("Send")');

    // Check that the message appears in the chat
    const chatMessage = page
      .locator("div")
      .filter({ hasText: new RegExp(`TestPlayer: ${testMessage}`) })
      .first();
    await expect(chatMessage).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test that verifies the game leaving functionality.
   * This tests that players can properly disconnect from a game session.
   */
  test("should allow leaving a game", async ({ page }) => {
    // Join a game first
    await page.fill('input[placeholder="Enter game ID"]', "test-game");
    await page.fill('input[placeholder="Enter your name"]', "TestPlayer");
    await page.click('button:has-text("Join Game")');

    // Wait for connection
    await page.waitForSelector('div:has-text("Game Connected")', {
      timeout: 5000,
    });

    // Leave the game
    await page.click('button:has-text("Leave Game")');

    // Check that the join panel is visible again
    const joinPanel = page
      .locator("div")
      .filter({ hasText: /Join Game/ })
      .first();
    await expect(joinPanel).toBeVisible({ timeout: 5000 });
  });
});
