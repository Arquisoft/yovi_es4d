/**
 * Servicio Gateway de YOVI ES4D
 *
 * Este módulo actúa como punto de entrada centralizado (API Gateway) para la aplicación.
 * Gestiona autenticación con JWT, autorización y enrutamiento de solicitudes a los microservicios
 * de autenticación, usuarios y juegos. Incluye validación de tokens, monitoreo de métricas
 * y documentación OpenAPI/Swagger.
 *
 * @module gateway-service
 * @requires express
 * @requires axios
 * @requires cors
 * @requires express-prom-bundle
 * @requires cookie-parser
 * @requires jsonwebtoken
 * @requires swagger-ui-express
 */

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
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8002';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8001';
const gameServiceUrl = process.env.GAME_SERVICE_URL || 'http://localhost:8003';


app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true              
}));
app.use(express.json());
app.use(cookieParser());

const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

/**
 * Middleware para verificar JWT.
 * Valida el token JWT almacenado en las cookies y extrae la información del usuario.
 * Si no hay token o es inválido, rechaza la solicitud con estado 401.
 *
 * @middleware
 * @param {Object} req - Objeto de solicitud Express con cookies
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 * @throws {401} Si el token no existe o es inválido
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
 * Obtener historial de juegos de un usuario.
 * Recupera todos los juegos jugados por el usuario autenticado del servicio de juegos.
 *
 * @route {GET} /api/game/history
 * @param {string} req.body.userId - ID del usuario autenticado (extraído del JWT)
 * @returns {Object[]} Array de objetos de juego con detalles de cada partida
 * @throws {401} Si no está autenticado
 * @throws {500} Si hay error al recuperar el historial
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
    console.log(error);
  }
});

/**
 * Actualizar avatar del usuario.
 * Genera un nuevo avatar aleatorio y lo asigna al usuario autenticado.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/user/updateAvatar
 * @param {Object} req.body - Datos del usuario
 * @param {string} req.body.userId - ID del usuario autenticado (extraído del JWT)
 * @returns {Object} Objeto con mensaje de confirmación y URL del nuevo avatar
 * @throws {401} Si no está autenticado
 * @throws {404} Si el usuario no existe
 * @throws {500} Si hay error al actualizar el avatar
 */
app.post('/api/user/updateAvatar', verifyToken, async (req, res) => {

  const userId = req.body.userId;

  try {

    const response = await axios.post(
      `${userServiceUrl}/updateAvatar`,
      { userId }
    );

    res.json(response.data);

  } catch (error) {

    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Internal error'
    });

    console.log(error);
  }

});


/**
 * Valida las credenciales del usuario y genera un token JWT.
 * El token se devuelve en una cookie segura.
 *
 * @route {POST} /login
 * @param {Object} req.body - Credenciales del usuario
 * @param {string} req.body.email - Email del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @returns {Object} Token JWT y datos del usuario autenticado
 * @throws {400} Si las credenciales son inválidas
 * @throws {500} Si hay error en el servicio de autenticación
 */
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

/**
 * Registrar nuevo usuario.
 * Crea una nueva cuenta de usuario en el servicio de usuarios.
 *
 * @route {POST} /adduser
 * @param {Object} req.body - Datos del nuevo usuario
 * @param {string} req.body.email - Email del nuevo usuario
 * @param {string} req.body.password - Contraseña del nuevo usuario
 * @param {string} req.body.username - Nombre de usuario
 * @returns {Object} Datos del usuario creado
 * @throws {400} Si hay validación fallida o email ya registrado
 * @throws {500} Si hay error en el servicio de usuarios
 */
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
/**
 * Obtener perfil del usuario autenticado.
 * Recupera la información de perfil del usuario actualmente autenticado.
 *
 * @route {POST} /api/user/getUserProfile
 * @param {string} req.cookies.token - Token JWT en cookies
 * @returns {Object} Perfil del usuario con email, username, etc.
 * @throws {401} Si no está autenticado
 * @throws {500} Si hay error al recuperar el perfil
 */
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


// ================= GAME =================

/**
 * Obtener modos de bot disponibles.
 * Devuelve la lista de dificultades de bot disponibles.
 * El cliente React lo usa para construir el selector de dificultad.
 *
 * @route {GET} /api/game/bot-modes
 * @returns {Object} Objeto con array de botModes disponibles
 * @throws {500} Si hay error al obtener los modos
 */
app.get('/api/game/bot-modes', async (req, res) => {
  try {
    const response = await axios.get(`${gameServiceUrl}/api/game/bot-modes`);
    res.json(response.data);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 500).json({ error: 'Error obteniendo modos de bot' });
  }
});



/**
 * Obtener información del usuario autenticado.
 * Devuelve el ID del usuario actualmente autenticado.
 *
 * @route {GET} /api/auth/me
 * @returns {Object} Objeto con userId del usuario autenticado
 * @throws {401} Si no está autenticado
 */
app.get('/api/auth/me', verifyToken, async (req, res) => {
  res.json({
    userId: req.body.userId
  });


});

/**
 * Desautenticar usuario (logout).
 * Invalida el token JWT del usuario y elimina la cookie de autenticación.
 *
 * @route {POST} /logout
 * @returns {Object} Confirmación de logout exitoso
 * @throws {500} Si hay error al cerrar sesión
 */
