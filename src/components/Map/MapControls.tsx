/**
 * MapControls Component
 *
 * This component provides UI controls for interacting with the map canvas.
 * It includes zoom controls, a reset button, and informational displays.
 */

import { Button } from "@/components/ui/button";
import { State } from "@/types/map";
import { Player } from "@/types/game";

interface MapControlsProps {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  resetView: () => void;
  hoveredState: string | null;
  states: State[];
  selectedStates: Set<string>;
  showTooltip: boolean;
  playerSelections?: Record<string, string[]>;
  players?: Player[];
}

export default function MapControls({
  zoomLevel,
  setZoomLevel,
  resetView,
  hoveredState,
  states,
  selectedStates,
  showTooltip,
  playerSelections = {},
  players = [],
}: MapControlsProps) {
  // Helper to find state name from ID
  const getStateName = (stateId: string) => {
    return states.find((s) => s.id === stateId)?.name || stateId;
  };

  // Get player name from ID
  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || "Unknown Player";
  };

  // Get player color from ID
  const getPlayerColor = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.color || "#888888";
  };

  // Count how many players have selected the hovered state
  const getHoveredStateSelectors = () => {
    if (!hoveredState) return [];

    return Object.entries(playerSelections)
      .filter(([_, stateIds]) => stateIds.includes(hoveredState))
      .map(([playerId]) => ({
        id: playerId,
        name: getPlayerName(playerId),
        color: getPlayerColor(playerId),
      }));
  };

  const hoveredStateSelectors = hoveredState ? getHoveredStateSelectors() : [];

  return (
    <>
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
          onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
          aria-label="Zoom out"
          title="Zoom out"
        >
          -
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
          onClick={resetView}
          aria-label="Reset view"
          title="Reset view"
        >
          Reset
        </Button>
      </div>

      {/* Control Info */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border text-xs">
        <span className="text-muted-foreground">
          Right-click + drag to pan • Mouse wheel to zoom
        </span>
      </div>

      {/* State tooltip */}
      {hoveredState && showTooltip && (
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border">
          <strong className="text-foreground">
            {getStateName(hoveredState)}
          </strong>
          {selectedStates.has(hoveredState) && (
            <span className="ml-2 text-primary">(Selected)</span>
          )}

          {/* Show other players who selected this state */}
          {hoveredStateSelectors.length > 0 && (
            <div className="mt-1 text-xs">
              <p className="text-muted-foreground">Selected by:</p>
              <ul className="mt-1">
                {hoveredStateSelectors.map((player) => (
                  <li key={player.id} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span>{player.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Selected count */}
      {selectedStates.size > 0 && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border">
          <span className="text-foreground">
            Selected: {selectedStates.size}{" "}
            {selectedStates.size === 1 ? "state" : "states"}
          </span>
        </div>
      )}

      {/* Player selections legend */}
      {Object.keys(playerSelections).length > 0 && (
        <div className="absolute top-16 left-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border max-w-xs">
          <h3 className="text-sm font-medium mb-1">Player Selections</h3>
          <ul className="text-xs space-y-1">
            {Object.entries(playerSelections).map(([playerId, stateIds]) => (
              <li key={playerId} className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: getPlayerColor(playerId) }}
                />
                <span>
                  {getPlayerName(playerId)}: {stateIds.length} states
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
