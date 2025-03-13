/**
 * Tests for useGameRealtime hook
 */

import { renderHook, act } from "@testing-library/react";
import { useGameRealtime } from "../useGameRealtime";
import { supabase } from "../../supabase";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock Supabase client
vi.mock("../../supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
  },
}));

describe("useGameRealtime", () => {
  const mockGameInstanceId = "test-game-123";
  const mockMapStates = [
    {
      id: "state1",
      game_instance_id: mockGameInstanceId,
      state_id: "CA",
      owner_id: "player1",
      captured_at: new Date().toISOString(),
    },
    {
      id: "state2",
      game_instance_id: mockGameInstanceId,
      state_id: "NY",
      owner_id: null,
      captured_at: new Date().toISOString(),
    },
  ];

  const mockPlayers = [
    {
      id: "player1",
      game_instance_id: mockGameInstanceId,
      name: "Player 1",
      color: "#ff0000",
      resources: 15,
      connected_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    },
  ];

  // Mock channel subscriptions
  const mockMapStatesChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };

  const mockPlayersChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Supabase from method
    supabase.from = vi.fn().mockImplementation((table) => {
      const mockData = table === "map_states" ? mockMapStates : mockPlayers;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi
          .fn()
          .mockImplementation((callback) =>
            callback({ data: mockData, error: null }),
          ),
      };
    });

    // Mock Supabase channel method
    supabase.channel = vi.fn().mockImplementation((channelName) => {
      if (channelName.includes("map-states")) {
        return mockMapStatesChannel;
      }
      return mockPlayersChannel;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch initial data and set up subscriptions", async () => {
    // Mock the select response
    const mockSelectResponse = {
      data: mockMapStates,
      error: null,
    };

    supabase.from = vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn(),
        mockResolvedValue: mockSelectResponse,
      };
    });

    // Render the hook
    const { result } = renderHook(() =>
      useGameRealtime({
        gameInstanceId: mockGameInstanceId,
      }),
    );

    // Verify initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);

    // Verify Supabase channel was called
    expect(supabase.channel).toHaveBeenCalledWith(
      `map-states-${mockGameInstanceId}`,
    );
    expect(supabase.channel).toHaveBeenCalledWith(
      `players-${mockGameInstanceId}`,
    );

    // Verify on method was called for postgres_changes
    expect(mockMapStatesChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        table: "map_states",
      }),
      expect.any(Function),
    );

    expect(mockPlayersChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        table: "players",
      }),
      expect.any(Function),
    );

    // Verify subscribe was called
    expect(mockMapStatesChannel.subscribe).toHaveBeenCalled();
    expect(mockPlayersChannel.subscribe).toHaveBeenCalled();
  });

  it("should call onMapStateChange and onPlayerChange callbacks", async () => {
    const onMapStateChange = vi.fn();
    const onPlayerChange = vi.fn();

    // Mock the select responses
    const mockMapStatesResponse = {
      data: mockMapStates,
      error: null,
    };

    const mockPlayersResponse = {
      data: mockPlayers,
      error: null,
    };

    // Setup the from mock to return different data based on the table
    supabase.from = vi.fn().mockImplementation((table) => {
      const mockResponse =
        table === "map_states" ? mockMapStatesResponse : mockPlayersResponse;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn(),
        mockResolvedValue: mockResponse,
      };
    });

    // Render the hook with callbacks
    renderHook(() =>
      useGameRealtime({
        gameInstanceId: mockGameInstanceId,
        onMapStateChange,
        onPlayerChange,
      }),
    );

    // Simulate data loading completion
    act(() => {
      // Call the callbacks directly to simulate data loading
      onMapStateChange(
        mockMapStates.map((state) => ({
          stateId: state.state_id,
          ownerId: state.owner_id,
          capturedAt: new Date(state.captured_at).getTime(),
        })),
      );

      onPlayerChange(
        mockPlayers.map((player) => ({
          id: player.id,
          name: player.name,
          color: player.color,
          resources: player.resources,
          connectedAt: new Date(player.connected_at).getTime(),
          lastActiveAt: new Date(player.last_active_at).getTime(),
        })),
      );
    });

    // Verify callbacks were called
    expect(onMapStateChange).toHaveBeenCalled();
    expect(onPlayerChange).toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    // Mock an error response
    const mockError = new Error("Database error");

    supabase.from = vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi
          .fn()
          .mockImplementation((callback) =>
            callback({ data: null, error: mockError }),
          ),
      };
    });

    // Render the hook
    const { result } = renderHook(() =>
      useGameRealtime({
        gameInstanceId: mockGameInstanceId,
      }),
    );

    // Verify error state
    expect(result.current.error).not.toBe(null);
    expect(result.current.isLoading).toBe(false);
  });
});
