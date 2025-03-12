/**
 * Custom Next.js Server with WebSocket Support
 *
 * This file implements a custom Next.js server that integrates WebSocket functionality.
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize the game manager
const gameManager = new GameManager();

app.prepare().then(() => {
  // Create an HTTP server
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url!, true);

      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Create a WebSocket server by attaching it to the HTTP server
  const wss = new WebSocketServer({
    server,
    path: "/ws", // Only handle connections at this path
  });

  // Set up WebSocket server event handlers
  wss.on("connection", (socket) => {
    console.log("WebSocket client connected");

    // Add this socket to the game manager
    const clientId = gameManager.addClient(socket);

    // Handle messages from clients
    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        gameManager.handleMessage(clientId, message);
      } catch (error) {
        console.error("Error processing message:", error);
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          }),
        );
      }
    });

    // Handle disconnection
    socket.on("close", () => {
      console.log("WebSocket client disconnected");
      gameManager.removeClient(clientId);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      gameManager.removeClient(clientId);
    });
  });

  // Start the server
  server.listen(port, () => {
    console.log(`Server running at http://${hostname}:${port}`);
  });
});
