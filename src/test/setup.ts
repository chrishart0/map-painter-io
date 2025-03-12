import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Automatically clean up after each test
afterEach(() => {
  cleanup();
});

// Make sure the matchers from jest-dom are available
expect.extend({
  // Add any custom matchers if needed
});
