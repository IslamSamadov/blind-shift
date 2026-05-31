const TILE = 32;
const COLS = 15;
const ROWS = 11;

const WALL = 1;
const FLOOR = 0;
const CUBE = 2;

const LAYER_0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const cloneMap = (map) => map.map((layer) => layer.map((row) => [...row]));

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
  const map = cloneMap([LAYER_0]);

  return {
    currentLayer: 0,
    player: { row: 1, col: 1 },
    stalker: { row: 9, col: 13 },
    score: 0,
    totalCubes: countCubes(map),
    gameStatus: 'playing',
    map,
  };
};

const createPreviewState = () => ({
  ...createPlayingState(),
  gameStatus: 'start',
});

let state = createPreviewState();

const restartGame = () => {
  startGame();
};

const startGame = () => {
  state = createPlayingState();
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
    gameOverMessage.textContent = `All ${state.totalCubes} cubes collected!`;
    gameOverScreen.classList.add('win');
  } else {
    gameOverTitle.textContent = 'You Lose';
    gameOverMessage.textContent = `Collected ${state.score} / ${state.totalCubes} cubes.`;
    gameOverScreen.classList.add('lost');
  }

  gameOverScreen.classList.remove('hidden');
};

const isPassable = (layer, row, col) => {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return false;
  }

  return state.map[layer][row][col] !== WALL;
};

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
  const cubesRemaining = countCubes(newMap);

  return {
    ...gameState,
    map: newMap,
    score: newScore,
    gameStatus: cubesRemaining === 0 ? 'won' : gameState.gameStatus,
  };
};

const updateHud = () => {
  hud.textContent = `Cubes: ${state.score} / ${state.totalCubes}`;
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
  state = collectCube(state);

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

const render = () => {
  const layer = state.map[state.currentLayer];
  const { row: playerRow, col: playerCol } = state.player;
  const { row: stalkerRow, col: stalkerCol } = state.stalker;

  ctx.fillStyle = '#0d0505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = row * TILE;
      const tile = layer[row][col];

      if (tile === WALL) {
        ctx.fillStyle = '#5c2020';
      } else {
        ctx.fillStyle = '#2a1212';
      }

      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#1a0a0a';
      ctx.strokeRect(x, y, TILE, TILE);

      if (tile === CUBE) {
        renderCube(row, col);
      }
    }
  }

  renderStalker(stalkerRow, stalkerCol);
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
  }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

gameLoop();
