import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="grid grid-rows-[60px_1fr_60px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <header className="w-full row-start-1 flex justify-end">
        <ThemeToggle />
      </header>

      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Card className="bg-card/80 backdrop-blur-sm border-border p-8 max-w-2xl">
          <CardContent className="p-0">
            <h1 className="text-4xl font-bold mb-4">Map Painter.io</h1>
            <p className="text-xl text-card-foreground/80 mb-8">
              A real-time multiplayer map painting game
            </p>

            <div className="flex gap-4 items-center flex-col sm:flex-row">
              <Button asChild size="lg">
                <Link href="/map">Play Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a
                  href="https://github.com/your-username/map-painter-io"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-muted-foreground">
        <a
          className="flex items-center gap-2 hover:text-foreground transition-colors"
          href="#"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          How to Play
        </a>
        <a
          className="flex items-center gap-2 hover:text-foreground transition-colors"
          href="#"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          About
        </a>
        <Button
          asChild
          variant="link"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/map">
            <div className="flex items-center gap-2">
              <Image
                aria-hidden
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
              />
              Go to Map →
            </div>
          </Link>
        </Button>
      </footer>
    </div>
  );
}
