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
import {
  useSupabaseRealtime,
  PresencePayload,
  MessagePayload,
} from "../hooks/useSupabaseRealtime";
import {
  MessageType,
  Player,
  GameInstance,
  StateOwnership,
} from "@/types/game";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

// Extended presence payload with player information
interface GamePresencePayload extends PresencePayload {
  player?: Player;
}

// Event types for the game
const GAME_EVENT_TYPES = [
  MessageType.GAME_STATE,
  MessageType.PLAYER_JOINED,
  MessageType.PLAYER_LEFT,
  MessageType.STATE_CLAIMED,
  MessageType.STATE_ATTACKED,
  MessageType.RESOURCES_UPDATED,
  MessageType.ERROR,
];

// Costs for game actions
const ACTION_COSTS = {
  CLAIM_STATE: 5,
  ATTACK_STATE_BASE: 10,
};

// Context type definition
interface GameRealtimeContextType {
  isConnected: boolean;
  currentPlayer: Player | null;
  gameInstance: GameInstance | null;
  onlinePlayers: Player[];
  claimState: (stateId: string) => void;
  attackState: (stateId: string, extraResources: number) => void;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  leaveGame: () => void;
  connectionStatus: string;
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
   * Handle presence state changes
   */
  const handlePresenceSync = useCallback((state: RealtimePresenceState) => {
    // Extract players from presence state
    const players: Player[] = [];

    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        // Cast to our extended presence payload type
        const gamePresence = presence as unknown as GamePresencePayload;
        if (gamePresence.player) {
          players.push(gamePresence.player);
        }
      });
    });

    setOnlinePlayers(players);
  }, []);

  /**
   * Handle incoming messages
   */
  const handleMessage = useCallback(
    (eventType: string, payload: MessagePayload) => {
      console.log(`Received ${eventType} message:`, payload);

      switch (eventType) {
        case MessageType.GAME_STATE:
          // Update game state
          setGameInstance(payload as unknown as GameInstance);
          break;

        case MessageType.PLAYER_JOINED:
          // Handle player joined
          if (payload.player) {
            setOnlinePlayers((prev) => {
              // Check if player already exists
              const exists = prev.some(
                (p) => p.id === (payload.player as Player).id,
              );
              if (exists) {
                return prev;
              }
              return [...prev, payload.player as Player];
            });
          }
          break;

        case MessageType.PLAYER_LEFT:
          // Handle player left
          if (payload.playerId) {
            setOnlinePlayers((prev) =>
              prev.filter((p) => p.id !== payload.playerId),
            );
          }
          break;

        case MessageType.STATE_CLAIMED:
          // Handle state claimed
          if (gameInstance && payload.stateId && payload.playerId) {
            setGameInstance((prev) => {
              if (!prev) return prev;

              // Update state ownership
              const updatedStates = prev.states.map((state: StateOwnership) => {
                if (state.stateId === payload.stateId) {
                  return {
                    ...state,
                    ownerId: payload.playerId as string,
                    capturedAt: Date.now(),
                  };
                }
                return state;
              });

              return {
                ...prev,
                states: updatedStates,
              };
            });
          }
          break;

        case MessageType.STATE_ATTACKED:
          // Handle state attacked
          if (
            gameInstance &&
            payload.stateId &&
            payload.playerId &&
            payload.success
          ) {
            setGameInstance((prev) => {
              if (!prev) return prev;

              // Update state ownership if attack was successful
              const updatedStates = prev.states.map((state: StateOwnership) => {
                if (state.stateId === payload.stateId && payload.success) {
                  return {
                    ...state,
                    ownerId: payload.playerId as string,
                    capturedAt: Date.now(),
                  };
                }
                return state;
              });

              return {
                ...prev,
                states: updatedStates,
              };
            });
          }
          break;

        case MessageType.RESOURCES_UPDATED:
          // Handle resources updated
          if (
            currentPlayer &&
            payload.resources &&
            payload.playerId === currentPlayer.id
          ) {
            setCurrentPlayer((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                resources: payload.resources as number,
              };
            });
          }
          break;

        case MessageType.ERROR:
          // Handle error message
          setConnectionError((payload.message as string) || "Unknown error");
          break;

        default:
          console.warn("Unknown message type:", eventType);
      }
    },
    [gameInstance, currentPlayer],
  );

  /**
   * Handle connection status changes
   */
  const handleStatusChange = useCallback((status: string) => {
    console.log(`Connection status changed: ${status}`);

    if (status.startsWith("ERROR")) {
      setConnectionError(`Connection error: ${status}`);
    }
  }, []);

  /**
   * Handle connection errors
   */
  const handleError = useCallback((error: Error) => {
    console.error("Realtime connection error:", error);
    setConnectionError(error.message);
  }, []);

  // Initialize Supabase Realtime hook
  const {
    isConnected,
    connectionStatus,
    sendMessage,
    joinChannel,
    leaveChannel,
    trackPresence,
  } = useSupabaseRealtime({
    channelName: gameId ? `game-${gameId}` : "lobby",
    eventTypes: GAME_EVENT_TYPES,
    onMessage: handleMessage,
    onPresenceSync: handlePresenceSync,
    onStatusChange: handleStatusChange,
    onError: handleError,
    autoJoin: false, // We'll join manually when a game is selected
  });

  /**
   * Join a game
   */
  const joinGame = useCallback(
    async (gameId: string, playerName: string) => {
      if (isJoining) return;

      try {
        setIsJoining(true);
        setGameId(gameId);

        // Create a new player
        const playerId = uuidv4();
        const player: Player = {
          id: playerId,
          name: playerName,
          color: getRandomColor(),
          resources: 10, // Starting resources
          connectedAt: Date.now(),
          lastActiveAt: Date.now(),
        };

        setCurrentPlayer(player);

        // Join the channel
        await joinChannel();

        // Track presence with player data
        trackPresence({ player });

        // Send join message
        sendMessage(MessageType.PLAYER_JOINED, { player });

        // Fetch game state from database
        const { data, error } = await supabase
          .from("game_instances")
          .select("*")
          .eq("id", gameId)
          .single();

        if (error) {
          throw new Error(`Failed to fetch game: ${error.message}`);
        }

        if (!data) {
          // Create new game instance if it doesn't exist
          const newGame: GameInstance = {
            id: gameId,
            createdAt: Date.now(),
            states: [], // This would be populated from your GeoJSON data
            players: [player],
          };

          // Save to database
          const { error: insertError } = await supabase
            .from("game_instances")
            .insert(newGame);

          if (insertError) {
            throw new Error(`Failed to create game: ${insertError.message}`);
          }

          setGameInstance(newGame);
        } else {
          // Use existing game instance
          const gameInstance: GameInstance = {
            id: data.id,
            createdAt: new Date(data.created_at).getTime(),
            states: data.states || [],
            players: [...(data.players || []), player],
          };

          setGameInstance(gameInstance);

          // Update players in database
          const { error: updateError } = await supabase
            .from("game_instances")
            .update({ players: gameInstance.players })
            .eq("id", gameId);

          if (updateError) {
            console.error("Failed to update players:", updateError);
          }
        }

        console.log(`Successfully joined game: ${gameId}`);
      } catch (error) {
        console.error("Error joining game:", error);
        setConnectionError(
          error instanceof Error ? error.message : "Failed to join game",
        );
      } finally {
        setIsJoining(false);
      }
    },
    [isJoining, joinChannel, trackPresence, sendMessage],
  );

  /**
   * Leave the current game
   */
  const leaveGame = useCallback(() => {
    if (currentPlayer && gameId) {
      // Send leave message
      sendMessage(MessageType.PLAYER_LEFT, { playerId: currentPlayer.id });

      // Update database
      supabase
        .from("game_instances")
        .select("players")
        .eq("id", gameId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            console.error("Failed to fetch players:", error);
            return;
          }

          const updatedPlayers = (data.players || []).filter(
            (p: Player) => p.id !== currentPlayer.id,
          );

          supabase
            .from("game_instances")
            .update({ players: updatedPlayers })
            .eq("id", gameId)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error("Failed to update players:", updateError);
              }
            });
        });
    }

    // Leave the channel
    leaveChannel();

    // Reset state
    setGameId(null);
    setCurrentPlayer(null);
    setGameInstance(null);
    setOnlinePlayers([]);
  }, [currentPlayer, gameId, sendMessage, leaveChannel]);

  /**
   * Claim a state
   */
  const claimState = useCallback(
    (stateId: string) => {
      if (!currentPlayer || !gameInstance) {
        setConnectionError("You must join a game first");
        return;
      }

      // Check if player has enough resources
      if (currentPlayer.resources < ACTION_COSTS.CLAIM_STATE) {
        setConnectionError(
          `Not enough resources to claim state (need ${ACTION_COSTS.CLAIM_STATE})`,
        );
        return;
      }

      // Check if state is neutral
      const state = gameInstance.states.find((s) => s.stateId === stateId);
      if (!state) {
        setConnectionError("State not found");
        return;
      }

      if (state.ownerId) {
        setConnectionError("Cannot claim a state that is already owned");
        return;
      }

      // Check if player owns an adjacent state
      const adjacentStates = getAdjacentStates(stateId, gameInstance.states);
      const ownsAdjacentState = adjacentStates.some(
        (s) => s.ownerId === currentPlayer.id,
      );

      if (!ownsAdjacentState) {
        setConnectionError("You must own an adjacent state to claim this one");
        return;
      }

      // Send claim message
      sendMessage(MessageType.STATE_CLAIMED, {
        stateId,
        playerId: currentPlayer.id,
        cost: ACTION_COSTS.CLAIM_STATE,
      });

      // Update local state
      setCurrentPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resources: prev.resources - ACTION_COSTS.CLAIM_STATE,
        };
      });

      setGameInstance((prev) => {
        if (!prev) return prev;

        const updatedStates = prev.states.map((s: StateOwnership) => {
          if (s.stateId === stateId) {
            return {
              ...s,
              ownerId: currentPlayer.id,
              capturedAt: Date.now(),
            };
          }
          return s;
        });

        return {
          ...prev,
          states: updatedStates,
        };
      });
    },
    [currentPlayer, gameInstance, sendMessage],
  );

  /**
   * Attack a state
   */
  const attackState = useCallback(
    (stateId: string, extraResources: number = 0) => {
      if (!currentPlayer || !gameInstance) {
        setConnectionError("You must join a game first");
        return;
      }

      const totalCost = ACTION_COSTS.ATTACK_STATE_BASE + extraResources;

      // Check if player has enough resources
      if (currentPlayer.resources < totalCost) {
        setConnectionError(
          `Not enough resources to attack state (need ${totalCost})`,
        );
        return;
      }

      // Check if state exists and is owned by someone else
      const state = gameInstance.states.find((s) => s.stateId === stateId);
      if (!state) {
        setConnectionError("State not found");
        return;
      }

      if (!state.ownerId) {
        setConnectionError("Cannot attack a neutral state, claim it instead");
        return;
      }

      if (state.ownerId === currentPlayer.id) {
        setConnectionError("Cannot attack your own state");
        return;
      }

      // Check if player owns an adjacent state
      const adjacentStates = getAdjacentStates(stateId, gameInstance.states);
      const ownsAdjacentState = adjacentStates.some(
        (s) => s.ownerId === currentPlayer.id,
      );

      if (!ownsAdjacentState) {
        setConnectionError("You must own an adjacent state to attack this one");
        return;
      }

      // Calculate attack strength
      const attackerAdjacentCount = adjacentStates.filter(
        (s) => s.ownerId === currentPlayer.id,
      ).length;

      const attackStrength =
        attackerAdjacentCount + Math.floor(extraResources / 5);

      // Calculate defense strength
      const defenderAdjacentCount = adjacentStates.filter(
        (s) => s.ownerId === state.ownerId,
      ).length;

      // Determine if attack is successful
      const isSuccessful = attackStrength > defenderAdjacentCount;

      // Send attack message
      sendMessage(MessageType.STATE_ATTACKED, {
        stateId,
        playerId: currentPlayer.id,
        targetPlayerId: state.ownerId,
        cost: totalCost,
        attackStrength,
        defenseStrength: defenderAdjacentCount,
        success: isSuccessful,
      });

      // Update local state
      setCurrentPlayer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resources: prev.resources - totalCost,
        };
      });

      if (isSuccessful) {
        setGameInstance((prev) => {
          if (!prev) return prev;

          const updatedStates = prev.states.map((s: StateOwnership) => {
            if (s.stateId === stateId) {
              return {
                ...s,
                ownerId: currentPlayer.id,
                capturedAt: Date.now(),
              };
            }
            return s;
          });

          return {
            ...prev,
            states: updatedStates,
          };
        });
      }
    },
    [currentPlayer, gameInstance, sendMessage],
  );

  // Context value
  const contextValue: GameRealtimeContextType = {
    isConnected,
    currentPlayer,
    gameInstance,
    onlinePlayers,
    claimState,
    attackState,
    joinGame,
    leaveGame,
    connectionStatus,
    connectionError,
  };

  return (
    <GameRealtimeContext.Provider value={contextValue}>
      {children}
    </GameRealtimeContext.Provider>
  );
};

/**
 * Custom hook to use the game realtime context
 */
export const useGameRealtimeContext = () => {
  const context = useContext(GameRealtimeContext);
  if (!context) {
    throw new Error(
      "useGameRealtimeContext must be used within a GameRealtimeProvider",
    );
  }
  return context;
};

/**
 * Helper function to get a random color for a player
 */
function getRandomColor(): string {
  const colors = [
    "#FF5733", // Red-Orange
    "#33FF57", // Green
    "#3357FF", // Blue
    "#FF33F5", // Pink
    "#F5FF33", // Yellow
    "#33FFF5", // Cyan
    "#FF5733", // Orange
    "#8C33FF", // Purple
    "#FF338C", // Magenta
    "#33FF8C", // Mint
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Helper function to get adjacent states
 */
function getAdjacentStates(
  stateId: string,
  states: StateOwnership[],
): StateOwnership[] {
  const state = states.find((s) => s.stateId === stateId);
  if (!state || !state.neighbors) {
    return [];
  }

  return states.filter((s) => state.neighbors?.includes(s.stateId));
}
