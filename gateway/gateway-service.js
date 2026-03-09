const express = require('express');
const axios = require('axios');
const cors = require('cors');
const promBundle = require('express-prom-bundle');
const cookieParser = require("cookie-parser");

// OpenAPI-Swagger Libraries
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const YAML = require('yaml');

// JWT Authentication library
const jwt = require('jsonwebtoken');
const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key';

const app = express();
const port = 8000;


// URLs for microservices NECESARIO CAMBIAR
const authServiceUrl =  process.env.authServiceUrl || 'http://localhost:8002';
const userServiceUrl =  process.env.userServiceUrl || 'http://localhost:8001';
const gameServiceUrl = process.env.gameServiceUrl || 'http://localhost:8003';


app.use(cors({
  origin: 'http://localhost:5173', // tu frontend
  credentials: true               // permite enviar cookies o headers de auth
}));
app.use(express.json());
app.use(cookieParser());

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

/**
 * Middleware para verificar JWT.
 * Si no hay token, asigna un usuario guest.
 */
const verifyToken = (req, res, next) => {
  const token = req.cookies.token; 

  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }

  jwt.verify(token, privateKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token inválido" });
    }

    req.body.userId = decoded.userId;
    next();
  });
};


// ================= AUTH & USERS =================

/**
 * Endpoint for the history of games of a user.
 * @route {GET} /api/game/history?userId={id}
 * @param {string} userId - The ID of the user whose game history is being requested.
 */
app.get('/api/game/history', verifyToken, async (req, res) => {
  try {
    const userId = req.body.userId;

    const gameRes = await axios.get(
      `${gameServiceUrl}/api/game/history`,
      { params: { userId } }
    );

    res.json(gameRes.data);

  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message;
    res.status(status).json({ error: message });
  }
});



app.post('/login', async (req, res) => {
  try {
    const authResponse = await axios.post(
      authServiceUrl + '/login',
      req.body,
      { withCredentials: true }
    );

    // reenviar cookie al frontend
    const setCookie = authResponse.headers['set-cookie'];
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.json(authResponse.data);

  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Login error'
    });
    console.log(error);
  }
});

app.post('/adduser', async (req, res) => {
  try {
    const userResponse = await axios.post(userServiceUrl + '/adduser', req.body);
    res.json(userResponse.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message || 'Internal server error';
    res.status(status).json({ error: message });
    console.log(error);
  }
});
app.post("/api/user/getUserProfile", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, privateKey); 
    const userId = payload.userId;

    // PASAR userId al microservicio
    const response = await axios.post(`${userServiceUrl}/profile`, { userId }); 

    res.json(response.data);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || "Internal server error",
    });
  }
});
s

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



app.get('/api/auth/me', verifyToken, async (req, res) => {
  res.json({
    userId: req.body.userId
  });


});

app.post('/logout', async (req, res) => {
  try {
    const authResponse = await axios.post(
      authServiceUrl + '/logout',
      {},
      { withCredentials: true }
    );

    // reenviar cookie al frontend
    const setCookie = authResponse.headers['set-cookie'];
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.json(authResponse.data);

  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Logout error'
    });
  }
});
/**
 * Endpoint to edit an existing user's details.
 * Requires JWT token verification for user authentication.
 *
 * @route {POST} /api/user/editUser
 * @param {Object} req.body - The data required to update the user's details.
 * @param {Object} req.body.userId - The authenticated user's information.
 * @returns {Object} The response from the user service.
 */
app.post('/api/user/editUsername', verifyToken, async (req, res) => {
    const { username } = req.body;
    const userId = req.body.userId;

    if (!userId || !username) {
        return res.status(400).json({ error: 'Missing userId or username' });
    }

    try {
        const response = await axios.post(`${userServiceUrl}/editUser`, { userId, username });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || 'Internal error'
        });
    }
});

app.post('/api/user/changePassword', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.body.userId;
    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const response = await axios.post(`${userServiceUrl}/changePassword`, {
            userId,
            currentPassword,
            newPassword
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || 'Internal error'
        });
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
      boardSize: req.body.boardSize || 11, // <- tamaño del tablero
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