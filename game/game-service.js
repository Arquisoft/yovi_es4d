/**
 * Módulo del Servicio de Juego
 *
 * Este módulo proporciona el servicio de juego para la aplicación YOVI ES4D.
 * Maneja la inicialización de juegos, movimientos, interacciones con bots y persistencia de juegos usando MongoDB.
 * El servicio se integra con un servidor de bots basado en Rust para la lógica del juego.
 *
 * @module game-service
 */
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8003;


const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameDB';

if (process.env.SKIP_MONGO !== 'true') {
  mongoose.connect(mongoUri)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));
}

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
const GAMEY_BOT_URL = process.env.GAMEY_BOT_URL || 'http://gamey_es4d:3001';

app.use(cors());
app.use(express.json());
const games = new Map();

// Rutas de bots disponibles
const BOT_ROUTES = {
  random_bot:       '/v1/ybot/choose/random_bot',
  intermediate_bot: '/v1/ybot/choose/intermediate_bot',
  hard_bot:      '/v1/ybot/choose/hard_bot',
};

/**
 * Obtener modos de bot disponibles
 * @route {GET} /api/game/bot-modes
 * @returns {Object} Objeto JSON con array de botModes
 */
app.get('/api/game/bot-modes', (req, res) => {
  res.json({ botModes: Object.keys(BOT_ROUTES) });
});

/**
 * Endpoint público para competición entre bots.
 * Recibe un estado de tablero en formato YEN y devuelve la jugada del bot indicado.
 * @route {GET} /play
 * @param {string} req.query.position - Estado del tablero en JSON YEN (obligatorio)
 * @param {string} [req.query.bot_id] - Identificador del bot. Por defecto: hard_bot
 * @returns {Object} {"coords":{"x":N,"y":N,"z":N}} o {"action":"resign"}
 * @throws {400} Si falta position
 * @throws {500} Si hay un error en el bot
 */
