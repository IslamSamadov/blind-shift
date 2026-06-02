const TILE = 32;
const COLS = 15;
const ROWS = 11;

const WALL = 1;
const FLOOR = 0;
const CUBE = 2;
const DOOR = 3;

const DIFFICULTY = {
  easy: {
    label: 'Easy',
    stalkerMovesOnShift: false,
    cubeBonusSteps: 0,
    lightRadius: 3,
  },
  hard: {
    label: 'Hard',
    stalkerMovesOnShift: true,
    cubeBonusSteps: 1,
    lightRadius: 2.5,
  },
};

const PLAYER_START = { row: 1, col: 1 };
const EXIT_DOOR = { row: 1, col: 13 };

const MIN_STALKER_DIST = 8; // minimum Manhattan distance from player start

const MIN_CUBES_PER_LAYER = 2;
const MAX_CUBES_PER_LAYER = 3;
const HIGH_SCORE_KEY = 'blindShiftHighScore';
const JUMPSCARE_MS = 750;

const LAYER_NAMES = ['Red', 'Blue'];
const SHIFT_COOLDOWN_MS = 300;

const TILE_COLORS = {
  0: { wallLit: '#5c2020', wallDim: '#241010', floorLit: '#2a1212', floorDim: '#140909' },
  1: { wallLit: '#20305c', wallDim: '#101828', floorLit: '#12182a', floorDim: '#090d14' },
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const restartBtn = document.getElementById('restart-btn');
const easyBtn = document.getElementById('easy-btn');
const hardBtn = document.getElementById('hard-btn');
const highScoreEl = document.getElementById('high-score');
const jumpscare = document.getElementById('jumpscare');
const hintEl = document.querySelector('.hint');

let pendingGameOver = false;
let selectedDifficulty = 'hard';

const getDifficultyConfig = (difficulty) => (
  DIFFICULTY[difficulty] || DIFFICULTY.hard
);

const getHighScore = () => {
  const stored = localStorage.getItem(HIGH_SCORE_KEY);
  return stored ? Number(stored) : 0;
};

const saveHighScore = (score) => {
  const currentBest = getHighScore();
  if (score > currentBest) {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
    return true;
  }
  return false;
};

const updateHighScoreDisplay = () => {
  highScoreEl.textContent = `High Score: ${getHighScore()} cubes`;
};

const showJumpscare = (callback) => {
  jumpscare.classList.remove('hidden');
  jumpscare.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    jumpscare.classList.add('hidden');
    jumpscare.setAttribute('aria-hidden', 'true');
    callback();
  }, JUMPSCARE_MS);
};

const finishGame = () => {
  if (pendingGameOver) return;
  pendingGameOver = true;
  cancelLunge();
  stopSoundtrack();

  if (state.gameStatus === 'lost') {
    playScreamSound();
    showJumpscare(showGameOver);
    return;
  }

  playWinSound();
  showGameOver();
};

const isInBounds = (row, col) => (
  row >= 0 && row < ROWS && col >= 0 && col < COLS
);

const isNotWall = (map, layer, row, col) => {
  if (!isInBounds(row, col)) return false;
  return map[layer][row][col] !== WALL;
};

const isWalkable = (map, layer, row, col, score, totalCubes) => {
  if (!isInBounds(row, col)) return false;
  const tile = map[layer][row][col];
  if (tile === WALL) return false;
  if (tile === DOOR && score < totalCubes) return false;
  return true;
};

// Resolves stalker to nearest non-wall tile in the new layer.
// Unlike before, we NO LONGER skip the player tile — if the nearest open tile
// is the player's tile, the stalker lands there and collision = death.
// The old "skip player tile" logic was hiding the bug: stalker next to you
// would resolve to a far tile instead of catching you.
const resolveStalkerPosition = (map, layer, row, col) => {
  // Already on a valid floor tile — stay there
  if (isNotWall(map, layer, row, col)) {
    return { row, col };
  }

  // On a wall in the new layer — BFS outward to nearest open tile
  const visited = new Set([`${row},${col}`]);
  let frontier = [[row, col]];

  while (frontier.length > 0) {
    const nextFrontier = [];

    for (let i = 0; i < frontier.length; i += 1) {
      const [currentRow, currentCol] = frontier[i];
      const neighbors = [
        [currentRow - 1, currentCol],
        [currentRow + 1, currentCol],
        [currentRow, currentCol - 1],
        [currentRow, currentCol + 1],
      ];

      for (let j = 0; j < neighbors.length; j += 1) {
        const [nextRow, nextCol] = neighbors[j];
        const key = `${nextRow},${nextCol}`;

        if (visited.has(key) || !isInBounds(nextRow, nextCol)) continue;
        visited.add(key);

        if (isNotWall(map, layer, nextRow, nextCol)) {
          // Found the nearest open tile — even if it's the player's tile
          // checkStalkerCollision will handle the death
          return { row: nextRow, col: nextCol };
        }

        nextFrontier.push([nextRow, nextCol]);
      }
    }

    frontier = nextFrontier;
  }

  // Absolute fallback — maze is fully connected so this shouldn't happen
  return { row, col };
};

