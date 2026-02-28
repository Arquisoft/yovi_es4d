const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8003;

const GAMEY_BOT_URL = 'http://gamey:3001' || 'http://localhost:3001';

app.use(cors());
app.use(express.json());

const games = new Map();

// ================= CONFIGURACIÓN DE MODOS DE BOT =================

/**
 * Mapa de botMode → ruta Rust.
 * Para añadir un nuevo bot basta con agregar una entrada aquí.
 */
const BOT_ROUTES = {
  random_bot:       '/v1/ybot/choose/random_bot',
  intermediate_bot: '/v1/ybot/choose/intermediate_bot',
  // hard_bot:      '/v1/ybot/choose/hard_bot',   ← ejemplo futuro
};

const DEFAULT_BOT_MODE = 'random_bot';

/**
 * Devuelve la ruta Rust para el botMode dado.
 * Lanza un error descriptivo si el modo no existe.
 */
function getBotRoute(botMode) {
  const route = BOT_ROUTES[botMode];
  if (!route) {
    const available = Object.keys(BOT_ROUTES).join(', ');
    throw new Error(`Bot mode desconocido: "${botMode}". Disponibles: ${available}`);
  }
  return route;
}

// ================= ENDPOINTS =================

/**
 * Iniciar un nuevo juego.
 * Body: { userId, gameMode?, botMode? }
 *   gameMode : 'vsBot' | 'multiplayer'  (default: 'vsBot')
 *   botMode  : 'random_bot' | 'intermediate_bot' | ...  (default: 'random_bot')
 */
