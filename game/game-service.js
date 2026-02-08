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

// Almacenamiento simple de juegos (en producción usar base de datos)
const games = new Map();

/**
 * Iniciar un nuevo juego
 * POST /api/game/new
 */
app.post('/api/game/new', async (req, res) => {
  try {
    const { userId, gameMode = 'vsBot' } = req.body;

    // Generar ID único del juego
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Crear estructura inicial del juego
    const boardSize = 11; // default board size (can be made configurable)
    const game = {
      gameId,
      userId,
      gameMode,
      board: initializeBoard(boardSize),
      boardSize,
      players: [
        { id: userId, name: 'Player 1', points: 0, color: 'j1' },
        { id: 'bot', name: 'Bot', points: 0, color: 'j2' }
      ],
      currentPlayer: 'j1',
      moves: [],
      status: 'active',
      createdAt: new Date()
    };

    games.set(gameId, game);

    res.json({
      gameId,
      board: game.board,
      players: game.players,
      status: 'Game started'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Realizar un movimiento
 * POST /api/game/:gameId/move
 */
app.post('/api/game/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { userId, move } = req.body;

    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Validar turno
    if (game.currentPlayer !== 'j1') {
      return res.status(400).json({ error: 'Not player turn' });
    }

    // Verificar que la casilla está libre
    if (!isCellEmpty(game, move)) {
      return res.status(400).json({ error: 'Cell is already occupied' });
    }

    // Normalizar posición del jugador y registrar movimiento
    const normMove = normalizePosition(game, move);
    const playerMove = {
      player: 'j1',
      position: normMove,
      timestamp: new Date()
    };
    game.moves.push(playerMove);
    updateBoard(game, normMove, 'j1');

    // Cambiar turno al bot (si aplica)
    game.currentPlayer = game.gameMode === 'vsBot' ? 'j2' : 'j1';

    // Llamar a Gamey para obtener movimiento del bot
    let botMove = null;
    if (game.gameMode === 'vsBot') {
      try {
        const gameState = convertToYEN(game);
        const botResponse = await axios.post(
          `${GAMEY_BOT_URL}/v1/ybot/choose/random_bot`,
          gameState,
          { headers: { 'Content-Type': 'application/json' } }
        );

        botMove = botResponse.data.coords; // { x, y, z }

        // Registrar movimiento del bot (usar formato '(x,y,z)')
        const botPosStr = `(${botMove.x},${botMove.y},${botMove.z})`;
        console.log(`[Bot Move] Registering at position: ${botPosStr}`);
        game.moves.push({
          player: 'j2',
          position: botPosStr,
          timestamp: new Date()
        });

        // Aplicar movimiento del bot al tablero
        updateBoard(game, botPosStr, 'j2');
      } catch (error) {
        console.error('Error calling Gamey bot:', error.message || error);
        // Si Gamey falla, hacer un movimiento aleatorio
        const rand = getRandomMove(game.board);
        if (rand) {
          updateBoard(game, rand, 'j2');
          game.moves.push({ player: 'j2', position: rand, timestamp: new Date() });
        }
      }
      // Después del bot, devolver el turno al jugador
      game.currentPlayer = 'j1';
    }

    // Verificar si hay ganador
    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'finished';
      game.winner = winner;
    }

    res.json({
      gameId,
      board: game.board,
      players: game.players,
      moves: game.moves,
      turn: game.currentPlayer,
      winner: game.winner || null,
      status: game.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener estado del juego
 * GET /api/game/:gameId
 */
app.get('/api/game/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = games.get(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      gameId,
      board: game.board,
      players: game.players,
      moves: game.moves,
      turn: game.currentPlayer,
      status: game.status,
      winner: game.winner || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Finalizar y guardar juego
 * POST /api/game/endAndSaveGame
 */
app.post('/api/game/endAndSaveGame', (req, res) => {
  try {
    const { gameId, userId } = req.body;
    const game = games.get(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    game.status = 'finished';

    // Aquí podrías guardar en base de datos
    res.json({
      gameId,
      status: 'Game saved',
      result: {
        winner: game.winner || 'draw',
        moves: game.moves.length,
        duration: new Date() - game.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= FUNCIONES AUXILIARES =============

/**
 * Inicializar tablero vacío con tamaño triangular
 * IMPORTANTE: Todas las posiciones en formato (x,y,z)
 */
function initializeBoard(boardSize) {
  const total = (boardSize * (boardSize + 1)) / 2;
  const board = [];
  console.log(`[initializeBoard] Creating board with ${total} cells, size ${boardSize}`);
  for (let i = 0; i < total; i++) {
    const { x, y, z } = indexToCoords(i, boardSize);
    const pos = `(${x},${y},${z})`;
    board.push({ position: pos, player: null });
  }
  console.log(`[initializeBoard] First 5 positions: ${board.slice(0, 5).map(b => b.position).join(', ')}`);
  return board;
}

/**
 * Actualizar tablero con movimiento
 * position puede ser un índice (string) o coordenadas 'x,y,z'
 */
function updateBoard(game, position, player) {
  // Normalize incoming position to string '(x,y,z)'
  let norm = null;
  if (typeof position === 'string') {
    // remove possible parentheses
    const cleaned = position.replace(/[()]/g, '');
    const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 3) {
      const [x, y, z] = parts.map(Number);
      norm = `(${x},${y},${z})`;
    } else if (!isNaN(Number(position))) {
      // numeric index
      const idx = Number(position);
      const c = indexToCoords(idx, game.boardSize);
      norm = `(${c.x},${c.y},${c.z})`;
    }
  } else if (typeof position === 'number') {
    const c = indexToCoords(position, game.boardSize);
    norm = `(${c.x},${c.y},${c.z})`;
  }

  if (!norm) return;
  const hex = game.board.find(h => h.position === norm);
  if (hex) hex.player = player;
}

function isCellEmpty(game, position) {
  // Normalize like updateBoard and check
  let norm = null;
  if (typeof position === 'string') {
    const cleaned = position.replace(/[()]/g, '');
    const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 3) {
      const [x, y, z] = parts.map(Number);
      norm = `(${x},${y},${z})`;
    } else if (!isNaN(Number(position))) {
      const idx = Number(position);
      const c = indexToCoords(idx, game.boardSize);
      norm = `(${c.x},${c.y},${c.z})`;
    }
  } else if (typeof position === 'number') {
    const c = indexToCoords(position, game.boardSize);
    norm = `(${c.x},${c.y},${c.z})`;
  }
  if (!norm) return false;
  const hex = game.board.find(h => h.position === norm);
  return hex ? hex.player === null : false;
}

/**
 * Convertir estado del juego a formato YEN (formato de Gamey)
 * YEN: { size, turn, players, layout }
 */
function convertToYEN(game) {
  const size = game.boardSize;
  const players = ['B', 'R']; // j1 -> B, j2 -> R
  const turn = game.currentPlayer === 'j1' ? 0 : 1;

  // Build layout rows: row 0 has 1 cell, row 1 has 2 cells, ..., row size-1 has size cells
  const rows = [];
  let idx = 0;
  for (let r = 0; r < size; r++) {
    const rowLen = r + 1;
    let row = '';
    for (let c = 0; c < rowLen; c++) {
      const cell = game.board[idx];
      if (!cell || cell.player === null) row += '.';
      else if (cell.player === 'j1') row += players[0];
      else if (cell.player === 'j2') row += players[1];
      idx++;
    }
    rows.push(row);
  }

  const layout = rows.join('/');
  return { size, turn, players, layout };
}

function indexToCoords(index, boardSize) {
  const i_f = index;
  const r = Math.floor((Math.sqrt(8 * i_f + 1) - 1) / 2);
  const rowStartIndex = (r * (r + 1)) / 2;
  const c = index - rowStartIndex;
  const x = boardSize - 1 - r;
  const y = c;
  const z = boardSize - 1 - x - y;
  return { x, y, z };
}

function normalizePosition(game, position) {
  if (!position && position !== 0) return null;
  // If it's an object with x,y,z
  if (typeof position === 'object' && position.x !== undefined) {
    return `(${position.x},${position.y},${position.z})`;
  }
  if (typeof position === 'string') {
    const cleaned = position.replace(/[()]/g, '');
    const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);

    if (parts.length === 3) {
      const [x, y, z] = parts.map(Number);
      return `(${x},${y},${z})`;
    }
    // if it's a numeric index
    if (!isNaN(Number(position))) {
      const idx = Number(position);
      const c = indexToCoords(idx, game.boardSize);
      return `(${c.x},${c.y},${c.z})`;
    }
  }
  if (typeof position === 'number') {
    const c = indexToCoords(position, game.boardSize);
    return `(${c.x},${c.y},${c.z})`;
  }
  return null;
}

/**
 * Obtener un movimiento aleatorio válido
 */
function coordsToIndex(x, y, z, boardSize) {
  // r = (boardSize - 1) - x
  const r = (boardSize - 1) - x;
  const rowStart = (r * (r + 1)) / 2;
  const c = y;
  return rowStart + c;
}

function getRandomMove(board) {
  const emptyHexes = board.filter(h => h.player === null);
  if (emptyHexes.length === 0) return null;
  return emptyHexes[Math.floor(Math.random() * emptyHexes.length)].position;
}

/**
 * Verificar si hay ganador
 */
function checkWinner(board) {
  // Implementar lógica de victoria del juego Y
  // Por ahora, devolver null
  return null;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Game Service is running' });
});

const server = app.listen(port, () => {
  console.log(`Game Service listening on port ${port}`);
});

module.exports = server;