const cloneMap = (map) => map.map((layer) => layer.map((row) => [...row]));

const allCubesCollected = (gameState) => gameState.score >= gameState.totalCubes;

const createEmptySeen = (layerCount) => (
  Array.from({ length: layerCount }, () => (
    Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  ))
);

const cloneSeen = (seen) => seen.map((layer) => layer.map((row) => [...row]));

const isInLight = (row, col, playerRow, playerCol, lightRadius) => {
  const dx = Math.abs(col - playerCol);
  const dy = Math.abs(row - playerRow);
  return Math.max(dx, dy) <= lightRadius;
};

const updateSeen = (gameState) => {
  const { player, currentLayer, seen, difficulty } = gameState;
  const { lightRadius } = getDifficultyConfig(difficulty);
  const newSeen = cloneSeen(seen);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (isInLight(row, col, player.row, player.col, lightRadius)) {
        newSeen[currentLayer][row][col] = true;
      }
    }
  }

  return { ...gameState, seen: newSeen };
};

const countCubes = (map) => {
  let total = 0;
  map.forEach((layer) => {
    layer.forEach((row) => {
      row.forEach((tile) => { if (tile === CUBE) total += 1; });
    });
  });
  return total;
};

const getReservedTiles = () => {
  const reserved = new Set();
  [PLAYER_START, EXIT_DOOR].forEach(({ row, col }) => {
    reserved.add(`${row},${col}`);
  });
  return reserved;
};

const shuffleTiles = (tiles) => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getOpenFloorTiles = (map, layer, reserved) => {
  const tiles = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (map[layer][row][col] !== FLOOR) continue;
      if (reserved.has(`${row},${col}`)) continue;
      tiles.push({ row, col });
    }
  }
  return tiles;
};

const placeRandomCubes = (map) => {
  const newMap = cloneMap(map);
  const reserved = getReservedTiles();

  newMap.forEach((_, layerIndex) => {
    const cubeCount = MIN_CUBES_PER_LAYER
      + Math.floor(Math.random() * (MAX_CUBES_PER_LAYER - MIN_CUBES_PER_LAYER + 1));
    const floorTiles = shuffleTiles(getOpenFloorTiles(newMap, layerIndex, reserved));

    for (let i = 0; i < Math.min(cubeCount, floorTiles.length); i += 1) {
      const { row, col } = floorTiles[i];
      newMap[layerIndex][row][col] = CUBE;
    }
  });

  return newMap;
};

const createWalledGrid = () => (
  Array.from({ length: ROWS }, () => Array(COLS).fill(WALL))
);

const isTraversibleTile = (tile) => tile === FLOOR || tile === DOOR;

const hasPath = (layer, start, end) => {
  const visited = new Set([`${start.row},${start.col}`]);
  let frontier = [[start.row, start.col]];

  while (frontier.length > 0) {
    const nextFrontier = [];

    for (let i = 0; i < frontier.length; i += 1) {
      const [row, col] = frontier[i];
      if (row === end.row && col === end.col) return true;

      [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ].forEach(([nextRow, nextCol]) => {
        const key = `${nextRow},${nextCol}`;
        if (visited.has(key) || !isInBounds(nextRow, nextCol)) return;
        if (!isTraversibleTile(layer[nextRow][nextCol])) return;
        visited.add(key);
        nextFrontier.push([nextRow, nextCol]);
      });
    }

    frontier = nextFrontier;
  }

  return false;
};

const carveFloor = (layer, row, col) => {
  if (isInBounds(row, col) && layer[row][col] === WALL) {
    layer[row][col] = FLOOR;
  }
};

const ensurePath = (layer, start, end) => {
  if (hasPath(layer, start, end)) return;

  let row = start.row;
  let col = start.col;

  while (row !== end.row) {
    row += Math.sign(end.row - row);
    carveFloor(layer, row, col);
  }

  while (col !== end.col) {
    col += Math.sign(end.col - col);
    carveFloor(layer, row, col);
  }
};

const stampRequiredTiles = (layer) => {
  carveFloor(layer, PLAYER_START.row, PLAYER_START.col);
  layer[PLAYER_START.row][PLAYER_START.col] = FLOOR;
  layer[EXIT_DOOR.row][EXIT_DOOR.col] = DOOR;
};

