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

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
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
import { GameContext } from "@/lib/contexts/GameContext";

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
  // Game state from context
  const {
    gameId: contextGameId,
    currentPlayer,
    isJoined,
    joinGame: contextJoinGame,
    leaveGame: contextLeaveGame,
  } = useContext(GameContext);

  // Local state
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

            // Update the game context
            contextJoinGame(gameId, playerName);
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
    try {
      if (channelRef.current) {
        // Send leave message
        await channelRef.current.send({
          type: "broadcast",
          event: "message",
          payload: {
            sender: playerName,
            text: `${playerName} has left the game.`,
          },
        });

        // Untrack presence
        await channelRef.current.untrack();
      }

      // Clean up channel
      cleanupChannel();

      // Update state
      setIsConnected(false);
      setConnectionStatus("Disconnected");

      // Update the game context
      contextLeaveGame();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      addLog(`Error leaving game: ${errorMessage}`);
      setErrorMessage(`Failed to leave game: ${errorMessage}`);
    }
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
                Game: <span className="font-semibold">{contextGameId}</span>
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
        <CardTitle>Game Session</CardTitle>
        <CardDescription>
          Join a game session to play with others
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isJoined ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="game-id"
                className="text-sm font-medium text-foreground"
              >
                Game ID
              </label>
              <Input
                id="game-id"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter game ID"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="player-name"
                className="text-sm font-medium text-foreground"
              >
                Your Name
              </label>
              <Input
                id="player-name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            {errorMessage && (
              <div className="text-sm text-red-500">{errorMessage}</div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Game ID:</span>{" "}
                <span className="font-medium">{contextGameId}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  Playing as:
                </span>{" "}
                <span className="font-medium">{currentPlayer?.name}</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Status: {connectionStatus}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Players Online</h3>
              <div className="max-h-24 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No other players online
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {players.map((player) => (
                      <li
                        key={player.user_id}
                        className="text-sm flex items-center"
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {player.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isJoined ? (
          <Button
            onClick={handleJoinGame}
            disabled={isConnecting || !playerName}
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Join Game"}
          </Button>
        ) : (
          <Button
            onClick={handleLeaveGame}
            variant="outline"
            className="w-full"
          >
            Leave Game
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default GameJoinPanel;
