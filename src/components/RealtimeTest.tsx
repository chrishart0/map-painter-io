"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "./ui/button";

export function RealtimeTest() {
  const [status, setStatus] = useState<string>("Disconnected");
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  const addLog = useCallback((message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toISOString().slice(11, 19)} - ${message}`,
    ]);
  }, []);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      addLog("Cleaning up channel...");
      try {
        channelRef.current.unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
      channelRef.current = null;
    }
  }, [addLog]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const testConnection = async () => {
    addLog("Starting connection test...");
    setStatus("Connecting...");
    setIsTesting(true);
    setConnected(false);

    try {
      // First, clean up any existing channel
      cleanup();

      // Get environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      addLog(
        `URL available: ${!!supabaseUrl}, Key available: ${!!supabaseAnonKey}`,
      );

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase environment variables");
      }

      // Create a fresh Supabase client if needed
      if (!supabaseRef.current) {
        supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
        addLog("Supabase client created");
      }

      // Create a simple channel with a unique name to avoid conflicts
      const channelName = `test-channel-${Date.now()}`;
      const channel = supabaseRef.current.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: "test-presence" },
        },
      });

      addLog(`Channel created: ${channelName}`);
      channelRef.current = channel;

      // Set up a simple event handler
      channel.on("broadcast", { event: "test-event" }, (payload) => {
        addLog(`Received message: ${JSON.stringify(payload)}`);
      });

      // Set up system event handler
      channel.on("system", { event: "*" }, (payload) => {
        addLog(`System event: ${payload.event}`);
        if (payload.event === "connected") {
          setConnected(true);
        } else if (payload.event === "disconnected") {
          setConnected(false);
        }
      });

      // Set up presence handler
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        addLog(`Presence sync: ${JSON.stringify(state)}`);
      });

      // Subscribe to the channel
      addLog("Subscribing to channel...");
      channel.subscribe((status) => {
        addLog(`Subscription status: ${status}`);
        setStatus(`Status: ${status}`);
        setIsTesting(false);

        // After subscribing successfully, try to send a message
        if (status === "SUBSCRIBED") {
          setTimeout(() => {
            addLog("Sending test message");
            channel.send({
              type: "broadcast",
              event: "test-event",
              payload: { message: "Hello from RealtimeTest!" },
            });

            // Try to track presence
            addLog("Tracking presence");
            channel.track({
              user_id: "test-user",
              online_at: new Date().toISOString(),
            });
          }, 1000);
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      addLog(`Error: ${errorMessage}`);
      setStatus(`Error: ${errorMessage}`);
      setIsTesting(false);
    }
  };

  const disconnect = () => {
    cleanup();
    setConnected(false);
    setStatus("Disconnected");
    addLog("Disconnected from channel");
  };

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h2 className="text-xl font-bold mb-4">Supabase Realtime Test</h2>

      <div className="flex items-center mb-4">
        <div
          className={`w-3 h-3 rounded-full mr-2 ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{status}</span>
      </div>

      <div className="flex gap-2 mb-4">
        <Button onClick={testConnection} disabled={isTesting || connected}>
          {isTesting ? "Connecting..." : "Test Connection"}
        </Button>

        {connected && (
          <Button onClick={disconnect} variant="destructive">
            Disconnect
          </Button>
        )}
      </div>

      <div className="bg-black/10 p-2 rounded h-64 overflow-y-auto font-mono text-xs">
        {logs.map((log, index) => (
          <div key={index} className="whitespace-pre-wrap mb-1">
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
