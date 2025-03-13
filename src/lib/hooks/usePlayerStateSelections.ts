"use client";

/**
 * usePlayerStateSelections Hook
 *
 * A custom hook that simplifies the integration of player state selections
 * in the main game. It handles tracking and updating player selections via WebSocket.
 */

import { useState, useCallback, useContext, useRef } from "react";
import { useGameRealtime } from "./useGameRealtime";
import { GameContext } from "@/lib/contexts/GameContext";
import { Player } from "@/types/game";
// Helper function to compare arrays of strings
const areArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;

  // Sort arrays to handle different ordering
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  // Compare each element
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }

  return true;
};

interface UsePlayerStateSelectionsOptions {
  gameInstanceId: string;
}

interface UsePlayerStateSelectionsReturn {
  playerSelections: Record<string, string[]>;
  players: Player[];
  isLoading: boolean;
  error: Error | null;
  updateSelection: (selectedStates: string[]) => void;
}

export function usePlayerStateSelections({
  gameInstanceId,
}: UsePlayerStateSelectionsOptions): UsePlayerStateSelectionsReturn {
  // Move all hooks to the top level to ensure consistent order
  const { currentPlayer } = useContext(GameContext);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  // Keep track of the last selection we sent to avoid unnecessary updates
  const lastSentSelectionRef = useRef<string[]>([]);

  // Validate that we have a valid game ID and current player before connecting
  const isValidConnection = gameInstanceId !== "" && !!currentPlayer;

  // Use the game realtime hook to get player selections only if we have a valid connection
  const {
    players,
    isLoading,
    error,
    playerSelections,
    sendStateSelectionUpdate,
  } = useGameRealtime({
    gameInstanceId,
    onPlayerSelectionsChange: (selections) => {
      if (isValidConnection) {
        console.log("Player selections updated:", selections);

        // If we have data for the current player, sync our local state with it
        // This prevents inconsistencies between local state and server state
        if (currentPlayer && selections[currentPlayer.id]) {
          const serverSelection = selections[currentPlayer.id];
          if (!areArraysEqual(serverSelection, selectedStates)) {
            setSelectedStates(serverSelection);
          }
        }
      }
    },
  });

  // Update the current player's selection
  const updateSelection = useCallback(
    (newSelectedStates: string[]) => {
      if (!isValidConnection || !currentPlayer) return;

      // Avoid unnecessary state updates if selection hasn't changed
      if (areArraysEqual(newSelectedStates, selectedStates)) return;

      setSelectedStates(newSelectedStates);

      // Avoid sending duplicate WebSocket messages
      // Only send if the selection has changed from what we last sent
      if (!areArraysEqual(newSelectedStates, lastSentSelectionRef.current)) {
        sendStateSelectionUpdate(currentPlayer.id, newSelectedStates);
        lastSentSelectionRef.current = [...newSelectedStates];
      }
    },
    [
      currentPlayer,
      sendStateSelectionUpdate,
      isValidConnection,
      selectedStates,
    ],
  );

  return {
    playerSelections,
    players,
    isLoading,
    error,
    updateSelection,
  };
}
