/**
 * Map Rendering Utilities
 *
 * This file contains utility functions for rendering maps with HTML5 Canvas.
 * These functions are used by the MapCanvas component but are separated
 * to improve maintainability and enable reuse.
 */

import { State } from "@/types/map";

// Check if a point is inside a polygon using ray casting algorithm
export function isPointInPolygon(
  lng: number,
  lat: number,
  polygon: Array<[number, number]>,
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if a point is inside a state (any polygon)
export function isPointInState(
  lng: number,
  lat: number,
  state: State,
): boolean {
  for (const polygon of state.polygons) {
    if (isPointInPolygon(lng, lat, polygon)) {
      return true;
    }
  }
  return false;
}

// Convert GeoJSON coordinates to canvas coordinates with zoom and pan
export function coordToCanvas(
  coord: [number, number],
  mapBounds: { minX: number; maxX: number; minY: number; maxY: number },
  offsetX: number,
  offsetY: number,
  scale: number,
): [number, number] {
  const [lng, lat] = coord;
  const x = offsetX + (lng - mapBounds.minX) * scale;
  const y = offsetY + (mapBounds.maxY - lat) * scale;
  return [x, y];
}

// Calculate map scale factors and offsets
export function calculateMapTransform(
  canvasWidth: number,
  canvasHeight: number,
  mapBounds: { minX: number; maxX: number; minY: number; maxY: number },
  zoomLevel: number,
  pan: { x: number; y: number },
) {
  const mapWidth = mapBounds.maxX - mapBounds.minX;
  const mapHeight = mapBounds.maxY - mapBounds.minY;

  // Calculate scaling to fit the map in the canvas with padding
  const padding = 40;
  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  // Calculate scale factors for both dimensions
  const scaleX = availableWidth / mapWidth;
  const scaleY = availableHeight / mapHeight;

  // Use the smaller scale to ensure the entire map fits
  const scale = Math.min(scaleX, scaleY) * zoomLevel;

  // Calculate offsets to center the map
  const offsetX = padding + (availableWidth - mapWidth * scale) / 2 + pan.x;
  const offsetY = padding + (availableHeight - mapHeight * scale) / 2 + pan.y;

  return { scale, offsetX, offsetY };
}

// Draw state on canvas with appropriate styling
export function drawState(
  ctx: CanvasRenderingContext2D,
  state: State,
  isSelected: boolean,
  isHovered: boolean,
  mapBounds: { minX: number; maxX: number; minY: number; maxY: number },
  offsetX: number,
  offsetY: number,
  scale: number,
) {
  if (!state.polygons.length) {
    return;
  }

  // Draw each polygon for this state
  state.polygons.forEach((polygon: Array<[number, number]>) => {
    if (polygon.length < 3) {
      return;
    }

    ctx.beginPath();

    // Move to the first point
    const [startX, startY] = coordToCanvas(
      polygon[0],
      mapBounds,
      offsetX,
      offsetY,
      scale,
    );
    ctx.moveTo(startX, startY);

    // Draw lines to all other points
    for (let i = 1; i < polygon.length; i++) {
      const [x, y] = coordToCanvas(
        polygon[i],
        mapBounds,
        offsetX,
        offsetY,
        scale,
      );
      ctx.lineTo(x, y);
    }

    // Close the path
    ctx.closePath();

    // Clean fill styles based on state status
    if (isSelected) {
      ctx.fillStyle = "#10B981"; // Solid teal for selected
    } else if (isHovered) {
      ctx.fillStyle = "#3B82F6"; // Solid blue for hover
    } else {
      ctx.fillStyle = "#2A3441"; // Neutral dark blue-gray
    }

    // Apply fill
    ctx.fill();

    // Borders
    if (isSelected) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#34D399"; // Teal border
    } else if (isHovered) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#60A5FA"; // Blue border
    } else {
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = "#4B5563"; // Subtle border for neutral states
    }

    ctx.stroke();
  });
}
