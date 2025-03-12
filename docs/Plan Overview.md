# Map Painter .io Game Template Plan

Game ConceptCore Idea: A real-time multiplayer browser game where players claim and attack regions on a map to conquer all territories.
Goal: One player wins by controlling 100% of the map (all regions painted their color).
Inspiration: Risk and Territorial.io, with strategic mechanics and real-time interaction.

RequirementsFunctional RequirementsMap SystemFormat: Load a GeoJSON file of the USA with states as regions.Initial Scope: Simplified subset of 12-15 states (e.g., contiguous Midwest or Northeast states) for the template.
Full Potential: Expandable to all 50 states in future iterations.

Rendering: Use HTML5 Canvas to draw GeoJSON polygons, each state as a clickable region.
Region Properties:ID (unique, from GeoJSON or assigned, e.g., state FIPS code or index).
Ownership (neutral or player ID).
Color (gray for neutral, player-specific for owned).
Adjacency (predefined in GeoJSON as "neighbors": [id1, id2, ...], based on shared state borders).

Interaction: Click a state to claim (neutral) or attack (enemy), validated by adjacency.

Player InteractionStart: Each player begins with 1 random state and 10 resources in their chosen game instance.
Claiming: Spend 5 resources to claim an adjacent neutral state.
Attacking: Base Cost: Spend 10 resources to attack an adjacent enemy state.
Strength Calculation:Attacker Strength = Number of adjacent states owned by attacker + extra resources spent (optional, +1 strength per 5 extra resources).
Defender Strength = Number of adjacent states owned by defender.

Resolution: Attacker Strength > Defender Strength: Attack succeeds (state switches to attacker’s color).
Attacker Strength ≤ Defender Strength: Attack fails (resources spent, no change).

Minimum: Must own at least 1 adjacent state to attack.

Validation: Claim: State is neutral, adjacent to owned state, 5+ resources.
Attack: State is enemy-owned, adjacent to owned state, 10+ resources.

Resource SystemGeneration: +1 resource per owned state every 5 seconds.
Starting Resources: 10.
Costs: Claim: 5 resources.
Attack: 10 resources base + optional extra (e.g., +5 for +1 strength).

Display: Show current resource count in UI.

Real-Time UpdatesBroadcast: Map changes (claims, attacks) and win condition sent to all players in the same game instance via WebSocket.
Sync: Resource updates broadcast every 5 seconds within each instance.
Win Condition: When one player owns all states in their instance (12-15 for template), announce victory and reset after 5 seconds.

Player IdentityAttributes: Unique ID, user-specified name, and color per player.
Initialization: Player specifies a name on join (e.g., via UI input).
Assign a random unclaimed state in the chosen instance.

Display: Show player names alongside scores in UI.

Game LoopState: Track state ownership, player resources, and map status per game instance.
Logic: Validate moves, resolve attacks (strength comparison), check for win (all states owned by one player).
Scoring: Secondary metric—number of states owned.

UI ElementsMap: Render USA GeoJSON polygons with colors indicating ownership.
Stats: Display player’s resource count, states owned, and name.
Feedback: Highlight valid claim/attack targets on hover.
Show attacker/defender strengths and costs before confirming attack (e.g., “Attack: 2 vs. Defense: 1”).

Player List: Show all players in the current instance (name, states owned).
Win Notification: “Player X has won!” message, followed by reset after 5s.

Multiple Game InstancesFeature: Support multiple concurrent games (e.g., "rooms") on the server.
Joining: Players choose or create a game instance on connect (e.g., via room code or lobby UI).
Isolation: Each instance has its own map state, players, and resources, independent of others.

Non-Functional RequirementsPerformance: Support 20-50 players across multiple instances with <1s latency for updates.
Simplicity: Intuitive mechanics (claim, strategic attack, conquer) and easy game joining.
Extensibility: Modular design to add features (e.g., full 50 states, defenses).
Browser Compatibility: Runs on Chrome, Firefox, Edge using lightweight tech.
Fairness: Random starting states per instance for balanced play.

Technical DetailsTech Stack:Server: Node.js with WebSocket (e.g., ws library) for real-time communication.
Client: Plain JavaScript + HTML5 Canvas for rendering GeoJSON and handling input.

GeoJSON Map:Initial Map: Simplified USA with 12-15 states (e.g., Midwest: IL, IN, MI, OH, WI, MN, IA, MO, KS, NE, SD, ND, or Northeast: NY, PA, NJ, CT, MA, etc.).
File: Stored in usa-map.json with precomputed "neighbors" property per state (e.g., IL neighbors: IN, MO, IA, WI, KY).
Source: Use a public GeoJSON dataset (e.g., simplified US states), trimmed to 12-15 regions for the template.

Rendering: Canvas parses GeoJSON coordinates, fills state polygons with colors based on ownership.
Adjacency: Predefined in GeoJSON (manual for template; dynamic calculation optional later).
WebSocket Backend:Multiple Games: Server maintains a Map of instances (key: instance ID, value: game state).
User Names: Client sends { type: "join", name: "Alice", instance: "game123" }; server ensures unique names per instance.
Attack Messages: { type: "attack", stateId: "IL", resources: 15 } includes optional extra resources.

Deployment: Local testing for now, with notes for hosting (e.g., Heroku, Vercel).

Gameplay Flow ExampleStart: "Alice" joins "game123", gets Illinois (blue), 10 resources. "Bob" joins, gets Ohio (red).
Growth: After 5s, Alice has 11 resources (+1 from IL).
Claim: Alice spends 5 resources to claim Indiana (adjacent to IL, turns blue).
Attack: Alice attacks Bob’s Ohio:Alice owns 2 adjacent states (IL, IN), spends 15 resources (+1 strength) → Strength = 3.
Bob owns 1 adjacent state (KY) → Strength = 1.
3 > 1, attack succeeds, Ohio turns blue.

Endgame: Alice conquers all 12-15 states in "game123". “Alice has won!” displays, instance resets after 5s.

Implementation NotesMap Choice: Start with a GeoJSON of 12-15 contiguous US states (e.g., Midwest: IL, IN, MI, OH, WI, MN, IA, MO, KS, NE, SD, ND, KY, TN, AR).
Attack Balance: Strength-based system; playtest and tweak (e.g., adjust extra resource cost or cap adjacency strength).
Reset: Auto-reset per instance after 5s ensures pick-up/put-down playability.
Game Instances: Simple lobby or URL-based joining (e.g., /game123); expand to UI later.
Names: Store in player object (e.g., { id: "p1", name: "Alice", color: "#0000FF" }).

Next StepsArchitecture: Define folder structure, modules, and data flow (server with instances, client with USA map rendering).
Prototype: Build map rendering (USA subset), gameplay, networking with improved attacks, and name support.
Playtest: Test with 2-10 players across 2-3 instances, refine attack mechanics and map balance if needed.
