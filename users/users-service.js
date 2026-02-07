const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const express = require('express');

const { protect } = require('./middleware/authMiddleware');

const router = express.Router();

const app = express();
const port = 3000;

// Conectar a MongoDB
connectDB();
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use(cors());
app.use(express.json());

// Rutas de autenticación
app.use('/api/users', authRoutes);

app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;
  try {
    // Simulate a 1 second delay to mimic processing/network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const message = `Hello ${username}! welcome to the course! PRUEBA`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const logoutUser = (req, res) => {
  res.setHeader('Set-Cookie', [
    'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
  ]);

  res.json({ message: 'Sesión cerrada' });
};

router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
