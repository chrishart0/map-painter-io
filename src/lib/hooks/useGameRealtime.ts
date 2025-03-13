"use client";

/**
 * Game Realtime Hook
 *
 * A specialized hook for subscribing to real-time updates for map states and players.
 * This hook builds on top of the useSupabaseRealtime hook to provide game-specific functionality.
 */

import { useState, useEffect, useCallback } from "react";
import {
  useSupabaseRealtime,
  MessagePayload,
} from "../hooks/useSupabaseRealtime";
import { supabase } from "../supabase";
import { Player, StateOwnership, MessageType } from "@/types/game";

interface UseGameRealtimeOptions {
  gameInstanceId: string;
  onMapStateChange?: (mapStates: StateOwnership[]) => void;
  onPlayerChange?: (players: Player[]) => void;
  onError?: (error: Error) => void;
}

interface UseGameRealtimeReturn {
  mapStates: StateOwnership[];
  players: Player[];
  isLoading: boolean;
  isConnected: boolean;
  connectionStatus: string;
  error: Error | null;
  sendStateUpdate: (stateId: string, ownerId: string | null) => void;
}

/**
 * Hook for subscribing to real-time updates for map states and players
 */
export function useGameRealtime({
  gameInstanceId,
  onMapStateChange,
  onPlayerChange,
  onError,
}: UseGameRealtimeOptions): UseGameRealtimeReturn {
  const [mapStates, setMapStates] = useState<StateOwnership[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Handle incoming messages
  const handleMessage = useCallback(
    (eventType: string, payload: MessagePayload) => {
      console.log(`Game realtime message received: ${eventType}`, payload);

      switch (eventType) {
        case MessageType.STATE_CLAIMED:
        case MessageType.STATE_ATTACKED:
          if (payload.stateId && payload.playerId) {
            // Update map state when a state is claimed or attacked
            setMapStates((prevStates) => {
              const updatedStates = prevStates.map((state) => {
                if (state.stateId === payload.stateId) {
                  // Only update if attack was successful or it's a claim
                  if (
                    eventType === MessageType.STATE_CLAIMED ||
                    payload.success
                  ) {
                    return {
                      ...state,
                      ownerId: payload.playerId as string,
                      capturedAt: Date.now(),
                    };
                  }
                }
                return state;
              });

              onMapStateChange?.(updatedStates);
              return updatedStates;
            });
          }
          break;

        case MessageType.PLAYER_JOINED:
          if (payload.player) {
            // Add new player
            setPlayers((prevPlayers) => {
              const player = payload.player as Player;
              // Check if player already exists
              if (prevPlayers.some((p) => p.id === player.id)) {
                return prevPlayers;
              }

              const updatedPlayers = [...prevPlayers, player];
              onPlayerChange?.(updatedPlayers);
              return updatedPlayers;
            });
          }
          break;

        case MessageType.PLAYER_LEFT:
          if (payload.playerId) {
            // Remove player
            setPlayers((prevPlayers) => {
              const updatedPlayers = prevPlayers.filter(
                (p) => p.id !== payload.playerId,
              );
              onPlayerChange?.(updatedPlayers);
              return updatedPlayers;
            });
          }
          break;

        case MessageType.RESOURCES_UPDATED:
          if (payload.playerId && payload.resources) {
            // Update player resources
            setPlayers((prevPlayers) => {
              const updatedPlayers = prevPlayers.map((player) => {
                if (player.id === payload.playerId) {
                  return {
                    ...player,
                    resources: payload.resources as number,
                    lastActiveAt: Date.now(),
                  };
                }
                return player;
              });

              onPlayerChange?.(updatedPlayers);
              return updatedPlayers;
            });
          }
          break;

        default:
          break;
      }
    },
    [onMapStateChange, onPlayerChange],
  );

  // Handle errors
  const handleError = useCallback(
    (err: Error) => {
      console.error("Game realtime error:", err);
      setError(err);
      onError?.(err);
    },
    [onError],
  );

  // Initialize Supabase Realtime
  const { isConnected, connectionStatus, sendMessage, leaveChannel } =
    useSupabaseRealtime({
      channelName: `game-${gameInstanceId}`,
      eventTypes: [
        MessageType.STATE_CLAIMED,
        MessageType.STATE_ATTACKED,
        MessageType.PLAYER_JOINED,
        MessageType.PLAYER_LEFT,
        MessageType.RESOURCES_UPDATED,
      ],
      onMessage: handleMessage,
      onError: handleError,
      autoJoin: true,
    });

  // Send a state update
  const sendStateUpdate = useCallback(
    (stateId: string, ownerId: string | null) => {
      if (!isConnected) {
        setError(new Error("Cannot update state: not connected"));
        return;
      }

      if (ownerId) {
        // Send state claimed message
        sendMessage(MessageType.STATE_CLAIMED, {
          stateId,
          playerId: ownerId,
        });
      } else {
        // Reset state to neutral (not implemented in the current protocol)
        console.warn("Resetting state to neutral is not implemented");
      }
    },
    [isConnected, sendMessage],
  );

  // Fetch initial data
  useEffect(() => {
    if (!gameInstanceId) {
      setError(new Error("Game instance ID is required"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch game instance data
    const fetchGameData = async () => {
      try {
        const { data, error } = await supabase
          .from("game_instances")
          .select("*")
          .eq("id", gameInstanceId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          // Set map states
          setMapStates(data.states || []);
          onMapStateChange?.(data.states || []);

          // Set players
          setPlayers(data.players || []);
          onPlayerChange?.(data.players || []);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching game data:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch game data"),
        );
        setIsLoading(false);
      }
    };

    fetchGameData();

    // Clean up on unmount
    return () => {
      leaveChannel();
    };
  }, [gameInstanceId, leaveChannel, onMapStateChange, onPlayerChange]);

  return {
    mapStates,
    players,
    isLoading,
    isConnected,
    connectionStatus,
    error,
    sendStateUpdate,
  };
}
