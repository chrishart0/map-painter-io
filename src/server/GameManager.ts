/**
 * Game Manager
 *
 * Manages game instances, client connections, and message handling.
 */

import { WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  GameInstance,
  GameMessage,
  MessageType,
  Player,
  // StateOwnership,
  JoinGameMessage,
  // LeaveGameMessage,
  ClaimStateMessage,
  AttackStateMessage,
  ErrorMessage,
} from "../types/game";

// Resource constants
const INITIAL_RESOURCES = 10;
const CLAIM_COST = 5;
const ATTACK_BASE_COST = 10;
const RESOURCE_UPDATE_INTERVAL = 5000; // 5 seconds
const RESOURCE_GAIN_PER_STATE = 1;

// Client tracking interface
interface Client {
  id: string;
  socket: WebSocket;
  gameId?: string;
  playerId?: string;
}

export class GameManager {
  private games: Map<string, GameInstance>;
  private clients: Map<string, Client>;
  private resourceUpdateInterval: NodeJS.Timeout | null;

  constructor() {
    this.games = new Map();
    this.clients = new Map();
    this.resourceUpdateInterval = null;

    // Start the resource update timer
    this.startResourceUpdates();
  }

  /**
   * Add a new client connection
   */
  public addClient(socket: WebSocket): string {
    const clientId = uuidv4();
    this.clients.set(clientId, { id: clientId, socket });
    return clientId;
  }

