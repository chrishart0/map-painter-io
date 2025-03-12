/**
 * MapControls Component
 *
 * This component provides UI controls for interacting with the map canvas.
 * It includes zoom controls, a reset button, and informational displays.
 */

import { Button } from "@/components/ui/button";
import { State } from "@/types/map";

interface MapControlsProps {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  resetView: () => void;
  hoveredState: string | null;
  states: State[];
  selectedStates: Set<string>;
  showTooltip: boolean;
}

export default function MapControls({
  zoomLevel,
  setZoomLevel,
  resetView,
  hoveredState,
  states,
  selectedStates,
  showTooltip,
}: MapControlsProps) {
  // Helper to find state name from ID
  const getStateName = (stateId: string) => {
    return states.find((s) => s.id === stateId)?.name || stateId;
  };

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
    </>
  );
}
