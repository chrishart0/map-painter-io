# Map Painter .io Roadmap & Actionable User Stories (Merged with WebSocket Functionality)

## Sprint 1: Project Setup & Basic Map Rendering (Completed)

### ✅ ~~User Story 1: Repository & Project Initialization~~

- **Title:** Set up repository structure and initialize Next.js project
- **Description:** As a developer, I want a well-organized Next.js 15 project with TypeScript, ESLint, Prettier, and Tailwind CSS configured so that I have a solid foundation for development.
- **Acceptance Criteria:**
  - Next.js project is initialized with the app router.
  - Repository structure follows the defined plan (e.g., `src/app`, `src/components`, etc.).
  - ESLint, Prettier, and Tailwind CSS are properly configured.
- **Tasks:**
  - [x] Initialize a new Next.js 15 project with TypeScript.
  - [x] Create the folder structure (`src/app`, `src/components`, `src/config`, `src/lib`, etc.).
  - [x] Set up ESLint, Prettier, and Tailwind CSS configurations.
  - [x] Commit the initial project setup.

### ✅ ~~User Story 2: Basic Map Rendering~~

- **Title:** Render a simplified GeoJSON map on HTML5 Canvas
- **Description:** As a player, I want to see a basic map of 12-15 states rendered on an HTML5 Canvas so that I can start interacting with the game.
- **Acceptance Criteria:**
  - A GeoJSON file with a subset of US states is loaded from the `public` folder.
  - States are rendered as polygons with a neutral color.
  - Each state is clickable.
- **Tasks:**
  - [x] Add a GeoJSON file into the `public` folder.
  - [x] Implement canvas rendering logic to draw the GeoJSON polygons.
  - [x] Add click event listeners for each state.
  - [x] Verify that the map renders correctly and is interactive.
  - [x] Mobile optimized.
  - [x] Supports scaling.
  - [x] Supports selecting a state to see details.

---

## Sprint 2: Backend Setup & Real-Time Infrastructure

_Purpose: Establish the Supabase backend and real-time subscriptions to support subsequent real-time game mechanics._

### User Story: Set up Supabase and Real-Time Subscriptions

- **Title:** Configure Supabase for data storage and real-time updates
- **Description:** As a developer, I want to set up Supabase with the necessary database schema and enable real-time subscriptions so that the game can handle persistent data and real-time updates.
- **Acceptance Criteria:**
  - Supabase project is created and environment variables are configured.
  - Database tables (`game_instances`, `players`, `map_states`, `adjacency`) are defined.
  - Real-time subscriptions are enabled for `map_states` and `players`.
  - Supabase client is initialized in the project with real-time support.
- **Tasks:**
  - [x] Create a Supabase project and obtain API keys.
  - [x] Configure environment variables in `.env.local` for Supabase.
  - [x] Define the database schema in Supabase:
    - `game_instances`: Tracks unique game rooms.
    - `players`: Stores player data per instance.
    - `map_states`: Tracks state ownership and resources.
    - `adjacency`: Defines state adjacency relationships.
  - [x] Enable real-time subscriptions for `map_states` and `players`.
  - [x] Implement the Supabase client in `src/lib/supabase.ts`.
  - [x] Create a real-time hook in `src/lib/hooks/useRealtimeChannel.ts`.

---

## Sprint 3: Core Mechanics – Claiming States & Resource Management

_Purpose: Implement state claiming with real-time updates using the Supabase backend._

### User Story: State Claiming Mechanism

