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
const crypto = require('crypto');

const app = express();
app.disable('x-powered-by');
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
  boardVariant: String,
  connectedFaces: mongoose.Schema.Types.Mixed,
  connectionEdges: mongoose.Schema.Types.Mixed,
  hasBranch: mongoose.Schema.Types.Mixed,
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

const allowedOrigins = [
  'http://localhost:5173',
  'http://20.188.62.231:5173',
  'http://20.188.62.231:8000',
  'http://20.188.62.231',
  'https://localhost:5173',
  'https://20.188.62.231:5173',
  'https://20.188.62.231:8000',
  'https://20.188.62.231'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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
    const { userId, page = 1, sortBy = 'date', sortOrder = 'desc' } = req.query;
    const limit = 5;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const startIndex = (pageNum - 1) * limit;
    const endIndex = startIndex + limit;

    if (!userId) {
      return res.status(400).json({ error: 'Falta userId en la query' });
    }

    const filtro = { userId };
    const allGames = await GameModel.find(filtro).lean();
    const sortedGames = [...allGames].sort((a, b) => {
      if (sortBy === 'moves') {
        const movesA = a.moves?.length || 0;
        const movesB = b.moves?.length || 0;
        return sortOrder === 'asc' ? movesA - movesB : movesB - movesA;
      }

      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const games = sortedGames.slice(startIndex, endIndex);
    const totalGames = allGames.length;
    const totalWins = allGames.filter((game) => game.winner === 'j1').length;
    const totalDraws = allGames.filter((game) => !game.winner).length;
    const totalLosses = totalGames - totalWins - totalDraws;
    const winPercentage = totalGames
      ? Math.round((totalWins / totalGames) * 100)
      : 0;

    res.json({
      games,
      pagination: {
        page: pageNum,
        limit,
        hasPrev: pageNum > 1,
        hasNext: sortedGames.length > endIndex,
      },
      summary: {
        totalGames,
        totalWins,
        totalDraws,
        totalLosses,
        winPercentage,
      }
    });

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
      boardVariant = 'classic',
      boardSize: rawBoardSize = 11,
      startingPlayer = 'j1',
    } = req.body;

    const ALLOWED_BOARD_SIZES = boardVariant === 'tetra3d'
      ? [3, 4, 5, 6]
      : [8, 11, 15, 19];
    const boardSize = ALLOWED_BOARD_SIZES.includes(Number(rawBoardSize))
      ? Number(rawBoardSize)
      : (boardVariant === 'tetra3d' ? 4 : 11);

    const gameId = `game_${crypto.randomUUID()}`;
    
    if (boardVariant === 'tetra3d') {
      await axios.post(`${GAMEY_BOT_URL}/v1/tetra/start`, { size: boardSize }, { timeout: 5000 });
    } else {
      await axios.post(`${GAMEY_BOT_URL}/v1/game/start`, { board_size: boardSize, game_id: gameId }, { timeout: 5000 });
    }

    const normalizedStartingPlayer = startingPlayer === 'j2' ? 'j2' : 'j1';

    // Crear estado del juego en Node
    const game = {
      gameId,
      userId,
      role,
      gameMode,
      botMode,
      boardVariant,
      boardSize,
      startingPlayer: normalizedStartingPlayer,
      board: boardVariant === 'tetra3d' ? initializeTetraBoard(boardSize) : initializeBoard(boardSize),
      connectedFaces: boardVariant === 'tetra3d' ? { j1: [], j2: [] } : undefined,
      connectionEdges: boardVariant === 'tetra3d' ? { j1: [], j2: [] } : undefined,
      hasBranch: boardVariant === 'tetra3d' ? { j1: false, j2: false } : undefined,
      players: [
        { id: userId, role, name: 'Player 1', color: 'j1', points: 0 },
        { id: gameMode === 'vsBot' ? 'bot' : 'player2', role: 'j2', name: gameMode === 'vsBot' ? 'Bot' : 'Player 2', color: 'j2', points: 0 }
      ],
      currentPlayer: normalizedStartingPlayer,
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
      winner: null,
      boardVariant: game.boardVariant,
      connectedFaces: game.connectedFaces || { j1: [], j2: [] },
      connectionEdges: game.connectionEdges || { j1: [], j2: [] },
      hasBranch: game.hasBranch || { j1: false, j2: false },
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

  if (game.boardVariant === 'tetra3d') {
    try {
      const { toGamey, toLogical } = getPlayerMapping(game);
      const tetraMove = parseTetraPosition(move);
      const rustResponse = await axios.post(`${GAMEY_BOT_URL}/v1/tetra/move`, {
        ...tetraMove,
        player: toGamey[game.currentPlayer],
      });

      game.moves.push({ position: move, userId });
      game.board = updateTetraBoardFromRust(rustResponse.data.board, toLogical);
      game.connectedFaces = mapConnectedFaces(rustResponse.data.connectedFaces, toLogical);
      game.connectionEdges = mapConnectionEdges(rustResponse.data.connectionEdges, toLogical);
      game.hasBranch = mapHasBranch(rustResponse.data.hasBranch, toLogical);
      game.currentPlayer = rustResponse.data.turn === null || rustResponse.data.turn === undefined
        ? game.currentPlayer
        : toLogical[rustResponse.data.turn];

      if (rustResponse.data.status === 'finished') {
        game.winner = toLogical[rustResponse.data.winner];
        await finishGameAndSave(game);
      }

      return res.json({
        valid: true,
        winner: rustResponse.data.status === 'finished' ? toLogical[rustResponse.data.winner] : null,
        status: rustResponse.data.status,
        connectedFaces: game.connectedFaces,
        connectionEdges: game.connectionEdges,
        hasBranch: game.hasBranch,
      });
    } catch (error) {
      return res.status(error.response?.status || 400).json({
        error: error.response?.data?.message || 'Invalid tetra move',
      });
    }
  }

  const [x, y, z] = move.replace(/[()]/g, '').split(',').map(v => Number(v.trim()));

  // Usamos el turno actual del juego para determinar el player
  // (no el userId, que puede variar según el JWT)
  const { toGamey, toLogical } = getPlayerMapping(game);
  const playerNum = toGamey[game.currentPlayer];

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
    game.winner = toLogical[rustResponse.data.winner];
    await finishGameAndSave(game);
  }
 rustResponse.data.board.forEach(move => {
  const cell = game.board.find(c => {
    const [x, y, z] = c.position.replace(/[()]/g,'').split(',').map(Number);
    return x === move.x && y === move.y && z === move.z;
  });
  if (cell) cell.player = toLogical[move.player];
});
  res.json({ valid: true,
    winner: rustResponse.data.status === 'finished' ? toLogical[rustResponse.data.winner] : null,
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

    if (game.boardVariant === 'tetra3d') {
      const { toLogical } = getPlayerMapping(game);
      const rustResponse = await axios.post(
        `${GAMEY_BOT_URL}/v1/tetra/bot/${game.botMode}`
      );

      game.board = updateTetraBoardFromRust(rustResponse.data.board, toLogical);
      game.connectedFaces = mapConnectedFaces(rustResponse.data.connectedFaces, toLogical);
      game.connectionEdges = mapConnectionEdges(rustResponse.data.connectionEdges, toLogical);
      game.hasBranch = mapHasBranch(rustResponse.data.hasBranch, toLogical);

      if (rustResponse.data.turn !== null && rustResponse.data.turn !== undefined) {
        game.currentPlayer = toLogical[rustResponse.data.turn];
      }

      if (rustResponse.data.status === 'finished') {
        game.status = 'finished';
        game.winner = toLogical[rustResponse.data.winner];
        await finishGameAndSave(game);
      }

      const move = rustResponse.data.lastMove;
      if (move) {
        game.moves.push({
          position: `(${move.a},${move.b},${move.c},${move.d})`,
          player: 'j2',
          userId: 'bot'
        });
      }

      return res.json({
        gameId,
        board: game.board,
        moves: game.moves,
        turn: game.currentPlayer,
        winner: game.winner || null,
        status: game.status,
        connectedFaces: game.connectedFaces,
        connectionEdges: game.connectionEdges,
        hasBranch: game.hasBranch,
      });
    }

   // NOSONAR: uso de Math.random solo para delay UX, no afecta seguridad
const array = new Uint32Array(1);
crypto.getRandomValues(array);

const delay = (array[0] % 1000) + 1000;
await sleep(delay);
    // Llamar a Rust usando el botMode guardado en el juego
    const { toLogical } = getPlayerMapping(game);
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
    cell.player = toLogical[m.player];

    game.moves.push({
      position: `(${m.x},${m.y},${m.z})`,
      player: 'j2',
      userId: 'bot'
    });
  }
});

    game.currentPlayer = toLogical[rustResponse.data.turn];

    if (rustResponse.data.status === 'finished') {
      game.status = 'finished';
      game.winner = toLogical[rustResponse.data.winner];
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
    winner: game.winner || null,
    boardVariant: game.boardVariant || 'classic',
    connectedFaces: game.connectedFaces || { j1: [], j2: [] },
    connectionEdges: game.connectionEdges || { j1: [], j2: [] },
    hasBranch: game.hasBranch || { j1: false, j2: false },
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
        boardVariant: game.boardVariant,
        connectedFaces: game.connectedFaces,
        connectionEdges: game.connectionEdges,
        hasBranch: game.hasBranch,
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

function initializeTetraBoard(boardSize) {
  const board = [];
  const total = boardSize - 1;

  for (let a = 0; a <= total; a++) {
    for (let b = 0; b <= total - a; b++) {
      for (let c = 0; c <= total - a - b; c++) {
        const d = total - a - b - c;
        board.push({ position: `(${a},${b},${c},${d})`, player: null });
      }
    }
  }

  return board;
}

function parseTetraPosition(move) {
  const parts = move.replace(/[()]/g, '').split(',').map(v => Number(v.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error('Invalid tetra position');
  }
  return { a: parts[0], b: parts[1], c: parts[2], d: parts[3] };
}

function updateTetraBoardFromRust(rustBoard, toLogical) {
  return rustBoard.map(cell => ({
    position: `(${cell.a},${cell.b},${cell.c},${cell.d})`,
    player: cell.player === null || cell.player === undefined ? null : toLogical[cell.player],
  }));
}

function mapConnectedFaces(rawConnectedFaces, toLogical) {
  const connectedFaces = { j1: [], j2: [] };

  if (!rawConnectedFaces || typeof rawConnectedFaces !== 'object') {
    return connectedFaces;
  }

  Object.entries(rawConnectedFaces).forEach(([gameyPlayer, faces]) => {
    const logicalPlayer = toLogical[Number(gameyPlayer)];
    if (!logicalPlayer) return;
    connectedFaces[logicalPlayer] = Array.isArray(faces) ? faces : [];
  });

  return connectedFaces;
}

function mapConnectionEdges(rawConnectionEdges, toLogical) {
  const connectionEdges = { j1: [], j2: [] };

  if (!rawConnectionEdges || typeof rawConnectionEdges !== 'object') {
    return connectionEdges;
  }

  Object.entries(rawConnectionEdges).forEach(([gameyPlayer, edges]) => {
    const logicalPlayer = toLogical[Number(gameyPlayer)];
    if (!logicalPlayer || !Array.isArray(edges)) return;

    connectionEdges[logicalPlayer] = edges.map((edge) => ({
      from: `(${edge.from.a},${edge.from.b},${edge.from.c},${edge.from.d})`,
      to: `(${edge.to.a},${edge.to.b},${edge.to.c},${edge.to.d})`,
    }));
  });

  return connectionEdges;
}

function mapHasBranch(rawHasBranch, toLogical) {
  const hasBranch = { j1: false, j2: false };

  if (!rawHasBranch || typeof rawHasBranch !== 'object') {
    return hasBranch;
  }

  Object.entries(rawHasBranch).forEach(([gameyPlayer, value]) => {
    const logicalPlayer = toLogical[Number(gameyPlayer)];
    if (!logicalPlayer) return;
    hasBranch[logicalPlayer] = Boolean(value);
  });

  return hasBranch;
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
  const { toGamey } = getPlayerMapping(game);
  const turn = toGamey[game.currentPlayer];
  const rows = [];
  let idx = 0;
  for (let r = 0; r < size; r++) {
    let row = '';
    for (let c = 0; c <= r; c++) {
      const cell = game.board[idx];
      if (!cell || cell.player === null) row += '.';
      else if (cell.player === 'j1') row += players[toGamey.j1];
      else if (cell.player === 'j2') row += players[toGamey.j2];
      idx++;
    }
    rows.push(row);
  }
  return { size, turn, players, layout: rows.join('/') };
}

function getPlayerMapping(game) {
  if (game.startingPlayer === 'j2') {
    return {
      toGamey: { j1: 1, j2: 0 },
      toLogical: { 0: 'j2', 1: 'j1' },
    };
  }
  return {
    toGamey: { j1: 0, j2: 1 },
    toLogical: { 0: 'j1', 1: 'j2' },
  };
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
module.exports._test = {
  GameModel,
  BOT_ROUTES,
  games,
  initializeBoard,
  initializeTetraBoard,
  parseTetraPosition,
  updateTetraBoardFromRust,
  mapConnectedFaces,
  mapConnectionEdges,
  mapHasBranch,
  convertToYEN,
  getPlayerMapping,
  indexToCoords,
  sleep,
  finishGameAndSave,
};
