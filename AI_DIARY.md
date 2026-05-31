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