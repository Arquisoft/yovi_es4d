# Arquitectura de Integración: Gateway + Game Service + Gamey Bot

## 📋 Descripción General

La arquitectura de microservicios está compuesta por:

1. **Frontend (React)** - Aplicación en puerto 5173
2. **Gateway** - Enrutador central en puerto 8000
3. **Game Service** (Node.js) - Orquestador de lógica de juego en puerto 8003
4. **Gamey Bot** (Rust) - Motor de IA del bot en puerto 3001
5. **Users Service** (Node.js) - Servicio de usuarios en puerto 8001
6. **Auth Service** - Servicio de autenticación en puerto 8002

## 🚀 Cómo Levantar Todos los Servicios

### Opción 1: Manualmente (para desarrollo)

#### 1. Levantar Gamey Bot (Rust)
```bash
cd gamey
# Instalar dependencias y compilar (primera vez)
cargo build --release

# Ejecutar en modo servidor en puerto 3001
cargo run --release -- --mode server --port 3001
```

#### 2. Levantar Game Service (Node.js)
```bash
cd game
npm install
npm start
# O con nodemon para auto-reload:
npm run dev
```

#### 3. Levantar Gateway (Node.js)
```bash
cd gateway
npm install
npm start
```

#### 4. Levantar Frontend (React/Vite)
```bash
cd webapp
npm install
npm run dev
```

### Opción 2: Con Docker Compose (recomendado para producción)

Actualiza el `docker-compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'

services:
  gamey-bot:
    build:
      context: ./gamey
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    command: ["--mode", "server", "--port", "3001"]
    environment:
      - RUST_LOG=info

  game-service:
    build:
      context: ./game
      dockerfile: Dockerfile
    ports:
      - "8003:8003"
    depends_on:
      - gamey-bot
    environment:
      - NODE_ENV=production
      - PORT=8003
      - GAMEY_BOT_URL=http://gamey-bot:3001

  gateway:
    build:
      context: ./gateway
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    depends_on:
      - game-service
    environment:
      - NODE_ENV=production
      - GAME_SERVICE_URL=http://game-service:8003

  webapp:
    build:
      context: ./webapp
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - gateway
```

## 🔄 Flujo de Comunicación

```
Frontend (GameBoard.tsx)
    ↓ POST /api/game/start
Gateway (puerto 8000)
    ↓ POST /api/game/new
Game Service (puerto 8003)
    ↓
  [Gestiona estado del juego]
    ↓ POST /v1/ybot/choose/random_bot
Gamey Bot (puerto 3001)
    ↓ [Calcula movimiento del bot]
Game Service
    ↓ [Actualiza tablero y devuelve estado]
Gateway
    ↓ JSON response
Frontend (GameBoard.tsx)
```

## 📍 Variables de Entorno

### Gateway (.env)
```
GAME_SERVICE_URL=http://localhost:8003
AUTH_SERVICE_URL=http://localhost:8002
USER_SERVICE_URL=http://localhost:8001
TOKEN_SECRET_KEY=mi_clave_secreta
```

### Game Service (.env)
```
PORT=8003
GAMEY_BOT_URL=http://localhost:3001
```

### Frontend (.env)
```
VITE_API_URL=
```

#### Despliegue en MV (IP pÃºblica)
- Acceso recomendado: `https://20.188.62.231` (o el puerto externo que mapees).
- El contenedor `webapp` (nginx) hace proxy de `/api` y `/socket.io` hacia `gateway` dentro de Docker, asÃ­ que en producciÃ³n conviene dejar `VITE_API_URL` vacÃ­o.
- Configura `WEBAPP_PUBLIC_IP` para que el certificado autofirmado incluya la IP como SAN.

## 🎮 Cómo Usar desde GameBoard.tsx

Tu código en `GameBoard.tsx` ya está correctamente configurado para:

1. **Iniciar juego**: `POST /api/game/start`
   ```typescript
   const res = await fetch(`${API_URL}/api/game/start`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ userId: "jugador1" }),
   });
   const data = await res.json();
   ```

2. **Realizar movimiento**: `POST /api/game/:gameId/move`
   ```typescript
   const res = await fetch(`${API_URL}/api/game/${gameId}/move`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ userId: "jugador1", move: "2,0,2" }),
   });
   const data = await res.json();
   ```

El flujo automático es:
- Procesa tu movimiento
- Llama a Gamey Bot para obtener el movimiento del bot
- Devuelve el estado actualizado del tablero

## ⚙️ Dockerfile para Game Service

Crea `game/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production
# NOSONAR 
COPY . .

EXPOSE 8003

CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Gamey Bot no responde
```bash
# Verifica que Gamey está corriendo
curl http://localhost:3001/status
# Debe devolver: OK
```

### Game Service no se conecta a Gamey
- Verifica que `GAMEY_BOT_URL` está correctamente configurada
- Corre: `curl http://localhost:3001/v1/ybot/choose/random_bot -X POST -d '{}' -H 'Content-Type: application/json'`

### Gateway no conecta con Game Service
- Verifica que `GAME_SERVICE_URL` está correctamente configurada
- Asegúrate que el Game Service está corriendo en puerto 8003

## 📦 Orden de inicio recomendado

1. Gamey Bot (es la base)
2. Game Service (necesita Gamey)
3. Gateway (necesita Game Service)
4. Frontend (necesita Gateway)

## 🔗 APIs Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/game/start` | Inicia un nuevo juego |
| POST | `/api/game/:gameId/move` | Realiza un movimiento |
| GET | `/api/game/:gameId` | Obtiene estado del juego |
| POST | `/api/game/end` | Finaliza el juego |
| GET | `/health` | Health check del Game Service |
| GET | `/status` | Health check de Gamey |
