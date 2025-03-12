# Map Painter .io

A real-time multiplayer browser game where players claim and attack regions on a map to conquer territories. Inspired by Risk and Territorial.io, this game combines strategic gameplay with real-time interaction.

## Game Concept

Players start with one random state and 10 resources. The goal is to conquer the entire map by:

- Claiming neutral states (costs 5 resources)
- Attacking and capturing enemy states (costs 10+ resources)
- Managing resources that accumulate over time (1 per owned state every 5 seconds)

A player wins by controlling 100% of the map regions.

## Features

- **Interactive Map System**: Click regions to claim or attack
- **Strategic Combat**: Attack success depends on adjacency strength and resources
- **Real-Time Updates**: Instant feedback on map changes via WebSockets
- **Multiple Game Instances**: Join or create separate game rooms
- **Resource Management**: Strategic decision-making on when to expand or attack

## Technology Stack

- **Framework**: Next.js 15 (using app router)
- **Language**: TypeScript
- **Frontend**:
  - React 19
  - PixiJS 8.x for map rendering
  - Redux Toolkit for state management
  - Shadcn/ui components
- **Backend**:
  - WebSocket server (`ws` library)
  - Vercel KV for data storage
- **Styling**: Tailwind CSS
- **Testing**:
  - Vitest for unit tests
  - Playwright for E2E tests

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or later recommended)
- npm (v9 or later)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/map-painter-io.git
cd map-painter-io

# Install dependencies
npm install
```

### Development

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Building for Production

```bash
# Create production build
npm run build

# Start production server
npm run start
```

## Testing

The project includes both unit tests and end-to-end tests:

```bash
# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e
```

### Test Structure

- **Unit Tests**: Located in `src/tests/`
- **E2E Tests**: Located in `e2e/`
- **Test Setup**: Configuration in `vitest.config.ts` and `playwright.config.ts`

## Project Structure

```
map-painter-io/
├── src/
│   ├── app/                  # Next.js app router and game routes
│   ├── components/           # UI & game components
│   ├── config/               # Game rules and map configuration
│   ├── lib/                  # Utility functions and game logic
│   ├── server/               # WebSocket server and game instances
│   ├── store/                # Redux state management
│   ├── types/                # TypeScript type definitions
│   ├── public/               # Static assets (GeoJSON maps)
│   └── tests/                # Unit tests
├── e2e/                      # Playwright end-to-end tests
└── ... (config files)
```

## Game Mechanics

### Map System

- Uses GeoJSON for USA states
- Regions have properties: ID, ownership, color, and adjacency
- Players interact by clicking to claim/attack regions

### Combat System

- **Attacker Strength** = Number of adjacent states owned + extra resources spent
- **Defender Strength** = Number of adjacent states owned
- Attack succeeds if Attacker Strength > Defender Strength

### Resource System

- +1 resource per owned state every 5 seconds
- Claiming neutral state: 5 resources
- Attacking enemy state: 10 resources base + optional extra

## Future Roadmap

- [ ] Implement full 50-state map
- [ ] Add defensive upgrades
- [ ] Introduce alliances system
- [ ] Create public lobbies and matchmaking
- [ ] Mobile responsive design

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
