const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8003;

const mongoose = require('mongoose');

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/gameDB')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Esquema de Game
const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  userId: String,
  gameMode: String,
  boardSize: Number,
  board: [{ position: String, player: String }],
  players: [{
    id: String,
    role: String,
    name: String,
    color: String,
    points: Number
  }],
  moves: [mongoose.Schema.Types.Mixed],
  status: String,
  winner: String,
  createdAt: Date,
  finishedAt: Date
});

const GameModel = mongoose.model('Game', gameSchema);

// URL del servidor bot de Rust/Gamey
const GAMEY_BOT_URL =  'http://localhost:3001';

app.use(cors());
app.use(express.json());
const games = new Map();

/**
 * Iniciar un nuevo juego
 */
app.post('/api/game/start', async (req, res) => {
  try {
    const { userId, role = 'j1', gameMode = 'vsBot' } = req.body;

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const boardSize = 11;

    // Inicializa juego en Rust (solo logging por ahora)
    await axios.post(`${GAMEY_BOT_URL}/v1/game/start`, { board_size: boardSize }, { timeout: 5000 });

    // Crear estado del juego en Node
    const game = {
      gameId,
      userId,
      role, // <-- nuevo
      gameMode,
      boardSize,
      board: initializeBoard(boardSize),
      players: [
        { id: userId, role, name: 'Player 1', color: 'j1', points: 0 },
        { id: gameMode === 'vsBot' ? 'bot' : 'player2', role: 'j2', name: gameMode === 'vsBot' ? 'Bot' : 'Player 2', color: 'j2', points: 0 }
      ],
      currentPlayer: 'j1',
      moves: [],
      status: 'active',
      winner: null,
      createdAt: new Date()
    };

    games.set(gameId, game);

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

/**
 * Validar movimiento del usuario antes de enviarlo a Rust
 */
app.post('/api/game/:gameId/validateMove', async (req, res) => {
  const { gameId } = req.params;
  const { move, userId, role } = req.body;

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const [x, y, z] = move.replace(/[()]/g, '').split(',').map(v => Number(v.trim()));

  const rustResponse = await axios.post(`${GAMEY_BOT_URL}/v1/game/move`, {
    x, y, z,
    player: role === 'j1' ? 0 : 1
  });

  // ✅ GUARDAR MOVIMIENTO EN MEMORIA
  game.moves.push({
    position: move,
    player: role,
    userId: userId
  });

  game.currentPlayer = 'j2';

  if (rustResponse.data.status === 'finished') {
    game.winner = rustResponse.data.winner === 0 ? 'j1' : 'j2';
    await finishGameAndSave(game);
  }

  res.json({
    valid: true,
    status: rustResponse.data.status
  });
});

/**
 * Movimiento del bot en modo vsBot
 */
app.post('/api/game/:gameId/vsBot/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { role } = req.body; // <-- agregado role
    const game = games.get(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.currentPlayer !== 'j2') {
      return res.status(400).json({ message: 'No es turno del bot', valid: false });
    }

    await sleep(Math.floor(Math.random() * 1000) + 1000);

    // Llamar a Rust para obtener movimiento del bot
    const rustResponse = await axios.post(
      `${GAMEY_BOT_URL}/v1/ybot/choose/random_bot`,
      convertToYEN(game)
    );

    if (!rustResponse.data?.board) {
      return res.status(500).json({ error: 'Rust no devolvió tablero' });
    }

    // Actualizar solo la celda correspondiente
    rustResponse.data.board.forEach(m => {
  const cell = game.board.find(c => {
    const [x, y, z] = c.position.replace(/[()]/g,'').split(',').map(Number);
    return x === m.x && y === m.y && z === m.z;
  });

  if (cell && cell.player === null) {
    cell.player = m.player === 0 ? 'j1' : 'j2';

    game.moves.push({
      position: `(${m.x},${m.y},${m.z})`,
      player: 'j2',
      userId: 'bot'
    });
  }
});

    game.currentPlayer = rustResponse.data.turn === 0 ? 'j1' : 'j2';

    if (rustResponse.data.status === 'finished') {
      game.status = 'finished';
      game.winner = rustResponse.data.winner === 0 ? 'j1' : 'j2';
        // Guardar automáticamente
      await finishGameAndSave(game);
    }

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

/**
 * Movimiento 1vs1 (vacío de momento)
 */
app.post('/api/game/:gameId/multiplayer/move', (req, res) => {
  res.json({ message: 'Multiplayer move endpoint (empty)' });
});

/**
 * Obtener estado del juego
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

async function finishGameAndSave(game) {
  game.status = 'finished';
  game.finishedAt = new Date();

  try {
    await GameModel.findOneAndUpdate(
      { gameId: game.gameId },
      {
        gameId: game.gameId,
        userId: game.userId,
        gameMode: game.gameMode,
        boardSize: game.boardSize,
        players: game.players,
        moves: game.moves,
        status: game.status,   
        winner: game.winner,
        createdAt: game.createdAt,
        finishedAt: game.finishedAt
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Juego ${game.gameId} guardado en DB`);
  } catch (err) {
    console.error('❌ Error guardando juego:', err);
  }
}

/**
 * Finalizar y guardar juego
 
app.post('/api/game/endAndSaveGame', async (req, res) => {
  const { gameId } = req.body;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  game.status = 'finished';
  game.finishedAt = new Date();

  try {
    // Guardar en MongoDB
    const savedGame = await GameModel.findOneAndUpdate(
      { gameId },
      game,
      { upsert: true, new: true }
    );

    // Notificar a Rust (opcional)
    await axios.post(`${GAMEY_BOT_URL}/v1/game/end`, { game_id: gameId });

    res.json({
      gameId,
      status: 'Game saved',
      result: {
        winner: game.winner || 'draw',
        moves: game.moves.length,
        duration: game.finishedAt - game.createdAt
      }
    });
  } catch (err) {
    console.error('❌ Error saving game:', err);
    res.status(500).json({ error: 'Error saving game' });
  }
});*/
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

app.listen(port, "0.0.0.0", () => console.log(`Game Service listening on ${port}`));

module.exports = app;