# Map Painter .io Technical Architecture Specification

## Overview

Map Painter .io is a real-time multiplayer map game template built with Next.js 15 and React 19. The design prioritizes testability, maintainability, and extensibility. The project leverages modern tools and practices (including heavy AI-assisted development) to create a cutting-edge, scalable game platform.

## Technology Stack

- **Framework**: Next.js 15 (using the app router for full-stack capabilities)
- **Language**: TypeScript 5.4+ (modern features like `satisfies`)
- **Frontend**:
  - **React**: React 19 (concurrent rendering, new hooks like `useTransition`)
  - **Rendering**: PixiJS 8.x (modern 2D graphics library with WebGPU support)
  - **State Management**: Redux Toolkit 2.x + RTK Query
  - **Component Library**: Shadcn/ui (unstyled, Tailwind-based components)
- **Backend**:
  - **WebSocket**: `ws` integrated with a custom Next.js server
  - **Data Storage**: Vercel KV (in-memory speed with Redis compatibility)
- **Styling**: Tailwind CSS 3.4+
- **Testing**:
  - **Unit**: Vitest
  - **E2E**: Playwright
- **Tooling**:
  - **Linting**: ESLint 9.x (flat config)
  - **Formatting**: Prettier 3.x
  - **CI/CD**: GitHub Actions with Husky and lint-staged for pre-commit hooks

### Modern Choices Rationale

- **Vitest**: Optimized for speed with modern ESM support.
- **Playwright**: Superior cross-browser and WebSocket testing.
- **Vercel KV**: Scalable, serverless key-value storage that simplifies Redis integration.
- **ws**: A lightweight WebSocket library that works seamlessly with Next.js.
- **ESLint 9.x**: Offers a simpler, flat configuration for maintainability.

## Repository Structure

```
map-painter-io/
├── src/
│   ├── app/                  # Next.js app router and game routes
│   ├── components/           # Reusable UI & game-specific components
│   ├── config/              # Game rules and map loader configuration
│   ├── lib/                 # Utility functions and core game logic
│   ├── server/              # Server-side logic (game instances, WebSocket server, storage adapter)
│   ├── store/               # Redux Toolkit slices and RTK Query API
│   ├── types/               # Shared TypeScript types
│   ├── public/              # Static assets (GeoJSON maps)
│   └── tests/               # Unit and integration tests
├── e2e/                     # Playwright end-to-end tests
├── .github/                 # CI/CD workflows (GitHub Actions)
├── .husky/                  # Pre-commit hooks configuration
├── Config files             # ESLint, Prettier, Next.js, Tailwind, Vitest, etc.
└── README.md                # Project guide and high-level documentation
```

## Key Components

### Data Models

- **Player**: Contains `id`, `name`, `color`, `resources`, and a list of `ownedStates`
- **State**: Represents each game state with an `id`, an optional `ownerId`, a `color`, and its neighboring states
- **GameInstance**: Aggregates the current game state, including maps of states and players, along with a start timestamp

### Client Architecture

- **Map Rendering**: Handled by a PixiJS-powered `MapCanvas` component to render interactive maps
- **State Synchronization**: Achieved with Redux Toolkit and RTK Query through WebSocket connections for real-time updates

### Server Architecture

- **Custom Next.js Server**: Integrates WebSocket support using `ws` for handling real-time communications
- **Storage Layer**: Utilizes Vercel KV for managing game state, offering a scalable alternative to traditional in-memory stores
- **WebSocket Protocol**: Defines structured messages for actions such as joining a game and updating state (e.g., `{ "type": "join", "name": "Alice", "instance": "game123" }`)

## Final Notes

This architecture provides a modern, maintainable, and scalable plan for developing a real-time multiplayer .io game. The design ensures robust integration between frontend, backend, and testing layers, making it a solid foundation for further expansion and customization.
