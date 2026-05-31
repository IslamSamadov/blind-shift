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
const STALKER_START = { row: 9, col: 13 };
const EXIT_DOOR = { row: 1, col: 13 };

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
  if (pendingGameOver) {
    return;
  }

  pendingGameOver = true;
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
  if (!isInBounds(row, col)) {
    return false;
  }

  return map[layer][row][col] !== WALL;
};

const isWalkable = (map, layer, row, col, score, totalCubes) => {
  if (!isInBounds(row, col)) {
    return false;
  }

  const tile = map[layer][row][col];

  if (tile === WALL) {
    return false;
  }

  if (tile === DOOR && score < totalCubes) {
    return false;
  }

  return true;
};

const resolveStalkerPosition = (map, layer, row, col) => {
  if (isNotWall(map, layer, row, col)) {
    return { row, col };
  }

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

        if (visited.has(key) || !isInBounds(nextRow, nextCol)) {
          continue;
        }

        visited.add(key);

        if (isNotWall(map, layer, nextRow, nextCol)) {
          return { row: nextRow, col: nextCol };
        }

        nextFrontier.push([nextRow, nextCol]);
      }
    }

    frontier = nextFrontier;
  }

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
  const dx = col - playerCol;
  const dy = row - playerRow;

  return Math.sqrt((dx * dx) + (dy * dy)) <= lightRadius;
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
      row.forEach((tile) => {
        if (tile === CUBE) {
          total += 1;
        }
      });
    });
  });

  return total;
};

