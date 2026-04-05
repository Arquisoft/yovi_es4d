/**
 * Servicio de Usuarios de YOVI ES4D
 *
 * Este módulo proporciona la gestión de usuarios incluyendo creación de cuentas,
 * obtención de perfiles, edición de nombres de usuario y cambio de contraseñas.
 * Utiliza MongoDB para persistencia y bcrypt para hash seguro de contraseñas.
 *
 * @module user-service
 * @requires express
 * @requires mongoose
 * @requires bcrypt
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./user-model');

const app = express();
const port = 8001;

app.use(express.json());

const mongoUri =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/usersdb';

mongoose.connect(mongoUri);


/**
 * Valida que los campos requeridos estén presentes en el cuerpo de la solicitud.
 *
 * @function
 * @param {Object} req - Objeto de solicitud Express
 * @param {string[]} fields - Array de nombres de campos requeridos
 * @throws {Error} Si falta algún campo requerido
 * @returns {void}
 */
function validateRequiredFields(req, fields) {
  for (const field of fields) {
    if (!(field in req.body)) {
      throw new Error(`Missing field: ${field}`);
    }
  }
}

/**
 * Valida que la contraseña cumpla con los requisitos de seguridad.
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos un número
 * - Sin espacios en blanco
 *
 * @function
 * @param {string} password - Contraseña a validar
 * @throws {Error} Si la contraseña no cumple los requisitos
 * @returns {void}
 */
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasNoSpaces = !/\s/.test(password);

  if (
    !hasUpperCase ||
    !hasNumber ||
    !hasNoSpaces ||
    password.length < minLength
  ) {
    throw new Error('Password does not meet requirements');
  }
}

app.post('/updateAvatar', async (req, res) => {
  try {

    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const seed = Math.random().toString(36).substring(7);

    const newAvatar =
      `https://api.dicebear.com/8.x/adventurer/svg?seed=${seed}`;

    user.avatar = newAvatar;
    await user.save();

    res.json({
      message: "Avatar updated",
      avatar: newAvatar
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal error" });
  }
});

/**
 * Crear un nuevo usuario.
 * Registra un nuevo usuario validando los requisitos y evitando duplicados.
 * Genera automáticamente un avatar basado en las iniciales del email.
 *
 * @route {POST} /adduser
 * @param {Object} req.body - Datos del nuevo usuario
 * @param {string} req.body.username - Nombre de usuario (único)
 * @param {string} req.body.email - Email del usuario (único)
 * @param {string} req.body.password - Contraseña (mínimo 8 caracteres, mayúscula, número)
 * @returns {Object} ID del usuario creado
 * @throws {400} Si faltan campos o contraseña no cumple requisitos
 * @throws {409} Si el email o nombre de usuario ya existen
 */
app.post('/adduser', async (req, res) => {
  try {

    validateRequiredFields(req, [
      'username',
      'email',
      'password'
    ]);

    const { username, email: rawEmail, password } = req.body;

    const email = rawEmail.trim().toLowerCase();

    validatePassword(password);

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email or username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const avatar =
        `https://api.dicebear.com/8.x/adventurer/svg?seed=${email}`;

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar,
      createdAt: new Date()
    });

   const savedUser = await newUser.save();
    console.log(savedUser);
    
    res.status(201).json({
      message: 'User created',
      id: newUser._id
    });

  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});



/**
 * Obtener perfil del usuario.
 * Recupera la información pública del usuario (sin incluir la contraseña).
 *
 * @route {POST} /profile
 * @param {Object} req.body - Datos de solicitud
 * @param {string} req.body.userId - ID único del usuario
 * @returns {Object} Perfil del usuario (id, username, email, avatar)
 * @throws {404} Si el usuario no existe
 * @throws {500} Si hay error interno
 */
app.post('/profile', async (req, res) => {

  try {

    const { userId } = req.body;

    const user = await User
      .findById(userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: 'Internal error'
    });
  }

});



/**
 * Editar nombre de usuario.
 * Actualiza el nombre de usuario de un usuario existente.
 * El nuevo nombre de usuario debe tener mínimo 3 caracteres.
 *
 * @route {POST} /editUser
 * @param {Object} req.body - Datos a actualizar
 * @param {string} req.body.userId - ID único del usuario
 * @param {string} req.body.username - Nuevo nombre de usuario (mínimo 3 caracteres)
 * @returns {Object} Mensaje de confirmación
 * @throws {400} Si el nombre de usuario no es válido
 * @throws {404} Si el usuario no existe
 * @throws {500} Si hay error interno
 */
app.post('/editUser', async (req, res) => {

  try {

    const { userId, username } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({
        error: "Invalid username"
      });
    }

    await User.findByIdAndUpdate(
      userId,
      { username }
    );

    res.json({ message: "Username updated" });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: "Internal error"
    });
  }

});


/**
 * Cambiar contraseña del usuario.
 * Cambia la contraseña del usuario después de validar la contraseña actual.
 * La nueva contraseña debe cumplir con los requisitos de seguridad.
 *
 * @route {POST} /changePassword
 * @param {Object} req.body - Datos de cambio de contraseña
 * @param {string} req.body.userId - ID único del usuario
 * @param {string} req.body.currentPassword - Contraseña actual
 * @param {string} req.body.newPassword - Nueva contraseña (mínimo 8 caracteres, mayúscula, número)
 * @returns {Object} Mensaje de confirmación
 * @throws {400} Si la contraseña actual es incorrecta o nueva contraseña no cumple requisitos
 * @throws {404} Si el usuario no existe
 * @throws {500} Si hay error interno
 */
app.post('/changePassword', async (req, res) => {

  try {
    const {
      userId,
      currentPassword,
      newPassword
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!valid) {
      return res.status(400).json({
        error: "Current password incorrect"
      });
    }

    validatePassword(newPassword);

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    await user.save();

    res.json({
      message: "Password updated"
    });

  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: error.message
    });
  }

});
app.post('/api/users/bulk', async (req, res) => {
  const { ids } = req.body;
  const users = await User.find({ _id: { $in: ids } });
  res.json(users);
});
app.get('/api/users', async (req, res) => {
  try {
    const { exclude = [], search = '', page = 1, limit = 10 } = req.query;

    const excludeIds = Array.isArray(exclude) ? exclude : [exclude];

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const users = await User.find({
      _id: { $nin: excludeIds },
      username: { $regex: search, $options: 'i' }
    })
      .select('-password')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json(users);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * Iniciar el servidor de usuarios en el puerto especificado.
 * Al cerrar el servidor, se cierra la conexión a MongoDB.
 * @type {Server}
 */
function startServer() {
  const server = app.listen(port, () => {
    console.log(`User service running on ${port}`);
  });

  server.on('close', () => {
    mongoose.connection.close();
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.__validateRequiredFields = validateRequiredFields;
module.exports.__validatePassword = validatePassword;
