import MapWrapper from "@/components/Map/MapWrapper";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GameStatus } from "@/components/GameStatus";
import { GameResourceCounter } from "@/components/GameResourceCounter";

export const metadata = {
  title: "Map Painter.io - Interactive Map",
  description: "Interactive map for Map Painter.io game",
};

export default function MapPage() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex justify-between items-center p-4 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Map Painter.io</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Select states to claim them. Click on a state to select or deselect
            it.
          </p>
          <Button variant="ghost" size="sm" asChild className="ml-4">
            <Link href="/" className="flex items-center gap-1 text-xs">
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
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M5 12h14" />
              </svg>
              Home
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden md:flex">
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
              className="mr-1"
            >
              <path d="M3 3v18h18" />
              <path d="m3 9 6-6 4 8 5-5 3 3" />
            </svg>
            Stats
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <GameStatus />
        <GameResourceCounter />
        <MapWrapper width={1000} height={600} />
      </main>
    </div>
  );
}
