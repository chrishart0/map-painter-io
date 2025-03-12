"use client";

import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Define types to replace 'any'
interface PresenceState {
  [key: string]: unknown;
  presence_ref?: string;
  user_id?: string;
  online_at?: string;
}

interface PlayerInfo {
  name: string;
  user_id?: string;
  online_at?: string;
  [key: string]: unknown;
}

export function DirectGameComponent() {
  // Game state
  const [gameId, setGameId] = useState<string>("default-game");
  const [playerName, setPlayerName] = useState<string>("");
  const [status, setStatus] = useState<string>("Disconnected");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    [],
  );

  // Refs for persistent objects
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addLog = useCallback((message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toISOString().slice(11, 19)} - ${message}`,
    ]);
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
  const joinGame = async () => {
    if (!playerName) {
      addLog("Player name is required");
      return;
    }

    setIsConnecting(true);
    setStatus("Connecting...");

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

      // Set up broadcast event listener
      channel.on("broadcast", { event: "message" }, (payload) => {
        addLog(`Received message: ${JSON.stringify(payload)}`);
        if (payload.payload && payload.payload.text) {
          setMessages((prev) => [
            ...prev,
            {
              sender: payload.payload.sender || "Unknown",
              text: payload.payload.text,
            },
          ]);
        }
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
        setStatus(`Status: ${status}`);
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
      setStatus(`Error: ${errorMessage}`);
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  // Leave game function
  const leaveGame = async () => {
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
  };

  // Send message function
  const sendMessage = async () => {
    if (!message.trim() || !isConnected || !channelRef.current) {
      return;
    }

    try {
      await channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: {
          sender: playerName,
          text: message,
        },
      });
      addLog("Message sent successfully");
      setMessage("");
    } catch (error) {
      addLog(
        `Error sending message: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h2 className="text-xl font-bold mb-4">Direct Game Component</h2>

      <div className="flex items-center mb-4">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{status}</span>
      </div>

      {!isConnected ? (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm mb-1">Game ID</label>
            <Input
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Game ID"
              className="mb-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Player Name</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="mb-2"
            />
          </div>

          <Button onClick={joinGame} disabled={isConnecting || !playerName}>
            {isConnecting ? "Joining..." : "Join Game"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          <div className="flex gap-2 items-center mb-4">
            <h3 className="font-bold">Players Online ({players.length}):</h3>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <span
                  key={player.name}
                  className="px-2 py-1 bg-primary-foreground/20 rounded-full text-sm"
                >
                  {player.name}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-black/10 p-2 rounded h-32 overflow-y-auto text-sm mb-2">
              {messages.map((msg, index) => (
                <div key={index} className="mb-1">
                  <span className="font-bold">{msg.sender}: </span>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={!message.trim()}>
                Send
              </Button>
            </div>
          </div>

          <Button onClick={leaveGame} variant="destructive">
            Leave Game
          </Button>
        </div>
      )}

      <div className="bg-black/10 p-2 rounded h-32 overflow-y-auto font-mono text-xs">
        {logs.map((log, index) => (
          <div key={index} className="whitespace-pre-wrap mb-1">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
