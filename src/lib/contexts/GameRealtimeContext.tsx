"use client";

/**
 * Game Realtime Context
 *
 * This context provides a real-time communication layer for the game using Supabase Realtime.
 * It handles:
 * - Player joining and leaving games
 * - Game state synchronization
 * - Player presence tracking
 * - Game actions (claiming states, attacking, etc.)
 * - Error handling and connection management
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
import { useSupabaseRealtime } from "../hooks/useSupabaseRealtime";
import { GameMessage, MessageType, Player, GameInstance } from "@/types/game";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

// Interface for presence payload
interface PresencePayload {
  player?: Player;
  [key: string]: unknown;
}

// Event types for the game
const GAME_EVENT_TYPES = [
  MessageType.GAME_STATE,
  MessageType.PLAYER_JOINED,
  MessageType.PLAYER_LEFT,
  MessageType.STATE_CLAIMED,
  MessageType.STATE_ATTACKED,
  MessageType.RESOURCES_UPDATED,
];

// Costs for game actions
const ACTION_COSTS = {
  CLAIM_STATE: 5,
  ATTACK_STATE_BASE: 10,
};

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = 10000;

// Context type definition
interface GameRealtimeContextType {
  isConnected: boolean;
  currentPlayer: Player | null;
  gameInstance: GameInstance | null;
  onlinePlayers: Player[];
  sendGameMessage: (message: GameMessage) => void;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: () => void;
  claimState: (stateId: string) => void;
  attackState: (stateId: string, extraResources: number) => void;
  connectionError: string | null;
}

// Create the context
const GameRealtimeContext = createContext<GameRealtimeContextType | null>(null);

// Provider props type
interface GameRealtimeProviderProps {
  children: ReactNode;
}

/**
 * Provider component for game realtime functionality
 */
