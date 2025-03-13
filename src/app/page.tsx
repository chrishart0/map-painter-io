"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DirectGameComponent } from "@/components/DirectGameComponent";
import { RealtimeTest } from "@/components/RealtimeTest";
import { GameStatus } from "@/components/GameStatus";
import { GameRealtimeProvider } from "@/lib/contexts/GameRealtimeContext";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen p-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <h1 className="text-2xl font-bold mb-6">Map Painter.io</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DirectGameComponent />
        <RealtimeTest />
      </div>

      <div className="grid p-4 gap-4">
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
          <GameRealtimeProvider>
            <GameStatus />
          </GameRealtimeProvider>

          <Card className="bg-card/80 backdrop-blur-sm border-border p-8 max-w-2xl">
            <CardContent className="p-0">
              <h2 className="text-2xl font-semibold mb-4">
                About Map Painter.io
              </h2>
              <p className="mb-4">
                Welcome to Map Painter.io, a real-time multiplayer game where
                you compete with other players to conquer territory on a map!
              </p>
              <p className="mb-4">
                Claim neutral territories and attack enemy-controlled regions to
                expand your influence. Each territory you control generates
                resources that can be used for more claims and attacks.
              </p>
              <p>
                Play with friends or join a public game and start conquering!
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </main>
  );
}
