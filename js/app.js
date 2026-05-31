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
  stalker: { row: 9, col: 13 },
  caught: false,
  map: [LAYER_0],
});

let state = createInitialState();

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
    return { ...gameState, caught: true };
  }

  return gameState;
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
  if (!delta || state.caught) {
    return;
  }

  state = movePlayer(state, delta[0], delta[1]);
  state = moveStalker(state);
  state = checkStalkerCollision(state);
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

const render = () => {
  const layer = state.map[state.currentLayer];
  const { row: playerRow, col: playerCol } = state.player;
  const { row: stalkerRow, col: stalkerCol } = state.stalker;

  ctx.fillStyle = state.caught ? '#3a0808' : '#0d0505';
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

  renderStalker(stalkerRow, stalkerCol);
  drawEntity(playerRow, playerCol, '#f5d76e');

  if (state.caught) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Caught!', canvas.width / 2, canvas.height / 2);
  }
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
