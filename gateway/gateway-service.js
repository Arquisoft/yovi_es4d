const express = require('express');
const axios = require('axios');
const cors = require('cors');
const promBundle = require('express-prom-bundle');

// OpenAPI-Swagger Libraries
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const YAML = require('yaml');

// JWT Authentication library
const jwt = require('jsonwebtoken');
const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key';

const app = express();
const port = 8000;

const authServiceUrl = 'http://auth:8002' || 'http://localhost:8002';
const userServiceUrl = 'http://users:8001' || 'http://localhost:8001';
const gameServiceUrl = 'http://game:8003' || 'http://localhost:8003';

app.use(cors());
app.use(express.json());

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

/**
 * Middleware para verificar JWT.
 * Si no hay token, asigna un usuario guest.
 */
const verifyToken = (req, res, next) => {
  if (!req.headers['authorization']) {
    req.body.userId = 'guest' + Date.now();
    next();
  } else {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Token wasn't provided properly" });
    jwt.verify(token, privateKey, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Unauthorized' });
      req.body.userId = decoded.userId;
      next();
    });
  }
};

// ================= AUTH & USERS =================

app.post('/login', async (req, res) => {
  try {
    const authResponse = await axios.post(authServiceUrl + '/login', req.body);
    res.json(authResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

app.post('/adduser', async (req, res) => {
  try {
    const userResponse = await axios.post(userServiceUrl + '/adduser', req.body);
    res.json(userResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

app.post('/api/user/editUser', verifyToken, async (req, res) => {
  try {
    const editResponse = await axios.post(userServiceUrl + '/editUser', req.body);
    res.json(editResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

// ================= GAME =================

/**
 * Devuelve los modos de bot disponibles (los lee del game-service).
 * El cliente React lo usa para construir el selector de dificultad.
 *
 * @route GET /api/game/bot-modes
 */
app.get('/api/game/bot-modes', async (req, res) => {
  try {
    const response = await axios.get(`${gameServiceUrl}/api/game/bot-modes`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Error obteniendo modos de bot' });
  }
});

/**
 * Iniciar juego.
 * Body: { gameMode?, botMode? }
 *   gameMode : 'vsBot' | 'multiplayer'  (default: 'vsBot')
 *   botMode  : 'random_bot' | 'intermediate_bot' | ...  (default: 'random_bot')
 *
 * @route POST /api/game/start
 */
app.post('/api/game/start', verifyToken, async (req, res) => {
  try {
    const startResponse = await axios.post(`${gameServiceUrl}/api/game/start`, {
      userId:   req.body.userId,
      gameMode: req.body.gameMode || 'vsBot',
      botMode:  req.body.botMode  || 'random_bot', // ← propagamos al game-service
    });
    res.json(startResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error iniciando juego' });
  }
});

/**
 * Validar movimiento del jugador humano.
 *
 * @route POST /api/game/:gameId/validateMove
 */
app.post('/api/game/:gameId/validateMove', async (req, res) => {
  try {
    const { gameId } = req.params;
    const validateResponse = await axios.post(
        `${gameServiceUrl}/api/game/${gameId}/validateMove`,
        { move: req.body.move, userId: req.body.userId }
    );
    res.json(validateResponse.data);
  } catch (error) {
    res.status(error.response?.status || 400).json({ error: error.response?.data?.error || 'Invalid move' });
  }
});

/**
 * Movimiento del bot (vsBot) o multiplayer.
 *
 * @route POST /api/game/:gameId/move
 * Body: { move, userId, mode }
 *   mode: 'vsBot' | 'multiplayer'
 */
app.post('/api/game/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { move, userId, mode } = req.body;

    if (!move || !userId) {
      return res.status(400).json({ error: 'Move and userId are required' });
    }

    let backendEndpoint;
    if (mode === 'vsBot') {
      backendEndpoint = `${gameServiceUrl}/api/game/${gameId}/vsBot/move`;
    } else if (mode === 'multiplayer') {
      backendEndpoint = `${gameServiceUrl}/api/game/${gameId}/multiplayer/move`;
    } else {
      return res.status(400).json({ error: 'Invalid game mode' });
    }

    const moveResponse = await axios.post(backendEndpoint, { userId, move, mode });
    res.json(moveResponse.data);
  } catch (error) {
    console.error(error.response?.data || error.message || error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message || 'Internal server error',
    });
  }
});

/**
 * Estado del juego.
 *
 * @route GET /api/game/:gameId
 */
app.get('/api/game/:gameId', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const statusResponse = await axios.get(`${gameServiceUrl}/api/game/${gameId}`, {
      params: { userId: req.body.userId },
    });
    res.json(statusResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error obteniendo estado del juego' });
  }
});

/**
 * Finalizar y guardar juego.
 *
 * @route POST /api/game/end
 */
app.post('/api/game/end', verifyToken, async (req, res) => {
  try {
    const endResponse = await axios.post(`${gameServiceUrl}/api/game/endAndSaveGame`, {
      userId: req.body.userId,
      gameId: req.body.gameId,
    });
    res.json(endResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error finalizando juego' });
  }
});

// ================= SWAGGER =================

const openapiPath = './openapi.yaml';
if (fs.existsSync(openapiPath)) {
  const file = fs.readFileSync(openapiPath, 'utf8');
  const swaggerDocument = YAML.parse(file);
  app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

const server = app.listen(port, () => {});

module.exports = server;