const generateMazeLayer = () => {
  const layer = createWalledGrid();
  const stack = [[1, 1]];
  layer[1][1] = FLOOR;

  const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];

  while (stack.length > 0) {
    const [row, col] = stack[stack.length - 1];
    const candidates = shuffleTiles(
      directions
        .map(([dRow, dCol]) => ({
          nextRow: row + dRow,
          nextCol: col + dCol,
          wallRow: row + dRow / 2,
          wallCol: col + dCol / 2,
        }))
        .filter(({ nextRow, nextCol }) => (
          nextRow > 0
          && nextRow < ROWS - 1
          && nextCol > 0
          && nextCol < COLS - 1
          && layer[nextRow][nextCol] === WALL
        )),
    );

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const { nextRow, nextCol, wallRow, wallCol } = candidates[0];
    layer[nextRow][nextCol] = FLOOR;
    layer[wallRow][wallCol] = FLOOR;
    stack.push([nextRow, nextCol]);
  }

  stampRequiredTiles(layer);
  ensurePath(layer, PLAYER_START, EXIT_DOOR);

  return layer;
};

const createRandomMap = () => [
  generateMazeLayer(),
  generateMazeLayer(),
];

const pickStalkerStart = (map) => {
  const candidates = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (map[0][row][col] === WALL) continue;
      if (map[0][row][col] === DOOR) continue;
      const dist = Math.abs(row - PLAYER_START.row) + Math.abs(col - PLAYER_START.col);
      if (dist < MIN_STALKER_DIST) continue;
      // also keep away from exit door
      const exitDist = Math.abs(row - EXIT_DOOR.row) + Math.abs(col - EXIT_DOOR.col);
      if (exitDist < 3) continue;
      candidates.push({ row, col });
    }
  }

  if (candidates.length === 0) {
    // Fallback if maze is too small (shouldn't happen)
    return { row: ROWS - 2, col: COLS - 2 };
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};

const createPlayingState = () => {
  const map = placeRandomCubes(createRandomMap());
  const seen = createEmptySeen(map.length);

  if (!isNotWall(map, 0, PLAYER_START.row, PLAYER_START.col)) {
    throw new Error('Player spawn is blocked by a wall.');
  }

  const stalkerStart = pickStalkerStart(map);
  const stalker = resolveStalkerPosition(
    map, 0,
    stalkerStart.row, stalkerStart.col,
  );

  return updateSeen({
    currentLayer: 0,
    player: { ...PLAYER_START },
    stalker,
    stalkerDimensionLocked: false, // dimension memory: stalker stays in other layer
    score: 0,
    totalCubes: countCubes(map),
    gameStatus: 'playing',
    difficulty: selectedDifficulty,
    map,
    seen,
  });
};

const createPreviewState = () => ({
  ...createPlayingState(),
  gameStatus: 'start',
});

let state = createPreviewState();
let isShiftOnCooldown = false;

const triggerShiftFlash = (layer) => {
  const el = document.getElementById('shift-flash');
  if (!el) return;
  el.classList.remove('shift-to-red', 'shift-to-blue');
  void el.offsetWidth;
  el.classList.add(layer === 0 ? 'shift-to-red' : 'shift-to-blue');
  setTimeout(() => el.classList.remove('shift-to-red', 'shift-to-blue'), 500);
};

const applyDimensionTheme = (layer) => {
  document.body.classList.toggle('red-dimension', layer === 0);
  document.body.classList.toggle('blue-dimension', layer === 1);
  triggerShiftFlash(layer);
  if (typeof shiftSoundtrackTheme === 'function') {
    shiftSoundtrackTheme(layer);
  }
};

const canShift = (gameState) => {
  const nextLayer = gameState.currentLayer === 0 ? 1 : 0;
  const { player, map } = gameState;
  return isNotWall(map, nextLayer, player.row, player.col);
};

