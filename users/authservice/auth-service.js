/**
 * Servicio de Autenticación de YOVI ES4D
 *
 * Este módulo proporciona la autenticación de usuarios mediante JWT.
 * Gestiona login, logout, validación de credenciales, limitación de intentos fallidos
 * y gestión de tokens seguros en cookies.
 *
 * @module auth-service
 * @requires express
 * @requires mongoose
 * @requires bcrypt
 * @requires jsonwebtoken
 * @requires express-validator
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('./auth-model')
const { check, validationResult } = require('express-validator');
const app = express();
const port = 8002;

// Middleware to parse JSON in request body
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/usersdb';
mongoose.connect(mongoUri);

/** Clave privada para firmar JWT */
const privateKey = process.env.TOKEN_SECRET_KEY || 'your-secret-key';

/**
 * Mapa para almacenar intentos de login fallidos por dirección IP.
 * Estructura: { ip: { count: número, lastAttempt: timestamp } }
 * @type {Map<string, {count: number, lastAttempt: number}>}
 */
const failedAttempts = new Map();
/** Número máximo de intentos de login fallidos antes de bloquear */
const MAX_ATTEMPTS = 5;
/** Ventana de tiempo en milisegundos para contar intentos fallidos (5 minutos) */
const WINDOW_MS = 5 * 60 * 1000;

/**
 * Middleware para limitar el número de intentos de login fallidos por dirección IP.
 * Si se excede el número máximo de intentos dentro de la ventana de tiempo,
 * devuelve error 429 (Too Many Requests).
 *
 * @middleware
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 * @returns {void} Llama a next() si se permite continuar, o devuelve error 429
 */
function loginLimiter(req, res, next) {
  const ip = req.ip;
  const entry = failedAttempts.get(ip);

  if (entry && entry.count + 1 >= MAX_ATTEMPTS && (Date.now() - entry.lastAttempt) < WINDOW_MS) {
    return res.status(429).json({ error: 'Too many login attempts, please try again later' });
  }

  next();
}

/**
 * Valida que los campos requeridos estén presentes en el cuerpo de la solicitud.
 *
 * @function
 * @param {Object} req - Objeto de solicitud Express
 * @param {string[]} requiredFields - Array de nombres de campos requeridos
 * @throws {Error} Si falta algún campo requerido
 * @returns {void}
 */
function validateRequiredFields(req, requiredFields) {
  for (const field of requiredFields) {
    if (!(field in req.body)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Endpoint para autenticación de usuarios.
 * Valida las credenciales del usuario contra la base de datos,
 * implementa limitación de intentos fallidos y genera un token JWT.
 *
 * @route {POST} /login
 * @param {Object} req.body - Credenciales del usuario
 * @param {string} req.body.email - Email del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @returns {Object} Datos del usuario autenticado con token JWT en cookie
 * @throws {400} Si faltan campos o validación falla
 * @throws {401} Si las credenciales son inválidas
 * @throws {429} Si se excede el número de intentos fallidos
 * @throws {500} Si hay error del servidor
 */
app.post('/login', loginLimiter, [
  check('email').isLength({ min: 3 }).trim().escape(),
  check('password').isLength({ min: 3 }).trim().escape()
], async (req, res) => {
  const ip = req.ip;
  try {
    validateRequiredFields(req, ['email', 'password']);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array().map(e => e.msg).join(', ')
      });
    }

    console.log(req.body.email);
    const email = req.body.email.toString();
    const password = req.body.password.toString();
    console.log(email);
    const user = await User.findOne({ email });
    console.log("la que mete el user" + password);
    console.log("AAAAAAAAAAAAAAAAAAA" + user);
    console.log("la de la bd de mierda" + user.password);
    
    if (user && await bcrypt.compare(password, user.password)) {
      failedAttempts.delete(ip);
      
      const token = jwt.sign({ userId: user._id }, privateKey, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 1000
      });

      res.json({ email: email, createdAt: user.createdAt, id: user._id });
    } else {
      const entry = failedAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };
      failedAttempts.set(ip, { count: entry.count + 1, lastAttempt: Date.now() });
      console.log(res.status(401).json({ error: 'Invalid credentials' }));
      
    }

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Endpoint para cerrar sesión del usuario.
 * Elimina la cookie de token JWT del cliente.
 *
 * @route {POST} /logout
 * @returns {Object} Mensaje de confirmación de logout
 */
app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false 
  });
  res.json({ message: 'Logged out' });
});

/**
 * Iniciar el servidor de autenticación en el puerto especificado.
 * Al cerrar el servidor, se cierra la conexión a MongoDB.
 * @type {Server}
 */
const server = app.listen(port, () => {
  console.log(`User service running on ${port}`);
});

server.on('close', () => {
  mongoose.connection.close();
});

module.exports =  server ;