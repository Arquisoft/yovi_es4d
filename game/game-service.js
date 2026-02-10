const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8003;

// URL del servidor bot de Gamey
const GAMEY_BOT_URL = process.env.GAMEY_BOT_URL || 'http://localhost:3001';

console.log('Game Service starting...');

app.use(cors());
app.use(express.json());
const games = new Map();


/**
 * Iniciar un nuevo juego
 * POST /api/game/start
 */
app.post('/api/game/start', async (req, res) => {
  try {
    const { userId, gameMode = 'vsBot' } = req.body;

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const boardSize = 11;

    // 🦀 1️⃣ Avisar a Rust (solo logging / init por ahora)
     await axios.post(`${GAMEY_BOT_URL}/v1/game/start`, {
      board_size: boardSize
    });
    
    // 🎮 2️⃣ Crear estado del juego en Node
    const game = {
      gameId,
      userId,
      gameMode,
      boardSize,
      board: initializeBoard(boardSize),
      players: [
        { id: userId, name: 'Player 1', color: 'j1', points: 0 },
        {
          id: gameMode === 'vsBot' ? 'bot' : 'player2',
          name: gameMode === 'vsBot' ? 'Bot' : 'Player 2',
          color: 'j2',
          points: 0
        }
      ],
      currentPlayer: 'j1',
      moves: [],
      status: 'active',
      winner: null,
      createdAt: new Date()
    };

    games.set(gameId, game);

  
        // 📤 3️⃣ Respuesta al frontend
    res.json({
      gameId: game.gameId,
      board: game.board,
      players: game.players,
      turn: game.currentPlayer,
      status: game.status,
      winner: null
    });
  
  } catch (error) {
    console.error('❌ Error starting game:', error.message);
    res.status(500).json({ error: 'Error iniciando juego' });
  }
});


app.post('/api/game/:gameId/validateMove', async (req, res) => {
  const { gameId } = req.params;
  const { move, userId } = req.body;

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  
  const [x, y, z] = move
  .replace(/[()]/g, '')   // quita ( )
  .split(',')
  .map(v => Number(v.trim()));
console.log(userId);
 const rustResponse = await axios.post(`${GAMEY_BOT_URL}/v1/game/move`, {
  x, y, z,
  player: userId == 'j1' ? 0 : 1
});
 
  // 2️⃣ actualizar Node.js con la respuesta de Rust
game.board = rustResponse.data.board;
game.moves.push({ userId, position: move, timestamp: new Date() });

// 3️⃣ cambiar turno inmediatamente
game.currentPlayer = 'j2'; // ahora sí es turno del bot
  
  res.json({ valid: true });
});

/**
 * Mover jugador vs Bot
 * POST /api/game/:gameId/vsBot/move
 */
