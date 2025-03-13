/**
 * Game Types
 *
 * This file contains type definitions for game-related data structures and WebSocket messages.
 */

// import { State } from './map';

// Player in the game
export interface Player {
  id: string;
  name: string;
  color: string;
  resources: number;
  connectedAt: number;
  lastActiveAt: number;
}

// State ownership record
export interface StateOwnership {
  stateId: string;
  ownerId: string | null; // null means neutral
  capturedAt: number;
  neighbors?: string[]; // IDs of neighboring states
}

// Game instance
export interface GameInstance {
  id: string;
  createdAt: number;
  states: StateOwnership[];
  players: Player[];
}

// WebSocket message types
export enum MessageType {
  // Client -> Server messages
  JOIN_GAME = "join_game",
  LEAVE_GAME = "leave_game",
  CLAIM_STATE = "claim_state",
  ATTACK_STATE = "attack_state",
  STATE_SELECTION = "state_selection",

  // Server -> Client messages
  GAME_STATE = "game_state",
  PLAYER_JOINED = "player_joined",
  PLAYER_LEFT = "player_left",
  STATE_CLAIMED = "state_claimed",
  STATE_ATTACKED = "state_attacked",
  RESOURCES_UPDATED = "resources_updated",
  ERROR = "error",
}

// Base WebSocket message
export interface WebSocketMessage {
  type: MessageType;
  gameId?: string;
}

// Client -> Server Messages

export interface JoinGameMessage extends WebSocketMessage {
  type: MessageType.JOIN_GAME;
  playerName: string;
}

export interface LeaveGameMessage extends WebSocketMessage {
  type: MessageType.LEAVE_GAME;
}

export interface ClaimStateMessage extends WebSocketMessage {
  type: MessageType.CLAIM_STATE;
  playerId: string;
  stateId: string;
  cost?: number;
}

export interface AttackStateMessage extends WebSocketMessage {
  type: MessageType.ATTACK_STATE;
  playerId: string;
  stateId: string;
  targetPlayerId?: string;
  cost?: number;
  attackStrength?: number;
  defenseStrength?: number;
  success?: boolean;
  extraResources?: number;
}

// Server -> Client Messages

export interface GameStateMessage extends WebSocketMessage {
  type: MessageType.GAME_STATE;
  instance: GameInstance;
}

export interface PlayerJoinedMessage extends WebSocketMessage {
  type: MessageType.PLAYER_JOINED;
  player: Player;
}

export interface PlayerLeftMessage extends WebSocketMessage {
  type: MessageType.PLAYER_LEFT;
  playerId: string;
}

export interface StateClaimedMessage extends WebSocketMessage {
  type: MessageType.STATE_CLAIMED;
  stateId: string;
  playerId: string;
}

export interface StateAttackedMessage extends WebSocketMessage {
  type: MessageType.STATE_ATTACKED;
  stateId: string;
  playerId: string;
  targetPlayerId: string;
  success: boolean;
}

export interface ResourcesUpdatedMessage extends WebSocketMessage {
  type: MessageType.RESOURCES_UPDATED;
  playerId: string;
  resources: number;
}

export interface ErrorMessage extends WebSocketMessage {
  type: MessageType.ERROR;
  message: string;
}

// New interface for state selection updates
export interface StateSelectionMessage extends WebSocketMessage {
  type: MessageType.STATE_SELECTION;
  playerId: string;
  selectedStates: string[]; // Array of state IDs that the player has selected
}

// Union type for all WebSocket messages
export type GameMessage =
  | JoinGameMessage
  | LeaveGameMessage
  | ClaimStateMessage
  | AttackStateMessage
  | GameStateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | StateClaimedMessage
  | StateAttackedMessage
  | ResourcesUpdatedMessage
  | ErrorMessage
  | StateSelectionMessage;