export const GameRealtimeProvider: React.FC<GameRealtimeProviderProps> = ({
  children,
}) => {
  // State
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameInstance, setGameInstance] = useState<GameInstance | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Player[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Auto-clear connection errors after 10 seconds
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => {
        setConnectionError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [connectionError]);

  /**
   * Process incoming game messages and update state accordingly
   */
  const handleGameMessage = useCallback((message: GameMessage) => {
    console.log("Received game message:", message);

    switch (message.type) {
      case MessageType.GAME_STATE:
        // Update the entire game state
        setGameInstance(message.instance);
        break;

      case MessageType.PLAYER_JOINED:
        // Add the new player to the game state
        setGameInstance((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            players: {
              ...prev.players,
              [message.player.id]: message.player,
            },
          };
        });
        break;

      case MessageType.PLAYER_LEFT:
        // Remove the player from the game state
        setGameInstance((prev) => {
          if (!prev) return prev;
          const newPlayers = { ...prev.players };
          delete newPlayers[message.playerId];
          return {
            ...prev,
            players: newPlayers,
          };
        });
        break;

      case MessageType.STATE_CLAIMED:
        // Update the state ownership
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
        break;

      case MessageType.STATE_ATTACKED:
        // Update the state ownership if attack was successful
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
        break;

      case MessageType.RESOURCES_UPDATED:
        // Update player resources
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
        break;

      case MessageType.ERROR:
        console.error("Game error:", message.message);
        setConnectionError(message.message);
        break;

      default:
        console.warn("Unknown message type:", message.type);
    }
  }, []);

  /**
   * Update online players list when presence state changes
   */
  const handlePresenceSync = useCallback((state: RealtimePresenceState) => {
    // Extract player information from presence state
    const players: Player[] = [];

    Object.keys(state).forEach((key) => {
      const presenceArray = state[key] as PresencePayload[];
      presenceArray.forEach((presence) => {
        if (presence.player) {
          players.push(presence.player);
        }
      });
    });

    setOnlinePlayers(players);
  }, []);

  // Initialize Supabase Realtime hook
  const { isConnected, sendMessage, joinChannel, leaveChannel, trackPresence } =
    useSupabaseRealtime({
      channelName: gameId || "lobby",
      eventTypes: GAME_EVENT_TYPES,
      onMessage: handleGameMessage,
      onPresenceSync: handlePresenceSync,
      autoJoin: false, // We'll join manually when a user wants to join a game
    });

  /**
   * Join a game with the given ID and player name
   */
  const joinGame = useCallback(
    async (newGameId: string, playerName: string) => {
      console.log(`Joining game: ${newGameId} as ${playerName}`);

      // Don't allow joining if already in the process
      if (isJoining) {
        console.warn("Already joining a game, please wait");
        return Promise.reject(new Error("Already joining a game"));
      }

      setIsJoining(true);
      setConnectionError(null);

      try {
        // Verify Supabase is available
        await supabase.auth.getSession();
        console.log("Supabase connection verified");

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

        // Set current player and game ID
        setCurrentPlayer(player);
        setGameId(newGameId);

        // Let the hook be updated with the new channel
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Join the channel and wait for connection
        console.log("Joining channel...");

        try {
          // Wait with a timeout to prevent infinite waiting
          const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(
              () => reject(new Error("Connection timeout")),
              CONNECTION_TIMEOUT,
            );
          });

          // Try to join with a timeout
          await Promise.race([joinChannel(), timeoutPromise]);

          console.log(
            "Channel connected, tracking presence and sending join message",
          );

          // Track player presence
          trackPresence(player);

          // Send join message
          sendMessage(MessageType.PLAYER_JOINED, {
            type: MessageType.PLAYER_JOINED,
            gameId: newGameId,
            player,
            timestamp: Date.now(),
          });

          return Promise.resolve();
        } catch (error) {
          console.error("Error joining channel:", error);
          throw error; // Re-throw to be caught by the outer try-catch
        }
      } catch (error) {
        console.error("Error joining game:", error);
        // Reset game state on error
        setGameId(null);
        setCurrentPlayer(null);

        // Set error message
        const errorMessage =
          error instanceof Error ? error.message : "Failed to join game";
        setConnectionError(`Failed to join game: ${errorMessage}`);

        return Promise.reject(error);
      } finally {
        setIsJoining(false);
      }
    },
    [isJoining, joinChannel, trackPresence, sendMessage],
  );

  /**
   * Leave the current game and clean up
   */
  const leaveGame = useCallback(() => {
    if (currentPlayer && gameId) {
      // Send leave message
      sendMessage(MessageType.PLAYER_LEFT, {
        type: MessageType.PLAYER_LEFT,
        gameId,
        playerId: currentPlayer.id,
        player: currentPlayer,
        timestamp: Date.now(),
      });

      // Leave the channel
      leaveChannel();

      // Reset state
      setGameId(null);
      setCurrentPlayer(null);
      setGameInstance(null);
    }
  }, [currentPlayer, gameId, leaveChannel, sendMessage]);

  /**
   * Claim a state with the current player
   */
  const claimState = useCallback(
    (stateId: string) => {
      if (!currentPlayer || !gameId) {
        setConnectionError("Cannot claim state: Not connected to a game");
        return;
      }

      // Check if the player has enough resources
      if (currentPlayer.resources < ACTION_COSTS.CLAIM_STATE) {
        setConnectionError(
          `Not enough resources to claim state. Need ${ACTION_COSTS.CLAIM_STATE} resources.`,
        );
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
          resources: prev.resources - ACTION_COSTS.CLAIM_STATE,
        };
      });
    },
    [currentPlayer, gameId, sendMessage],
  );

  /**
   * Attack a state with the current player
   */
  const attackState = useCallback(
    (stateId: string, extraResources: number) => {
      if (!currentPlayer || !gameId) {
        setConnectionError("Cannot attack state: Not connected to a game");
        return;
      }

      // Check if the player has enough resources (base cost + extra)
      const totalCost = ACTION_COSTS.ATTACK_STATE_BASE + extraResources;
      if (currentPlayer.resources < totalCost) {
        setConnectionError(
          `Not enough resources for attack. Need ${totalCost} resources.`,
        );
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
    [currentPlayer, gameId, sendMessage],
  );

  /**
   * Send a game message of any type
   */
  const sendGameMessage = useCallback(
    (message: GameMessage) => {
      // Cast the message to MessagePayload to satisfy the type constraint
      sendMessage(message.type, message as unknown as Record<string, unknown>);
    },
    [sendMessage],
  );

  // Create the context value
  const contextValue: GameRealtimeContextType = {
    isConnected,
    currentPlayer,
    gameInstance,
    onlinePlayers,
    sendGameMessage,
    joinGame,
    leaveGame,
    claimState,
    attackState,
    connectionError,
  };

  return (
    <GameRealtimeContext.Provider value={contextValue}>
      {children}
    </GameRealtimeContext.Provider>
  );
};

/**
 * Hook to access game realtime functionality
 * Must be used within a GameRealtimeProvider
 */
export const useGameRealtime = () => {
  const context = useContext(GameRealtimeContext);
  if (!context) {
    throw new Error(
      "useGameRealtime must be used within a GameRealtimeProvider",
    );
  }
  return context;
};
