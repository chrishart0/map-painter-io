import MapWrapper from "@/components/Map/MapWrapper";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata = {
  title: "Map Painter.io - Interactive Map",
  description: "Interactive map for Map Painter.io game",
};

export default function MapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Map Painter.io</h1>
          <p className="text-muted-foreground mt-2">
            Select states to claim them. Click on a state to select or deselect
            it.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl mx-auto">
        {/* The height prop establishes aspect ratio, actual dimensions are responsive */}
        <MapWrapper width={1000} height={600} />
      </div>
    </div>
  );
}
