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
 * - Full-screen immersive map experience
 * - Supports multiplayer state selection tracking via WebSocket
 *
 * @component
 * @example
 * <MapWrapper width={1000} height={600} />
 */

import { Suspense, useContext } from "react";
import dynamic from "next/dynamic";
import { GameContext } from "@/lib/contexts/GameContext";

// Dynamically import client component with ssr: false
const MultiplayerMap = dynamic(() => import("./MultiplayerMap"), {
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
  // Get current game and player information from context
  const { gameId, currentPlayer } = useContext(GameContext);

  return (
    <div className="w-full h-full relative">
      <Suspense
        fallback={
          <div className="w-full h-[600px] flex flex-col items-center justify-center text-foreground">
            <div className="w-16 h-16 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin mb-4" />
            <p className="text-lg font-medium animate-pulse">Loading map...</p>
          </div>
        }
      >
        {gameId && currentPlayer ? (
          <MultiplayerMap
            gameInstanceId={gameId}
            currentPlayerId={currentPlayer.id}
            width={width}
            height={height}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-lg text-muted-foreground">
              Join a game to interact with the map
            </p>
          </div>
        )}
      </Suspense>
    </div>
  );
}
