"use client";

/**
 * Simple Game Realtime Context
 *
 * A simplified version of the GameRealtimeContext that uses the useSimpleRealtimeChannel hook.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { RealtimePresenceState } from "@supabase/supabase-js";
import { useSimpleRealtimeChannel } from "../hooks/useSimpleRealtimeChannel";
import {
  MessageType,
  Player,
  GameInstance,
  GameStateMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  StateClaimedMessage,
  StateAttackedMessage,
  ResourcesUpdatedMessage,
} from "@/types/game";
import { v4 as uuidv4 } from "uuid";

// Define more specific types to replace 'any'
interface ChannelPayload {
  [key: string]: unknown;
  type?: string;
  event: string;
  payload?: unknown;
}

interface PresenceData {
  presence_ref?: string;
  user_id?: string;
  user_data?: Player;
  [key: string]: unknown;
}

interface SimpleGameRealtimeContextType {
  isConnected: boolean;
  currentPlayer: Player | null;
  gameInstance: GameInstance | null;
  onlinePlayers: Player[];
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: () => void;
  claimState: (stateId: string) => void;
  attackState: (stateId: string, extraResources: number) => void;
  connectionError: string | null;
}

const SimpleGameRealtimeContext =
  createContext<SimpleGameRealtimeContextType | null>(null);

interface SimpleGameRealtimeProviderProps {
  children: ReactNode;
}

export const SimpleGameRealtimeProvider: React.FC<
  SimpleGameRealtimeProviderProps
> = ({ children }) => {
  // State
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameInstance, setGameInstance] = useState<GameInstance | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Clear error message after some time
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => {
        setConnectionError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [connectionError]);

  // Message handlers
  const eventHandlers = {
    [MessageType.GAME_STATE]: (payload: ChannelPayload) => {
      console.log("Game state received:", payload);
      if (payload.payload) {
        // Use unknown as intermediate type for safe type assertion
        const payloadData = payload.payload as unknown;
        const message = payloadData as GameStateMessage;
        if (message.type === MessageType.GAME_STATE && message.instance) {
          setGameInstance(message.instance);
        }
      }
    },

    [MessageType.PLAYER_JOINED]: (payload: ChannelPayload) => {
      console.log("Player joined:", payload);
      if (payload.payload) {
        // Use unknown as intermediate type for safe type assertion
        const payloadData = payload.payload as unknown;
        const message = payloadData as PlayerJoinedMessage;
        if (message.type === MessageType.PLAYER_JOINED && message.player) {
          setGameInstance((prev) => {
            if (!prev)
              return {
                id: gameId || "default",
                name: "Default Game",
                createdAt: Date.now(),
                players: { [message.player.id]: message.player },
                stateOwnerships: {},
                lastResourceUpdate: Date.now(),
              };

            return {
              ...prev,
              players: {
                ...prev.players,
                [message.player.id]: message.player,
              },
            };
          });
        }
      }
    },

    [MessageType.PLAYER_LEFT]: (payload: ChannelPayload) => {
      console.log("Player left:", payload);
      if (payload.payload) {
        // Use unknown as intermediate type for safe type assertion
        const payloadData = payload.payload as unknown;
        const message = payloadData as PlayerLeftMessage;
        if (message.type === MessageType.PLAYER_LEFT && message.playerId) {
          setGameInstance((prev) => {
            if (!prev) return prev;

            const newPlayers = { ...prev.players };
            delete newPlayers[message.playerId];

            return {
              ...prev,
              players: newPlayers,
            };
          });
        }
      }
    },

    [MessageType.STATE_CLAIMED]: (payload: ChannelPayload) => {
      console.log("State claimed:", payload);
      if (payload.payload) {
        // Use unknown as intermediate type for safe type assertion
        const payloadData = payload.payload as unknown;
        const message = payloadData as StateClaimedMessage;
        if (
          message.type === MessageType.STATE_CLAIMED &&
          message.stateId &&
          message.playerId
        ) {
          setGameInstance((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              stateOwnerships: {
                ...prev.stateOwnerships,
                [message.stateId]: {
                  stateId: message.stateId,
                  ownerId: message.playerId,
                  capturedAt: Date.now(),
                },
              },
            };
          });
        }
      }
    },

    [MessageType.STATE_ATTACKED]: (payload: ChannelPayload) => {
      console.log("State attacked:", payload);
      if (payload.payload) {
        // Use unknown as intermediate type for safe type assertion
        const payloadData = payload.payload as unknown;
        const message = payloadData as StateAttackedMessage;
        if (
          message.type === MessageType.STATE_ATTACKED &&
          message.stateId &&
          message.attackerId
        ) {
          if (message.success) {
            setGameInstance((prev) => {
              if (!prev) return prev;

              return {
                ...prev,
                stateOwnerships: {
                  ...prev.stateOwnerships,
                  [message.stateId]: {
                    stateId: message.stateId,
                    ownerId: message.attackerId,
                    capturedAt: Date.now(),
                  },
                },
              };
            });
          }
        }
      }
    },

    [MessageType.RESOURCES_UPDATED]: (payload: ChannelPayload) => {
      console.log("Resources updated:", payload);
      if (payload.payload) {
        // Use unknown as intermediate type for safe type assertion
        const payloadData = payload.payload as unknown;
        const message = payloadData as ResourcesUpdatedMessage;
        if (
          message.type === MessageType.RESOURCES_UPDATED &&
          message.playerResources
        ) {
          setGameInstance((prev) => {
            if (!prev) return prev;

            const updatedPlayers = { ...prev.players };

            // Update resources for each player
            Object.keys(message.playerResources).forEach((playerId) => {
              if (updatedPlayers[playerId]) {
                updatedPlayers[playerId] = {
                  ...updatedPlayers[playerId],
                  resources: message.playerResources[playerId],
                };
              }
            });

            return {
              ...prev,
              players: updatedPlayers,
              lastResourceUpdate: Date.now(),
            };
          });
        }
      }
    },
  };

  // Handle presence sync
  const handlePresenceSync = useCallback((state: RealtimePresenceState) => {
    console.log("Presence state synced:", state);

    const players: Player[] = [];

    Object.keys(state).forEach((key) => {
      // Use unknown as intermediate type for safe type assertion
      const presenceArray = state[key] as unknown as PresenceData[];
      presenceArray.forEach((presence) => {
        if (presence.user_data) {
          players.push(presence.user_data);
        }
      });
    });

    setOnlinePlayers(players);
  }, []);

  // Handle connection change
  const handleConnectionChange = useCallback(
    (connected: boolean) => {
      console.log("Connection changed:", connected);

      if (!connected && currentPlayer) {
        setConnectionError(
          "Lost connection to the game server. Trying to reconnect...",
        );
      }
    },
    [currentPlayer],
  );

  // Initialize the realtime channel hook
  const { isConnected, sendMessage, trackPresence } = useSimpleRealtimeChannel({
    channelName: gameId || "lobby",
    eventHandlers,
    onPresenceSync: handlePresenceSync,
    onConnectionChange: handleConnectionChange,
  });

  // Join a game
  const joinGame = useCallback(
    async (newGameId: string, playerName: string) => {
      console.log(`Joining game: ${newGameId} as ${playerName}`);

      if (joining) {
        console.log("Already joining a game, please wait");
        return;
      }

      setJoining(true);
      setConnectionError(null);

      try {
        // Generate a player ID
        const playerId = uuidv4();

        // Create player object
        const player: Player = {
          id: playerId,
          name: playerName || `Player ${playerId.substring(0, 4)}`,
          color: `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`,
          resources: 10, // Initial resources
          connectedAt: Date.now(),
          lastActiveAt: Date.now(),
        };

        // Set the current player and game ID
        setCurrentPlayer(player);
        setGameId(newGameId);

        // Wait for connection (with timeout)
        const waitForConnection = async () => {
          const maxWaitTime = 5000; // 5 seconds
          const interval = 100; // Check every 100ms
          const maxAttempts = maxWaitTime / interval;
          let attempts = 0;

          while (!isConnected && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, interval));
            attempts++;
          }

          if (!isConnected) {
            throw new Error("Timed out waiting for connection");
          }

          return true;
        };

        // Wait for connection with timeout
        await Promise.race([
          waitForConnection(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Connection timed out")), 5000),
          ),
        ]);

        // Track presence
        const success = trackPresence({
          user_id: player.id,
          user_data: player,
        });

        if (!success) {
          throw new Error("Failed to track presence");
        }

        // Send join message
        sendMessage(MessageType.PLAYER_JOINED, {
          type: MessageType.PLAYER_JOINED,
          gameId: newGameId,
          player,
          timestamp: Date.now(),
        });

        console.log("Successfully joined game!");
        return Promise.resolve();
      } catch (error) {
        console.error("Error joining game:", error);

        // Reset game state
        setGameId(null);
        setCurrentPlayer(null);

        // Set error message
        if (error instanceof Error) {
          setConnectionError(`Failed to join game: ${error.message}`);
        } else {
          setConnectionError("Failed to join game");
        }

        return Promise.reject(error);
      } finally {
        setJoining(false);
      }
    },
    [isConnected, sendMessage, trackPresence, joining],
  );

  // Leave the current game
  const leaveGame = useCallback(() => {
    if (!currentPlayer || !gameId) return;

    // Send leave message
    sendMessage(MessageType.PLAYER_LEFT, {
      type: MessageType.PLAYER_LEFT,
      gameId,
      playerId: currentPlayer.id,
      timestamp: Date.now(),
    });

    // Reset state
    setGameId(null);
    setCurrentPlayer(null);
    setGameInstance(null);
  }, [currentPlayer, gameId, sendMessage]);

  // Claim a state
  const claimState = useCallback(
    (stateId: string) => {
      if (!currentPlayer || !gameId || !isConnected) return;

      // Check if the player has enough resources
      if (currentPlayer.resources < 5) {
        console.warn("Not enough resources to claim state");
        setConnectionError("Not enough resources to claim state");
        return;
      }

      sendMessage(MessageType.CLAIM_STATE, {
        type: MessageType.CLAIM_STATE,
        gameId,
        playerId: currentPlayer.id,
        stateId,
        timestamp: Date.now(),
      });

      // Optimistically update the player's resources
      setCurrentPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resources: prev.resources - 5,
        };
      });
    },
    [currentPlayer, gameId, isConnected, sendMessage],
  );

  // Attack a state
  const attackState = useCallback(
    (stateId: string, extraResources: number) => {
      if (!currentPlayer || !gameId || !isConnected) return;

      // Check if the player has enough resources
      const totalCost = 10 + extraResources;
      if (currentPlayer.resources < totalCost) {
        console.warn("Not enough resources for attack");
        setConnectionError("Not enough resources for attack");
        return;
      }

      sendMessage(MessageType.ATTACK_STATE, {
        type: MessageType.ATTACK_STATE,
        gameId,
        playerId: currentPlayer.id,
        stateId,
        extraResources,
        timestamp: Date.now(),
      });

      // Optimistically update the player's resources
      setCurrentPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resources: prev.resources - totalCost,
        };
      });
    },
    [currentPlayer, gameId, isConnected, sendMessage],
  );

  // Update current player from game instance
  useEffect(() => {
    if (
      gameInstance &&
      currentPlayer &&
      gameInstance.players[currentPlayer.id]
    ) {
      setCurrentPlayer(gameInstance.players[currentPlayer.id]);
    }
  }, [gameInstance, currentPlayer]);

  // Create context value
  const contextValue: SimpleGameRealtimeContextType = {
    isConnected,
    currentPlayer,
    gameInstance,
    onlinePlayers,
    joinGame,
    leaveGame,
    claimState,
    attackState,
    connectionError,
  };

  return (
    <SimpleGameRealtimeContext.Provider value={contextValue}>
      {children}
    </SimpleGameRealtimeContext.Provider>
  );
};

// Custom hook to use the SimpleGameRealtime context
export const useSimpleGameRealtime = () => {
  const context = useContext(SimpleGameRealtimeContext);
  if (!context) {
    throw new Error(
      "useSimpleGameRealtime must be used within a SimpleGameRealtimeProvider",
    );
  }
  return context;
};