const shiftDimension = (gameState) => {
  if (!canShift(gameState)) return gameState;

  const nextLayer = gameState.currentLayer === 0 ? 1 : 0;
  const { stalker, map, player, stalkerDimensionLocked } = gameState;

  // ── Dimension Memory ────────────────────────────────────────────────────────
  // If the stalker is already locked in the other dimension, shifting back
  // releases it — it snaps to the nearest open tile in the new current layer.
  // If it's not locked, there's a 30% chance it stays behind (memory trigger).
  // On easy mode, dimension memory never triggers.
  const config = getDifficultyConfig(gameState.difficulty);
  let newStalkerLocked = false;
  let resolvedStalker;

  if (stalkerDimensionLocked) {
    // Stalker was in the other dimension — it re-enters current play layer
    newStalkerLocked = false;
    resolvedStalker = resolveStalkerPosition(
      map, nextLayer, stalker.row, stalker.col,
    );
  } else if (config.stalkerMovesOnShift && Math.random() < 0.30) {
    // Dimension memory: stalker stays in the old layer — player escapes alone
    newStalkerLocked = true;
    resolvedStalker = { ...stalker };
    if (typeof onStalkerMemory === 'function') onStalkerMemory();
  } else {
    // Normal shift — stalker follows
    newStalkerLocked = false;
    resolvedStalker = resolveStalkerPosition(
      map, nextLayer, stalker.row, stalker.col,
    );
  }

  let newState = {
    ...gameState,
    currentLayer: nextLayer,
    stalker: resolvedStalker,
    stalkerDimensionLocked: newStalkerLocked,
  };

  newState = updateSeen(newState);
  applyDimensionTheme(nextLayer);

  // Check collision IMMEDIATELY after resolving — stalker may have landed on player
  newState = checkStalkerCollision(newState);
  if (newState.gameStatus !== 'playing') return newState;

  // FIX 1: collect cube and check exit after shifting
  const scoreBeforeShiftCube = newState.score;
  newState = collectCube(newState);
  if (newState.score > scoreBeforeShiftCube) {
    playCubeSound();
    updateHud();
  }
  newState = checkExit(newState);

  // Update proximity audio after shift
  if (typeof setStalkerProximity === 'function') {
    setStalkerProximity(stalkerDistance(newState));
  }

  return newState;
};

const handleShift = () => {
  if (state.gameStatus !== 'playing' || isShiftOnCooldown) return;

  const nextState = shiftDimension(state);
  if (nextState === state) return;

  state = nextState;

  if (state.gameStatus === 'lost') {
    finishGame();
    return;
  }

  playShiftSound();

  if (getDifficultyConfig(state.difficulty).stalkerMovesOnShift) {
    state = runStalkerTurn(state, 0);
  }

  isShiftOnCooldown = true;
  setTimeout(() => { isShiftOnCooldown = false; }, SHIFT_COOLDOWN_MS);

  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    finishGame();
  }

  updateHud();
};

const restartGame = () => {
  stopSoundtrack();
  cancelLunge();
  state = createPreviewState();
  gameOverScreen.classList.add('hidden');
  hud.classList.add('hidden');
  startScreen.classList.remove('hidden');
  updateHint();
};

const updateHint = () => {
  if (state.gameStatus === 'start') {
    hintEl.textContent = 'Choose Easy or Hard — Hard: stalker reacts to shifts and cubes';
    return;
  }
  const config = getDifficultyConfig(state.difficulty);
  if (config.stalkerMovesOnShift) {
    hintEl.textContent = 'Hard mode · WASD to move · Space shifts (stalker reacts) · Cubes draw him closer';
    return;
  }
  hintEl.textContent = 'Easy mode · WASD to move · Space to shift safely · Stalker still hunts on every move';
};

const startGame = (difficulty = selectedDifficulty) => {
  selectedDifficulty = difficulty;
  pendingGameOver = false;
  jumpscare.classList.add('hidden');
  state = createPlayingState();
  isShiftOnCooldown = false;
  applyDimensionTheme(0);
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  gameOverScreen.classList.remove('win', 'lost');
  hud.classList.remove('hidden');
  updateHud();
  updateHint();
  startSoundtrack();
  scheduleLunge();
};

const showGameOver = () => {
  gameOverScreen.classList.remove('win', 'lost');
  const isNewRecord = saveHighScore(state.score);

  if (state.gameStatus === 'won') {
    gameOverTitle.textContent = 'You Win';
    gameOverMessage.textContent = isNewRecord
      ? `You escaped! New high score: ${state.score} cubes.`
      : 'All cubes collected — you escaped through the exit!';
    gameOverScreen.classList.add('win');
  } else {
    gameOverTitle.textContent = 'You Lose';
    gameOverMessage.textContent = isNewRecord
      ? `Caught! New high score: ${state.score} / ${state.totalCubes} cubes.`
      : `Collected ${state.score} / ${state.totalCubes} cubes.`;
    gameOverScreen.classList.add('lost');
  }

  updateHighScoreDisplay();
  gameOverScreen.classList.remove('hidden');
  pendingGameOver = false;
};

const isPassable = (layer, row, col) => (
  isWalkable(state.map, layer, row, col, state.score, state.totalCubes)
);

const movePlayer = (gameState, dRow, dCol) => {
  const { row, col } = gameState.player;
  const nextRow = row + dRow;
  const nextCol = col + dCol;
  if (!isPassable(gameState.currentLayer, nextRow, nextCol)) return gameState;
  return { ...gameState, player: { row: nextRow, col: nextCol } };
};

