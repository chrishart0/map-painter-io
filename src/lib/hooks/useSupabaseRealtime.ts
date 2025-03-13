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

// Enum for subscription states from Supabase Realtime
enum REALTIME_SUBSCRIBE_STATES {
  SUBSCRIBED = "SUBSCRIBED",
  TIMED_OUT = "TIMED_OUT",
  CLOSED = "CLOSED",
  CHANNEL_ERROR = "CHANNEL_ERROR",
}

// Interface for presence payload
export interface PresencePayload {
  [key: string]: unknown;
}

// Message payload type
export type MessagePayload = Record<string, unknown>;

// Reconnection configuration
const RECONNECT_INITIAL_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 30000; // 30 seconds
const RECONNECT_MAX_ATTEMPTS = 10;

interface UseSupabaseRealtimeOptions {
  channelName: string;
  eventTypes?: string[];
  onMessage?: (eventType: string, message: MessagePayload) => void;
  onPresenceSync?: (state: RealtimePresenceState) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
  autoJoin?: boolean;
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
  trackPresence: (presenceData: PresencePayload) => void;
  updatePresence: (presenceData: PresencePayload) => void;
  connectionStatus: string;
}

/**
 * A hook for managing Supabase Realtime subscriptions
 */
export function useSupabaseRealtime({
  channelName,
  eventTypes = ["message"],
  onMessage,
  onPresenceSync,
  onError,
  onStatusChange,
  autoJoin = true,
}: UseSupabaseRealtimeOptions): UseSupabaseRealtimeReturn {
  // State and refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("DISCONNECTED");
  const [presenceState, setPresenceState] =
    useState<RealtimePresenceState | null>(null);
  const messageQueue = useRef<QueuedMessage[]>([]);
  const channelNameRef = useRef<string>(channelName);
  const reconnectAttempts = useRef<number>(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update connection status and notify via callback
   */
  const updateConnectionStatus = useCallback(
    (status: string) => {
      setConnectionStatus(status);
      onStatusChange?.(status);
    },
    [onStatusChange],
  );

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
    }
    setIsConnected(false);
    setConnectionStatus("DISCONNECTED");
    if (onStatusChange) {
      onStatusChange("DISCONNECTED");
    }
  }, [onStatusChange]);

  /**
   * Calculate reconnection delay with exponential backoff
   */
  const getReconnectDelay = useCallback(() => {
    const attempt = reconnectAttempts.current;
    // Exponential backoff: 2^attempt * initial delay, capped at max delay
    return Math.min(
      RECONNECT_INITIAL_DELAY * Math.pow(2, attempt),
      RECONNECT_MAX_DELAY,
    );
  }, []);

  // Forward declaration for circular dependency
  const attemptReconnectRef = useRef<() => void>(() => {});
  const joinChannelRef = useRef<() => Promise<void>>(async () => {});

  /**
   * Attempt to reconnect to the channel with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= RECONNECT_MAX_ATTEMPTS) {
      console.error(
        `Max reconnection attempts (${RECONNECT_MAX_ATTEMPTS}) reached`,
      );
      updateConnectionStatus("MAX_RETRIES_EXCEEDED");
      onError?.(
        new Error(
          `Failed to reconnect after ${RECONNECT_MAX_ATTEMPTS} attempts`,
        ),
      );
      return;
    }

    const delay = getReconnectDelay();
    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${RECONNECT_MAX_ATTEMPTS})`,
    );
    updateConnectionStatus(
      `RECONNECTING (${reconnectAttempts.current + 1}/${RECONNECT_MAX_ATTEMPTS})`,
    );

    // Clear any existing timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    // Set a new timeout for reconnection
    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current += 1;
      joinChannelRef.current().catch((error: unknown) => {
        console.error("Reconnection attempt failed:", error);
        attemptReconnectRef.current();
      });
    }, delay);
  }, [getReconnectDelay, onError, updateConnectionStatus]);

  // Set the ref to the actual function
  attemptReconnectRef.current = attemptReconnect;

  /**
   * Join the Supabase Realtime channel
   */
  const joinChannel = useCallback(async (): Promise<void> => {
    // Clean up any existing channel
    cleanupChannel();

    updateConnectionStatus("CONNECTING");
    console.log(`Joining channel: ${channelNameRef.current}`);

    try {
      // Create a new channel
      const channel = supabase.channel(channelNameRef.current, {
        config: {
          broadcast: { self: true },
          presence: { key: "" },
        },
      });
      channelRef.current = channel;

      // Set up event listeners for each event type
      eventTypes.forEach((eventType) => {
        channel.on("broadcast", { event: eventType }, (payload) => {
          console.log(`Received ${eventType} message:`, payload);
          onMessage?.(eventType, payload.payload as MessagePayload);
        });
      });

      // Set up presence listeners
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        console.log("Presence state updated:", state);
        setPresenceState(state);
        onPresenceSync?.(state);
      });

      // Set up system event listeners
      channel.on("system", { event: "*" }, (payload) => {
        console.log("System event:", payload);
      });

      // Subscribe to the channel
      await channel.subscribe((status) => {
        console.log(`Channel status: ${status}`);

        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          console.log(
            `Successfully subscribed to channel: ${channelNameRef.current}`,
          );
          setIsConnected(true);
          updateConnectionStatus("CONNECTED");
          reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
          processQueuedMessages(channel);
        } else if (
          status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT ||
          status === REALTIME_SUBSCRIBE_STATES.CLOSED ||
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR
        ) {
          console.error(`Channel subscription failed with status: ${status}`);
          setIsConnected(false);
          updateConnectionStatus(`ERROR: ${status}`);
          attemptReconnect();
        }
      });

      return;
    } catch (error: unknown) {
      console.error("Error joining channel:", error);
      setIsConnected(false);
      updateConnectionStatus("ERROR");
      onError?.(
        error instanceof Error ? error : new Error("Failed to join channel"),
      );
      attemptReconnect();
      throw error;
    }
  }, [
    cleanupChannel,
    eventTypes,
    onMessage,
    onPresenceSync,
    onError,
    processQueuedMessages,
    updateConnectionStatus,
    attemptReconnect,
  ]);

  // Set the ref to the actual function
  joinChannelRef.current = joinChannel;

  /**
   * Leave the Supabase Realtime channel
   */
  const leaveChannel = useCallback(() => {
    // Clear any reconnection timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    cleanupChannel();
    reconnectAttempts.current = 0; // Reset reconnect attempts
  }, [cleanupChannel]);

  /**
   * Send a message through the Supabase Realtime channel
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
        console.log(`Queueing ${eventType} message (not connected):`, message);
        messageQueue.current.push({ eventType, message });

        // If we're not connected and not already attempting to reconnect, try to connect
        if (!isConnected && reconnectAttempts.current === 0) {
          joinChannel().catch((error: unknown) => {
            console.error(
              "Error joining channel while sending message:",
              error,
            );
          });
        }
      }
    },
    [isConnected, joinChannel],
  );

  /**
   * Track presence data in the channel
   */
  const trackPresence = useCallback(
    (presenceData: PresencePayload) => {
      if (channelRef.current && isConnected) {
        console.log("Tracking presence:", presenceData);
        channelRef.current.track(presenceData);
      } else {
        console.warn("Cannot track presence, channel not connected");
      }
    },
    [isConnected],
  );

  /**
   * Update presence data in the channel
   */
  const updatePresence = useCallback(
    (presenceData: PresencePayload) => {
      if (channelRef.current && isConnected) {
        console.log("Updating presence:", presenceData);
        channelRef.current.track(presenceData);
      } else {
        console.warn("Cannot update presence, channel not connected");
      }
    },
    [isConnected],
  );

  // New auto-join effect
  useEffect(() => {
    if (autoJoin) {
      joinChannelRef.current().catch((error: unknown) => {
        console.error("Error during auto-join:", error);
      });
    }
    return () => {
      leaveChannel();
    };
  }, [autoJoin, leaveChannel]);

  // Update channel name if it changes
  useEffect(() => {
    if (channelName !== channelNameRef.current) {
      channelNameRef.current = channelName;
      if (isConnected) {
        // Rejoin with new channel name
        joinChannel().catch((error: unknown) => {
          console.error("Error rejoining with new channel name:", error);
        });
      }
    }
  }, [channelName, isConnected, joinChannel]);

  return {
    isConnected,
    presenceState,
    sendMessage,
    joinChannel,
    leaveChannel,
    trackPresence,
    updatePresence,
    connectionStatus,
  };
}
