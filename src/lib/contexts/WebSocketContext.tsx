/**
 * WebSocket Context
 *
 * Provides global WebSocket functionality to the application.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { GameMessage, MessageType, JoinGameMessage } from "../../types/game";

// URL for the WebSocket server - use environment variable or default
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000/ws";

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: GameMessage) => void;
  connect: () => void;
  disconnect: () => void;
  joinGame: (gameId: string, playerName: string) => void;
  // Add more game-specific methods here as needed
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  // State for handling messages
  const [messageQueue, setMessageQueue] = useState<GameMessage[]>([]);

  // Handler for incoming messages
  const handleMessage = useCallback((message: GameMessage) => {
    // Process incoming message based on type
    console.log("Received message:", message);

    switch (message.type) {
      case MessageType.GAME_STATE:
        // Handle game state update
        break;
      case MessageType.PLAYER_JOINED:
        // Handle player joined
        break;
      case MessageType.PLAYER_LEFT:
        // Handle player left
        break;
      case MessageType.STATE_CLAIMED:
        // Handle state claimed
        break;
      case MessageType.STATE_ATTACKED:
        // Handle state attacked
        break;
      case MessageType.RESOURCES_UPDATED:
        // Handle resources updated
        break;
      case MessageType.ERROR:
        // Handle error message
        console.error("Server error:", message.message);
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  }, []);

  // Initialize WebSocket hook
  const { isConnected, sendMessage, connect, disconnect } = useWebSocket({
    url: WS_URL,
    autoConnect: true,
    onMessage: handleMessage,
    onOpen: () => {
      console.log("WebSocket connected");

      // Send any queued messages
      if (messageQueue.length > 0) {
        messageQueue.forEach((msg) => sendMessage(msg));
        setMessageQueue([]);
      }
    },
    onClose: () => {
      console.log("WebSocket disconnected");
    },
    onError: (error) => {
      console.error("WebSocket error:", error);
    },
  });

  // Utility method to join a game
  const joinGame = useCallback(
    (gameId: string, playerName: string) => {
      const joinMessage: JoinGameMessage = {
        type: MessageType.JOIN_GAME,
        gameId,
        playerName,
      };

      if (isConnected) {
        sendMessage(joinMessage);
      } else {
        // Queue message to be sent when connected
        setMessageQueue((prev) => [...prev, joinMessage]);
        connect();
      }
    },
    [isConnected, sendMessage, connect],
  );

  // Value to be provided by the context
  const contextValue: WebSocketContextType = {
    isConnected,
    sendMessage,
    connect,
    disconnect,
    joinGame,
    // Add more methods as needed
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocketContext must be used within a WebSocketProvider",
    );
  }
  return context;
};
