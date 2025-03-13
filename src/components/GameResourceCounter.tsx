"use client";

/**
 * GameResourceCounter Component
 *
 * Displays the current player's resources in a visually appealing way.
 * This component is used on the map page to show resource information.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function GameResourceCounter() {
  const [resources, setResources] = useState<number>(10); // Default starting resources

  useEffect(() => {
    // Simulate resource generation over time
    const interval = setInterval(() => {
      setResources((prev) => prev + 1);
    }, 5000); // Add 1 resource every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-yellow-500"
          >
            <circle cx="12" cy="12" r="8" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <span className="font-bold">{resources}</span>
          <span className="text-xs text-muted-foreground">Resources</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default GameResourceCounter;
