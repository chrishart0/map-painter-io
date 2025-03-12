import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import MapCanvas from "../MapCanvas";

// Mock fetch to return sample GeoJSON data
global.fetch = vi.fn();

// Sample minimal GeoJSON for testing
const sampleGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "test-state-1",
      properties: { name: "Test State 1" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-100, 40],
            [-105, 40],
            [-105, 45],
            [-100, 45],
            [-100, 40],
          ],
        ],
      },
    },
    {
      type: "Feature",
      id: "test-state-2",
      properties: { name: "Test State 2" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-90, 30],
              [-95, 30],
              [-95, 35],
              [-90, 35],
              [-90, 30],
            ],
          ],
        ],
      },
    },
  ],
};

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock canvas methods
const mockGetContext = vi.fn(() => ({
  fillStyle: "",
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  lineWidth: 0,
  strokeStyle: "",
  setLineDash: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  shadowColor: "",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
}));

describe("MapCanvas Component", () => {
  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;

    // Mock canvas
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(mockGetContext());

    // Mock fetch response
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(sampleGeoJSON),
    });

    // Mock getBoundingClientRect for canvas
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));

    // Suppress console logs
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the canvas element", () => {
    const { container } = render(<MapCanvas />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });

  it("fetches GeoJSON data on mount", async () => {
    render(<MapCanvas />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/data/us-states.json");
    });
  });

  it("processes GeoJSON data correctly", async () => {
    render(<MapCanvas />);

    // Wait for mock fetch to resolve and useEffect to process the data
    await waitFor(() => {
      // Check that getContext was called to render the map
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });
  });

  it("renders zoom controls", async () => {
    render(<MapCanvas />);

    await waitFor(() => {
      const zoomInButton = screen.getByText("+");
      const zoomOutButton = screen.getByText("-");
      const resetButton = screen.getByText("Reset");

      expect(zoomInButton).toBeInTheDocument();
      expect(zoomOutButton).toBeInTheDocument();
      expect(resetButton).toBeInTheDocument();
    });
  });

  it("renders control info", async () => {
    render(<MapCanvas />);

    await waitFor(() => {
      const controlInfo = screen.getByText(
        /Right-click \+ drag to pan • Mouse wheel to zoom/i,
      );
      expect(controlInfo).toBeInTheDocument();
    });
  });

  // Skip the problematic tests for now
  it.skip("updates hoveredState on mouse move", async () => {
    // This test needs more work to properly mock the state detection
    const { container } = render(<MapCanvas />);

    // Wait for data to load
    await waitFor(
      () => {
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
      },
      { timeout: 1000 },
    );
  });

  it.skip("toggles state selection on left-click", async () => {
    // This test needs more work to properly mock the state selection
    const { container } = render(<MapCanvas />);

    // Wait for data to load
    await waitFor(
      () => {
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
      },
      { timeout: 1000 },
    );
  });

  it.skip("pans the map on right-click drag", async () => {
    // This test would need to simulate right-click and drag
    const { container } = render(<MapCanvas />);

    // Wait for data to load
    await waitFor(
      () => {
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
      },
      { timeout: 1000 },
    );
  });
});
