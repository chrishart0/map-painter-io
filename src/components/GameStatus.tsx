"use client";
/**
 * Game Status Component
 *
 * Displays Supabase Realtime connection status and provides game joining functionality.
 */

import React, { useState, useEffect } from "react";
import { useGameRealtimeContext } from "@/lib/contexts/GameRealtimeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GameStatus() {
  const {
    isConnected,
    currentPlayer,
    gameInstance,
    onlinePlayers,
    joinGame,
    leaveGame,
    claimState,
    attackState,
    connectionError,
  } = useGameRealtimeContext();

  const [gameId, setGameId] = useState("default-game");
  const [playerName, setPlayerName] = useState("");
  const [extraResources, setExtraResources] = useState(0);
  const [joiningGame, setJoiningGame] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Set local error from connection error
  useEffect(() => {
    if (connectionError) {
      setErrorMessage(connectionError);
    }
  }, [connectionError]);

  // Handle join game
  const handleJoinGame = async () => {
    if (!gameId) {
      setErrorMessage("Please enter a game ID");
      return;
    }

    try {
      setJoiningGame(true);
      setErrorMessage(null);

      // Wait for the join to complete
      await joinGame(gameId, playerName || "Anonymous");
      console.log("Successfully joined game!");
    } catch (error) {
      console.error("Failed to join game", error);
      if (error instanceof Error) {
        setErrorMessage(`Failed to join game: ${error.message}`);
      } else {
        setErrorMessage("Failed to connect to game server. Please try again.");
      }
    } finally {
      setJoiningGame(false);
    }
  };

  // Handle leaving game
  const handleLeaveGame = () => {
    leaveGame();
  };

  // Handle claiming a state
  const handleClaimState = (stateId: string) => {
    try {
      claimState(stateId);
    } catch (error) {
      console.error("Failed to claim state", error);
      setErrorMessage("Failed to claim state. Check console for more details.");
    }
  };

  // Handle attacking a state
  const handleAttackState = (stateId: string) => {
    try {
      attackState(stateId, extraResources);
    } catch (error) {
      console.error("Failed to attack state", error);
      setErrorMessage(
        "Failed to attack state. Check console for more details.",
      );
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4 bg-card">
      <h2 className="text-xl font-bold mb-4">Game Connection</h2>

      {/* Connection status */}
      <div className="flex items-center mb-4">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>
          {isConnected
            ? "Connected"
            : joiningGame
              ? "Connecting..."
              : "Disconnected"}
        </span>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mb-4 p-2 bg-red-500/20 text-red-600 rounded text-sm">
          {errorMessage}
        </div>
      )}

      {/* Player info if connected */}
      {currentPlayer && (
        <div className="mb-4 p-2 bg-secondary/20 rounded">
          <p className="text-sm">
            Playing as{" "}
            <span className="font-semibold">{currentPlayer.name}</span>
          </p>
          <p className="text-sm">
            Resources:{" "}
            <span className="font-semibold">{currentPlayer.resources}</span>
          </p>
          <p className="text-sm">
            Game:{" "}
            <span className="font-semibold">
              {gameInstance?.id || "Unknown"}
            </span>
          </p>
          <p className="text-sm">
            Players online:{" "}
            <span className="font-semibold">{onlinePlayers.length}</span>
          </p>
        </div>
      )}

      {/* Game forms */}
      {!currentPlayer ? (
        <div className="space-y-2 mb-4">
          <div>
            <label className="text-sm font-medium">Game ID</label>
            <Input
              type="text"
              value={gameId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setGameId(e.target.value)
              }
              placeholder="Enter game ID"
              disabled={joiningGame}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Player Name</label>
            <Input
              type="text"
              value={playerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPlayerName(e.target.value)
              }
              placeholder="Enter your name"
              disabled={joiningGame}
            />
          </div>
          <Button onClick={handleJoinGame} disabled={!gameId || joiningGame}>
            {joiningGame ? "Connecting..." : "Join Game"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Game actions */}
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2">Game Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleClaimState("test-state-1")}
                variant="secondary"
                size="sm"
                disabled={currentPlayer.resources < 5 || !isConnected}
              >
                Claim State 1
              </Button>
              <Button
                onClick={() => handleClaimState("test-state-2")}
                variant="secondary"
                size="sm"
                disabled={currentPlayer.resources < 5 || !isConnected}
              >
                Claim State 2
              </Button>
            </div>
          </div>

          {/* Attack controls */}
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2">Attack Controls</h3>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm">Extra Resources:</label>
              <Input
                type="number"
                value={extraResources}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExtraResources(parseInt(e.target.value) || 0)
                }
                className="w-20"
                min={0}
                max={currentPlayer.resources - 10}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleAttackState("test-state-1")}
                variant="destructive"
                size="sm"
                disabled={
                  currentPlayer.resources < 10 + extraResources || !isConnected
                }
              >
                Attack State 1
              </Button>
              <Button
                onClick={() => handleAttackState("test-state-2")}
                variant="destructive"
                size="sm"
                disabled={
                  currentPlayer.resources < 10 + extraResources || !isConnected
                }
              >
                Attack State 2
              </Button>
            </div>
          </div>

          {/* Leave game button */}
          <div className="mt-4">
            <Button onClick={handleLeaveGame} variant="outline" size="sm">
              Leave Game
            </Button>
          </div>
        </div>
      )}

      {/* Display online players if any */}
      {onlinePlayers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-md font-semibold mb-2">Online Players</h3>
          <ul className="space-y-1">
            {onlinePlayers.map((player) => (
              <li key={player.id} className="text-sm flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                {player.name} - {player.resources} resources
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
