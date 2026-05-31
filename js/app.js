const TILE = 32;
const COLS = 15;
const ROWS = 11;

const WALL = 1;
const FLOOR = 0;
const CUBE = 2;
const DOOR = 3;
const LIGHT_RADIUS = 2.5;

const PLAYER_START = { row: 1, col: 1 };
const STALKER_START = { row: 9, col: 13 };
const EXIT_DOOR = { row: 1, col: 13 };

const LAYER_0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 3],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const LAYER_1 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 3],
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

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
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

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

const isInLight = (row, col, playerRow, playerCol) => {
  const dx = col - playerCol;
  const dy = row - playerRow;

  return Math.sqrt((dx * dx) + (dy * dy)) <= LIGHT_RADIUS;
};

const updateSeen = (gameState) => {
  const { player, currentLayer, seen } = gameState;
  const newSeen = cloneSeen(seen);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (isInLight(row, col, player.row, player.col)) {
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

const createPlayingState = () => {
  const map = cloneMap([LAYER_0, LAYER_1]);
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
  isShiftOnCooldown = true;
  setTimeout(() => {
    isShiftOnCooldown = false;
  }, SHIFT_COOLDOWN_MS);

  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    showGameOver();
  }

  updateHud();
};

const restartGame = () => {
  startGame();
};

const startGame = () => {
  state = createPlayingState();
  isShiftOnCooldown = false;
  applyDimensionTheme(0);
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  gameOverScreen.classList.remove('win', 'lost');
  hud.classList.remove('hidden');
  updateHud();
};

const showGameOver = () => {
  gameOverScreen.classList.remove('win', 'lost');

  if (state.gameStatus === 'won') {
    gameOverTitle.textContent = 'You Win';
    gameOverMessage.textContent = 'All cubes collected — you escaped through the exit!';
    gameOverScreen.classList.add('win');
  } else {
    gameOverTitle.textContent = 'You Lose';
    gameOverMessage.textContent = `Collected ${state.score} / ${state.totalCubes} cubes.`;
    gameOverScreen.classList.add('lost');
  }

  gameOverScreen.classList.remove('hidden');
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

  hud.textContent = `Cubes: ${state.score} / ${state.totalCubes} | ${layerName} | ${exitStatus}`;
};

const handleInput = (key) => {
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
  state = collectCube(state);
  state = checkExit(state);

  if (state.gameStatus === 'playing') {
    state = moveStalker(state);
    state = checkStalkerCollision(state);
  }

  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    showGameOver();
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
  const { currentLayer } = state;
  const layer = state.map[currentLayer];
  const seenLayer = state.seen[currentLayer];
  const { row: playerRow, col: playerCol } = state.player;
  const { row: stalkerRow, col: stalkerCol } = state.stalker;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const lit = isInLight(row, col, playerRow, playerCol);
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

  if (isInLight(stalkerRow, stalkerCol, playerRow, playerCol)) {
    renderStalker(stalkerRow, stalkerCol);
  }

  drawEntity(playerRow, playerCol, '#f5d76e');
};

const gameLoop = () => {
  render();
  requestAnimationFrame(gameLoop);
};

window.addEventListener('keydown', (event) => {
  if (state.gameStatus === 'start' && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    startGame();
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

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

gameLoop();
