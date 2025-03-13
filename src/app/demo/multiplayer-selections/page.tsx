"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import MultiplayerMap from "@/components/Map/MultiplayerMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MultiplayerSelectionsDemo() {
  const [gameId, setGameId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [isJoined, setIsJoined] = useState<boolean>(false);

  // Generate a default game ID on mount
  useEffect(() => {
    const defaultGameId = "demo-" + Math.floor(Math.random() * 1000);
    setGameId(defaultGameId);
  }, []);

  // Join the game
  const handleJoin = () => {
    if (!gameId || !playerName) return;

    const newPlayerId = uuidv4();
    setPlayerId(newPlayerId);
    setIsJoined(true);
  };

  // Leave the game
  const handleLeave = () => {
    setIsJoined(false);
    setPlayerId("");
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">
        Multiplayer State Selections Demo
      </h1>

      <div className="mb-8 p-4 bg-gray-800 rounded-lg">
        <p className="mb-4">
          This demo shows how to see what states other players have selected via
          WebSocket. Join with different browser tabs to see the selections
          update in real-time.
        </p>

        {!isJoined ? (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="gameId">Game ID</Label>
              <Input
                id="gameId"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter a game ID"
              />
              <p className="text-xs text-gray-400">
                Use the same Game ID in different browser tabs to test
                multiplayer functionality.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <Button onClick={handleJoin} disabled={!gameId || !playerName}>
              Join Game
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
              <div>
                <span className="text-gray-400">Game ID:</span>{" "}
                <span className="font-mono">{gameId}</span>
              </div>
              <div>
                <span className="text-gray-400">Player:</span>{" "}
                <span className="font-semibold">{playerName}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLeave}>
                Leave Game
              </Button>
            </div>

            <div className="text-sm mb-2">
              <p>
                Click on states to select/deselect them. Other players will see
                your selections in real-time.
              </p>
            </div>

            <div className="h-[600px] border border-gray-700 rounded-lg overflow-hidden">
              <MultiplayerMap
                gameInstanceId={gameId}
                currentPlayerId={playerId}
                height={600}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
