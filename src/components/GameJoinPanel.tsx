"use client";

/**
 * GameJoinPanel Component
 *
 * A panel that allows users to join a game by entering a game ID and player name.
 * This component uses direct Supabase Realtime connection for game sessions.
 *
 * The component handles:
 * 1. Creating and managing Supabase Realtime channels
 * 2. Player presence tracking for online players
 * 3. Game session joining and leaving
 * 4. Exposing the channel globally for other components (like Chat)
 *
 * This is the primary component for establishing WebSocket connections in the application.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";

// Define types for presence state
/**
 * @interface PresenceState
 * Represents the structure of a presence state object in Supabase Realtime.
 * @property {string} presence_ref - Unique reference ID for the presence
 * @property {string} user_id - User identifier (typically the player name)
 * @property {string} online_at - ISO timestamp when the user came online
 * @property {unknown} [key: string] - Additional properties that might be present
 */
interface PresenceState {
  [key: string]: unknown;
  presence_ref?: string;
  user_id?: string;
  online_at?: string;
}

// Define types for player info
/**
 * @interface PlayerInfo
 * Represents a player in the game with their connection information.
 * @property {string} name - The player's display name
 * @property {string} [user_id] - User identifier from presence state
 * @property {string} [online_at] - When the player connected
 * @property {unknown} [key: string] - Additional properties that might be present
 */
interface PlayerInfo {
  name: string;
  user_id?: string;
  online_at?: string;
  [key: string]: unknown;
}

export function GameJoinPanel() {
  // Game state
  const [gameId, setGameId] = useState<string>("default-game");
  const [playerName, setPlayerName] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for persistent objects
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addLog = useCallback((message: string) => {
    console.log(message);
  }, []);

  // Cleanup function for channel
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      addLog(`Cleaning up channel: ${gameId}`);
      try {
        channelRef.current.unsubscribe();
      } catch (error) {
        addLog(
          `Error unsubscribing from channel: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      channelRef.current = null;
    }
  }, [gameId, addLog]);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    // Initialize Supabase client if not already done
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseRef.current && supabaseUrl && supabaseAnonKey) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
      addLog("Supabase client initialized");
    }

    return () => {
      cleanupChannel();
    };
  }, [cleanupChannel, addLog]);

  // Join game function
  /**
   * Handles joining a game session by creating and subscribing to a Supabase Realtime channel.
   *
   * This function:
   * 1. Validates input and shows error messages if needed
   * 2. Creates a new channel with the specified game ID
   * 3. Sets up event listeners for messages, system events, and presence
   * 4. Subscribes to the channel and tracks the player's presence
   * 5. Sends a join message to notify other players
   * 6. Makes the channel available globally for other components
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleJoinGame = async () => {
    if (!playerName) {
      setErrorMessage("Player name is required");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("Connecting...");

    try {
      // First clean up any existing channel
      cleanupChannel();

      if (!supabaseRef.current) {
        throw new Error("Supabase client not initialized");
      }

      addLog(`Joining game: ${gameId} as ${playerName}`);

      // Create channel
      const channel = supabaseRef.current.channel(`game:${gameId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: playerName },
        },
      });

      addLog(`Channel created: game:${gameId}`);
      channelRef.current = channel;

      // Set up broadcast event listener for chat messages
      channel.on("broadcast", { event: "message" }, (payload) => {
        addLog(`Received message: ${JSON.stringify(payload)}`);
        // Chat messages will be handled by the Chat component
      });

      // Set up system event listeners
      channel.on("system", { event: "*" }, (payload) => {
        addLog(`System event: ${payload.event}`);
        if (payload.event === "connected") {
          setIsConnected(true);
        } else if (payload.event === "disconnected") {
          setIsConnected(false);
        }
      });

      // Set up presence event listeners
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        addLog(`Presence sync: ${JSON.stringify(state)}`);

        // Update players list
        const playersList = Object.entries(state).map(([key, value]) => {
          const presences = value as PresenceState[];
          return {
            name: key,
            ...(presences[0] || {}),
          } as PlayerInfo;
        });

        setPlayers(playersList);
      });

      // Subscribe to the channel
      addLog("Subscribing to channel...");
      channel.subscribe(async (status) => {
        addLog(`Subscription status: ${status}`);
        setConnectionStatus(`Status: ${status}`);
        setIsConnecting(false);

        if (status === "SUBSCRIBED") {
          setIsConnected(true);

          // Start tracking presence
          addLog("Tracking presence");
          try {
            await channel.track({
              user_id: playerName,
              online_at: new Date().toISOString(),
            });
            addLog("Presence tracked successfully");
          } catch (error) {
            addLog(
              `Error tracking presence: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }

          // Send join message
          try {
            await channel.send({
              type: "broadcast",
              event: "message",
              payload: {
                sender: playerName,
                text: `${playerName} has joined the game!`,
              },
            });
            addLog("Join message sent successfully");
          } catch (error) {
            addLog(
              `Error sending join message: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      addLog(`Error joining game: ${errorMessage}`);
      setConnectionStatus(`Error: ${errorMessage}`);
      setErrorMessage(`Failed to join game: ${errorMessage}`);
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  // Leave game function
  /**
   * Handles leaving a game session by unsubscribing from the Supabase Realtime channel.
   *
   * This function:
   * 1. Sends a leave message to notify other players
   * 2. Unsubscribes from the channel and cleans up resources
   * 3. Updates the UI to show the join form again
   *
   * @async
   * @returns {Promise<void>}
   */
  const handleLeaveGame = async () => {
    if (channelRef.current && isConnected) {
      try {
        // Send leave message
        await channelRef.current.send({
          type: "broadcast",
          event: "message",
          payload: {
            sender: playerName,
            text: `${playerName} has left the game!`,
          },
        });
        addLog("Leave message sent successfully");
      } catch (error) {
        addLog(
          `Error sending leave message: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    cleanupChannel();
    setIsConnected(false);
    setConnectionStatus("Disconnected");
  };

  // Make channel available globally for other components
  useEffect(() => {
    if (channelRef.current) {
      (window as Window & { gameChannel?: RealtimeChannel }).gameChannel =
        channelRef.current;
    }
    return () => {
      (window as Window & { gameChannel?: RealtimeChannel }).gameChannel =
        undefined;
    };
  }, [isConnected]);

  if (isConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Game Connected</CardTitle>
          <CardDescription>You are currently in a game session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full mr-2 bg-green-500" />
              <span>{connectionStatus}</span>
            </div>
            <div className="p-2 bg-secondary/20 rounded">
              <p className="text-sm">
                Playing as <span className="font-semibold">{playerName}</span>
              </p>
              <p className="text-sm">
                Game: <span className="font-semibold">{gameId}</span>
              </p>
              <p className="text-sm">
                Players online:{" "}
                <span className="font-semibold">{players.length}</span>
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLeaveGame} variant="outline" size="sm">
            Leave Game
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Join Game</CardTitle>
        <CardDescription>
          Enter a game ID to join or create a new game
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-500/20 text-red-600 rounded text-sm">
            {errorMessage}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Game ID</label>
            <Input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter game ID"
              disabled={isConnecting}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Player Name</label>
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              disabled={isConnecting}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleJoinGame}
          disabled={!gameId || !playerName || isConnecting}
          className="w-full"
        >
          {isConnecting ? "Connecting..." : "Join Game"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default GameJoinPanel;
