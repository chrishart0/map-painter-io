"use client";

/**
 * MapWrapper Component
 *
 * This component serves as a client-side wrapper for the MapCanvas component.
 * It uses Next.js dynamic imports with SSR disabled to ensure the canvas rendering
 * only happens on the client side, avoiding hydration errors.
 *
 * Features:
 * - Provides a loading fallback during dynamic import
 * - Handles client-side only rendering of canvas elements
 * - Passes dimension props to the MapCanvas component
 *
 * @component
 * @example
 * <MapWrapper width={1000} height={600} />
 */

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import client component with ssr: false
const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
});

interface MapWrapperProps {
  /** Width of the map in pixels (default: 1000) */
  width?: number;
  /** Height of the map in pixels (default: 600) */
  height?: number;
}

export default function MapWrapper({
  width = 1000,
  height = 600,
}: MapWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[600px] border border-border rounded-md bg-card/50 flex items-center justify-center text-card-foreground">
          Loading map...
        </div>
      }
    >
      <MapCanvas width={width} height={height} />
    </Suspense>
  );
}
