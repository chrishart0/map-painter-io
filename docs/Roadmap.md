# Map Painter .io Roadmap & Actionable User Stories

## Sprint 1: Project Setup & Basic Map Rendering

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

### ~~User Story 2: Basic Map Rendering~~

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
  - [x] Mobile optimized
  - [x] Supports scaling
  - [x] Supports selecting a state to see details

---

## Sprint 2: Core Mechanics – Claiming States & Resource Management

### User Story 3: State Claiming Mechanism

- **Title:** Implement claiming of adjacent neutral states
- **Description:** As a player, I want to claim an adjacent neutral state by spending resources so I can expand my territory.
- **Acceptance Criteria:**
  - Clicking a neutral state (adjacent to one of the player’s states) triggers a claim.
  - Claiming costs 5 resources.
  - The claimed state changes color to reflect the player's ownership.
- **Tasks:**
  - [ ] Build a resource tracking system (starting at 10 resources, with +1 per state every 5 seconds).
  - [ ] Implement logic to verify adjacency and neutral status before claiming.
  - [ ] Update the game state to reflect ownership and change the state color.
  - [ ] Update the UI to display the deducted resources.

---

## Sprint 3: Attack Mechanics & Strength Calculation

### User Story 4: Attack Functionality

- **Title:** Enable players to attack enemy states
- **Description:** As a player, I want to attack an adjacent enemy state by spending resources so that I can capture it.
- **Acceptance Criteria:**
  - Attacks are only allowed on enemy-owned states adjacent to a player’s state.
  - Attacks cost a base of 10 resources plus optional extra resources to boost strength.
  - Attacker and defender strengths are calculated (attacker gains +1 per adjacent owned state and per extra resources spent, defender’s strength equals its adjacent owned states).
  - On success, the target state’s ownership switches; on failure, resources are still deducted.
- **Tasks:**
  - [ ] Create attack validation logic (checking adjacency, enemy ownership, and resource availability).
  - [ ] Implement strength calculation for both attacker and defender.
  - [ ] Update the game state and UI based on attack outcomes.
  - [ ] Deduct the appropriate resources after an attack attempt.

---

## Sprint 4: Real-Time Multiplayer & Game Instances

### User Story 5: Real-Time Updates via WebSockets

- **Title:** Integrate WebSocket for real-time game state synchronization
- **Description:** As a player, I want to see real-time updates of map changes and resource counts so that my game is always in sync with other players.
- **Acceptance Criteria:**
  - A WebSocket connection is established between client and server using the `ws` library.
  - Map changes (claims and attacks) are broadcast to all players in a game instance.
  - Resource updates are broadcast every 5 seconds.
- **Tasks:**
  - [ ] Set up a WebSocket server within the Next.js custom server.
  - [ ] Implement broadcast functionality for game state changes.
  - [ ] Schedule regular resource update messages.
  - [ ] Test real-time synchronization with multiple simulated players.

### User Story 6: Multiple Game Instances

- **Title:** Support concurrent game rooms
- **Description:** As a player, I want to join or create a game instance (room) so I can play with a specific group without interference from other games.
- **Acceptance Criteria:**
  - Players can create or join a game room via a room code or lobby UI.
  - Each game instance maintains its own independent map state, players, and resources.
- **Tasks:**
  - [ ] Design and implement a room creation/joining mechanism.
  - [ ] Maintain separate game state objects per instance.
  - [ ] Ensure WebSocket messages are isolated to the correct game instance.
  - [ ] Validate instance isolation through testing.

---

## Sprint 5: UI Enhancements & Player Feedback

### User Story 7: Enhanced Game UI & Player Statistics

- **Title:** Improve UI to display game stats and player information
- **Description:** As a player, I want to see my resource count, owned states, and a list of players with their scores, so that I can track my progress and understand the game dynamics.
- **Acceptance Criteria:**
  - The UI displays the current resource count and the number of states owned.
  - A real-time player list with names and state counts is visible.
  - Win notifications appear when a player conquers all states, with an automatic reset after 5 seconds.
- **Tasks:**
  - [ ] Build UI components to show resource counts and state ownership.
  - [ ] Develop a player list component with real-time updates.
  - [ ] Implement hover effects to highlight valid claim/attack targets.
  - [ ] Create win condition checks and notifications in the UI.

---

## Sprint 6: Authentication & Persistent Storage

### User Story 8: Optional User Authentication with Clerk

- **Title:** Integrate Clerk for optional user authentication
- **Description:** As a player, I want the option to log in using Clerk so that I can have a personalized username and track my game metrics, or play as a guest.
- **Acceptance Criteria:**
  - Clerk authentication is integrated into the Next.js app.
  - Players can choose to log in or continue as guests with default usernames.
  - Authenticated users have their metrics tracked.
- **Tasks:**
  - [ ] Install and configure the Clerk SDK in the project.
  - [ ] Wrap necessary routes/components with Clerk authentication.
  - [ ] Implement guest mode fallback.
  - [ ] Test login flow and user data handling.

### User Story 9: Persistent Data Storage with Supabase

- **Title:** Implement data persistence for game metrics
- **Description:** As a developer, I want to store game metrics and user data in Supabase so that I can analyze game performance and ensure data durability.
- **Acceptance Criteria:**
  - Supabase is configured with environment variables.
  - User profiles, game sessions, and event logs are stored in Supabase.
  - The data is accessible for future analytics.
- **Tasks:**
  - [ ] Set up the Supabase client in the project.
  - [ ] Create tables for user metrics, game sessions, and event logs.
  - [ ] Develop API endpoints or service layers to handle data CRUD operations.
  - [ ] Verify data persistence with integration tests.

---

## Sprint 7: Testing, Optimization & Documentation

### User Story 10: Automated Testing & CI/CD Integration

- **Title:** Write unit and end-to-end tests; set up CI/CD pipelines
- **Description:** As a developer, I want automated tests (Vitest and Playwright) and CI/CD pipelines in place so that I can ensure code quality and reliable deployments.
- **Acceptance Criteria:**
  - Core game logic and server functions have unit tests written in Vitest.
  - End-to-end tests simulate key player flows using Playwright.
  - GitHub Actions are configured for linting, testing, and deployments.
- **Tasks:**
  - [ ] Write Vitest unit tests for game mechanics and server logic.
  - [ ] Develop Playwright tests to simulate multiplayer interactions.
  - [ ] Configure GitHub Actions workflows for continuous integration.
  - [ ] Optimize performance based on testing feedback.

### User Story 11: Final Documentation & Deployment Preparation

- **Title:** Complete project documentation and deployment configuration
- **Description:** As a developer, I want comprehensive documentation and clear deployment instructions so that future maintenance and scaling are straightforward.
- **Acceptance Criteria:**
  - README.md and inline documentation are complete and up-to-date.
  - Detailed deployment instructions (local and production) are provided.
  - Environment variables and CI/CD configurations are tested and verified.
- **Tasks:**
  - [ ] Update the README.md with project overview, setup instructions, and roadmap.
  - [ ] Document the repository structure and key modules.
  - [ ] Provide deployment steps (e.g., for Vercel, Heroku).
  - [ ] Perform a final code review and cleanup.
