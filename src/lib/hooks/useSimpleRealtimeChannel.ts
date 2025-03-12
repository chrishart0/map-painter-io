"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { supabase } from "../supabase";

// Define more specific types to replace 'any'
interface ChannelPayload {
  [key: string]: unknown;
  type?: string;
  event: string;
  payload?: Record<string, unknown>;
}

type ChannelEventHandler = (payload: ChannelPayload) => void;
type BroadcastEvent = {
  type: "broadcast";
  event: string;
  payload: Record<string, unknown>;
};

interface UseRealtimeChannelOptions {
  channelName: string;
  eventHandlers?: Record<string, ChannelEventHandler>;
  onPresenceSync?: (state: RealtimePresenceState) => void;
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * A simplified hook for managing Supabase Realtime channel subscriptions.
 *
 * This hook creates and manages a single channel for the provided channel name.
 * It provides methods for sending messages, tracking presence, and handling events.
 */
export function useSimpleRealtimeChannel({
  channelName,
  eventHandlers = {},
  onPresenceSync,
  onConnectionChange,
}: UseRealtimeChannelOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const eventsRef = useRef<Record<string, ChannelEventHandler>>(eventHandlers);
  const messageQueueRef = useRef<BroadcastEvent[]>([]);

  // Update event handlers if they change
  useEffect(() => {
    eventsRef.current = eventHandlers;
  }, [eventHandlers]);

  // Create and initialize channel
  useEffect(() => {
    console.log(`Creating channel: ${channelName}`);

    // Create the channel
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: "presence" },
      },
    });

    // Set up broadcast event handlers
    Object.keys(eventHandlers).forEach((eventName) => {
      channel.on("broadcast", { event: eventName }, (payload) => {
        console.log(`Received ${eventName} event:`, payload);
        eventsRef.current[eventName]?.(payload);
      });
    });

    // Set up presence sync handler
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      console.log("Presence sync:", state);
      onPresenceSync?.(state);
    });

    // Set up system event handlers
    channel.on("system", { event: "*" }, (payload) => {
      console.log("System event:", payload);

      if (payload.event === "connected") {
        setIsConnected(true);
        onConnectionChange?.(true);

        // Process message queue
        if (messageQueueRef.current.length > 0) {
          console.log(
            `Processing ${messageQueueRef.current.length} queued messages`,
          );
          messageQueueRef.current.forEach((msg) => {
            channel.send(msg);
          });
          messageQueueRef.current = [];
        }
      } else if (payload.event === "disconnected") {
        setIsConnected(false);
        onConnectionChange?.(false);
      }
    });

    // Subscribe to the channel
    console.log(`Subscribing to channel: ${channelName}`);
    channel.subscribe((status) => {
      console.log(`Channel subscription status: ${status}`);
      setIsConnected(status === "SUBSCRIBED");
    });

    // Store the channel reference
    channelRef.current = channel;

    // Clean up on unmount
    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`);
      channel.unsubscribe();
    };
  }, [channelName, onPresenceSync, onConnectionChange, eventHandlers]);

  // Send a message to the channel
  const sendMessage = useCallback(
    (eventName: string, payload: Record<string, unknown>) => {
      const message: BroadcastEvent = {
        type: "broadcast",
        event: eventName,
        payload,
      };

      if (channelRef.current && isConnected) {
        console.log(`Sending ${eventName} message:`, payload);
        channelRef.current.send(message);
      } else {
        console.log(`Queueing ${eventName} message:`, payload);
        messageQueueRef.current.push(message);
      }
    },
    [isConnected],
  );

  // Track presence
  const trackPresence = useCallback(
    (presenceData: Record<string, unknown>) => {
      if (channelRef.current && isConnected) {
        console.log("Tracking presence:", presenceData);
        channelRef.current.track(presenceData);
        return true;
      } else {
        console.log("Cannot track presence, not connected");
        return false;
      }
    },
    [isConnected],
  );

  return {
    isConnected,
    sendMessage,
    trackPresence,
  };
}
