"use client";

import React, { createContext, useState, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Player } from "@/types/game";

interface GameContextType {
  gameId: string | null;
  setGameId: (id: string) => void;
  currentPlayer: Player | null;
  setCurrentPlayer: (player: Player) => void;
  isJoined: boolean;
  joinGame: (gameId: string, playerName: string) => void;
  leaveGame: () => void;
}

export const GameContext = createContext<GameContextType>({
  gameId: null,
  setGameId: () => {},
  currentPlayer: null,
  setCurrentPlayer: () => {},
  isJoined: false,
  joinGame: () => {},
  leaveGame: () => {},
});

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isJoined, setIsJoined] = useState<boolean>(false);

  // Generate a random color for the player
  const getRandomColor = (): string => {
    const colors = [
      "#FF5733", // Red-Orange
      "#33FF57", // Green
      "#3357FF", // Blue
      "#FF33F5", // Pink
      "#F5FF33", // Yellow
      "#33FFF5", // Cyan
      "#F533FF", // Magenta
      "#FF8333", // Orange
      "#8333FF", // Purple
      "#33FF83", // Mint
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Join a game
  const joinGame = (gameId: string, playerName: string) => {
    if (!gameId || !playerName) return;

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name: playerName,
      color: getRandomColor(),
      resources: 10, // Starting resources
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    setGameId(gameId);
    setCurrentPlayer(player);
    setIsJoined(true);
  };

  // Leave the game
  const leaveGame = () => {
    setGameId(null);
    setCurrentPlayer(null);
    setIsJoined(false);
  };

  return (
    <GameContext.Provider
      value={{
        gameId,
        setGameId,
        currentPlayer,
        setCurrentPlayer,
        isJoined,
        joinGame,
        leaveGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
