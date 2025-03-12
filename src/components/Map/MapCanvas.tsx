"use client";

/**
 * MapCanvas Component
 *
 * This component renders an interactive map of US states using HTML5 Canvas.
 * It loads GeoJSON data and provides functionality for:
 * - Rendering state boundaries on a canvas
 * - Hover interactions to display state names
 * - Click interactions to select/deselect states
 * - Responsive design that scales with its container
 * - Touch support for mobile devices
 *
 * The component uses ShadcnUI for styling with a dark mode first approach.
 * It integrates with the application's theme system for consistent styling.
 *
 * @component
 * @example
 * <MapCanvas width={800} height={600} />
 */

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MapCanvasProps {
  /** Width of the canvas in pixels (default: 800) */
  width?: number;
  /** Height of the canvas in pixels (default: 600) */
  height?: number;
}

// Improving type definitions for GeoJSON
// More specific types for coordinate structures
type Coordinate = [number, number];
type Ring = Coordinate[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

// GeoJSON type interfaces with improved typing
interface GeoJSONFeature {
  id?: string;
  properties: {
    name: string;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: Ring | Polygon | MultiPolygon; // More specific union type instead of any[]
  };
}

// Simple representation of a state with essential data for rendering
interface State {
  id: string;
  name: string;
  // Store coordinates directly as simplified polygons
  polygons: Array<Array<[number, number]>>;
}

export default function MapCanvas({
  width = 800,
  height = 600,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [states, setStates] = useState<State[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [mapBounds, setMapBounds] = useState<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Handle container resizing for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;

    // Store ref value in variable to use in cleanup function
    const currentContainer = containerRef.current;

    const updateCanvasSize = () => {
      if (currentContainer) {
        // Make the canvas fill its container, but respect provided size limits
        const containerWidth = currentContainer.clientWidth;
        // Set a max width if needed, otherwise use the container width
        const newWidth = Math.min(containerWidth, width);
        setCanvasSize({ width: newWidth, height: (newWidth / width) * height });
      }
    };

    // Initial size
    updateCanvasSize();

    // Set up resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(currentContainer);

    return () => {
      resizeObserver.unobserve(currentContainer);
      resizeObserver.disconnect();
    };
  }, [width, height]);

  // Load and process GeoJSON data
  useEffect(() => {
    async function loadGeoJSON() {
      try {
        console.log("Fetching GeoJSON data...");
        const response = await fetch("/data/us-states.json");
        const data = await response.json();

        if (!data.features || !Array.isArray(data.features)) {
          console.error(
            "Invalid GeoJSON data: missing or invalid features array",
          );
          return;
        }

        console.log(`Found ${data.features.length} features in GeoJSON data`);

        // Process states and collect bounds
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        const processedStates = data.features.map((feature: GeoJSONFeature) => {
          const id = feature.id || feature.properties.name;
          const name = feature.properties.name;
          const polygons: Array<Array<[number, number]>> = [];

          // Process based on geometry type
          if (feature.geometry.type === "Polygon") {
            // For polygons, each ring is an array of coordinates
            (feature.geometry.coordinates as Ring[]).forEach(
              (ring: Coordinate[]) => {
                const processedRing: Array<[number, number]> = [];

                ring.forEach(([lng, lat]) => {
                  // Update bounds
                  minX = Math.min(minX, lng);
                  minY = Math.min(minY, lat);
                  maxX = Math.max(maxX, lng);
                  maxY = Math.max(maxY, lat);

                  processedRing.push([lng, lat]);
                });

                polygons.push(processedRing);
              },
            );
          } else if (feature.geometry.type === "MultiPolygon") {
            // For multipolygons, we have an array of polygons
            (feature.geometry.coordinates as Polygon[]).forEach(
              (polygon: Ring[]) => {
                polygon.forEach((ring: Coordinate[]) => {
                  const processedRing: Array<[number, number]> = [];

                  ring.forEach(([lng, lat]) => {
                    // Update bounds
                    minX = Math.min(minX, lng);
                    minY = Math.min(minY, lat);
                    maxX = Math.max(maxX, lng);
                    maxY = Math.max(maxY, lat);

                    processedRing.push([lng, lat]);
                  });

                  polygons.push(processedRing);
                });
              },
            );
          }

          return {
            id,
            name,
            polygons,
          };
        });

        // Validate bounds - ensure they're not NaN or Infinity
        if (
          !isFinite(minX) ||
          !isFinite(minY) ||
          !isFinite(maxX) ||
          !isFinite(maxY)
        ) {
          console.error("Invalid map bounds calculated:", {
            minX,
            minY,
            maxX,
            maxY,
          });
          return;
        }

        setMapBounds({ minX, minY, maxX, maxY });
        setStates(processedStates);
        console.log(
          "Processed",
          processedStates.length,
          "states with bounds:",
          { minX, minY, maxX, maxY },
        );
      } catch (error) {
        console.error("Error loading GeoJSON data:", error);
      }
    }

    loadGeoJSON();
  }, []);

  // Render map on canvas
  useEffect(() => {
    if (!canvasRef.current || !states.length || !mapBounds) {
      console.log("Skipping render:", {
        canvasRef: !!canvasRef.current,
        statesLength: states.length,
        mapBounds: !!mapBounds,
      });
      return;
    }

    console.log("Rendering map with", states.length, "states");

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size according to the measured size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear the canvas - use a dark background in dark mode
    // Note: We can't use CSS variables directly in canvas, so we use actual colors
    // Dark mode background color - using a dark gray
    ctx.fillStyle = "#171717"; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate the dimensions of the map in coordinate space
    const mapWidth = mapBounds.maxX - mapBounds.minX;
    const mapHeight = mapBounds.maxY - mapBounds.minY;

    // Calculate scaling to fit the map in the canvas with padding
    const padding = 20;
    const availableWidth = canvasSize.width - padding * 2;
    const availableHeight = canvasSize.height - padding * 2;

    // Calculate scale factors for both dimensions
    const scaleX = availableWidth / mapWidth;
    const scaleY = availableHeight / mapHeight;

    // Use the smaller scale to ensure the entire map fits
    const scale = Math.min(scaleX, scaleY);

    // Calculate offsets to center the map
    const offsetX = padding + (availableWidth - mapWidth * scale) / 2;
    const offsetY = padding + (availableHeight - mapHeight * scale) / 2;

    // Function to convert a GeoJSON coordinate to canvas position
    function coordToCanvas(coord: [number, number]): [number, number] {
      const [lng, lat] = coord;
      // mapBounds is guaranteed to be non-null here because of the check at the top of this effect
      const x = offsetX + (lng - mapBounds!.minX) * scale;

      // Invert Y coordinate to flip the map right-side up
      // In canvas, y increases downward, but in geographic coordinates, latitude increases upward
      const y = offsetY + (mapBounds!.maxY - lat) * scale;

      return [x, y];
    }

    // Draw each state
    states.forEach((state) => {
      if (!state.polygons.length) {
        console.log(`State "${state.name}" has no polygons to draw`);
        return;
      }

      // Draw each polygon for this state
      state.polygons.forEach((polygon) => {
        if (polygon.length < 3) {
          console.log(
            `Skipping polygon with insufficient points in state "${state.name}"`,
          );
          return;
        }

        ctx.beginPath();

        // Move to the first point
        const [startX, startY] = coordToCanvas(polygon[0]);
        ctx.moveTo(startX, startY);

        // Draw lines to all other points
        for (let i = 1; i < polygon.length; i++) {
          const [x, y] = coordToCanvas(polygon[i]);
          ctx.lineTo(x, y);
        }

        // Close the path
        ctx.closePath();

        // Fill style based on state status - using actual colors instead of CSS variables
        if (selectedStates.has(state.id)) {
          ctx.fillStyle = "#4CAF50"; // Green for selected
        } else if (hoveredState === state.id) {
          ctx.fillStyle = "#3B82F6"; // Blue for hover
        } else {
          ctx.fillStyle = "#374151"; // Dark gray for neutral states
        }

        // Fill and stroke
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#525252"; // Border color
        ctx.stroke();
      });
    });
  }, [states, hoveredState, selectedStates, canvasSize, mapBounds]);

  // Convert canvas coordinates to map coordinates (for mouse/touch events)
  const canvasToMapCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !mapBounds) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    // Calculate map dimensions
    const mapWidth = mapBounds.maxX - mapBounds.minX;
    const mapHeight = mapBounds.maxY - mapBounds.minY;

    // Calculate scaling
    const padding = 20;
    const availableWidth = canvasSize.width - padding * 2;
    const availableHeight = canvasSize.height - padding * 2;
    const scaleX = availableWidth / mapWidth;
    const scaleY = availableHeight / mapHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate offsets
    const offsetX = padding + (availableWidth - mapWidth * scale) / 2;
    const offsetY = padding + (availableHeight - mapHeight * scale) / 2;

    // Convert mouse position to map coordinates
    const lng = (mouseX - offsetX) / scale + mapBounds.minX;

    // Apply the inverse of our coordinate transform to get the correct latitude
    // We inverted the Y axis in coordToCanvas, so we need to invert it here too
    const lat = mapBounds.maxY - (mouseY - offsetY) / scale;

    return { lng, lat };
  };

  // Determine which state a point is over
  const getStateAtPoint = (lng: number, lat: number) => {
    for (const state of states) {
      if (isPointInState(lng, lat, state)) {
        return state.id;
      }
    }
    return null;
  };

  // Handle mouse move to detect hovering over states
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = canvasToMapCoordinates(event.clientX, event.clientY);
    if (!coords) return;

    const { lng, lat } = coords;
    const newHoveredState = getStateAtPoint(lng, lat);

    if (newHoveredState !== hoveredState) {
      setHoveredState(newHoveredState);
    }
  };

  // Handle touch events for mobile
  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling while touching the map
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const coords = canvasToMapCoordinates(touch.clientX, touch.clientY);
      if (!coords) return;

      const { lng, lat } = coords;
      const newHoveredState = getStateAtPoint(lng, lat);

      if (newHoveredState !== hoveredState) {
        setHoveredState(newHoveredState);
      }
    }
  };

  // Handle clicks/touches to select/deselect states
  const handleStateSelect = () => {
    if (hoveredState) {
      setSelectedStates((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(hoveredState)) {
          newSet.delete(hoveredState);
        } else {
          newSet.add(hoveredState);
        }
        return newSet;
      });
    }
  };

  // Check if a point is inside a state (any polygon)
  function isPointInState(lng: number, lat: number, state: State): boolean {
    for (const polygon of state.polygons) {
      if (isPointInPolygon(lng, lat, polygon)) {
        return true;
      }
    }
    return false;
  }

  // Check if a point is inside a polygon using ray casting algorithm
  function isPointInPolygon(
    lng: number,
    lat: number,
    polygon: Array<[number, number]>,
  ): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Updated UI with shadcn components
  return (
    <div
      ref={containerRef}
      className="relative w-full"
      data-testid="map-canvas-container"
    >
      <Card className="mb-4 bg-card text-card-foreground">
        <CardHeader className="p-4">
          <CardTitle className="text-xl">Interactive US Map</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onClick={handleStateSelect}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleStateSelect}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              touchAction: "none", // Important for preventing scroll on touch
            }}
            className="rounded-md"
          />
          {hoveredState && (
            <div className="absolute top-4 right-4 bg-card p-2 rounded-md shadow-md border border-border">
              <strong className="text-card-foreground">
                {states.find((s) => s.id === hoveredState)?.name ||
                  hoveredState}
              </strong>
              {selectedStates.has(hoveredState) && (
                <span className="ml-2 text-primary">(Selected)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* State Details Panel */}
      {selectedStates.size > 0 && (
        <Card className="bg-card text-card-foreground">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Selected States</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="divide-y divide-border">
              {Array.from(selectedStates).map((stateId) => {
                const state = states.find((s) => s.id === stateId);
                if (!state) return null;

                return (
                  <li
                    key={state.id}
                    className="py-2 flex justify-between items-center"
                  >
                    <span className="font-medium text-card-foreground">
                      {state.name}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStates((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(state.id);
                          return newSet;
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
          {selectedStates.size > 0 && (
            <CardFooter className="p-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedStates(new Set())}
              >
                Clear All
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