const getReservedTiles = () => {
  const reserved = new Set();

  [PLAYER_START, STALKER_START, EXIT_DOOR].forEach(({ row, col }) => {
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
      if (map[layer][row][col] !== FLOOR) {
        continue;
      }

      if (reserved.has(`${row},${col}`)) {
        continue;
      }

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

      if (row === end.row && col === end.col) {
        return true;
      }

      [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ].forEach(([nextRow, nextCol]) => {
        const key = `${nextRow},${nextCol}`;

        if (visited.has(key) || !isInBounds(nextRow, nextCol)) {
          return;
        }

        if (!isTraversibleTile(layer[nextRow][nextCol])) {
          return;
        }

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
  if (hasPath(layer, start, end)) {
    return;
  }

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
  carveFloor(layer, STALKER_START.row, STALKER_START.col);
  layer[STALKER_START.row][STALKER_START.col] = FLOOR;
  layer[EXIT_DOOR.row][EXIT_DOOR.col] = DOOR;
};

const generateMazeLayer = () => {
  const layer = createWalledGrid();
  const stack = [[1, 1]];

  layer[1][1] = FLOOR;

  const directions = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];

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
  ensurePath(layer, STALKER_START, EXIT_DOOR);

  return layer;
};

const createRandomMap = () => [
  generateMazeLayer(),
  generateMazeLayer(),
];

const createPlayingState = () => {
  const map = placeRandomCubes(createRandomMap());
  const seen = createEmptySeen(map.length);

  if (!isNotWall(map, 0, PLAYER_START.row, PLAYER_START.col)) {
    throw new Error('Player spawn is blocked by a wall.');
  }

  const stalker = resolveStalkerPosition(map, 0, STALKER_START.row, STALKER_START.col);

  return updateSeen({
    currentLayer: 0,
    player: { ...PLAYER_START },
    stalker,
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

const applyDimensionTheme = (layer) => {
  document.body.classList.toggle('red-dimension', layer === 0);
  document.body.classList.toggle('blue-dimension', layer === 1);
  
  // Shift the audio texture to match the CSS color!
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
  if (!canShift(gameState)) {
    return gameState;
  }

  const nextLayer = gameState.currentLayer === 0 ? 1 : 0;
  const { stalker, map } = gameState;
  const resolvedStalker = resolveStalkerPosition(
    map,
    nextLayer,
    stalker.row,
    stalker.col,
  );

  let newState = {
    ...gameState,
    currentLayer: nextLayer,
    stalker: resolvedStalker,
  };

  newState = updateSeen(newState);
  applyDimensionTheme(nextLayer);
  newState = checkStalkerCollision(newState);

  return newState;
};

const handleShift = () => {
  if (state.gameStatus !== 'playing' || isShiftOnCooldown) {
    return;
  }

  const nextState = shiftDimension(state);

  if (nextState === state) {
    return;
  }

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
  setTimeout(() => {
    isShiftOnCooldown = false;
  }, SHIFT_COOLDOWN_MS);

  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    finishGame();
  }

  updateHud();
};

const restartGame = () => {
  stopSoundtrack();

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

  if (!isPassable(gameState.currentLayer, nextRow, nextCol)) {
    return gameState;
  }

  return {
    ...gameState,
    player: { row: nextRow, col: nextCol },
  };
};

const moveStalker = (gameState) => {
  const { player, stalker, currentLayer } = gameState;
  const dRow = player.row - stalker.row;
  const dCol = player.col - stalker.col;

  if (dRow === 0 && dCol === 0) {
    return gameState;
  }

  const attempts = Math.abs(dRow) >= Math.abs(dCol)
    ? [[Math.sign(dRow), 0], [0, Math.sign(dCol)]]
    : [[0, Math.sign(dCol)], [Math.sign(dRow), 0]];

  for (const [stepRow, stepCol] of attempts) {
    const nextRow = stalker.row + stepRow;
    const nextCol = stalker.col + stepCol;

    if (isPassable(currentLayer, nextRow, nextCol)) {
      return {
        ...gameState,
        stalker: { row: nextRow, col: nextCol },
      };
    }
  }

  return gameState;
};

const checkStalkerCollision = (gameState) => {
  const { player, stalker } = gameState;

  if (player.row === stalker.row && player.col === stalker.col) {
    return { ...gameState, gameStatus: 'lost' };
  }

  return gameState;
};

const runStalkerTurn = (gameState, bonusSteps = 0) => {
  let nextState = gameState;
  const totalSteps = 1 + bonusSteps;

  for (let step = 0; step < totalSteps && nextState.gameStatus === 'playing'; step += 1) {
    nextState = moveStalker(nextState);
    nextState = checkStalkerCollision(nextState);
  }

  return nextState;
};

const collectCube = (gameState) => {
  const { player, currentLayer, map, score } = gameState;
  const tile = map[currentLayer][player.row][player.col];

  if (tile !== CUBE) {
    return gameState;
  }

  const newMap = cloneMap(map);
  newMap[currentLayer][player.row][player.col] = FLOOR;
  const newScore = score + 1;

  return {
    ...gameState,
    map: newMap,
    score: newScore,
  };
};

const checkExit = (gameState) => {
  if (!allCubesCollected(gameState)) {
    return gameState;
  }

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
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    w: [-1, 0],
    W: [-1, 0],
    s: [1, 0],
    S: [1, 0],
    a: [0, -1],
    A: [0, -1],
    d: [0, 1],
    D: [0, 1],
  };

  const delta = moves[key];
  if (!delta || state.gameStatus !== 'playing') {
    return;
  }

  state = movePlayer(state, delta[0], delta[1]);
  state = updateSeen(state);

  const scoreBeforeCube = state.score;
  state = collectCube(state);
  const collectedCube = state.score > scoreBeforeCube;

  if (collectedCube) {
    playCubeSound();
  }

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

const renderCube = (row, col) => {
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  const size = TILE / 4;

  ctx.fillStyle = '#7ec8ff';
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.strokeStyle = '#c8e8ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - size, y - size, size * 2, size * 2);
};

const renderDoor = (row, col, unlocked) => {
  const x = col * TILE + TILE / 2;
  const y = row * TILE + TILE / 2;
  const width = TILE / 2;
  const height = (TILE * 2) / 3;

  ctx.fillStyle = unlocked ? '#6bdc6b' : '#4a3030';
  ctx.fillRect(x - width / 2, y - height / 2, width, height);
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
};

const renderTile = (row, col, tile, lit, layer) => {
  const x = col * TILE;
  const y = row * TILE;
  const colors = TILE_COLORS[layer];

  if (tile === WALL) {
    ctx.fillStyle = lit ? colors.wallLit : colors.wallDim;
  } else {
    ctx.fillStyle = lit ? colors.floorLit : colors.floorDim;
  }

  ctx.fillRect(x, y, TILE, TILE);

  if (lit) {
    ctx.strokeStyle = layer === 0 ? '#1a0a0a' : '#0a0a1a';
    ctx.strokeRect(x, y, TILE, TILE);
  }
};

const render = () => {
  const { currentLayer, difficulty } = state;
  const { lightRadius } = getDifficultyConfig(difficulty);
  const layer = state.map[currentLayer];
  const seenLayer = state.seen[currentLayer];
  const { row: playerRow, col: playerCol } = state.player;
  const { row: stalkerRow, col: stalkerCol } = state.stalker;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const lit = isInLight(row, col, playerRow, playerCol, lightRadius);
      const explored = seenLayer[row][col];

      if (!lit && !explored) {
        continue;
      }

      renderTile(row, col, layer[row][col], lit, currentLayer);

      if (lit && layer[row][col] === CUBE) {
        renderCube(row, col);
      }

      if (lit && layer[row][col] === DOOR) {
        renderDoor(row, col, allCubesCollected(state));
      }
    }
  }

  if (isInLight(stalkerRow, stalkerCol, playerRow, playerCol, lightRadius)) {
    renderStalker(stalkerRow, stalkerCol);
  }

  drawEntity(playerRow, playerCol, '#f5d76e');
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

  const movementKeys = [
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'w',
    'W',
    'a',
    'A',
    's',
    'S',
    'd',
    'D',
  ];

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

updateHighScoreDisplay();
updateHint();
gameLoop();
