/**
 * WebSocket Hook
 *
 * A React hook to manage WebSocket connections and communications.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { GameMessage } from "../../types/game";

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  onMessage?: (message: GameMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: GameMessage) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket({
  url,
  autoConnect = true,
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const webSocketRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) return;

    // Create new WebSocket connection
    const ws = new WebSocket(url);
    webSocketRef.current = ws;

    // Set up event handlers
    ws.onopen = () => {
      setIsConnected(true);
      onOpen?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      onClose?.();
    };

    ws.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      onError?.(error);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as GameMessage;
        onMessage?.(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }, [url, onMessage, onOpen, onClose, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.close();
    }
  }, []);

  // Send a message through the WebSocket
  const sendMessage = useCallback((message: GameMessage) => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message, WebSocket is not connected");
    }
  }, []);

  // Auto-connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect,
  };
}
