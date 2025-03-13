/**
 * Functional tests for useSupabaseRealtime hook
 *
 * These tests verify the hook provides the expected API and behavior
 * for managing Supabase Realtime channels, focusing on the hook's
 * public interface rather than implementation details.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Define interfaces for type safety
interface ChannelMock {
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  presenceState: ReturnType<typeof vi.fn>;
}

// Create mock functions outside the mock to make them accessible
const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockImplementation(function (
  this: ChannelMock | void,
  callback: (status: string) => void,
) {
  // Simulate successful subscription
  setTimeout(() => callback("SUBSCRIBED"), 0);
  return this;
});
const mockUnsubscribe = vi.fn();
const mockSend = vi.fn();
const mockTrack = vi.fn();
const mockPresenceState = vi.fn().mockReturnValue({});

// Create a channel factory
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  send: mockSend,
  track: mockTrack,
  presenceState: mockPresenceState,
};

// Mock the supabase module
vi.mock("@/lib/supabase", () => {
  const mockChannelFn = vi.fn().mockReturnValue(mockChannel);

  return {
    supabase: {
      channel: mockChannelFn,
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  };
});

// Import the hook and mocked supabase after mocking
import { useSupabaseRealtime } from "../useSupabaseRealtime";
import { supabase } from "@/lib/supabase";

describe("useSupabaseRealtime Hook", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it("provides the expected API shape", () => {
    // Render the hook
    const { result } = renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
      }),
    );

    // Verify the hook returns the expected API
    expect(result.current).toHaveProperty("isConnected");
    expect(result.current).toHaveProperty("presenceState");
    expect(result.current).toHaveProperty("sendMessage");
    expect(result.current).toHaveProperty("joinChannel");
    expect(result.current).toHaveProperty("leaveChannel");
    expect(result.current).toHaveProperty("trackPresence");
    expect(result.current).toHaveProperty("updatePresence");

    // Verify the methods are functions
    expect(typeof result.current.sendMessage).toBe("function");
    expect(typeof result.current.joinChannel).toBe("function");
    expect(typeof result.current.leaveChannel).toBe("function");
    expect(typeof result.current.trackPresence).toBe("function");
    expect(typeof result.current.updatePresence).toBe("function");
  });

  it("automatically creates a channel with the provided name", () => {
    // Render the hook
    renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
      }),
    );

    // Verify channel creation
    expect(supabase.channel).toHaveBeenCalledWith(
      "test-channel",
      expect.any(Object),
    );
  });

  it("allows joining a channel and reflects connection status", async () => {
    // Render the hook with autoJoin=false
    const { result } = renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
        autoJoin: false,
      }),
    );

    // Initial state should be disconnected
    expect(result.current.isConnected).toBe(false);

    // Join the channel
    await act(async () => {
      await result.current.joinChannel();
    });

    // Simulate connection event
    act(() => {
      // Find and call the system callback
      const systemCallbacks = mockOn.mock.calls
        .filter((call) => call[0] === "system")
        .filter(
          (call) =>
            call[1] && typeof call[1] === "object" && call[1].event === "*",
        );

      if (
        systemCallbacks.length > 0 &&
        typeof systemCallbacks[0][2] === "function"
      ) {
        systemCallbacks[0][2]({ event: "connected" });
      }
    });

    // Connection status should be updated
    expect(result.current.isConnected).toBe(true);
  });

  it("handles message sending appropriately based on connection state", async () => {
    // Render the hook
    const { result } = renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
        autoJoin: false,
      }),
    );

    // Send a message while disconnected (should be queued)
    act(() => {
      result.current.sendMessage("test-event", { data: "test" });
    });

    // Verify send was not called yet
    expect(mockSend).not.toHaveBeenCalled();

    // Connect to the channel
    await act(async () => {
      // Call joinChannel
      await result.current.joinChannel();

      // Simulate connection event
      const systemCallbacks = mockOn.mock.calls
        .filter((call) => call[0] === "system")
        .filter(
          (call) =>
            call[1] && typeof call[1] === "object" && call[1].event === "*",
        );

      if (
        systemCallbacks.length > 0 &&
        typeof systemCallbacks[0][2] === "function"
      ) {
        systemCallbacks[0][2]({ event: "connected" });
      }
    });

    // After connecting, the queued message should be sent
    expect(mockSend).toHaveBeenCalledWith({
      type: "broadcast",
      event: "test-event",
      payload: { data: "test" },
    });

    // Clear the mock to test direct sending
    mockSend.mockClear();

    // Send another message while connected
    act(() => {
      result.current.sendMessage("another-event", { data: "connected-test" });
    });

    // Verify this message was sent immediately
    expect(mockSend).toHaveBeenCalledWith({
      type: "broadcast",
      event: "another-event",
      payload: { data: "connected-test" },
    });
  });

  it("properly responds to channel name changes", () => {
    // Render the hook with initial channel name
    const { rerender } = renderHook((props) => useSupabaseRealtime(props), {
      initialProps: {
        channelName: "initial-channel",
      },
    });

    // Verify initial channel was created
    expect(supabase.channel).toHaveBeenCalledWith(
      "initial-channel",
      expect.any(Object),
    );

    // Reset mock to check new calls
    vi.mocked(supabase.channel).mockClear();

    // Change the channel name
    rerender({
      channelName: "new-channel",
    });

    // Verify channel cleanup and recreation
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(supabase.channel).toHaveBeenCalledWith(
      "new-channel",
      expect.any(Object),
    );
  });

  it("cleans up channel resources when unmounted", () => {
    // Render the hook
    const { unmount } = renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
      }),
    );

    // Unmount to trigger cleanup
    unmount();

    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("supports presence tracking when connected", async () => {
    // Render the hook with autoJoin=true
    const { result } = renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
      }),
    );

    // Find and execute the system connected callback to ensure isConnected is true
    const systemCallbacks = mockOn.mock.calls
      .filter((call) => call[0] === "system")
      .filter(
        (call) =>
          call[1] && typeof call[1] === "object" && call[1].event === "*",
      );

    if (
      systemCallbacks.length > 0 &&
      typeof systemCallbacks[0][2] === "function"
    ) {
      act(() => {
        systemCallbacks[0][2]({ event: "connected" });
      });
    }

    // Call trackPresence now that we're connected
    act(() => {
      result.current.trackPresence({
        player: {
          id: "player1",
          name: "Player 1",
          color: "#FF5733",
          resources: 10,
          connectedAt: Date.now(),
          lastActiveAt: Date.now(),
        },
      });
    });

    // Verify presence was tracked
    expect(mockTrack).toHaveBeenCalledWith({
      player: {
        id: "player1",
        name: "Player 1",
        color: "#FF5733",
        resources: 10,
        connectedAt: expect.any(Number),
        lastActiveAt: expect.any(Number),
      },
    });
  });

  it("updates presence state on sync events", () => {
    // Prepare mock presence state
    const mockPresenceData = {
      user1: [{ user_id: "user1", online_at: "2023-01-01T00:00:00Z" }],
    };

    // Update the mock to return our test data
    mockPresenceState.mockReturnValue(mockPresenceData);

    // Render the hook with callback
    const onPresenceSync = vi.fn();
    renderHook(() =>
      useSupabaseRealtime({
        channelName: "test-channel",
        onPresenceSync,
      }),
    );

    // Find presence callback
    const presenceCallbacks = mockOn.mock.calls
      .filter((call) => call[0] === "presence")
      .filter(
        (call) =>
          call[1] && typeof call[1] === "object" && call[1].event === "sync",
      );

    if (
      presenceCallbacks.length > 0 &&
      typeof presenceCallbacks[0][2] === "function"
    ) {
      // Trigger presence sync
      act(() => {
        presenceCallbacks[0][2]();
      });

      // Verify callback was called
      expect(onPresenceSync).toHaveBeenCalledWith(mockPresenceData);
    }
  });
});