// ── BFS pathfinding ───────────────────────────────────────────────────────────
// Returns the first step the stalker should take toward the player,
// respecting walls of the current layer. Falls back to the old greedy
// move if BFS finds no path (shouldn't happen in a connected maze).
const bfsNextStep = (gameState) => {
  const { player, stalker, currentLayer, map, score, totalCubes } = gameState;
  const startRow = stalker.row;
  const startCol = stalker.col;
  const goalRow  = player.row;
  const goalCol  = player.col;

  if (startRow === goalRow && startCol === goalCol) return null;

  const key = (r, c) => `${r},${c}`;
  const visited = new Map(); // key → parent key
  visited.set(key(startRow, startCol), null);
  let frontier = [[startRow, startCol]];

  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

  while (frontier.length > 0) {
    const next = [];
    for (const [r, c] of frontier) {
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const k = key(nr, nc);
        if (visited.has(k)) continue;
        // stalker can walk through doors regardless of lock state
        if (!isInBounds(nr, nc)) continue;
        if (map[currentLayer][nr][nc] === WALL) continue;
        visited.set(k, key(r, c));
        if (nr === goalRow && nc === goalCol) {
          // Trace back to find the first step from start
          let cur = k;
          let prev = visited.get(cur);
          while (prev !== key(startRow, startCol)) {
            cur = prev;
            prev = visited.get(cur);
          }
          const [stepR, stepC] = cur.split(',').map(Number);
          return { row: stepR, col: stepC };
        }
        next.push([nr, nc]);
      }
    }
    frontier = next;
  }

  // Fallback: greedy step (maze should always be connected)
  const dRow = Math.sign(goalRow - startRow);
  const dCol = Math.sign(goalCol - startCol);
  for (const [sr, sc] of (Math.abs(goalRow - startRow) >= Math.abs(goalCol - startCol)
    ? [[dRow, 0], [0, dCol]] : [[0, dCol], [dRow, 0]])) {
    const nr = startRow + sr;
    const nc = startCol + sc;
    if (isWalkable(map, currentLayer, nr, nc, score, totalCubes)) {
      return { row: nr, col: nc };
    }
  }
  return null;
};

const moveStalker = (gameState) => {
  // If the stalker is in dimension memory mode (locked in other layer), skip movement
  if (gameState.stalkerDimensionLocked) return gameState;

  const next = bfsNextStep(gameState);
  if (!next) return gameState;
  return { ...gameState, stalker: next };
};

const checkStalkerCollision = (gameState) => {
  const { player, stalker, stalkerDimensionLocked } = gameState;
  // If stalker is dimension-locked it's in the other layer — can't catch you
  if (stalkerDimensionLocked) return gameState;
  if (player.row === stalker.row && player.col === stalker.col) {
    return { ...gameState, gameStatus: 'lost' };
  }
  return gameState;
};

// ── Stalker distance ──────────────────────────────────────────────────────────
const stalkerDistance = (gameState) => {
  const { player, stalker, stalkerDimensionLocked } = gameState;
  if (stalkerDimensionLocked) return 999; // in other dimension — far away
  return Math.abs(player.row - stalker.row) + Math.abs(player.col - stalker.col);
};

// ── Lunge ─────────────────────────────────────────────────────────────────────
// Every LUNGE_INTERVAL_MS the stalker gets a burst of extra steps.
const LUNGE_INTERVAL_MS  = 18000; // lunge every ~18s
const LUNGE_INTERVAL_JITTER = 8000;
const LUNGE_STEPS = 3; // extra steps on top of the normal 1
let lungeTimeout = null;

const scheduleLunge = () => {
  clearTimeout(lungeTimeout);
  lungeTimeout = setTimeout(() => {
    if (state.gameStatus !== 'playing') return;
    // Do the lunge: move stalker LUNGE_STEPS extra times immediately
    for (let i = 0; i < LUNGE_STEPS && state.gameStatus === 'playing'; i++) {
      state = moveStalker(state);
      state = checkStalkerCollision(state);
    }
    if (state.gameStatus === 'lost') { finishGame(); return; }
    // Signal audio
    if (typeof onStalkerLunge === 'function') onStalkerLunge();
    updateHud();
    scheduleLunge(); // reschedule
  }, LUNGE_INTERVAL_MS + Math.random() * LUNGE_INTERVAL_JITTER);
};

const cancelLunge = () => clearTimeout(lungeTimeout);