app.post('/api/game/start', async (req, res) => {
  try {
    const {
      userId,
      gameMode = 'vsBot',
      botMode  = DEFAULT_BOT_MODE,
    } = req.body;

    // Validar botMode antes de crear el juego
    if (gameMode === 'vsBot') getBotRoute(botMode); // lanza si es inválido

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const boardSize = 11;

    await axios.post(`${GAMEY_BOT_URL}/v1/game/start`, { board_size: boardSize }, { timeout: 5000 });

    const game = {
      gameId,
      userId,
      gameMode,
      botMode,           // ← guardamos el modo elegido
      boardSize,
      board: initializeBoard(boardSize),
      players: [
        { id: userId,                                       name: 'Player 1', color: 'j1', points: 0 },
        { id: gameMode === 'vsBot' ? 'bot' : 'player2',    name: gameMode === 'vsBot' ? 'Bot' : 'Player 2', color: 'j2', points: 0 },
      ],
      currentPlayer: 'j1',
      moves: [],
      status: 'active',
      winner: null,
      createdAt: new Date(),
    };

    games.set(gameId, game);

    res.json({
      gameId:   game.gameId,
      board:    game.board,
      players:  game.players,
      turn:     game.currentPlayer,
      status:   game.status,
      botMode:  game.botMode,
      winner:   null,
    });

  } catch (error) {
    console.error('❌ Error starting game:', error.message);
    const status = error.message.startsWith('Bot mode desconocido') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * Devuelve los modos de bot disponibles.
 * El cliente puede usarlo para construir el selector de dificultad.
 */
app.get('/api/game/bot-modes', (req, res) => {
  res.json({ botModes: Object.keys(BOT_ROUTES) });
});

/**
 * Validar y aplicar movimiento del jugador humano.
 */
app.post('/api/game/:gameId/validateMove', async (req, res) => {
  const { gameId } = req.params;
  const { move, userId } = req.body;

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const [x, y, z] = move.replace(/[()]/g, '').split(',').map(v => Number(v.trim()));
  const rustResponse = await axios.post(`${GAMEY_BOT_URL}/v1/game/move`, {
    x, y, z,
    player: userId === 'j1' ? 0 : 1,
  });

  game.currentPlayer = 'j2';
  applyBoardUpdate(game, rustResponse.data.board);

  res.json({
    valid:  true,
    winner: rustResponse.data.status === 'finished' ? (rustResponse.data.winner === 0 ? 'j1' : 'j2') : null,
    status: rustResponse.data.status,
  });
});

/**
 * Movimiento del bot (vsBot).
 * Usa el botMode almacenado en el juego para elegir la ruta Rust correcta.
 */
app.post('/api/game/:gameId/vsBot/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = games.get(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.currentPlayer !== 'j2') {
      return res.status(400).json({ message: 'No es turno del bot', valid: false });
    }

    // Bot "piensa"
    await sleep(Math.floor(Math.random() * 1000) + 1000);

    // Ruta dinámica según el botMode guardado en el juego
    const botRoute = getBotRoute(game.botMode);
    const rustResponse = await axios.post(`${GAMEY_BOT_URL}${botRoute}`, convertToYEN(game));

    if (!rustResponse.data?.board) {
      return res.status(500).json({ error: 'Rust no devolvió tablero' });
    }

    applyBoardUpdate(game, rustResponse.data.board);
    game.currentPlayer = rustResponse.data.turn === 0 ? 'j1' : 'j2';

    if (rustResponse.data.status === 'finished') {
      game.status = 'finished';
      game.winner = rustResponse.data.winner === 0 ? 'j1' : 'j2';
    }

    res.json({
      gameId,
      board:  game.board,
      moves:  game.moves,
      turn:   game.currentPlayer,
      winner: game.winner || null,
      status: game.status,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Movimiento 1vs1 (vacío de momento).
 */
app.post('/api/game/:gameId/multiplayer/move', (req, res) => {
  res.json({ message: 'Multiplayer move endpoint (empty)' });
});

/**
 * Obtener estado del juego.
 */
app.get('/api/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  res.json({
    gameId,
    board:   game.board,
    players: game.players,
    moves:   game.moves,
    turn:    game.currentPlayer,
    status:  game.status,
    botMode: game.botMode,
    winner:  game.winner || null,
  });
});

/**
 * Finalizar y guardar juego.
 */
app.post('/api/game/endAndSaveGame', async (req, res) => {
  const { gameId } = req.body;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  game.status = 'finished';
  await axios.post(`${GAMEY_BOT_URL}/v1/game/end`, { game_id: gameId });

  res.json({
    gameId,
    status: 'Game saved',
    result: {
      winner:   game.winner || 'draw',
      moves:    game.moves.length,
      duration: new Date() - game.createdAt,
    },
  });
});

// ================= FUNCIONES AUXILIARES =================

/**
 * Aplica la lista de celdas devuelta por Rust sobre el tablero local.
 */
function applyBoardUpdate(game, rustBoard) {
  rustBoard.forEach(move => {
    const cell = game.board.find(c => {
      const [x, y, z] = c.position.replace(/[()]/g, '').split(',').map(Number);
      return x === move.x && y === move.y && z === move.z;
    });
    if (cell) cell.player = move.player === 0 ? 'j1' : 'j2';
  });
}

function initializeBoard(boardSize) {
  const total = (boardSize * (boardSize + 1)) / 2;
  const board = [];
  for (let i = 0; i < total; i++) {
    const { x, y, z } = indexToCoords(i, boardSize);
    board.push({ position: `(${x},${y},${z})`, player: null });
  }
  return board;
}

function convertToYEN(game) {
  const size = game.boardSize;
  const players = ['B', 'R'];
  const turn = game.currentPlayer === 'j1' ? 0 : 1;
  const rows = [];
  let idx = 0;
  for (let r = 0; r < size; r++) {
    let row = '';
    for (let c = 0; c <= r; c++) {
      const cell = game.board[idx];
      if (!cell || cell.player === null) row += '.';
      else if (cell.player === 'j1') row += players[0];
      else if (cell.player === 'j2') row += players[1];
      idx++;
    }
    rows.push(row);
  }
  return { size, turn, players, layout: rows.join('/') };
}

function indexToCoords(index, boardSize) {
  const r = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
  const rowStart = (r * (r + 1)) / 2;
  const c = index - rowStart;
  const x = boardSize - 1 - r;
  const y = c;
  const z = boardSize - 1 - x - y;
  return { x, y, z };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'Game Service is running' }));

app.listen(port, '0.0.0.0', () => console.log(`Game Service listening on ${port}`));

module.exports = app;