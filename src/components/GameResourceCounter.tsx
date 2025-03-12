"use client";

/**
 * Game Resource Counter
 *
 * Displays game resources and state ownership statistics
 */

import React from "react";
import { useGameRealtime } from "@/lib/contexts/GameRealtimeContext";

export function GameResourceCounter() {
  const { currentPlayer, gameInstance } = useGameRealtime();

  if (!currentPlayer || !gameInstance) {
    return null;
  }

  // Count owned states by player
  const stateCounts: Record<string, number> = {};

  // Calculate state ownership counts
  Object.values(gameInstance.stateOwnerships).forEach((ownership) => {
    if (ownership.ownerId) {
      stateCounts[ownership.ownerId] =
        (stateCounts[ownership.ownerId] || 0) + 1;
    }
  });

  // Get player data
  const playerData = Object.values(gameInstance.players).map((player) => ({
    ...player,
    stateCount: stateCounts[player.id] || 0,
  }));

  // Sort players by state count (descending)
  playerData.sort((a, b) => b.stateCount - a.stateCount);

  return (
    <div className="fixed top-4 right-4 p-3 bg-background/90 backdrop-blur-sm border rounded-lg shadow-md z-50 w-64">
      <h3 className="text-sm font-semibold mb-2 pb-1 border-b">Game Stats</h3>

      {/* Player stats */}
      <div className="space-y-2">
        {playerData.map((player) => {
          const isCurrentPlayer = player.id === currentPlayer.id;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between text-xs ${isCurrentPlayer ? "font-medium" : ""}`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="truncate max-w-32">
                  {player.name} {isCurrentPlayer && "(you)"}
                </span>
              </div>
              <div className="flex gap-3">
                <span title="States owned">🏙️ {player.stateCount}</span>
                <span title="Resources">💰 {player.resources}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Game details */}
      <div className="mt-3 pt-1 border-t text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Game:</span>
          <span>{gameInstance.name}</span>
        </div>
        <div className="flex justify-between">
          <span>States:</span>
          <span>{Object.keys(gameInstance.stateOwnerships).length}</span>
        </div>
        <div className="flex justify-between">
          <span>Last update:</span>
          <span>
            {new Date(gameInstance.lastResourceUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
