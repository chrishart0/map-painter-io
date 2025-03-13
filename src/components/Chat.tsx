"use client";

import React, { useEffect, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * @interface ChatMessage
 * Represents a chat message object used in the Chat component.
 * @property {string} id - Unique identifier for the message.
 * @property {string} user - Username of the message sender.
 * @property {string} message - The chat message content.
 * @property {number} timestamp - Timestamp of when the message was sent.
 */
interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: number;
}

/**
 * Interface for the payload received from broadcast events
 * @interface BroadcastPayload
 * Represents the structure of messages received from Supabase Realtime broadcast events.
 * @property {Object} payload - The actual message content
 * @property {string} payload.sender - The username of the sender
 * @property {string} payload.text - The message text content
 */
interface BroadcastPayload {
  payload?: {
    sender?: string;
    text?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Chat component that renders a realtime chat interface using WebSocket.
 *
 * This component uses the global gameChannel (Supabase Realtime channel) to send and receive messages.
 * It displays received messages and provides an interface for sending messages.
 *
 * The component:
 * 1. Connects to an existing Supabase Realtime channel stored in window.gameChannel
 * 2. Listens for broadcast events with type "message"
 * 3. Displays messages in a scrollable container
 * 4. Allows users to send new messages when connected
 *
 * This component depends on the GameJoinPanel component establishing the connection first
 * and storing the channel in the window object.
 *
 * @returns {JSX.Element} The rendered Chat component.
 */
const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if channel exists and update connection state
    const checkConnection = () => {
      const channel = (window as Window & { gameChannel?: RealtimeChannel })
        .gameChannel;
      setIsConnected(!!channel);
    };

    // Initial check
    checkConnection();

    // Set up interval to check connection status
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Access the channel from the window object
    const channel = (window as Window & { gameChannel?: RealtimeChannel })
      .gameChannel;

    if (channel) {
      // Set up broadcast event listener for chat messages
      const handleMessage = (payload: BroadcastPayload) => {
        if (payload.payload && payload.payload.sender && payload.payload.text) {
          const newMessage: ChatMessage = {
            id:
              Date.now().toString() +
              Math.floor(Math.random() * 1000).toString(),
            user: payload.payload.sender,
            message: payload.payload.text,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      };

      channel.on("broadcast", { event: "message" }, handleMessage);

      return () => {
        // Clean up the listener when component unmounts
        try {
          // @ts-expect-error - RealtimeChannel does have an off method but TypeScript doesn't recognize it
          channel.off("broadcast", { event: "message" }, handleMessage);
        } catch (error) {
          console.error("Error removing listener:", error);
        }
      };
    }
  }, [isConnected]);

  /**
   * Sends a new chat message using the channel.
   * Constructs a message payload and sends it over the WebSocket.
   *
   * The function:
   * 1. Validates that the input is not empty
   * 2. Gets the current user's name from the presence state
   * 3. Sends a broadcast message with the user's name and message text
   * 4. Clears the input field on success
   */
  const sendMessage = () => {
    if (input.trim() === "") return;

    const channel = (window as Window & { gameChannel?: RealtimeChannel })
      .gameChannel;
    if (channel) {
      // Get the user name from the presence state or use Anonymous
      let userName = "Anonymous";
      try {
        const presenceState = channel.presenceState();
        const topic = channel.topic;
        if (
          presenceState &&
          topic &&
          presenceState[topic] &&
          presenceState[topic][0]
        ) {
          // @ts-expect-error - The presence state does have user_id but TypeScript doesn't recognize it
          userName = presenceState[topic][0].user_id || "Anonymous";
        }
      } catch (error) {
        console.error("Error getting user name:", error);
      }

      channel
        .send({
          type: "broadcast",
          event: "message",
          payload: {
            sender: userName,
            text: input,
          },
        })
        .then(() => {
          setInput("");
        })
        .catch((error: Error) => {
          console.error("Error sending message:", error);
        });
    }
  };

  return (
    <div className="flex flex-col h-full bg-secondary/10 text-primary p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Game Chat</h3>

      <div className="flex-1 overflow-y-auto mb-2 space-y-2 min-h-[200px] bg-background/80 p-2 rounded">
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-bold">{msg.user}: </span>
              <span>{msg.message}</span>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground h-full flex items-center justify-center">
            {isConnected
              ? "No messages yet. Start the conversation!"
              : "Join a game above to start chatting with other players."}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={
            isConnected ? "Type a message..." : "Join a game to chat..."
          }
          className="flex-1 p-2 border rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && isConnected && sendMessage()}
          disabled={!isConnected}
        />
        <button
          onClick={sendMessage}
          className={`p-2 rounded ${isConnected ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
          disabled={!isConnected}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
