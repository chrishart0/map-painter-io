/**
 * Map Types
 *
 * This file contains type definitions for map-related data structures.
 */

// Coordinate types
export type Coordinate = [number, number];
export type Ring = Coordinate[];
export type Polygon = Ring[];
export type MultiPolygon = Polygon[];

// GeoJSON feature interface with improved typing
export interface GeoJSONFeature {
  id?: string;
  properties: {
    name: string;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: Ring | Polygon | MultiPolygon;
  };
}

// Simple representation of a state with essential data for rendering
export interface State {
  id: string;
  name: string;
  // Store coordinates directly as simplified polygons
  polygons: Array<Array<[number, number]>>;
}

// Map bounds
export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Canvas size
export interface CanvasSize {
  width: number;
  height: number;
}

// Pan position
export interface PanPosition {
  x: number;
  y: number;
}

// Point for drag start
export interface Point {
  x: number;
  y: number;
}