const runStalkerTurn = (gameState, bonusSteps = 0) => {
  let nextState = gameState;
  const totalSteps = 1 + bonusSteps;
  for (let step = 0; step < totalSteps && nextState.gameStatus === 'playing'; step += 1) {
    nextState = moveStalker(nextState);
    nextState = checkStalkerCollision(nextState);
  }
  // Notify audio of new proximity
  if (typeof setStalkerProximity === 'function') {
    setStalkerProximity(stalkerDistance(nextState));
  }
  return nextState;
};

const collectCube = (gameState) => {
  const { player, currentLayer, map, score } = gameState;
  const tile = map[currentLayer][player.row][player.col];
  if (tile !== CUBE) return gameState;

  const newMap = cloneMap(map);
  newMap[currentLayer][player.row][player.col] = FLOOR;

  return { ...gameState, map: newMap, score: score + 1 };
};

const checkExit = (gameState) => {
  if (!allCubesCollected(gameState)) return gameState;
  const { player, currentLayer, map } = gameState;
  if (map[currentLayer][player.row][player.col] === DOOR) {
    return { ...gameState, gameStatus: 'won' };
  }
  return gameState;
};

const updateHud = () => {
  const layerName = LAYER_NAMES[state.currentLayer];
  const exitStatus = allCubesCollected(state) ? 'Exit unlocked' : 'Exit locked';
  const modeName = getDifficultyConfig(state.difficulty).label;
  hud.textContent = `Cubes: ${state.score} / ${state.totalCubes} | ${modeName} | ${layerName} | ${exitStatus} | Best: ${getHighScore()}`;
};

const handleInput = (key) => {
  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    finishGame();
    return;
  }

  const moves = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0],
    ArrowLeft: [0, -1], ArrowRight: [0, 1],
    w: [-1, 0], W: [-1, 0],
    s: [1, 0],  S: [1, 0],
    a: [0, -1], A: [0, -1],
    d: [0, 1],  D: [0, 1],
  };

  const delta = moves[key];
  if (!delta || state.gameStatus !== 'playing') return;

  state = movePlayer(state, delta[0], delta[1]);
  state = updateSeen(state);

  const scoreBeforeCube = state.score;
  state = collectCube(state);
  const collectedCube = state.score > scoreBeforeCube;

  if (collectedCube) playCubeSound();

  state = checkExit(state);

  if (state.gameStatus === 'playing') {
    const { cubeBonusSteps } = getDifficultyConfig(state.difficulty);
    state = runStalkerTurn(state, collectedCube ? cubeBonusSteps : 0);
  }

  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    finishGame();
  }

  updateHud();
};

const drawEntity = (row, col, color, radius = TILE / 3) => {
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
};

const renderStalker = (row, col) => {
  drawEntity(row, col, '#1a1028');
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
};

// Render just the stalker's glowing red eyes — used when it's in darkness nearby
const renderStalkerEyes = (row, col, alpha) => {
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const renderCube = (row, col) => {
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  const size = TILE / 4;
  // Pulsing glow — oscillates using time
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.save();
  ctx.shadowColor = '#7ec8ff';
  ctx.shadowBlur = 6 + pulse * 10;
  ctx.fillStyle = `rgba(126, 200, 255, ${0.75 + pulse * 0.25})`;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#c8e8ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - size, y - size, size * 2, size * 2);
  ctx.restore();
};

const renderDoor = (row, col, unlocked) => {
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  const width = TILE / 2;
  const height = (TILE * 2) / 3;
  ctx.save();
  if (unlocked) {
    ctx.shadowColor = '#6bdc6b';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = unlocked ? '#6bdc6b' : '#4a3030';
  ctx.fillRect(x - width / 2, y - height / 2, width, height);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = unlocked ? '#c8ffc8' : '#8a5050';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - width / 2, y - height / 2, width, height);
  if (!unlocked) {
    ctx.strokeStyle = '#ff6666';
    ctx.beginPath();
    ctx.moveTo(x - width / 4, y - height / 4);
    ctx.lineTo(x + width / 4, y + height / 4);
    ctx.moveTo(x + width / 4, y - height / 4);
    ctx.lineTo(x - width / 4, y + height / 4);
    ctx.stroke();
  }
  ctx.restore();
};

// Brightness falloff — 1.0 at player, 0.0 at radius edge
const getLightBrightness = (row, col, playerRow, playerCol, lightRadius) => {
  const dx = Math.abs(col - playerCol);
  const dy = Math.abs(row - playerRow);
  const dist = Math.max(dx, dy); // Chebyshev — diagonals same as straights
  if (dist > lightRadius) return 0;
  return Math.max(0, 1 - (dist / lightRadius) ** 1.1);
};

const renderTile = (row, col, tile, brightness, explored, layer) => {
  const x = col * TILE;
  const y = row * TILE;
  const colors = TILE_COLORS[layer];

  let fillColor;
  if (brightness > 0) {
    // Interpolate between dim and lit color based on brightness
    const litColor   = tile === WALL ? colors.wallLit  : colors.floorLit;
    const dimColor   = tile === WALL ? colors.wallDim  : colors.floorDim;
    // Simple brightness blend: at brightness=1 use litColor, at 0 use dimColor
    fillColor = brightness > 0.55 ? litColor : dimColor;
    // Overlay alpha to fake smooth gradient
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, TILE, TILE);
    if (brightness < 1) {
      ctx.fillStyle = `rgba(0,0,0,${(1 - brightness) * 0.45})`;
      ctx.fillRect(x, y, TILE, TILE);
    }
    ctx.strokeStyle = layer === 0 ? 'rgba(26,10,10,0.4)' : 'rgba(10,10,26,0.4)';
    ctx.strokeRect(x, y, TILE, TILE);
  } else if (explored) {
    fillColor = tile === WALL ? colors.wallDim : colors.floorDim;
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, TILE, TILE);
  }
};

