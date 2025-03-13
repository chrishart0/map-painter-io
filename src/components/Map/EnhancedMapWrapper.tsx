"use client";

/**
 * EnhancedMapWrapper Component
 *
 * This component serves as a client-side wrapper for the MapCanvas component
 * with enhanced functionality for multiplayer state selection tracking.
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
 * <EnhancedMapWrapper width={1000} height={600} />
 */

import { Suspense, useContext } from "react";
import dynamic from "next/dynamic";
import { GameContext } from "@/lib/contexts/GameContext";
import { usePlayerStateSelections } from "@/lib/hooks/usePlayerStateSelections";

// Dynamically import client component with ssr: false
const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
});

interface EnhancedMapWrapperProps {
  /** Width of the map in pixels (default: 1000) */
  width?: number;
  /** Height of the map in pixels (default: 600) */
  height?: number;
}

export default function EnhancedMapWrapper({
  width = 1000,
  height = 600,
}: EnhancedMapWrapperProps) {
  // Get current game and player information from context
  const { gameId, currentPlayer, isJoined } = useContext(GameContext);

  // Always call the hook, but handle the inactive state inside the hook
  const playerSelectionsData = usePlayerStateSelections({
    gameInstanceId: isJoined && gameId ? gameId : "",
  });

  // If not joined or no game ID, return empty data
  const {
    playerSelections = {},
    players = [],
    isLoading = false,
    error = null,
    updateSelection = () => {},
  } = isJoined && gameId
    ? playerSelectionsData
    : {
        playerSelections: {},
        players: [],
        isLoading: false,
        error: null,
        updateSelection: () => {},
      };

  // Handle selection changes from the map
  const handleSelectionChange = (newSelection: string[]) => {
    if (isJoined && gameId) {
      updateSelection(newSelection);
    }
  };

  // isLoading is true if the player is not joined to a game
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Joining...</p>
      </div>
    );
  }

  // error
  // TODO: handle error
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Error: {error.message}</p>
      </div>
    );
  }

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
        {isJoined && currentPlayer ? (
          <MapCanvas
            width={width}
            height={height}
            playerSelections={playerSelections}
            players={players}
            onSelectionChange={handleSelectionChange}
            currentPlayerId={currentPlayer.id}
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
