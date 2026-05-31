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

### [May 31, 2026] - Stalker walked through walls

**What I asked the AI:** "Write the stalker movement function. It should move one step toward the player every tick."

**What it gave me:** A function that calculated `dx = playerX - stalkerX` and `dy = playerY - stalkerY`, then moved the stalker one step in whichever direction had the larger difference (Chebyshev-style movement).

**What was wrong:** The stalker completely ignored walls. It would slide through any wall tile in the current dimension because the function never checked whether the target tile was passable before moving. The stalker could teleport through entire wall sections and instantly reach the player.

**How I fixed it:** I added a wall check before applying the move. I read the `map[currentLayer][newRow][newCol]` value first and only updated the stalker's position if that tile was not a wall (`!== 1`). If the direct path was blocked I tried moving on just one axis at a time as a fallback.

**Time lost:** ~25 minutes

---

### [May 31, 2026] - Phase shift triggered every frame while holding Spacebar

**What I asked the AI:** "Handle keyboard input for movement and phase shifting."

**What it gave me:** An event listener on `keydown` that checked `if (e.key === ' ') shiftDimension()` inside the main game loop.

**What was wrong:** Holding Spacebar for even half a second fired the shift dozens of times per second, rapidly flickering between dimensions. The stalker also teleported unpredictably because its position was being recalculated on every shift. The game became unplayable.

**How I fixed it:** I moved the Spacebar listener outside the game loop into a one-time `addEventListener('keydown', ...)` and added a boolean flag `isShiftOnCooldown`. After each shift I set it to `true` and used `setTimeout` to reset it after 300ms, preventing spam.

**Time lost:** ~20 minutes

---

### [May 31, 2026] - Phase shift made stalker spawn in walls

**What I asked the AI:** "Implement layer shifting with Spacebar."

**What it gave me:** First a `canShift()` check for the player only, leaving the stalker able to end up inside walls. A follow-up fix blocked the shift entirely if the stalker's tile was a wall in the target dimension.

**What was wrong:** The stalker keeps the same grid coordinates when you shift. If that tile is a wall in the other dimension, the stalker ended up inside a wall — still drawn on screen and breaking the trap logic. Blocking the shift entirely also felt wrong because it punished the player for a geometry problem that should trap the stalker, not freeze the player.

**How I fixed it:** Instead of blocking the shift, I added `resolveStalkerPosition()` — a BFS search that finds the nearest open tile around the stalker's intended coordinates in the new dimension. On every phase shift, if the stalker's tile is a wall in the target layer, he gets placed on the closest passable floor tile instead. The same helper runs at game start so the stalker never initializes inside a wall.

**Time lost:** ~10 minutes

---

### [May 31, 2026] - Exit door unlocked before all cubes were collected

**What I asked the AI:** "Write the win condition check — the exit should unlock when all cubes are collected."

**What it gave me:** A check that counted cubes remaining in the `map` array and unlocked the exit when the count hit zero.

**What was wrong:** The cube count only checked the *current* layer. If I was in Layer 1 and had collected all Layer 1 cubes, the exit unlocked even though Layer 2 cubes were still sitting there. I could win the game without collecting half the cubes.

**How I fixed it:** I changed the count function to loop over both layers: `map[0]` and `map[1]`. The exit only unlocks when the total cube count across all layers reaches zero.

**Time lost:** ~15 minutes