app.post('/api/game/:gameId/vsBot/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = games.get(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });
console.log('💡 Antes de que el bot mueva:');
  console.log('Turno actual Node.js:', game.currentPlayer);

    // Solo mover si es turno del bot
    if (game.currentPlayer !== 'j2') {
      return res.status(400).json({ message: 'No es turno del bot', valid: false });
    }

    // Bot “piensa”
    await sleep(Math.floor(Math.random() * 1000) + 1000);

    // Pedir movimiento al bot (API externa)
    // Llamar al endpoint del bot para generar movimiento
    const botResponse = await axios.post(
      `${GAMEY_BOT_URL}/v1/ybot/choose/random_bot`,
      convertToYEN(game)
    );
console.log('💡 Después de mover en Rust:');
  console.log('Turno retornado por Rust:', botResponse);
  

    const botMove = botResponse.data.bot_move;

    // Ahora sí movemos en Rust
    const rustResponse = await axios.post(
      `${GAMEY_BOT_URL}/v1/game/move`,
      {
        x: botMove.x,
        y: botMove.y,
        z: botMove.z,
        player: 1
      }
    );
  console.log('Turno Node.js actualizado:', game.currentPlayer);

console.log('💡 Después de mover en Rust:');
  console.log('Turno retornado por Rust:', rustResponse.data.turn === 0 ? 'j1' : 'j2');

    if (!rustResponse.data?.board) {
      return res.status(500).json({ error: 'Rust no devolvió tablero' });
    }

    // Actualizar memoria Node.js
    game.board = rustResponse.data.board;
    game.moves.push({ player: 'j2', position: botMove, timestamp: new Date() });
    game.currentPlayer = rustResponse.data.turn === 0 ? 'j1' : 'j2';

    if (rustResponse.data.status === 'finished') {
      game.status = 'finished';
      game.winner = rustResponse.data.winner;
    }

    // Devolver tablero actualizado
    res.json({
      gameId,
      board: game.board,
      moves: game.moves,
      turn: game.currentPlayer,
      winner: game.winner || null,
      status: game.status
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/*
 * Mover jugador 1vs1 (vacío de momento)
 * POST /api/game/:gameId/multiplayer/move
 */
app.post('/api/game/:gameId/multiplayer/move', (req, res) => {
  // No hacemos nada aún, solo devolver JSON de prueba
  res.json({ message: 'Multiplayer move endpoint (empty)' });
});

/**
 * Obtener estado del juego
 * GET /api/game/:gameId
 */
app.get('/api/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  res.json({
    gameId,
    board: game.board,
    players: game.players,
    moves: game.moves,
    turn: game.currentPlayer,
    status: game.status,
    winner: game.winner || null
  });
});

/**
 * Finalizar y guardar juego
 * POST /api/game/endAndSaveGame
 */
app.post('/api/game/endAndSaveGame', async (req, res) => {
  const { gameId } = req.body;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  game.status = 'finished';

  await axios.post(`${GAMEY_BOT_URL}/v1/game/end`, {
    game_id: gameId
  });

  res.json({
    gameId,
    status: 'Game saved',
    result: {
      winner: game.winner || 'draw',
      moves: game.moves.length,
      duration: new Date() - game.createdAt
    }
  });
});

// ================= FUNCIONES AUXILIARES =================
function initializeBoard(boardSize) {
  const total = (boardSize * (boardSize + 1)) / 2;
  const board = [];
  for (let i = 0; i < total; i++) {
    const { x, y, z } = indexToCoords(i, boardSize);
    board.push({ position: `(${x},${y},${z})`, player: null });
  }
  return board;
}

function updateBoard(game, position, player) {
  let norm = normalizePosition(game, position);
  const hex = game.board.find(h => h.position === norm);
  if (hex) hex.player = player;
}

function isCellEmpty(game, position) {
  const norm = normalizePosition(game, position);
  const hex = game.board.find(h => h.position === norm);
  return hex ? hex.player === null : false;
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

function normalizePosition(game, position) {
  if (!position && position !== 0) return null;
  if (typeof position === 'object' && position.x !== undefined) {
    return `(${position.x},${position.y},${position.z})`;
  }
  if (typeof position === 'string') {
    const cleaned = position.replace(/[()]/g, '');
    const parts = cleaned.split(',').map(s => s.trim());
    if (parts.length === 3) return `(${parts[0]},${parts[1]},${parts[2]})`;
    if (!isNaN(Number(position))) {
      const c = indexToCoords(Number(position), game.boardSize);
      return `(${c.x},${c.y},${c.z})`;
    }
  }
  if (typeof position === 'number') {
    const c = indexToCoords(position, game.boardSize);
    return `(${c.x},${c.y},${c.z})`;
  }
  return null;
}

function getRandomMove(board) {
  const emptyHexes = board.filter(h => h.player === null);
  if (emptyHexes.length === 0) return null;
  return emptyHexes[Math.floor(Math.random() * emptyHexes.length)].position;
}

function checkWinner(board) {
  return null; // placeholder
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Game Service is running' });
});

app.listen(port, () => console.log(`Game Service listening on port ${port}`));

module.exports = app;
