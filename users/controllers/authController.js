const User = require('../models/User');
const jwt = require('jsonwebtoken');


// Generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key', {
    expiresIn: '30d',
  });
};

// @desc    Registrar nuevo usuario
// @route   POST /api/users/register
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      const token = generateToken(user._id);

      // Configurar cookie con el token
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,        // localhost = HTTP
        sameSite: 'lax',      //
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });


      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: token,
      });
    } else {
      res.status(400).json({ error: 'Datos de usuario inválidos' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Autenticar usuario y obtener token
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);

      res.setHeader('Set-Cookie', [
        `token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Strict`
      ]);

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: token,
      });
    } else {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Logout usuario (eliminar cookie)
// @route   POST /api/users/logout
const logoutUser = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logout exitoso' });
};

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/users/profile
const getUserProfile = async (req, res) => {

  let token;

  // Intentar obtener el token de la cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Fallback: obtener token del header Authorization
  else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'No autorizado, no hay token' });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');

    // Obtener usuario del token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(401).json({ error: 'No autorizado, token inválido' });
  }



  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
      });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};




module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
};