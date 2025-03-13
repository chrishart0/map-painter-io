"use client";

/**
 * MultiplayerMap Component
 *
 * This component integrates the MapCanvas with real-time player state selections.
 * It shows what states other players have selected via WebSocket.
 */

import { useEffect, useState } from "react";
import { useGameRealtime } from "@/lib/hooks/useGameRealtime";
import MapCanvas from "./MapCanvas";
// import { Player } from "@/types/game";

interface MultiplayerMapProps {
  gameInstanceId: string;
  currentPlayerId?: string;
  width?: number;
  height?: number;
}

export default function MultiplayerMap({
  gameInstanceId,
  currentPlayerId,
  width = 800,
  height = 600,
}: MultiplayerMapProps) {
  // Track the current player's selections
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  // Use the game realtime hook to get player selections
  const {
    players,
    isLoading,
    error,
    playerSelections,
    sendStateSelectionUpdate,
  } = useGameRealtime({
    gameInstanceId,
    onPlayerSelectionsChange: (selections) => {
      console.log("Player selections updated:", selections);
    },
  });

  // When the current player's selection changes, send an update
  useEffect(() => {
    if (currentPlayerId && selectedStates.length > 0) {
      sendStateSelectionUpdate(currentPlayerId, selectedStates);
    }
  }, [selectedStates, currentPlayerId, sendStateSelectionUpdate]);

  // Handle selection changes from the map
  const handleSelectionChange = (newSelection: string[]) => {
    setSelectedStates(newSelection);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading map...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 text-white p-4 rounded-md">
        <h3 className="font-bold">Error</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapCanvas
        width={width}
        height={height}
        playerSelections={playerSelections}
        players={players}
        onSelectionChange={handleSelectionChange}
        currentPlayerId={currentPlayerId}
      />
    </div>
  );
}