app.post('/logout', async (req, res) => {
  try {
    const authResponse = await axios.post(
      authServiceUrl + '/logout',
      {},
      { withCredentials: true }
    );

    const setCookie = authResponse.headers['set-cookie'];
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }

    res.json(authResponse.data);

  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Logout error'
    });
    console.log(error);
  }
});
/**
 * Editar nombre de usuario.
 * Actualiza el nombre de usuario del usuario autenticado.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/user/editUsername
 * @param {Object} req.body - Datos a actualizar
 * @param {string} req.body.username - Nuevo nombre de usuario
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @returns {Object} Confirmación de actualización exitosa
 * @throws {400} Si faltan userId o username
 * @throws {401} Si no está autenticado
 * @throws {500} Si hay error al actualizar
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
        console.log(error);
    }
});

/**
 * Cambiar contraseña del usuario.
 * Cambia la contraseña del usuario autenticado después de validar la contraseña actual.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/user/changePassword
 * @param {Object} req.body - Datos de cambio de contraseña
 * @param {string} req.body.currentPassword - Contraseña actual
 * @param {string} req.body.newPassword - Nueva contraseña
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @returns {Object} Confirmación de cambio de contraseña exitoso
 * @throws {400} Si faltan campos requeridos
 * @throws {401} Si no está autenticado
 * @throws {500} Si hay error al cambiar contraseña
 */
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
        console.log(error);
    }
});



/**
 * Iniciar un nuevo juego.
 * Crea una nueva partida con los parámetros especificados.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/game/start
 * @param {Object} req.body - Parámetros del juego
 * @param {string} [req.body.gameMode='vsBot'] - Modo de juego (vsBot o multiplayer)
 * @param {string} [req.body.botMode='random_bot'] - Dificultad del bot
 * @param {number} [req.body.boardSize=11] - Tamaño del tablero (8, 11, 15, 19)
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @returns {Object} Datos de inicialización del juego (gameId, board, players)
 * @throws {401} Si no está autenticado
 * @throws {500} Si hay error al iniciar el juego
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
    console.log(error);
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error iniciando juego' });
  }
});

/**
 * Validar movimiento del jugador humano.
 * Verifica que el movimiento propuesto sea válido según las reglas del juego.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/game/:gameId/validateMove
 * @param {string} req.params.gameId - ID único del juego
 * @param {Object} req.body - Datos del movimiento
 * @param {string} req.body.move - Posición del movimiento en formato (x,y,z)
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @returns {Object} Validación del movimiento y estado actual del juego
 * @throws {400} Si el movimiento es inválido
 * @throws {401} Si no está autenticado
 * @throws {404} Si el juego no se encuentra
 */
app.post('/api/game/:gameId/validateMove', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const validateResponse = await axios.post(
        `${gameServiceUrl}/api/game/${gameId}/validateMove`,
        { move: req.body.move, userId: req.body.userId }
    );
    res.json(validateResponse.data);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 400).json({ error: error.response?.data?.error || 'Invalid move' });
  }
});

/**
 * Procesar movimiento en el juego.
 * Maneja movimientos de bot en modo vsBot o de otros jugadores en modo multiplayer.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/game/:gameId/move
 * @param {string} req.params.gameId - ID único del juego
 * @param {Object} req.body - Datos del movimiento
 * @param {string} req.body.move - Posición en formato (x,y,z)
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @param {string} req.body.mode - Modo de juego (vsBot o multiplayer)
 * @returns {Object} Estado actualizado del juego después del movimiento
 * @throws {400} Si falta información requerida o modo inválido
 * @throws {401} Si no está autenticado
 * @throws {500} Si hay error al procesar el movimiento
 */
app.post('/api/game/:gameId/move', verifyToken,  async (req, res) => {
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
 * Obtener estado actual del juego.
 * Recupera el estado completo de una partida incluyendo tablero, jugadores y turnos.
 * Requiere autenticación JWT.
 *
 * @route {GET} /api/game/:gameId
 * @param {string} req.params.gameId - ID único del juego
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @returns {Object} Estado completo del juego (board, players, moves, turn, status, winner)
 * @throws {401} Si no está autenticado
 * @throws {404} Si el juego no se encuentra
 * @throws {500} Si hay error al obtener el estado
 */
app.get('/api/game/:gameId', verifyToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const statusResponse = await axios.get(`${gameServiceUrl}/api/game/${gameId}`, {
      params: { userId: req.body.userId },
    });
    res.json(statusResponse.data);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error obteniendo estado del juego' });
  }
});

/**
 * Finalizar y guardar un juego.
 * Marcar un juego como finalizado y guardar sus datos en la base de datos.
 * Requiere autenticación JWT.
 *
 * @route {POST} /api/game/end
 * @param {Object} req.body - Datos de finalización
 * @param {string} req.body.gameId - ID único del juego a finalizar
 * @param {string} req.body.userId - ID del usuario autenticado (del JWT)
 * @returns {Object} Datos del juego finalizado (winner, moves count, duration)
 * @throws {401} Si no está autenticado
 * @throws {404} Si el juego no se encuentra
 * @throws {500} Si hay error al finalizar el juego
 */
app.post('/api/game/end', verifyToken, async (req, res) => {
  try {
    const endResponse = await axios.post(`${gameServiceUrl}/api/game/endAndSaveGame`, {
      userId: req.body.userId,
      gameId: req.body.gameId,
    });
    res.json(endResponse.data);
  } catch (error) {
    console.log(error);
    res.status(error.response?.status || 500).json({ error: error.response?.data?.error || 'Error finalizando juego' });
  }
});

// ================= SWAGGER =================

/**
 * Cargar y servir documentación OpenAPI/Swagger.
 * Si existe el archivo openapi.yaml, se sirve la interfaz Swagger en /api-doc.
 */
const openapiPath = './openapi.yaml';
if (fs.existsSync(openapiPath)) {
  const file = fs.readFileSync(openapiPath, 'utf8');
  const swaggerDocument = YAML.parse(file);
  app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

/**
 * Iniciar el servidor HTTP en el puerto especificado.
 * @type {Server}
 */
const server = app.listen(port, () => {});

module.exports = server;