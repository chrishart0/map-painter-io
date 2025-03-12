"use client";
/**
 * Supabase Realtime Hook
 *
 * A React hook for managing Supabase Realtime subscriptions.
 * This hook handles channel creation, connection management, message sending,
 * and presence tracking for real-time communication using Supabase.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { GameMessage, Player } from "@/types/game";

// Enum for subscription states from Supabase Realtime
enum REALTIME_SUBSCRIBE_STATES {
  SUBSCRIBED = "SUBSCRIBED",
  TIMED_OUT = "TIMED_OUT",
  CLOSED = "CLOSED",
  CHANNEL_ERROR = "CHANNEL_ERROR",
}

interface UseSupabaseRealtimeOptions {
  channelName: string;
  eventTypes?: string[];
  onMessage?: (message: GameMessage) => void;
  onPresenceSync?: (state: RealtimePresenceState) => void;
  autoJoin?: boolean;
}

interface MessagePayload {
  [key: string]: unknown;
}

interface QueuedMessage {
  eventType: string;
  message: MessagePayload;
}

interface UseSupabaseRealtimeReturn {
  isConnected: boolean;
  presenceState: RealtimePresenceState | null;
  sendMessage: (eventType: string, message: MessagePayload) => void;
  joinChannel: () => Promise<void>;
  leaveChannel: () => void;
  trackPresence: (presenceData: Partial<Player>) => void;
  updatePresence: (presenceData: Partial<Player>) => void;
}

/**
 * A hook for managing Supabase Realtime subscriptions
 */
