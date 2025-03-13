"use client";

/**
 * Game Realtime Hook
 *
 * A specialized hook for subscribing to real-time updates for map states and players.
 * This hook builds on top of the useSupabaseRealtime hook to provide game-specific functionality.
 */

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Player, StateOwnership } from "@/types/game";

interface UseGameRealtimeOptions {
  gameInstanceId: string;
  onMapStateChange?: (mapStates: StateOwnership[]) => void;
  onPlayerChange?: (players: Player[]) => void;
}

interface UseGameRealtimeReturn {
  mapStates: StateOwnership[];
  players: Player[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for subscribing to real-time updates for map states and players
 */
export function useGameRealtime({
  gameInstanceId,
  onMapStateChange,
  onPlayerChange,
}: UseGameRealtimeOptions): UseGameRealtimeReturn {
  const [mapStates, setMapStates] = useState<StateOwnership[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch initial data and set up real-time subscriptions
   */
  useEffect(() => {
    if (!gameInstanceId) {
      setError(new Error("Game instance ID is required"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Fetch initial map states
    const fetchMapStates = async () => {
      try {
        const { data, error } = await supabase
          .from("map_states")
          .select("*")
          .eq("game_instance_id", gameInstanceId);

        if (error) {
          throw error;
        }

        const stateOwnerships = data.map((state) => ({
          stateId: state.state_id,
          ownerId: state.owner_id,
          capturedAt: new Date(state.captured_at).getTime(),
        }));

        setMapStates(stateOwnerships);
        onMapStateChange?.(stateOwnerships);
      } catch (err) {
        console.error("Error fetching map states:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch map states"),
        );
      }
    };

    // Fetch initial players
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("*")
          .eq("game_instance_id", gameInstanceId);

        if (error) {
          throw error;
        }

        const playersList = data.map((player) => ({
          id: player.id,
          name: player.name,
          color: player.color,
          resources: player.resources,
          connectedAt: new Date(player.connected_at).getTime(),
          lastActiveAt: new Date(player.last_active_at).getTime(),
        }));

        setPlayers(playersList);
        onPlayerChange?.(playersList);
      } catch (err) {
        console.error("Error fetching players:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to fetch players"),
        );
      }
    };

    // Set up real-time subscriptions
    const setupSubscriptions = async () => {
      try {
        // Subscribe to map_states changes
        const mapStatesSubscription = supabase
          .channel(`map-states-${gameInstanceId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "map_states",
              filter: `game_instance_id=eq.${gameInstanceId}`,
            },
            async (payload) => {
              console.log("Map state change:", payload);
              // Refresh all map states when any change occurs
              await fetchMapStates();
            },
          )
          .subscribe();

        // Subscribe to players changes
        const playersSubscription = supabase
          .channel(`players-${gameInstanceId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "players",
              filter: `game_instance_id=eq.${gameInstanceId}`,
            },
            async (payload) => {
              console.log("Player change:", payload);
              // Refresh all players when any change occurs
              await fetchPlayers();
            },
          )
          .subscribe();

        // Fetch initial data
        await Promise.all([fetchMapStates(), fetchPlayers()]);
        setIsLoading(false);

        // Cleanup function
        return () => {
          mapStatesSubscription.unsubscribe();
          playersSubscription.unsubscribe();
        };
      } catch (err) {
        console.error("Error setting up subscriptions:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to set up subscriptions"),
        );
        setIsLoading(false);
      }
    };

    // Start the setup process
    const cleanup = setupSubscriptions();

    // Cleanup on unmount
    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, [gameInstanceId, onMapStateChange, onPlayerChange]);

  return {
    mapStates,
    players,
    isLoading,
    error,
  };
}