// ── Particle trail ────────────────────────────────────────────────────────────
const MAX_TRAIL = 2;
const playerTrail = []; // array of {row, col, age} — age 0=newest

const addTrailPoint = (row, col) => {
  // Only add if moved
  if (playerTrail.length > 0 && playerTrail[0].row === row && playerTrail[0].col === col) return;
  playerTrail.unshift({ row, col, age: 0 });
  if (playerTrail.length > MAX_TRAIL) playerTrail.pop();
};

const renderTrail = (playerRow, playerCol, currentLayer, lightRadius) => {
  playerTrail.forEach((pt, i) => {
    pt.age += 1;
    const dist = Math.sqrt((pt.col - playerCol) ** 2 + (pt.row - playerRow) ** 2);
    if (dist > lightRadius + 1) return; // only in or near light
    const alpha = Math.max(0, (1 - i / MAX_TRAIL) * 0.35);
    const x = pt.col * TILE + TILE / 2;
    const y = pt.row * TILE + TILE / 2;
    const r = TILE / 9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = currentLayer === 0 ? '#f5d76e' : '#4488ff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

// ── Stalker trail ─────────────────────────────────────────────────────────────
const MAX_STALKER_TRAIL = 5;
const stalkerTrail = []; // {row, col}

const addStalkerTrailPoint = (row, col) => {
  if (stalkerTrail.length > 0 && stalkerTrail[0].row === row && stalkerTrail[0].col === col) return;
  stalkerTrail.unshift({ row, col });
  if (stalkerTrail.length > MAX_STALKER_TRAIL) stalkerTrail.pop();
};

const renderStalkerTrail = (playerRow, playerCol, lightRadius) => {
  stalkerTrail.forEach((pt, i) => {
    const dist = Math.sqrt((pt.col - playerCol) ** 2 + (pt.row - playerRow) ** 2);
    if (dist > lightRadius + 1) return;
    const alpha = Math.max(0, (1 - i / MAX_STALKER_TRAIL) * 0.28);
    const x = pt.col * TILE + TILE / 2;
    const y = pt.row * TILE + TILE / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#cc1111';
    ctx.beginPath();
    ctx.arc(x, y, TILE / 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

// ── Flashlight flicker ────────────────────────────────────────────────────────
let flickerActive = false;
let flickerAmount = 0;

const scheduleFlicker = () => {
  const delay = 8000 + Math.random() * 12000;
  setTimeout(() => {
    if (state.gameStatus !== 'playing') { scheduleFlicker(); return; }
    flickerActive = true;
    flickerAmount = 0.4 + Math.random() * 0.5; // shrink by this fraction
    setTimeout(() => {
      flickerActive = false;
      scheduleFlicker();
    }, 80 + Math.random() * 120);
  }, delay);
};
scheduleFlicker();

// ── Line of sight ─────────────────────────────────────────────────────────────
const hasLineOfSight = (r1, c1, r2, c2, layerIdx) => {
  const steps = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  if (steps === 0) return true;
  for (let i = 1; i < steps; i++) {
    const r = Math.round(r1 + (r2 - r1) * (i / steps));
    const c = Math.round(c1 + (c2 - c1) * (i / steps));
    if (state.map[layerIdx][r][c] === WALL) return false;
  }
  return true;
};

const render = () => {
  const { currentLayer, difficulty } = state;
  let { lightRadius } = getDifficultyConfig(difficulty);
  // Apply flicker
  if (flickerActive) lightRadius *= (1 - flickerAmount);

  const layer = state.map[currentLayer];
  const seenLayer = state.seen[currentLayer];
  const { row: playerRow, col: playerCol } = state.player;
  const { row: stalkerRow, col: stalkerCol } = state.stalker;

  // Track trails
  addTrailPoint(playerRow, playerCol);
  if (!state.stalkerDimensionLocked) addStalkerTrailPoint(stalkerRow, stalkerCol);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tiles with gradient brightness
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const brightness = getLightBrightness(row, col, playerRow, playerCol, lightRadius);
      const explored = seenLayer[row][col];
      if (brightness === 0 && !explored) continue;
      renderTile(row, col, layer[row][col], brightness, explored, currentLayer);

      if (brightness > 0) {
        if (layer[row][col] === CUBE) renderCube(row, col);
        if (layer[row][col] === DOOR) renderDoor(row, col, allCubesCollected(state));
      }
    }
  }

  // Player trail (under player)
  renderTrail(playerRow, playerCol, currentLayer, lightRadius);

  // Stalker trail (red smear — only if same dimension)
  if (!state.stalkerDimensionLocked) {
    renderStalkerTrail(playerRow, playerCol, lightRadius);
  }

  // Stalker visibility
  const { stalkerDimensionLocked } = state;
  const stalkerDist = Math.sqrt((stalkerCol - playerCol) ** 2 + (stalkerRow - playerRow) ** 2);
  const stalkerInLight = stalkerDist <= lightRadius;
  const stalkerHasLos = hasLineOfSight(playerRow, playerCol, stalkerRow, stalkerCol, currentLayer);

  if (!stalkerDimensionLocked) {
    if (stalkerInLight && stalkerHasLos) {
      // Fully visible — render whole body
      renderStalker(stalkerRow, stalkerCol);
    } else if (stalkerDist <= 5 && stalkerHasLos) {
      // In darkness but close and has LoS — show glowing eyes only
      const eyeAlpha = Math.max(0.15, 1 - stalkerDist / 5);
      renderStalkerEyes(stalkerRow, stalkerCol, eyeAlpha);
    }
  }

  // Player
  ctx.save();
  ctx.shadowColor = '#f5d76e';
  ctx.shadowBlur = 8;
  drawEntity(playerRow, playerCol, '#f5d76e');
  ctx.restore();
};

const gameLoop = () => {
  render();
  requestAnimationFrame(gameLoop);
};

window.addEventListener('keydown', (event) => {
  if (state.gameStatus === 'start' && event.key === '1') {
    event.preventDefault();
    startGame('easy');
    return;
  }
  if (state.gameStatus === 'start' && event.key === '2') {
    event.preventDefault();
    startGame('hard');
    return;
  }
  if (state.gameStatus === 'start' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    startGame('hard');
    return;
  }
  if ((state.gameStatus === 'won' || state.gameStatus === 'lost')
    && (event.key === 'Enter' || event.key === ' ' || event.key === 'r' || event.key === 'R')) {
    event.preventDefault();
    restartGame();
    return;
  }

  const movementKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'];
  if (movementKeys.includes(event.key)) {
    event.preventDefault();
    handleInput(event.key);
    return;
  }

  if (event.key === ' ' && state.gameStatus === 'playing') {
    event.preventDefault();
    handleShift();
  }
});

easyBtn.addEventListener('click', () => startGame('easy'));
hardBtn.addEventListener('click', () => startGame('hard'));
restartBtn.addEventListener('click', restartGame);

// ── How to Play modal ─────────────────────────────────────────────────────────
const howToPlayModal = document.getElementById('how-to-play-modal');
const openModal  = () => howToPlayModal.classList.remove('hidden');
const closeModal = () => howToPlayModal.classList.add('hidden');

document.getElementById('how-to-play-btn').addEventListener('click', openModal);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);

// Close on backdrop click (clicking outside modal-inner)
howToPlayModal.addEventListener('click', (e) => {
  if (e.target === howToPlayModal) closeModal();
});

// Close on Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !howToPlayModal.classList.contains('hidden')) {
    e.preventDefault();
    closeModal();
  }
});

document.getElementById('mute-btn').addEventListener('click', () => {
  if (typeof toggleMute === 'function') toggleMute();
});

// ── Mobile D-pad ─────────────────────────────────────────────────────────────
// Use touchstart (not click) for instant response with no 300ms delay
document.querySelectorAll('.dpad-btn[data-key]').forEach((btn) => {
  const fire = (e) => {
    e.preventDefault();
    handleInput(btn.dataset.key);
  };
  btn.addEventListener('touchstart', fire, { passive: false });
  btn.addEventListener('click', fire); // fallback for mouse on desktop preview
});

document.getElementById('mobile-shift-btn').addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleShift();
}, { passive: false });
document.getElementById('mobile-shift-btn').addEventListener('click', () => handleShift());

updateHighScoreDisplay();
updateHint();
gameLoop();