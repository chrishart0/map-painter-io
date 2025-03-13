"use client";

/**
 * Game State Monitor Component
 *
 * This component demonstrates how to use the real-time hooks to monitor game state changes.
 * It displays the current map states and players for a given game instance.
 */

import { useGameRealtime } from "@/lib/hooks/useGameRealtime";

interface GameStateMonitorProps {
  gameInstanceId: string;
}

export default function GameStateMonitor({
  gameInstanceId,
}: GameStateMonitorProps) {
  const { mapStates, players, isLoading, error } = useGameRealtime({
    gameInstanceId,
    onMapStateChange: (states) => {
      console.log("Map states updated:", states);
    },
    onPlayerChange: (players) => {
      console.log("Players updated:", players);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">
          Game State Monitor
        </h2>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-white">Loading game state...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">
          Game State Monitor
        </h2>
        <div className="bg-red-900 text-white p-4 rounded-md">
          <h3 className="font-bold">Error</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Game State Monitor</h2>

      {/* Players Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Players ({players.length})
        </h3>
        {players.length === 0 ? (
          <p className="text-gray-400">No players in this game yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-gray-700 p-3 rounded-md border-l-4"
                style={{ borderColor: player.color }}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-white">{player.name}</h4>
                  <span className="bg-gray-600 px-2 py-1 rounded text-sm">
                    {player.resources} resources
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Connected: {new Date(player.connectedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map States Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Map States ({mapStates.length})
        </h3>
        {mapStates.length === 0 ? (
          <p className="text-gray-400">No map states available.</p>
        ) : (
          <div className="overflow-auto max-h-60">
            <table className="min-w-full bg-gray-700 rounded-md overflow-hidden">
              <thead className="bg-gray-600">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    State ID
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Captured At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {mapStates.map((state) => {
                  const owner = players.find((p) => p.id === state.ownerId);
                  return (
                    <tr key={state.stateId}>
                      <td className="py-2 px-4 text-sm text-white">
                        {state.stateId}
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {owner ? (
                          <span
                            className="px-2 py-1 rounded text-white"
                            style={{ backgroundColor: owner.color + "80" }} // Add transparency
                          >
                            {owner.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">Neutral</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-300">
                        {new Date(state.capturedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
