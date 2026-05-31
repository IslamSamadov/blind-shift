# 🤖 AI Diary — Blind Shift

## Tools Used & Why

| Tool | Purpose |
|---|---|
| **Gemini** | Early brainstorming — discussed what kind of game to make, explored genre ideas, and settled on the horror puzzle concept with dual dimensions |
| **ChatGPT (Image Generation)** | Generated the visual game design sheet / concept art to map out mechanics before writing any code |
| **Claude** | Writing the README.md and this AI_DIARY.md — documentation and writing tasks |
| **Cursor** | Main development tool for writing all game code (HTML, CSS, JavaScript) |

Each tool was chosen for what it does best. Gemini is good for open-ended conversation and ideation. ChatGPT's image generation turned abstract ideas into a concrete visual spec. Claude handles structured writing well. Cursor's AI-assisted coding environment makes it practical for actually building the game.

---

## Diary Entries

---

### May 31, 2026 - Pivoting from Complex 4D Projection to 2D Layer Shifting

**What I asked the AI:**
I asked for a simple 4D game idea using HTML, CSS, and JS.

**What it gave me:**
Initially, concepts for fully projected 4D hypercubes, a complex 4D Pac-Man matrix layout consisting of a 3x3 grid of 9 simultaneous mazes, and mathematical rendering ideas.

**What was wrong:**
While structurally fascinating, the 9-grid layout and hypercube math were far too complex for a simple assignment and did not fit my teacher's constraint to keep the project straightforward and achievable.

**How I fixed it:**
I guided the AI to pivot toward a 2D perspective-shifting game with an atmospheric horror element. We combined a limited-light "flashlight" radius with a simple 3D array (`[layer][row][column]`). Instead of displaying multiple mazes at once, the player stays on one clean 2D screen and presses Spacebar to phase-shift layers, using the geometry of one layer to trap a monster following them in another.

**Time lost:** ~20 minutes of conceptual shifting.

---

### May 31, 2026 - Stalker walked through walls

**What I asked the AI:** "Add the stalker — it should move one step toward me after every move I make."

**What it gave me:** A `moveStalker()` function in `app.js` that picked the direction with the bigger distance gap (`Math.sign(dRow)` / `Math.sign(dCol)`) and updated the stalker's row/col without reading the map first.

**What was wrong:** In testing, the stalker cut straight through maze walls in the Red dimension and caught me in places that should have been safe. It felt broken, not scary.

**How I fixed it:** I reused the same wall check the player already had. Before moving, the stalker now reads `map[currentLayer][newRow][newCol]` and only steps if the tile is not a wall. If the direct path is blocked, it tries moving on a single axis instead.

**Time lost:** ~25 minutes

---

### May 31, 2026 - Phase shift spammed while holding Spacebar

**What I asked the AI:** "Wire up Spacebar so the player can shift between Red and Blue."

**What it gave me:** Shift logic hooked up correctly, but every `keydown` event for Space fired another shift with no delay between them.

**What was wrong:** Holding Spacebar for half a second flipped dimensions dozens of times. The HUD flickered between "Red" and "Blue", the canvas colors strobed, and the stalker's position kept getting recalculated — the game was unplayable.

**How I fixed it:** I kept the listener in `keydown` but added an `isShiftOnCooldown` flag in `app.js`. After a successful shift it locks input for 300ms via `setTimeout`, same idea I had written about in my notes from earlier AI sessions.

**Time lost:** ~15 minutes

---

### May 31, 2026 - Phase shift made stalker spawn in walls

**What I asked the AI:** "Implement layer shifting with Spacebar."

**What it gave me:** First a `canShift()` check for the player only, leaving the stalker able to end up inside walls. A follow-up fix blocked the shift entirely if the stalker's tile was a wall in the target dimension.

**What was wrong:** The stalker keeps the same grid coordinates when you shift. If that tile is a wall in the other dimension, the stalker ended up inside a wall — still drawn on screen and breaking the trap logic. Blocking the shift entirely also felt wrong because it punished the player for a geometry problem that should trap the stalker, not freeze the player.

**How I fixed it:** Instead of blocking the shift, I added `resolveStalkerPosition()` — a BFS search that finds the nearest open tile around the stalker's intended coordinates in the new dimension. On every phase shift, if the stalker's tile is a wall in the target layer, he gets placed on the closest passable floor tile instead. The same helper runs at game start so the stalker never initializes inside a wall.

**Time lost:** ~10 minutes

---

### May 31, 2026 - Won the game without reaching the exit door

**What I asked the AI:** "Add the exit door from the README — locked until all cubes are collected."

**What it gave me:** A door tile rendered on the map, but the win check still lived inside `collectCube()`. Picking up the last cube immediately set `gameStatus` to `'won'`.

**What was wrong:** That skipped the whole escape part of the design. I could win standing in the middle of the maze as long as I had grabbed every cube. The locked door was cosmetic.

**How I fixed it:** I split the logic. Collecting cubes only updates `score` and unlocks the door through `isWalkable()`. A separate `checkExit()` runs after each move and only sets `'won'` when all cubes are collected **and** the player is standing on the door tile in the current layer.

**Time lost:** ~12 minutes

---

### May 31, 2026 - Cubes were hard-coded and every run felt the same

**What I asked the AI:** "Cubes are placed manually in the map arrays — can we randomize spawn locations so replays aren't identical?"

**What it gave me:** Quantum cubes baked directly into `LAYER_0` and `LAYER_1` as literal `2` values in the 2D arrays. Same spots every restart.

**What was wrong:** After two or three playthroughs I had memorized the Red and Blue cube locations. The fog and stalker were tense, but the puzzle itself stopped changing. My README even listed manual cube placement as something to fix.

**How I fixed it:** I removed all cube values from the static maze templates and added `placeRandomCubes()` in `app.js`. On each new game it shuffles open floor tiles per layer, skips the player spawn, stalker spawn, and exit door, and drops 2–3 cubes in each dimension. `totalCubes` is counted after placement so the HUD and win condition stay in sync.

**Time lost:** ~18 minutes
