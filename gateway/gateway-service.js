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
const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key'; // Secret key for JWT verification

const app = express();
const port = 8000;

// URLs for microservices NECESARIO CAMBIAR
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8002';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8001';
const gameServiceUrl = process.env.GAME_SERVICE_URL || 'http://localhost:8003';


app.use(cors());
app.use(express.json());

// Prometheus metrics middleware
const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

/**
 * Middleware to verify JWT token for authentication.
 * If the token is not provided, assigns a guest user. If the token is valid, decodes the user information and attaches it to the request body.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The callback function to move to the next middleware or route handler.
 */
const verifyToken = (req, res, next) => {
  if (!req.headers["authorization"]) {
    req.body.userId = "guest" + Date.now();
    next();
  } else {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token wasn't provided properly" });
    }
    jwt.verify(token, privateKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.body.userId = decoded.userId;
      next();
    });
  }
};


/**
 * Endpoint to handle user login by forwarding the request to the authentication service.
 *
 * @route {POST} /login
 * @param {Object} req.body - The login credentials provided by the user.
 * @returns {Object} The authentication response from the auth service.
 */
app.post('/login', async (req, res) => {
  try {
    const authResponse = await axios.post(authServiceUrl + '/login', req.body);
    res.json(authResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});



/**
 * Endpoint to add a new user by forwarding the request to the user service.
 *
 * @route {POST} /adduser
 * @param {Object} req.body - The data required to create a new user.
 * @returns {Object} The response from the user service.
 */
app.post('/adduser', async (req, res) => {
  try {
    const userResponse = await axios.post(userServiceUrl + '/adduser', req.body);
    res.json(userResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
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
app.post('/api/user/editUser', verifyToken, async (req, res) => {
  try {
    const editResponse = await axios.post(userServiceUrl + '/editUser', req.body);
    res.json(editResponse.data);
  } catch (error) {
    res.status(error.response.status).json({ error: error.response.data.error });
  }
});

/**
 * Iniciar juego (nuevo)
 */
app.post('/api/game/start', verifyToken, async (req, res) => {
  try {
    // Enviar petición al servicio de juego
    const startResponse = await axios.post(`${gameServiceUrl}/api/game/start`, {
      userId: req.body.userId,
      gameMode: req.body.gameMode || 'vsBot', // por si luego quieres multiplayer
    });

    // Retorna gameId y estado inicial del tablero
    res.json(startResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error iniciando juego' });
  }
});

/**
 * Validar movimiento del usuario
 */
app.post('/api/game/:gameId/validateMove', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { move, userId } = req.body;

    // Llamamos al game-service para comprobar la validez
    const validateResponse = await axios.post(`${gameServiceUrl}/api/game/${gameId}/validateMove`, {
      move,
      userId
    });

    res.json(validateResponse.data);
  } catch (error) {
    res.status(error.response?.status || 400).json({
      error: error.response?.data?.error || 'Invalid move'
    });
  }
});

/**
 * Realizar movimiento (usuario + bot)
 */
/**
 * Realizar movimiento (usuario + bot)
 * - Bloquea el tablero mientras el bot juega
 * - Maneja vsBot y multiplayer
 */
app.post('/api/game/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { move, userId, mode } = req.body; // mode = 'vsBot' | 'multiplayer'
   
    if (!move || !userId) {
      return res.status(400).json({ error: 'Move and userId are required' });
    }

    let backendEndpoint = '';
    if (mode === 'vsBot') {
      backendEndpoint = `${gameServiceUrl}/api/game/${gameId}/vsBot/move`;
    } else if (mode === 'multiplayer') {
      backendEndpoint = `${gameServiceUrl}/api/game/${gameId}/multiplayer/move`;
    } else {
      return res.status(400).json({ error: 'Invalid game mode' });
    }

    // Llamada al backend del game-service
    const moveResponse = await axios.post(backendEndpoint, {
      userId,
      move,
      mode, // importante para que game-service sepa si es vsBot
    });

    // Devuelve el estado actualizado del tablero (incluyendo turno del bot si aplica)
    res.json(moveResponse.data);

  } catch (error) {
    console.error(error.response?.data || error.message || error);

    // Diferenciar errores del backend y errores de servidor
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message || 'Internal server error';

    res.status(status).json({ error: message });
  }
});

/**
 * Obtener estado del juego
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
 * Finalizar y guardar juego
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


// OpenAPI-Swagger documentation configuration
const openapiPath = './openapi.yaml';
if (fs.existsSync(openapiPath)) {
  const file = fs.readFileSync(openapiPath, 'utf8');
  const swaggerDocument = YAML.parse(file);
  app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Start the gateway service
const server = app.listen(port, () => {
});

module.exports = server;