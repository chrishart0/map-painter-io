"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Create a direct Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

export function DirectRealtimeTest() {
  const [status, setStatus] = useState("Disconnected");
  const [gameId, setGameId] = useState("test-game");
  const [playerName, setPlayerName] = useState("Tester");
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Use refs to keep track of the Supabase client and channel
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const addMessage = useCallback((message: string) => {
    console.log(message);
    setMessages((prev) => [...prev, message]);
  }, []);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      addMessage("Cleaning up channel...");
      try {
        channelRef.current.unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
      channelRef.current = null;
    }
  }, [addMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupChannel();
    };
  }, [cleanupChannel]);

  const connectToGame = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      addMessage("Error: Missing Supabase environment variables");
      return;
    }

    // Reset state
    setMessages([]);
    setIsConnected(false);
    setIsConnecting(true);
    setStatus("Connecting...");

    // First, clean up any existing channel
    cleanupChannel();

    addMessage(`Connecting to game: ${gameId} as ${playerName}...`);

    // Create a fresh Supabase client if we don't already have one
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
      addMessage("Created new Supabase client");
    }

    // Create a channel for the game
    const channel = supabaseRef.current.channel(gameId, {
      config: {
        broadcast: { self: true },
        presence: { key: "presence" },
      },
    });

    addMessage("Channel created");
    channelRef.current = channel;

    // Setup handlers
    channel.on("broadcast", { event: "message" }, (payload) => {
      addMessage(`Received message: ${JSON.stringify(payload.payload)}`);
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      addMessage(
        `Presence state updated: ${Object.keys(state).length} users online`,
      );
    });

    channel.on("system", { event: "*" }, (payload) => {
      addMessage(`System: ${payload.event}`);
      if (payload.event === "connected") {
        setIsConnected(true);
      } else if (payload.event === "disconnected") {
        setIsConnected(false);
      }
    });

    // Subscribe to the channel
    channel.subscribe((status: string) => {
      addMessage(`Subscription status: ${status}`);
      setStatus(`Status: ${status}`);
      setIsConnecting(false);

      if (status === "SUBSCRIBED") {
        // Track presence
        channel.track({
          user: playerName,
          online_at: new Date().toISOString(),
        });

        // Send a join message
        channel.send({
          type: "broadcast",
          event: "message",
          payload: {
            type: "join",
            player: playerName,
            timestamp: new Date().toISOString(),
          },
        });
      }
    });
  };

  const sendMessage = () => {
    if (!isConnected || !channelRef.current) {
      addMessage("Cannot send message: not connected");
      return;
    }

    // Send a chat message using the existing channel
    channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload: {
        type: "chat",
        player: playerName,
        message: `Hello from ${playerName} at ${new Date().toISOString()}`,
        timestamp: new Date().toISOString(),
      },
    });

    addMessage("Message sent");
  };

  const disconnect = () => {
    cleanupChannel();
    setIsConnected(false);
    setStatus("Disconnected");
    addMessage("Disconnected from channel");
  };

  return (
    <div className="p-4 border border-blue-500 rounded-lg mb-4 bg-card">
      <h2 className="text-xl font-bold mb-4">Direct Supabase Realtime Test</h2>

      <div className="flex items-center mb-4">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{status}</span>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <label className="text-sm font-medium">Game ID</label>
          <Input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            placeholder="Enter game ID"
            disabled={isConnecting || isConnected}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Player Name</label>
          <Input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            disabled={isConnecting || isConnected}
          />
        </div>
        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button onClick={disconnect} variant="destructive">
                Disconnect
              </Button>
              <Button onClick={sendMessage} variant="secondary">
                Send Test Message
              </Button>
            </>
          ) : (
            <Button
              onClick={connectToGame}
              variant="default"
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-black/10 p-2 rounded h-64 overflow-y-auto font-mono text-xs">
        {messages.length === 0 && (
          <div className="text-gray-500">Messages will appear here...</div>
        )}
        {messages.map((message, index) => (
          <div key={index} className="whitespace-pre-wrap mb-1">
            {message}
          </div>
        ))}
      </div>
    </div>
  );
}