app.get('/play', async (req, res) => {
  const { position, bot_id } = req.query;
  if (!position) return res.status(400).json({ error: 'position requerido' });
  try {
    const response = await axios.get(`${GAMEY_BOT_URL}/play`, {
      params: { position, bot_id: bot_id || 'hard_bot' },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Error en el bot' });
  }
});

/**
 * Obtener historial de juegos de un usuario
 * @route {GET} /api/game/history
 * @param {string} req.query.userId - El ID de usuario para obtener el historial
 * @returns {Array} Array de objetos de juego ordenados por fecha de creación
 * @throws {400} Si falta userId
 * @throws {500} Si hay un error al obtener el historial
 */
app.get('/api/game/history', async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'Falta userId en la query' });
    }

    const filtro = { userId };

    const games = await GameModel.find(filtro)
      .sort({ createdAt: -1 })
      .lean();

    res.json(games);

  } catch (error) {
    console.error('[HISTORIAL] Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});


/**
 * Iniciar un nuevo juego
 * @route {POST} /api/game/start
 * @param {Object} req.body
 * @param {string} req.body.userId - El ID de usuario que inicia el juego
 * @param {string} [req.body.role='j1'] - El rol del usuario (j1 o j2)
 * @param {string} [req.body.gameMode='vsBot'] - El modo de juego (vsBot o multiplayer)
 * @param {string} [req.body.botMode='random_bot'] - La dificultad del bot (para modo vsBot)
 * @param {number} [req.body.boardSize=11] - El tamaño del tablero (8, 11, 15, 19)
 * @returns {Object} Datos de inicialización del juego
 * @throws {500} Si hay un error al iniciar el juego
 */
app.post('/api/game/start', async (req, res) => {
  try {
    const {
      userId,
      role      = 'j1',
      gameMode  = 'vsBot',
      botMode   = 'random_bot',
      boardSize: rawBoardSize = 11,
    } = req.body;

    const ALLOWED_BOARD_SIZES = [8, 11, 15, 19];
    const boardSize = ALLOWED_BOARD_SIZES.includes(Number(rawBoardSize))
      ? Number(rawBoardSize)
      : 11;

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await axios.post(`${GAMEY_BOT_URL}/v1/game/start`, { board_size: boardSize, game_id: gameId }, { timeout: 5000 });

    // Crear estado del juego en Node
    const game = {
      gameId,
      userId,
      role,
      gameMode,
      botMode,
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
    console.log("BOT URL:", GAMEY_BOT_URL);
    console.error('❌ Error starting game:', error.message);
    res.status(500).json({ error: 'Error iniciando juego' });
  }
});

/**
 * Validar y procesar un movimiento del usuario
 * @route {POST} /api/game/:gameId/validateMove
 * @param {string} req.params.gameId - El ID del juego
 * @param {Object} req.body
 * @param {string} req.body.move - La posición del movimiento en formato (x,y,z)
 * @param {string} req.body.userId - El ID de usuario que hace el movimiento
 * @returns {Object} Resultado de validación con estado del juego
 * @throws {404} Si el juego no se encuentra
 * @throws {500} Si hay un error al validar el movimiento
 */
app.post('/api/game/:gameId/validateMove', async (req, res) => {
  const { gameId } = req.params;
  const { move, userId } = req.body;

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const [x, y, z] = move.replace(/[()]/g, '').split(',').map(v => Number(v.trim()));

  // Usamos el turno actual del juego para determinar el player
  // (no el userId, que puede variar según el JWT)
  const playerNum = game.currentPlayer === 'j1' ? 0 : 1;

  const rustResponse = await axios.post(`${GAMEY_BOT_URL}/v1/game/move`, {
    x, y, z,
    player: playerNum,
    game_id: gameId
  });

  game.moves.push({
    position: move,
    userId: userId
  });

  game.currentPlayer = game.currentPlayer === 'j1' ? 'j2' : 'j1';

  if (rustResponse.data.status === 'finished') {
    game.winner = rustResponse.data.winner === 0 ? 'j1' : 'j2';
    await finishGameAndSave(game);
  }
 rustResponse.data.board.forEach(move => {
  const cell = game.board.find(c => {
    const [x, y, z] = c.position.replace(/[()]/g,'').split(',').map(Number);
    return x === move.x && y === move.y && z === move.z;
  });
  if (cell) cell.player = move.player === 0 ? 'j1' : 'j2';
});
  res.json({ valid: true,
    winner: rustResponse.data.status === 'finished' ? (rustResponse.data.winner === 0 ? 'j1' : 'j2') : null,
    status: rustResponse.data.status
   });
});

/**
 * Procesar movimiento del bot en modo vsBot
 * @route {POST} /api/game/:gameId/vsBot/move
 * @param {string} req.params.gameId - El ID del juego
 * @param {Object} req.body
 * @param {string} req.body.role - El rol (debe ser j2 para el bot)
 * @returns {Object} Estado actualizado del juego después del movimiento del bot
 * @throws {404} Si el juego no se encuentra
 * @throws {400} Si no es el turno del bot
 * @throws {500} Si hay un error al procesar el movimiento del bot
 */
app.post('/api/game/:gameId/vsBot/move', async (req, res) => {
  
  try {
    const { gameId } = req.params;
    const { role } = req.body; 
    const game = games.get(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.currentPlayer !== 'j2') {
      return res.status(400).json({ message: 'No es turno del bot', valid: false });
    }

    await sleep(Math.floor(Math.random() * 1000) + 1000);

    // Llamar a Rust usando el botMode guardado en el juego
    const botRoute = BOT_ROUTES[game.botMode] || BOT_ROUTES['random_bot'];
    const rustResponse = await axios.post(
      `${GAMEY_BOT_URL}${botRoute}`,
      { ...convertToYEN(game), game_id: gameId }
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
 * Movimiento 1vs1 
 * Procesar movimiento en modo multijugador (placeholder)
 * @route {POST} /api/game/:gameId/multiplayer/move
 * @param {string} req.params.gameId - El ID del juego
 * @returns {Object} Respuesta placeholder
 */
app.post('/api/game/:gameId/multiplayer/move', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
 
  // El turno ya fue cambiado a j2 en validateMove, aquí solo devolvemos el estado
  res.json({
    gameId,
    board:  game.board,
    moves:  game.moves,
    turn:   game.currentPlayer,
    winner: game.winner || null,
    status: game.status,
  });
});

/**
 * Obtener estado actual del juego
 * @route {GET} /api/game/:gameId
 * @param {string} req.params.gameId - El ID del juego
 * @returns {Object} Estado actual del juego
 * @throws {404} Si el juego no se encuentra
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
 * Finalizar el juego y guardarlo en la base de datos
 * @param {Object} game - El objeto del juego a guardar
 * @param {string} game.gameId - Identificador único del juego
 * @param {string} game.userId - ID de usuario
 * @param {string} game.gameMode - Modo de juego
 * @param {number} game.boardSize - Tamaño del tablero
 * @param {Array} game.players - Array de jugadores
 * @param {Array} game.moves - Array de movimientos
 * @param {string} game.status - Estado del juego
 * @param {string} game.winner - Identificador del ganador
 * @param {Date} game.createdAt - Fecha de creación
 * @param {Date} game.finishedAt - Fecha de finalización
 */
async function finishGameAndSave(game) {
  // Las partidas locales de 2 jugadores no se guardan en el historial
  if (game.gameMode === 'multiplayer') return;

  game.status = 'finished';
  game.finishedAt = new Date();

  // En modo online usamos clave compuesta gameId_userId para que cada jugador tenga su registro
  const dbKey = game.gameMode === 'online'
    ? `${game.gameId}_${game.userId}`
    : game.gameId;

  try {
    await GameModel.findOneAndUpdate(
      { gameId: dbKey },
      {
        gameId: dbKey,
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

    console.log(`Juego ${game.gameId} guardado en DB para userId=${game.userId}`);
  } catch (err) {
    console.error('Error guardando juego:', err);
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
    console.error('Error saving game:', err);
    res.status(500).json({ error: 'Error saving game' });
  }
});*/


/**
 * Registrar el nombre real de un jugador en la partida en memoria.
 * El frontend lo llama nada más obtener su perfil y el del rival.
 * @route {POST} /api/game/:gameId/setPlayerName
 */
app.post('/api/game/:gameId/setPlayerName', (req, res) => {
  const { gameId } = req.params;
  const { role, name } = req.body; // role: 'j1' | 'j2', name: string
  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const player = game.players.find(p => p.color === role);
  if (player && name) player.name = name;
  res.json({ ok: true });
});

/**
 * Guardar la partida online en el historial de un jugador concreto.
 * @route {POST} /api/game/:gameId/saveForPlayer
 */
app.post('/api/game/:gameId/saveForPlayer', async (req, res) => {
  const { gameId } = req.params;
  // winner y playerNames los envía el frontend, que conoce los nombres reales y el resultado final
  const { userId, winner, playerNames } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  if (game.gameMode === 'multiplayer') {
    return res.status(400).json({ error: 'Las partidas locales no se guardan en el historial' });
  }

  // Actualizar nombres reales si el frontend los proporciona
  const players = game.players.map((p, idx) => ({
    ...p,
    name: (playerNames && playerNames[idx]) ? playerNames[idx] : p.name,
  }));

  const resolvedWinner = winner || game.winner;
  const finishedAt = game.finishedAt || new Date();

  try {
    // Clave compuesta para que cada jugador tenga su propio registro
    await GameModel.findOneAndUpdate(
      { gameId: `${gameId}_${userId}` },
      {
        gameId: `${gameId}_${userId}`,
        userId,
        gameMode: game.gameMode,
        boardSize: game.boardSize,
        players,
        moves: game.moves,
        status: 'finished',
        winner: resolvedWinner,
        createdAt: game.createdAt,
        finishedAt
      },
      { upsert: true, new: true }
    );

    console.log(`Juego ${gameId} guardado en DB para userId=${userId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error guardando juego para jugador:', err);
    res.status(500).json({ error: 'Error guardando juego' });
  }
});

// ================= FUNCIONES AUXILIARES =================

/**
 * Inicializar el tablero del juego con celdas vacías
 * @param {number} boardSize - El tamaño del tablero (ej. 11)
 * @returns {Array} Array de celdas del tablero con posición y jugador
 */
function initializeBoard(boardSize) {
  const total = (boardSize * (boardSize + 1)) / 2;
  const board = [];
  for (let i = 0; i < total; i++) {
    const { x, y, z } = indexToCoords(i, boardSize);
    board.push({ position: `(${x},${y},${z})`, player: null });
  }
  return board;
}

/**
 * Convertir estado del juego a formato YEN para el bot de Rust
 * @param {Object} game - El objeto del juego
 * @param {number} game.boardSize - Tamaño del tablero
 * @param {string} game.currentPlayer - Jugador actual (j1 o j2)
 * @param {Array} game.board - Celdas del tablero
 * @returns {Object} Estado del juego en formato YEN
 */
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

/**
 * Convertir índice del tablero a coordenadas (x, y, z)
 * @param {number} index - El índice lineal de la celda
 * @param {number} boardSize - El tamaño del tablero
 * @returns {Object} Objeto de coordenadas con x, y, z
 */
function indexToCoords(index, boardSize) {
  const r = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
  const rowStart = (r * (r + 1)) / 2;
  const c = index - rowStart;
  const x = boardSize - 1 - r;
  const y = c;
  const z = boardSize - 1 - x - y;
  return { x, y, z };
}

/**
 * Dormir durante un número especificado de milisegundos
 * @param {number} ms - Milisegundos a dormir
 * @returns {Promise} Promesa que se resuelve después del sueño
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'Game Service is running' }));

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => console.log(`Game Service listening on ${port}`));
}

module.exports = app;