"use client";

/**
 * Supabase Client
 *
 * This file creates and exports a Supabase client instance for use throughout the application.
 * It also includes initialization and connection testing to ensure Supabase is properly configured.
 */

import { createClient } from "@supabase/supabase-js";

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log availability of required environment variables
console.log("Supabase URL available:", !!supabaseUrl);
console.log("Supabase Anon Key available:", !!supabaseAnonKey);

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY are defined in your .env.local file.",
  );
}

/**
 * Create a single Supabase client for the entire app
 *
 * This client is configured with:
 * - Auth persistence and auto-refresh
 * - Custom headers for app identification
 * - Default Realtime options
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      "x-application-name": "map-painter-io",
    },
  },
  // Realtime configuration to ensure proper connection
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Test the Supabase connection
 *
 * This self-executing function tests both the authentication
 * and Realtime connections to ensure everything is working.
 */
(async function testSupabaseConnection() {
  try {
    console.log("Testing Supabase connection...");

    // Test authentication
    const { data, error } = await supabase.auth.getSession();

    // Check that the data is not null
    if (!data) {
      throw new Error("No session data returned from Supabase");
    }

    if (error) {
      throw new Error(`Auth error: ${error.message}`);
    }

    console.log("Supabase authentication initialized successfully");

    // Test Realtime connection
    testRealtimeConnection();
  } catch (error) {
    console.error("Exception during Supabase initialization:", error);
  }
})();

/**
 * Test the Realtime connection by creating a temporary channel
 */
function testRealtimeConnection() {
  try {
    const testChannel = supabase.channel("test-connection", {
      config: {
        broadcast: { self: true },
      },
    });

    const connectionTimeout: NodeJS.Timeout = setTimeout(() => {
      console.warn("Realtime connection test timed out after 5 seconds");
      try {
        testChannel.unsubscribe();
      } catch (e) {
        // Ignore errors during cleanup
        console.error("Error during cleanup:", e);
      }
    }, 5000);

    // Listen for system events
    testChannel.on("system", { event: "*" }, (status) => {
      console.log("Test channel system event:", status);
      if (status.event === "connected") {
        console.log("Realtime connection successful!");
      }
    });

    // Subscribe to the channel
    testChannel.subscribe((status) => {
      console.log("Test channel subscription status:", status);

      // Unsubscribe after successful test
      if (status === "SUBSCRIBED") {
        console.log("Test subscription successful, cleaning up");
        clearTimeout(connectionTimeout);

        setTimeout(() => {
          testChannel.unsubscribe();
        }, 1000);
      }
    });
  } catch (error) {
    console.error("Error testing Realtime connection:", error);
  }
}