- **Title:** Implement claiming of adjacent neutral states with real-time updates
- **Description:** As a player, I want to claim an adjacent neutral state by spending resources, and see the map update in real-time for all players.
- **Acceptance Criteria:**
  - Clicking a neutral state (adjacent to one of the player's states) triggers a claim.
  - Claiming costs 5 resources.
  - The claimed state changes color and updates in real-time across all players in the instance.
  - Resources increase by +1 per owned state every 5 seconds, broadcasted in real-time.
- **Tasks:**
  - [ ] Build a resource tracking system (starting at 10 resources, +1 per state every 5 seconds).
  - [ ] Implement an Edge Function (`claim_state.ts`) to:
    - Verify adjacency and neutral status.
    - Deduct 5 resources.
    - Update `map_states` in Supabase.
  - [ ] Implement a scheduled Edge Function (`update_resources.ts`) to increment resources every 5 seconds.
  - [ ] Update the UI to reflect real-time changes in resources and map states using the real-time hook.

---

## Sprint 4: Attack Mechanics & Strength Calculation

_Purpose: Add attack functionality with real-time synchronization._

### User Story: Attack Functionality

- **Title:** Enable players to attack enemy states with real-time outcomes
- **Description:** As a player, I want to attack an adjacent enemy state by spending resources, and see the outcome reflected in real-time for all players.
- **Acceptance Criteria:**
  - Attacks are only allowed on enemy-owned states adjacent to a player's state.
  - Attacks cost a base of 10 resources plus optional extra resources to boost strength.
  - Strengths are calculated (attacker: +1 per adjacent owned state and extra resources; defender: +1 per adjacent owned states).
  - On success, ownership switches; on failure, resources are deducted—both broadcasted in real-time.
- **Tasks:**
  - [ ] Implement an Edge Function (`attack_state.ts`) to:
    - Validate adjacency, enemy ownership, and resource availability.
    - Calculate attacker and defender strengths.
    - Update `map_states` in Supabase based on outcome.
  - [ ] Ensure real-time updates for attack outcomes via Supabase subscriptions.
  - [ ] Update the UI to reflect attack results in real-time.

---

## Sprint 5: Real-Time Multiplayer & Game Instances

_Purpose: Enable multiple game rooms with isolated real-time updates._

### User Story: Multiple Game Instances

- **Title:** Support concurrent game rooms with isolated real-time updates
- **Description:** As a player, I want to join or create a game instance (room) so I can play with a specific group, with real-time updates isolated to my instance.
- **Acceptance Criteria:**
  - Players can create or join a game room via a room code or lobby UI.
  - Each game instance maintains its own independent map state, players, and resources.
  - Real-time subscriptions are filtered by game instance ID.
- **Tasks:**
  - [ ] Design and implement a room creation/joining mechanism (e.g., Edge Function `join_instance.ts`).
  - [ ] Store instance-specific data in `game_instances` and link to `players` and `map_states`.
  - [ ] Modify real-time subscriptions to filter by `game_instance_id`.
  - [ ] Test instance isolation with multiple simulated players.

---

## Sprint 6: UI Enhancements & Player Feedback

_Purpose: Enhance the UI with real-time data and migrate map rendering to PixiJS._

### User Story: Enhanced Game UI & Player Statistics

- **Title:** Improve UI to display game stats and player information in real-time
- **Description:** As a player, I want to see my resource count, owned states, and a list of players with their scores in real-time, so I can track progress and game dynamics.
- **Acceptance Criteria:**
  - Map is rendered with PixiJS and updates in real-time.
  - UI displays current resource count and owned states in real-time.
  - A real-time player list shows names and state counts.
  - Win notifications appear when a player conquers all states, resetting after 5 seconds.
- **Tasks:**
  - [ ] Migrate map rendering from HTML5 Canvas to PixiJS in a `MapCanvas` component.
  - [ ] Subscribe `MapCanvas` to real-time `map_states` updates.
  - [ ] Build `PlayerStats` and `PlayerList` components subscribed to `players` updates.
  - [ ] Implement hover effects to highlight valid claim/attack targets.
  - [ ] Create a `WinNotification` component with real-time win condition detection and auto-reset.

---

## Sprint 7: Authentication & Persistent Storage

_Purpose: Add optional authentication and persistent data storage._

### User Story: Optional User Authentication with Clerk

- **Title:** Integrate Clerk for optional user authentication
- **Description:** As a player, I want the option to log in using Clerk for a personalized username and tracked metrics, or play as a guest.
- **Acceptance Criteria:**
  - Clerk authentication is integrated into the Next.js app.
  - Players can log in or continue as guests with default usernames.
  - Authenticated users have metrics linked to their Clerk ID.
- **Tasks:**
  - [ ] Install and configure the Clerk SDK in the project.
  - [ ] Wrap necessary routes/components with Clerk authentication.
  - [ ] Implement guest mode with default usernames.
  - [ ] Test login flow and user data handling.

### User Story: Persistent Data Storage with Supabase

- **Title:** Implement data persistence for game metrics
- **Description:** As a developer, I want to store game metrics and user data in Supabase so that I can analyze performance and ensure data durability.
- **Acceptance Criteria:**
  - User profiles, game sessions, and event logs are stored in Supabase.
  - Data is accessible for analytics.
- **Tasks:**
  - [ ] Create additional tables (`user_metrics`, `game_sessions`, `event_logs`) in Supabase.
  - [ ] Update Edge Functions to log game events (claims, attacks) to `event_logs`.
  - [ ] Verify data persistence with integration tests.

---

## Sprint 8: Testing, Optimization & Documentation

_Purpose: Ensure quality and prepare for deployment with real-time feature validation._

### User Story: Automated Testing & CI/CD Integration

- **Title:** Write tests for real-time functionality and optimize performance
- **Description:** As a developer, I want automated tests and CI/CD pipelines to ensure code quality, reliable real-time updates, and <1s latency.
- **Acceptance Criteria:**
  - Unit tests cover real-time hooks and Edge Functions.
  - End-to-end tests simulate multiplayer real-time interactions.
  - Performance optimizations achieve <1s latency for real-time updates.
- **Tasks:**
  - [ ] Write Vitest unit tests for `useRealtimeChannel.ts`, `claim_state.ts`, `attack_state.ts`.
  - [ ] Develop Playwright tests for multiplayer flows (e.g., claiming, attacking in real-time).
  - [ ] Configure GitHub Actions for linting, testing, and deployment.
  - [ ] Optimize real-time subscriptions and monitor latency.

### User Story: Final Documentation & Deployment Preparation

- **Title:** Complete project documentation and deployment configuration
- **Description:** As a developer, I want comprehensive documentation and clear deployment instructions for maintenance and scaling.
- **Acceptance Criteria:**
  - README.md includes real-time feature details.
  - Deployment instructions cover Supabase and Clerk configurations.
- **Tasks:**
  - [ ] Update README.md with project overview, real-time setup, and roadmap.
  - [ ] Document key modules (e.g., Supabase client, real-time hooks).
  - [ ] Provide deployment steps for Vercel, including environment variables.
  - [ ] Perform a final code review and cleanup.