  /**
   * Remove a client connection
   */
  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client && client.gameId && client.playerId) {
      // Remove player from game
      this.handlePlayerLeave(client.gameId, client.playerId);
    }
    this.clients.delete(clientId);

    // Check if we still have any clients
    if (this.clients.size === 0) {
      this.stopResourceUpdates();
    }
  }

  /**
   * Handle an incoming message from a client
   */
  public handleMessage(clientId: string, message: GameMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      switch (message.type) {
        case MessageType.JOIN_GAME:
          this.handleJoinGame(clientId, message as JoinGameMessage);
          break;
        case MessageType.LEAVE_GAME:
          if (client.gameId && client.playerId) {
            this.handlePlayerLeave(client.gameId, client.playerId);
          }
          break;
        case MessageType.CLAIM_STATE:
          if (client.gameId && client.playerId) {
            this.handleClaimState(
              client.gameId,
              client.playerId,
              (message as ClaimStateMessage).stateId,
            );
          }
          break;
        case MessageType.ATTACK_STATE:
          if (client.gameId && client.playerId) {
            const attackMessage = message as AttackStateMessage;
            this.handleAttackState(
              client.gameId,
              client.playerId,
              attackMessage.stateId,
              attackMessage.extraResources,
            );
          }
          break;
        default:
          this.sendErrorToClient(client, "Unknown message type");
      }
    } catch (error) {
      console.error("Error handling message:", error);
      this.sendErrorToClient(client, "Error processing message");
    }
  }

  /**
   * Handle a player joining a game
   */
  private handleJoinGame(clientId: string, message: JoinGameMessage): void {
    const gameId = message.gameId;
    const client = this.clients.get(clientId);
    if (!client) return;

    // Get or create the game
    let game = this.games.get(gameId);

    if (!game) {
      // Create a new game instance
      game = {
        id: gameId,
        name: `Game ${gameId}`,
        createdAt: Date.now(),
        players: {},
        stateOwnerships: {},
        lastResourceUpdate: Date.now(),
      };
      this.games.set(gameId, game);
    }

    // Create a new player
    const playerId = uuidv4();
    const playerName =
      message.playerName || `Player ${playerId.substring(0, 4)}`;

    // Generate a unique color for the player (simple approach for now)
    const colors = [
      "#FF5733",
      "#33FF57",
      "#3357FF",
      "#F033FF",
      "#FF33A8",
      "#33FFF6",
    ];
    const assignedColors = Object.values(game.players).map((p) => p.color);
    const availableColors = colors.filter((c) => !assignedColors.includes(c));
    const color =
      availableColors.length > 0
        ? availableColors[0]
        : `#${Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")}`;

    // Create and add the player
    const player: Player = {
      id: playerId,
      name: playerName,
      color,
      resources: INITIAL_RESOURCES,
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    game.players[playerId] = player;

    // Update client tracking
    client.gameId = gameId;
    client.playerId = playerId;

    // Send full game state to the new player
    this.sendToClient(client, {
      type: MessageType.GAME_STATE,
      gameId,
      instance: game,
    });

    // Notify other players that someone joined
    this.broadcastToGame(
      gameId,
      {
        type: MessageType.PLAYER_JOINED,
        gameId,
        player,
      },
      [playerId],
    );

    // Start resource updates if not already running
    this.startResourceUpdates();
  }

  /**
   * Handle a player leaving a game
   */
  private handlePlayerLeave(gameId: string, playerId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Remove the player
    if (game.players[playerId]) {
      delete game.players[playerId];

      // Broadcast to remaining players
      this.broadcastToGame(gameId, {
        type: MessageType.PLAYER_LEFT,
        gameId,
        playerId,
      });

      // If game is empty, clean it up
      if (Object.keys(game.players).length === 0) {
        this.games.delete(gameId);
      }
    }

    // Update client records
    for (const [id, client] of this.clients.entries()) {
      if (client.playerId === playerId && client.gameId === gameId) {
        console.log(`Removing client ${id} from game ${gameId}`);
        client.gameId = undefined;
        client.playerId = undefined;
      }
    }
  }

  /**
   * Handle claim state action
   */
  private handleClaimState(
    gameId: string,
    playerId: string,
    stateId: string,
  ): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const player = game.players[playerId];
    if (!player) return;

    // Check if player has enough resources
    if (player.resources < CLAIM_COST) {
      return this.sendErrorToPlayer(
        gameId,
        playerId,
        "Not enough resources to claim state",
      );
    }

    // Check if state is already owned
    const stateOwnership = game.stateOwnerships[stateId];
    if (stateOwnership && stateOwnership.ownerId !== null) {
      return this.sendErrorToPlayer(
        gameId,
        playerId,
        "State is already claimed",
      );
    }

    // TODO: Add adjacency check to ensure player can only claim adjacent states
    // For now, allowing any claim for testing purposes

    // Deduct resources
    player.resources -= CLAIM_COST;

    // Update state ownership
    game.stateOwnerships[stateId] = {
      stateId,
      ownerId: playerId,
      capturedAt: Date.now(),
    };

    // Broadcast change to all players
    this.broadcastToGame(gameId, {
      type: MessageType.STATE_CLAIMED,
      gameId,
      stateId,
      playerId,
    });
  }

  /**
   * Handle attack state action
   */
  private handleAttackState(
    gameId: string,
    attackerId: string,
    stateId: string,
    extraResources: number,
  ): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const attacker = game.players[attackerId];
    if (!attacker) return;

    // Check if state is owned by someone else
    const stateOwnership = game.stateOwnerships[stateId];
    if (
      !stateOwnership ||
      stateOwnership.ownerId === null ||
      stateOwnership.ownerId === attackerId
    ) {
      return this.sendErrorToPlayer(
        gameId,
        attackerId,
        "Can only attack states owned by other players",
      );
    }

    const defenderId = stateOwnership.ownerId;

    // Calculate total attack cost
    const totalCost = ATTACK_BASE_COST + extraResources;

    // Check if attacker has enough resources
    if (attacker.resources < totalCost) {
      return this.sendErrorToPlayer(
        gameId,
        attackerId,
        "Not enough resources for attack",
      );
    }

    // TODO: Add adjacency check to ensure player can only attack adjacent states
    // For now, allowing any attack for testing purposes

    // Deduct resources
    attacker.resources -= totalCost;

    // Simple attack logic (can be enhanced later)
    // Attacker strength: 1 + extraResources spent
    // Defender strength: 1
    // TODO: Add proper strength calculation based on adjacent owned states
    const attackerStrength = 1 + extraResources;
    const defenderStrength = 1;

    const success = attackerStrength > defenderStrength;

    if (success) {
      // Update state ownership
      game.stateOwnerships[stateId] = {
        stateId,
        ownerId: attackerId,
        capturedAt: Date.now(),
      };
    }

    // Broadcast result to all players
    this.broadcastToGame(gameId, {
      type: MessageType.STATE_ATTACKED,
      gameId,
      stateId,
      attackerId,
      defenderId,
      success,
    });
  }

  /**
   * Start the resource update timer
   */
  private startResourceUpdates(): void {
    if (this.resourceUpdateInterval === null) {
      this.resourceUpdateInterval = setInterval(() => {
        this.updateResources();
      }, RESOURCE_UPDATE_INTERVAL);
    }
  }

  /**
   * Stop the resource update timer
   */
  private stopResourceUpdates(): void {
    if (this.resourceUpdateInterval !== null) {
      clearInterval(this.resourceUpdateInterval);
      this.resourceUpdateInterval = null;
    }
  }

  /**
   * Update resources for all players based on owned states
   */
  private updateResources(): void {
    // Skip if no games
    if (this.games.size === 0) return;

    for (const [gameId, game] of this.games.entries()) {
      // Calculate state counts per player
      const stateCounts: Record<string, number> = {};

      for (const stateOwnership of Object.values(game.stateOwnerships)) {
        if (stateOwnership.ownerId !== null) {
          stateCounts[stateOwnership.ownerId] =
            (stateCounts[stateOwnership.ownerId] || 0) + 1;
        }
      }

      // Calculate resource gains and update player resources
      const playerResources: Record<string, number> = {};

      for (const playerId in game.players) {
        const player = game.players[playerId];
        const ownedStates = stateCounts[playerId] || 0;

        // Add resources based on owned states
        player.resources += ownedStates * RESOURCE_GAIN_PER_STATE;

        // Record for broadcast
        playerResources[playerId] = player.resources;
      }

      // Update timestamp
      game.lastResourceUpdate = Date.now();

      // Broadcast resource update to all players in this game
      this.broadcastToGame(gameId, {
        type: MessageType.RESOURCES_UPDATED,
        gameId,
        playerResources,
      });
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(client: Client, message: GameMessage): void {
    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending message to client:", error);
    }
  }

  /**
   * Send an error message to a client
   */
  private sendErrorToClient(client: Client, errorMessage: string): void {
    const error: ErrorMessage = {
      type: MessageType.ERROR,
      gameId: client.gameId || "",
      message: errorMessage,
    };
    this.sendToClient(client, error);
  }

  /**
   * Send an error message to a player
   */
  private sendErrorToPlayer(
    gameId: string,
    playerId: string,
    errorMessage: string,
  ): void {
    for (const client of this.clients.values()) {
      if (client.gameId === gameId && client.playerId === playerId) {
        this.sendErrorToClient(client, errorMessage);
        return;
      }
    }
  }

  /**
   * Broadcast a message to all players in a game, optionally excluding specific players
   */
  private broadcastToGame(
    gameId: string,
    message: GameMessage,
    excludePlayerIds: string[] = [],
  ): void {
    for (const client of this.clients.values()) {
      if (
        client.gameId === gameId &&
        client.playerId &&
        !excludePlayerIds.includes(client.playerId)
      ) {
        this.sendToClient(client, message);
      }
    }
  }
}
