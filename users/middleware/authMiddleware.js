const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Parseo simple de cookies
const parseCookies = (cookieHeader) => {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=');
        cookies[key] = value;
    });

    return cookies;
};

const protect = async (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'No autorizado, sin token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = { protect };