export function useSupabaseRealtime({
  channelName,
  eventTypes = ["message"],
  onMessage,
  onPresenceSync,
  autoJoin = true,
}: UseSupabaseRealtimeOptions): UseSupabaseRealtimeReturn {
  // State and refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presenceState, setPresenceState] =
    useState<RealtimePresenceState | null>(null);
  const messageQueue = useRef<QueuedMessage[]>([]);
  const channelNameRef = useRef<string>(channelName);

  /**
   * Process any messages that were queued while disconnected
   */
  const processQueuedMessages = useCallback((channel: RealtimeChannel) => {
    if (messageQueue.current.length > 0) {
      console.log(`Processing ${messageQueue.current.length} queued messages`);
      messageQueue.current.forEach(({ eventType, message }) => {
        channel.send({
          type: "broadcast",
          event: eventType,
          payload: message,
        });
      });
      messageQueue.current = [];
    }
  }, []);

  /**
   * Safely clean up a channel, unsubscribing and resetting state
   */
  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      console.log(`Cleaning up channel: ${channelNameRef.current}`);
      try {
        channelRef.current.unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
      channelRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Create a new Supabase Realtime channel with appropriate event handlers
   */
  const createChannel = useCallback(
    (name: string) => {
      console.log(`Creating channel: ${name}`);

      // Clean up existing channel first
      cleanupChannel();

      // Create a new channel
      const newChannel = supabase.channel(name, {
        config: {
          broadcast: { self: true },
          presence: { key: "game-presence" },
        },
      });

      // Set up broadcast event listeners for each event type
      eventTypes.forEach((eventType) => {
        newChannel.on("broadcast", { event: eventType }, (payload) => {
          console.log(`Received ${eventType} message:`, payload);
          onMessage?.(payload.payload as GameMessage);
        });
      });

      // Set up presence event listener
      newChannel.on("presence", { event: "sync" }, () => {
        const state = newChannel.presenceState();
        console.log("Presence sync:", state);
        setPresenceState(state);
        onPresenceSync?.(state);
      });

      // Set up system event listeners for connection status
      newChannel.on("system", { event: "*" }, (status) => {
        console.log("Realtime system event:", status);
        if (status.event === "connected") {
          setIsConnected(true);

          // Process any queued messages
          processQueuedMessages(newChannel);
        } else if (status.event === "disconnected") {
          setIsConnected(false);
        }
      });

      // Store the channel reference
      channelRef.current = newChannel;
      return newChannel;
    },
    [
      eventTypes,
      onMessage,
      onPresenceSync,
      cleanupChannel,
      processQueuedMessages,
    ],
  );

  /**
   * Join the channel and return a promise that resolves when connected
   */
  const joinChannel = useCallback(async () => {
    // Create the channel if it doesn't exist
    if (!channelRef.current) {
      console.log(
        `No channel exists, creating channel: ${channelNameRef.current}`,
      );
      createChannel(channelNameRef.current);
    }

    if (!channelRef.current) {
      console.error("Failed to create channel");
      throw new Error("Failed to create channel");
    }

    console.log(`Joining channel: ${channelNameRef.current}`);

    // Return a promise that resolves when subscription is successful
    return new Promise<void>((resolve, reject) => {
      try {
        channelRef.current!.subscribe((status) => {
          console.log("Join subscription status:", status);
          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            console.log("Successfully subscribed to channel");
            setIsConnected(true);
            resolve();
          } else if (
            status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
            status === REALTIME_SUBSCRIBE_STATES.CLOSED ||
            status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
          ) {
            console.error("Failed to subscribe to channel:", status);
            setIsConnected(false);
            reject(new Error(`Failed to subscribe to channel: ${status}`));
          }
        });
      } catch (error) {
        console.error("Error during subscribe:", error);
        reject(error);
      }
    });
  }, [createChannel]);

  /**
   * Handle channel changes when channelName prop changes
   */
  useEffect(() => {
    // Skip if nothing changed
    if (channelNameRef.current === channelName) {
      return;
    }

    // Update the ref and create a new channel
    channelNameRef.current = channelName;
    console.log(`Channel name changed to: ${channelName}`);
    createChannel(channelName);

    // Auto-join if enabled
    if (autoJoin) {
      console.log(`Auto-joining channel: ${channelName}`);
      // Use setTimeout to avoid dependency cycle with joinChannel
      setTimeout(() => {
        joinChannel().catch((error) => {
          console.error(`Error auto-joining channel: ${error.message}`);
        });
      }, 0);
    }

    // Cleanup on unmount or when channelName changes
    return () => {
      cleanupChannel();
    };
  }, [channelName, autoJoin, createChannel, cleanupChannel, joinChannel]);

  /**
   * Leave the channel, cleaning up resources
   */
  const leaveChannel = useCallback(() => {
    cleanupChannel();
  }, [cleanupChannel]);

  /**
   * Send a message to the channel, or queue it if not connected
   */
  const sendMessage = useCallback(
    (eventType: string, message: MessagePayload) => {
      if (channelRef.current && isConnected) {
        console.log(`Sending ${eventType} message:`, message);
        channelRef.current.send({
          type: "broadcast",
          event: eventType,
          payload: message,
        });
      } else {
        console.warn(
          "Cannot send message, not connected to channel. Queueing message.",
        );
        // Queue the message to be sent when connection is established
        messageQueue.current.push({ eventType, message });
      }
    },
    [isConnected],
  );

  /**
   * Track user presence in the channel
   */
  const trackPresence = useCallback(
    (presenceData: Partial<Player>) => {
      if (channelRef.current && isConnected) {
        console.log("Tracking presence:", presenceData);
        channelRef.current.track(presenceData);
      } else {
        console.warn("Cannot track presence, not connected to channel");
      }
    },
    [isConnected],
  );

  /**
   * Update presence data for the current user
   */
  const updatePresence = useCallback(
    (presenceData: Partial<Player>) => {
      if (channelRef.current && isConnected) {
        console.log("Updating presence:", presenceData);
        channelRef.current.track(presenceData);
      } else {
        console.warn("Cannot update presence, not connected to channel");
      }
    },
    [isConnected],
  );

  return {
    isConnected,
    presenceState,
    sendMessage,
    joinChannel,
    leaveChannel,
    trackPresence,
    updatePresence,
  };
}
