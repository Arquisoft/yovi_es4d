const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const express = require('express');
const { protect } = require('./middleware/authMiddleware');

const fs = require('node:fs');
const YAML = require('js-yaml');
const swaggerUi = require('swagger-ui-express');
const promBundle = require('express-prom-bundle');

const app = express();
const port = 3000;

// Conectar a MongoDB
connectDB();

// Prometheus metrics
const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// Swagger
try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

// Middleware CORS configurado para cookies
const allowedOrigins = ['http://localhost:5173', 'http://localhost']; // tu frontend
app.use(
    cors({
      origin: allowedOrigins,
      credentials: true, // 🔑 permite enviar cookies HTTP-only
    })
);

// Middleware para parsear JSON
app.use(express.json());

app.use(cors({
  origin: "http://localhost", // o http://localhost:5173 (Vite)
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
// Rutas de autenticación
app.use('/api/users', authRoutes);

// Ruta de prueba
app.post('/createuser', async (req, res) => {
  const username = req.body?.username;
  try {
    // Simula un retraso
    await new Promise((resolve) => setTimeout(resolve, 1000));
    res.json({ message: `Hello ${username}! welcome to the course! PRUEBA` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Rutas protegidas directamente en app
app.get('/api/users/me', protect, (req, res) => {
  res.json(req.user);
});

app.post('/api/users/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict',
  ]);
  res.json({ message: 'Sesión cerrada' });
});

// Levantar servidor
if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`);
  });
}

module.exports = app;
