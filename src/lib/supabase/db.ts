"use client";

/**
 * Supabase Database Utilities
 *
 * This file provides utility functions for interacting with the Supabase database.
 * It includes typed query helpers and common database operations for the game.
 */

import { supabase } from "../supabase";
import { GameInstance, Player } from "@/types/game";
import { PostgrestError } from "@supabase/supabase-js";

// Type for database operation results
export interface DbResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

// Database model types
export interface MapState {
  game_instance_id: string;
  state_id: string;
  owner_id: string | null;
  captured_at?: string;
}

export interface StateAdjacency {
  game_instance_id: string;
  state1: string;
  state2: string;
}

export interface GameEvent {
  id?: string;
  game_instance_id: string;
  player_id: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at?: string;
}

// Game Instances

/**
 * Create a new game instance
 */
export async function createGameInstance(
  name: string,
): Promise<DbResult<GameInstance>> {
  const { data, error } = await supabase
    .from("game_instances")
    .insert([{ name }])
    .select()
    .single();

  return { data, error };
}

/**
 * Get a game instance by ID
 */
export async function getGameInstance(
  id: string,
): Promise<DbResult<GameInstance>> {
  const { data, error } = await supabase
    .from("game_instances")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

/**
 * List active game instances
 */
export async function listGameInstances(): Promise<DbResult<GameInstance[]>> {
  const { data, error } = await supabase
    .from("game_instances")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return { data, error };
}

// Players

/**
 * Add a player to a game instance
 */
export async function addPlayer(
  gameInstanceId: string,
  name: string,
  color: string,
  userId?: string,
): Promise<DbResult<Player>> {
  const { data, error } = await supabase
    .from("players")
    .insert([
      {
        game_instance_id: gameInstanceId,
        name,
        color,
        user_id: userId,
      },
    ])
    .select()
    .single();

  return { data, error };
}

/**
 * Get a player by ID
 */
export async function getPlayer(id: string): Promise<DbResult<Player>> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

/**
 * List players in a game instance
 */
export async function listPlayers(
  gameInstanceId: string,
): Promise<DbResult<Player[]>> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("game_instance_id", gameInstanceId)
    .order("connected_at", { ascending: true });

  return { data, error };
}

/**
 * Update player resources
 */
export async function updatePlayerResources(
  playerId: string,
  resources: number,
): Promise<DbResult<Player>> {
  const { data, error } = await supabase
    .from("players")
    .update({ resources })
    .eq("id", playerId)
    .select()
    .single();

  return { data, error };
}

// Map States

/**
 * Initialize map states for a game instance
 */
export async function initializeMapStates(
  gameInstanceId: string,
  stateIds: string[],
): Promise<DbResult<MapState[]>> {
  const mapStates = stateIds.map((stateId) => ({
    game_instance_id: gameInstanceId,
    state_id: stateId,
    owner_id: null, // Start as neutral
  }));

  const { data, error } = await supabase
    .from("map_states")
    .insert(mapStates)
    .select();

  return { data, error };
}

/**
 * Get all map states for a game instance
 */
export async function getMapStates(
  gameInstanceId: string,
): Promise<DbResult<MapState[]>> {
  const { data, error } = await supabase
    .from("map_states")
    .select("*")
    .eq("game_instance_id", gameInstanceId);

  return { data, error };
}

/**
 * Update the ownership of a state
 */
export async function updateStateOwnership(
  gameInstanceId: string,
  stateId: string,
  ownerId: string | null,
): Promise<DbResult<MapState>> {
  const { data, error } = await supabase
    .from("map_states")
    .update({
      owner_id: ownerId,
      captured_at: new Date().toISOString(),
    })
    .eq("game_instance_id", gameInstanceId)
    .eq("state_id", stateId)
    .select()
    .single();

  return { data, error };
}

// Adjacency

/**
 * Initialize adjacency list for a game instance
 */
export async function initializeAdjacency(
  gameInstanceId: string,
  adjacencyList: { state1: string; state2: string }[],
): Promise<DbResult<StateAdjacency[]>> {
  const adjacencyRecords = adjacencyList.map(({ state1, state2 }) => ({
    game_instance_id: gameInstanceId,
    state1,
    state2,
  }));

  const { data, error } = await supabase
    .from("adjacency")
    .insert(adjacencyRecords)
    .select();

  return { data, error };
}

/**
 * Get adjacent states for a given state
 */
export async function getAdjacentStates(
  gameInstanceId: string,
  stateId: string,
): Promise<DbResult<string[]>> {
  const { data, error } = await supabase
    .from("adjacency")
    .select("*")
    .eq("game_instance_id", gameInstanceId)
    .or(`state_id_1.eq.${stateId},state_id_2.eq.${stateId}`);

  if (error) {
    return { data: null, error };
  }

  // Extract the adjacent state IDs
  const adjacentStateIds = data.map((record) =>
    record.state_id_1 === stateId ? record.state_id_2 : record.state_id_1,
  );

  return { data: adjacentStateIds, error: null };
}

// Game Events

/**
 * Log a game event
 */
export async function logGameEvent(
  gameInstanceId: string,
  playerId: string | null,
  eventType: string,
  eventData: Record<string, unknown>,
): Promise<DbResult<GameEvent>> {
  const { data, error } = await supabase
    .from("game_events")
    .insert({
      game_instance_id: gameInstanceId,
      player_id: playerId,
      event_type: eventType,
      event_data: eventData,
    })
    .select()
    .single();

  return { data, error };
}
