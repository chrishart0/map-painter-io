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
 * - Zoom and pan functionality similar to territorial.io
 *
 * @component
 * @example
 * <MapCanvas width={800} height={600} />
 */

import { useEffect, useRef, useState, useCallback } from "react";
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

  // Zoom and pan functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showTooltip] = useState(true);

  // Handle container resizing for responsive layout
  useEffect(() => {
    if (!containerRef.current) return;

    // Store ref value in variable to use in cleanup function
    const currentContainer = containerRef.current;

    const updateCanvasSize = () => {
      if (currentContainer) {
        // Make the canvas fill its container, but respect provided size limits
        const containerWidth = currentContainer.clientWidth;
        const containerHeight = currentContainer.clientHeight;
        // Set full dimensions for more immersive experience
        setCanvasSize({
          width: containerWidth,
          height: containerHeight,
        });
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
  }, []);

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

  // Render map on canvas with zoom and pan
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

    // Clear the canvas - use a clean dark background
    ctx.fillStyle = "#0A0F14"; // Dark background without gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate the dimensions of the map in coordinate space
    const mapWidth = mapBounds.maxX - mapBounds.minX;
    const mapHeight = mapBounds.maxY - mapBounds.minY;

    // Calculate scaling to fit the map in the canvas with padding
    const padding = 40;
    const availableWidth = canvasSize.width - padding * 2;
    const availableHeight = canvasSize.height - padding * 2;

    // Calculate scale factors for both dimensions
    const scaleX = availableWidth / mapWidth;
    const scaleY = availableHeight / mapHeight;

    // Use the smaller scale to ensure the entire map fits
    const scale = Math.min(scaleX, scaleY) * zoomLevel;

    // Calculate offsets to center the map
    const offsetX = padding + (availableWidth - mapWidth * scale) / 2 + pan.x;
    const offsetY = padding + (availableHeight - mapHeight * scale) / 2 + pan.y;

    // Function to convert a GeoJSON coordinate to canvas position with zoom and pan
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

        // Clean fill styles based on state status
        if (selectedStates.has(state.id)) {
          ctx.fillStyle = "#10B981"; // Solid teal for selected
        } else if (hoveredState === state.id) {
          ctx.fillStyle = "#3B82F6"; // Solid blue for hover
        } else {
          ctx.fillStyle = "#2A3441"; // Neutral dark blue-gray
        }

        // Apply fill
        ctx.fill();

        // Borders
        if (selectedStates.has(state.id)) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#34D399"; // Teal border
        } else if (hoveredState === state.id) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#60A5FA"; // Blue border
        } else {
          ctx.lineWidth = 0.75;
          ctx.strokeStyle = "#4B5563"; // Subtle border for neutral states
        }

        ctx.stroke();
      });
    });
  }, [
    states,
    hoveredState,
    selectedStates,
    canvasSize,
    mapBounds,
    zoomLevel,
    pan,
  ]);

  // Check if a point is inside a polygon using ray casting algorithm
  const isPointInPolygon = useCallback(
    (lng: number, lat: number, polygon: Array<[number, number]>): boolean => {
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
    },
    [],
  );

  // Check if a point is inside a state (any polygon)
  const isPointInState = useCallback(
    (lng: number, lat: number, state: State): boolean => {
      for (const polygon of state.polygons) {
        if (isPointInPolygon(lng, lat, polygon)) {
          return true;
        }
      }
      return false;
    },
    [isPointInPolygon],
  );

  // Convert canvas coordinates to map coordinates (for mouse/touch events)
  const canvasToMapCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current || !mapBounds) return null;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // Calculate map dimensions
      const mapWidth = mapBounds.maxX - mapBounds.minX;
      const mapHeight = mapBounds.maxY - mapBounds.minY;

      // Calculate scaling
      const padding = 40;
      const availableWidth = canvasSize.width - padding * 2;
      const availableHeight = canvasSize.height - padding * 2;
      const scaleX = availableWidth / mapWidth;
      const scaleY = availableHeight / mapHeight;
      const scale = Math.min(scaleX, scaleY) * zoomLevel;

      // Calculate offsets
      const offsetX = padding + (availableWidth - mapWidth * scale) / 2 + pan.x;
      const offsetY =
        padding + (availableHeight - mapHeight * scale) / 2 + pan.y;

      // Convert mouse position to map coordinates
      const lng = (mouseX - offsetX) / scale + mapBounds.minX;
      const lat = mapBounds.maxY - (mouseY - offsetY) / scale;

      return { lng, lat };
    },
    [canvasSize, mapBounds, zoomLevel, pan],
  );

  // Determine which state a point is over
  const getStateAtPoint = useCallback(
    (lng: number, lat: number) => {
      for (const state of states) {
        if (isPointInState(lng, lat, state)) {
          return state.id;
        }
      }
      return null;
    },
    [states, isPointInState],
  );

  // Handle zoom with mouse wheel - reduced sensitivity
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      // Reduce sensitivity by a factor of 3
      const delta = event.deltaY * -0.003;
      const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));

      setZoomLevel(newZoom);
    },
    [zoomLevel],
  );

  // Handle right-click drag to pan
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      // Only start dragging on right-click (button 2)
      if (event.button === 2) {
        event.preventDefault();
        setIsDragging(true);
        setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
      }
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      // First check for hover state
      const coords = canvasToMapCoordinates(event.clientX, event.clientY);
      if (coords) {
        const { lng, lat } = coords;
        const newHoveredState = getStateAtPoint(lng, lat);

        if (newHoveredState !== hoveredState) {
          setHoveredState(newHoveredState);
        }
      }

      // Then handle dragging if active
      if (isDragging) {
        setPan({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y,
        });
      }
    },
    [
      isDragging,
      dragStart,
      hoveredState,
      canvasToMapCoordinates,
      getStateAtPoint,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events for mobile
  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      // Prevent scrolling while touching the map
      event.preventDefault();

      if (event.touches.length === 1) {
        const touch = event.touches[0];

        // Handle panning
        if (isDragging) {
          setPan({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
          });
        }

        // Update hovered state
        const coords = canvasToMapCoordinates(touch.clientX, touch.clientY);
        if (!coords) return;

        const { lng, lat } = coords;
        const newHoveredState = getStateAtPoint(lng, lat);

        if (newHoveredState !== hoveredState) {
          setHoveredState(newHoveredState);
        }
      }
    },
    [
      canvasToMapCoordinates,
      getStateAtPoint,
      hoveredState,
      isDragging,
      dragStart,
    ],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    },
    [pan],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle clicks/touches to select/deselect states
  const handleStateSelect = useCallback(() => {
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
  }, [hoveredState]);

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Clean minimal UI with full-screen map
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px]"
      data-testid="map-canvas-container"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStateSelect}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none", // Important for preventing scroll on touch
          cursor: isDragging ? "grabbing" : hoveredState ? "pointer" : "grab",
        }}
        className="rounded-sm"
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}
        >
          +
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
        >
          -
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
          onClick={resetView}
        >
          Reset
        </Button>
      </div>

      {/* Control Info */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border text-xs">
        <span className="text-muted-foreground">
          Right-click + drag to pan • Mouse wheel to zoom
        </span>
      </div>

      {/* State tooltip */}
      {hoveredState && showTooltip && (
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border">
          <strong className="text-foreground">
            {states.find((s) => s.id === hoveredState)?.name || hoveredState}
          </strong>
          {selectedStates.has(hoveredState) && (
            <span className="ml-2 text-primary">(Selected)</span>
          )}
        </div>
      )}

      {/* Selected count */}
      {selectedStates.size > 0 && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border">
          <span className="text-foreground">
            Selected: {selectedStates.size}{" "}
            {selectedStates.size === 1 ? "state" : "states"}
          </span>
        </div>
      )}
    </div>
  );
}
