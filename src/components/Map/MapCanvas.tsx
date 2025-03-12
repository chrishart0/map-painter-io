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
 * - Keyboard navigation for accessibility
 *
 * @component
 * @example
 * <MapCanvas width={800} height={600} />
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import MapControls from "./MapControls";
import {
  CanvasSize,
  GeoJSONFeature,
  MapBounds,
  PanPosition,
  Point,
  State,
} from "@/types/map";
import {
  calculateMapTransform,
  drawState,
  isPointInState,
} from "@/utils/mapRendering";

interface MapCanvasProps {
  /** Width of the canvas in pixels (default: 800) */
  width?: number;
  /** Height of the canvas in pixels (default: 600) */
  height?: number;
}

// Define a spatial index grid
interface SpatialGridCell {
  stateIndices: number[];
}

export default function MapCanvas({
  width = 800,
  height = 600,
}: MapCanvasProps) {
  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map data state
  const [states, setStates] = useState<State[]>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width, height });

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState<PanPosition>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [showTooltip] = useState(true);
  const [focusedStateIndex, setFocusedStateIndex] = useState<number>(-1);

  // Create a spatial index for faster hit testing and rendering
  const spatialIndex = useMemo(() => {
    if (!states.length || !mapBounds) return null;

    const GRID_SIZE = 20; // 20x20 grid for spatial indexing
    const grid: SpatialGridCell[][] = Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => ({ stateIndices: [] })),
      );

    const mapWidth = mapBounds.maxX - mapBounds.minX;
    const mapHeight = mapBounds.maxY - mapBounds.minY;

    // Place each state in the appropriate grid cells
    states.forEach((state, stateIndex) => {
      // Find the min/max bounds for this state
      let stateMinX = Infinity;
      let stateMaxX = -Infinity;
      let stateMinY = Infinity;
      let stateMaxY = -Infinity;

      state.polygons.forEach((polygon) => {
        polygon.forEach(([lng, lat]) => {
          stateMinX = Math.min(stateMinX, lng);
          stateMaxX = Math.max(stateMaxX, lng);
          stateMinY = Math.min(stateMinY, lat);
          stateMaxY = Math.max(stateMaxY, lat);
        });
      });

      // Convert state bounds to grid cells
      const minGridX = Math.max(
        0,
        Math.floor((GRID_SIZE * (stateMinX - mapBounds.minX)) / mapWidth),
      );
      const maxGridX = Math.min(
        GRID_SIZE - 1,
        Math.floor((GRID_SIZE * (stateMaxX - mapBounds.minX)) / mapWidth),
      );
      const minGridY = Math.max(
        0,
        Math.floor((GRID_SIZE * (stateMinY - mapBounds.minY)) / mapHeight),
      );
      const maxGridY = Math.min(
        GRID_SIZE - 1,
        Math.floor((GRID_SIZE * (stateMaxY - mapBounds.minY)) / mapHeight),
      );

      // Add state index to all grid cells it intersects
      for (let y = minGridY; y <= maxGridY; y++) {
        for (let x = minGridX; x <= maxGridX; x++) {
          grid[y][x].stateIndices.push(stateIndex);
        }
      }
    });

    return { grid, GRID_SIZE };
  }, [states, mapBounds]);

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
          // Extract basic state info
          const id = feature.id || feature.properties.name;
          const name = feature.properties.name;

          // Initialize array to hold all polygons for this state
          const polygons: Array<Array<[number, number]>> = [];

          if (feature.geometry.type === "Polygon") {
            // For single polygons, just add all coordinate rings
            // The first ring is the outer ring, any additional rings are holes
            const coordinates = feature.geometry.coordinates as Array<
              Array<[number, number]>
            >;

            // Add the outer ring (first ring) to the polygons
            polygons.push(coordinates[0]);

            // Update bounds
            coordinates[0].forEach(([lng, lat]) => {
              minX = Math.min(minX, lng);
              maxX = Math.max(maxX, lng);
              minY = Math.min(minY, lat);
              maxY = Math.max(maxY, lat);
            });
          } else if (feature.geometry.type === "MultiPolygon") {
            // For multi-polygons, we have an array of polygons
            // Each polygon has an outer ring and potentially hole rings
            const multiCoordinates = feature.geometry.coordinates as Array<
              Array<Array<[number, number]>>
            >;

            multiCoordinates.forEach((coordinates) => {
              // Add the outer ring (first ring) of each polygon
              polygons.push(coordinates[0]);

              // Update bounds from the outer ring coordinates
              coordinates[0].forEach(([lng, lat]) => {
                minX = Math.min(minX, lng);
                maxX = Math.max(maxX, lng);
                minY = Math.min(minY, lat);
                maxY = Math.max(maxY, lat);
              });
            });
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

  // Determine which state a point is over (using spatial index)
  const getStateAtPoint = useCallback(
    (lng: number, lat: number) => {
      // Fast path: use spatial index if available
      if (spatialIndex && mapBounds) {
        const { grid, GRID_SIZE } = spatialIndex;
        const mapWidth = mapBounds.maxX - mapBounds.minX;
        const mapHeight = mapBounds.maxY - mapBounds.minY;

        // Calculate grid cell for this point
        const gridX = Math.floor(
          (GRID_SIZE * (lng - mapBounds.minX)) / mapWidth,
        );
        const gridY = Math.floor(
          (GRID_SIZE * (lat - mapBounds.minY)) / mapHeight,
        );

        // Point is outside our grid
        if (
          gridX < 0 ||
          gridX >= GRID_SIZE ||
          gridY < 0 ||
          gridY >= GRID_SIZE
        ) {
          return null;
        }

        // Check only states in this grid cell
        const cell = grid[gridY][gridX];
        for (const stateIndex of cell.stateIndices) {
          const state = states[stateIndex];
          if (isPointInState(lng, lat, state)) {
            return state.id;
          }
        }
        return null;
      }

      // Slow path: check all states (fallback)
      for (const state of states) {
        if (isPointInState(lng, lat, state)) {
          return state.id;
        }
      }
      return null;
    },
    [states, mapBounds, spatialIndex],
  );

  // Determine visible states based on current view
  const getVisibleStates = useCallback(() => {
    if (!states.length || !mapBounds) return states;

    // Calculate the current viewport bounds in map coordinates
    // This is a simplified calculation that could be more precise
    const mapWidth = mapBounds.maxX - mapBounds.minX;
    const mapHeight = mapBounds.maxY - mapBounds.minY;

    // Approximate viewport based on the zoom level and pan
    // This is a rough estimate - a more precise calculation would use the inverse of the canvas-to-map transform
    const viewportWidth = mapWidth / zoomLevel;
    const viewportHeight = mapHeight / zoomLevel;

    // Calculate pan offset in map coordinates
    const panOffsetX = (pan.x / canvasSize.width) * viewportWidth;
    const panOffsetY = (pan.y / canvasSize.height) * viewportHeight;

    // Calculate map bounds of current viewport
    const viewMinX = mapBounds.minX - panOffsetX;
    const viewMaxX = viewMinX + viewportWidth;
    const viewMinY = mapBounds.minY - panOffsetY;
    const viewMaxY = viewMinY + viewportHeight;

    // Filter states to those that intersect the viewport
    return states.filter((state) => {
      // Quick check: see if any polygon vertex is in viewport
      for (const polygon of state.polygons) {
        for (const [lng, lat] of polygon) {
          if (
            lng >= viewMinX &&
            lng <= viewMaxX &&
            lat >= viewMinY &&
            lat <= viewMaxY
          ) {
            return true;
          }
        }
      }

      // Additional check for state bounds could be added for more precision
      return false;
    });
  }, [states, mapBounds, zoomLevel, pan, canvasSize]);

  // Render map on canvas with zoom and pan - optimized version
  useEffect(() => {
    if (!canvasRef.current || !states.length || !mapBounds) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size according to the measured size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Clear the canvas - use a clean dark background
    ctx.fillStyle = "#0A0F14"; // Dark background without gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate transform parameters
    const { scale, offsetX, offsetY } = calculateMapTransform(
      canvasSize.width,
      canvasSize.height,
      mapBounds,
      zoomLevel,
      pan,
    );

    // Performance optimization: only draw states that are likely to be visible
    // For very large datasets, this can significantly improve performance
    const stateList = states.length > 50 ? getVisibleStates() : states;

    // Draw each state
    stateList.forEach((state) => {
      // Find the real index in the full states array for highlighting
      const realIndex = states.indexOf(state);
      const isSelected = selectedStates.has(state.id);
      const isHovered =
        hoveredState === state.id || realIndex === focusedStateIndex;

      drawState(
        ctx,
        state,
        isSelected,
        isHovered,
        mapBounds,
        offsetX,
        offsetY,
        scale,
      );
    });
  }, [
    states,
    hoveredState,
    selectedStates,
    canvasSize,
    mapBounds,
    zoomLevel,
    pan,
    focusedStateIndex,
    getVisibleStates,
  ]);

  // Convert canvas coordinates to map coordinates (for mouse/touch events)
  const canvasToMapCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current || !mapBounds) return null;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      // Calculate transform parameters
      const { scale, offsetX, offsetY } = calculateMapTransform(
        canvasSize.width,
        canvasSize.height,
        mapBounds,
        zoomLevel,
        pan,
      );

      // Convert mouse position to map coordinates
      const lng = (mouseX - offsetX) / scale + mapBounds.minX;
      const lat = mapBounds.maxY - (mouseY - offsetY) / scale;

      return { lng, lat };
    },
    [canvasSize, mapBounds, zoomLevel, pan],
  );

  // Handle zoom with mouse wheel - reduced sensitivity
  const handleWheel = useCallback(
    (event: WheelEvent) => {
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
    (event: TouchEvent) => {
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
    (event: TouchEvent) => {
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

  // Add non-passive touch event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Add touch event listeners with passive: false
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    // Add wheel event listener with passive: false
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // Cleanup
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

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

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // If no state is focused yet, focus the first one on any navigation key
      if (
        focusedStateIndex === -1 &&
        states.length > 0 &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown")
      ) {
        setFocusedStateIndex(0);
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          // Navigate to the next state
          if (states.length > 0) {
            setFocusedStateIndex((prev) => (prev + 1) % states.length);
          }
          e.preventDefault();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          // Navigate to the previous state
          if (states.length > 0) {
            setFocusedStateIndex((prev) =>
              prev <= 0 ? states.length - 1 : prev - 1,
            );
          }
          e.preventDefault();
          break;
        case "Enter":
        case " ": // Space
          // Select/deselect the focused state
          if (focusedStateIndex >= 0 && focusedStateIndex < states.length) {
            const stateId = states[focusedStateIndex].id;
            setSelectedStates((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(stateId)) {
                newSet.delete(stateId);
              } else {
                newSet.add(stateId);
              }
              return newSet;
            });
          }
          e.preventDefault();
          break;
        case "+":
          // Zoom in
          setZoomLevel((prev) => Math.min(5, prev + 0.1));
          e.preventDefault();
          break;
        case "-":
          // Zoom out
          setZoomLevel((prev) => Math.max(0.5, prev - 0.1));
          e.preventDefault();
          break;
        case "r":
        case "R":
          // Reset view
          resetView();
          e.preventDefault();
          break;
      }
    },
    [focusedStateIndex, states, resetView],
  );

  // Clean minimal UI with full-screen map
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px]"
      data-testid="map-canvas-container"
      tabIndex={0} // Make div focusable for keyboard events
      onKeyDown={handleKeyDown}
      aria-label="Interactive map of US states"
      role="application"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStateSelect}
        onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right-click
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none", // Important for preventing scroll on touch
          cursor: isDragging ? "grabbing" : hoveredState ? "pointer" : "grab",
        }}
        className="rounded-sm"
        aria-hidden="true" // Hide canvas from screen readers since we use the parent div for interactions
      />

      {/* Map Controls */}
      <MapControls
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        resetView={resetView}
        hoveredState={
          hoveredState ||
          (focusedStateIndex >= 0 ? states[focusedStateIndex]?.id : null)
        }
        states={states}
        selectedStates={selectedStates}
        showTooltip={showTooltip}
      />

      {/* Invisible text for screen readers to announce focused state */}
      {focusedStateIndex >= 0 && focusedStateIndex < states.length && (
        <div className="sr-only" aria-live="polite">
          {states[focusedStateIndex].name}
          {selectedStates.has(states[focusedStateIndex].id)
            ? " - Selected"
            : ""}
        </div>
      )}
    </div>
  );
}
