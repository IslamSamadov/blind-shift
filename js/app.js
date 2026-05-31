const TILE = 32;
const COLS = 15;
const ROWS = 11;

const WALL = 1;
const FLOOR = 0;

const LAYER_0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const createInitialState = () => ({
  currentLayer: 0,
  player: { row: 1, col: 1 },
  map: [LAYER_0],
});

let state = createInitialState();

const isPassable = (layer, row, col) => {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return false;
  }

  return state.map[layer][row][col] !== WALL;
};

const movePlayer = (dRow, dCol) => {
  const { row, col } = state.player;
  const nextRow = row + dRow;
  const nextCol = col + dCol;

  if (!isPassable(state.currentLayer, nextRow, nextCol)) {
    return state;
  }

  return {
    ...state,
    player: { row: nextRow, col: nextCol },
  };
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
  if (!delta) {
    return;
  }

  state = movePlayer(delta[0], delta[1]);
};

const render = () => {
  const layer = state.map[state.currentLayer];
  const { row: playerRow, col: playerCol } = state.player;

  ctx.fillStyle = '#0d0505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = col * TILE;
      const y = row * TILE;

      if (layer[row][col] === WALL) {
        ctx.fillStyle = '#5c2020';
      } else {
        ctx.fillStyle = '#2a1212';
      }

      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#1a0a0a';
      ctx.strokeRect(x, y, TILE, TILE);
    }
  }

  const playerX = playerCol * TILE;
  const playerY = playerRow * TILE;

  ctx.fillStyle = '#f5d76e';
  ctx.beginPath();
  ctx.arc(playerX + TILE / 2, playerY + TILE / 2, TILE / 3, 0, Math.PI * 2);
  ctx.fill();
};

const gameLoop = () => {
  render();
  requestAnimationFrame(gameLoop);
};

window.addEventListener('keydown', (event) => {
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

gameLoop();
