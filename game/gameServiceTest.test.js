const request = require('supertest');
const axios   = require('axios');
const app     = require('./game-service');

// ── Mock de axios para no necesitar el bot Rust ──────────────
jest.mock('axios');

// Respuesta base que simula el bot Rust en /v1/game/start
const rustStartOk = { data: {} };

// Respuesta base que simula un movimiento válido del bot Rust
const rustMoveOk = {
    data: {
        board:  [{ x: 0, y: 0, z: 10, player: 0 }],
        turn:   1,
        status: 'active',
        winner: null,
    },
};

// ── Helper para crear una partida ────────────────────────────
async function startGame(overrides = {}) {
    axios.post.mockResolvedValueOnce(rustStartOk); // /v1/game/start
    const res = await request(app)
        .post('/api/game/start')
        .send({ userId: 'jugador1', gameMode: 'vsBot', botMode: 'random_bot', ...overrides });
    return res;
}

// ============================================================
describe('GET /api/game/bot-modes', () => {

    test('devuelve la lista de modos disponibles', async () => {
        const res = await request(app).get('/api/game/bot-modes');
        expect(res.status).toBe(200);
        expect(res.body.botModes).toContain('random_bot');
    });

    test('incluye intermediate_bot', async () => {
        const res = await request(app).get('/api/game/bot-modes');
        expect(res.body.botModes).toContain('intermediate_bot');
    });
});

// ============================================================
describe('POST /api/game/start', () => {

    test('crea una partida y devuelve los campos esenciales', async () => {
        const res = await startGame();
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('gameId');
        expect(res.body).toHaveProperty('board');
        expect(res.body).toHaveProperty('players');
        expect(res.body.players).toHaveLength(2);
    });

    test('el turno inicial es j1 y el status es active', async () => {
        const res = await startGame();
        expect(res.body.turn).toBe('j1');
        expect(res.body.status).toBe('active');
    });

    test('los jugadores tienen los ids correctos para vsBot', async () => {
        const res = await startGame();
        const ids = res.body.players.map(p => p.id);
        expect(ids).toContain('jugador1');
        expect(ids).toContain('bot');
    });

    test('crea partida con intermediate_bot y devuelve gameId', async () => {
        const res = await startGame({ botMode: 'intermediate_bot' });
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBeDefined();
    });

    test('botMode desconocido crea partida igualmente con random_bot por defecto', async () => {
        const res = await startGame({ botMode: 'super_bot' });
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBeDefined();
    });

    test('crea una partida con intermediate_bot correctamente', async () => {
        const res = await startGame({ botMode: 'intermediate_bot' });
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBeDefined();
    });
});

// ============================================================
describe('POST /api/game/:gameId/validateMove', () => {

    test('valida un movimiento correcto y devuelve valid: true', async () => {
        const start = await startGame();
        const { gameId } = start.body;

        axios.post.mockResolvedValueOnce(rustMoveOk);

        const res = await request(app)
            .post(`/api/game/${gameId}/validateMove`)
            .send({ userId: 'j1', move: '(10,0,0)' });

        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
    });

    test('devuelve 404 para un gameId que no existe', async () => {
        const res = await request(app)
            .post('/api/game/fake_id_xyz/validateMove')
            .send({ userId: 'j1', move: '(10,0,0)' });
        expect(res.status).toBe(404);
    });

    test('devuelve winner cuando Rust indica que la partida terminó', async () => {
        const start = await startGame();
        const { gameId } = start.body;

        axios.post.mockResolvedValueOnce({
            data: { board: [], turn: 1, status: 'finished', winner: 0 },
        });

        const res = await request(app)
            .post(`/api/game/${gameId}/validateMove`)
            .send({ userId: 'j1', move: '(10,0,0)' });

        expect(res.body.winner).toBe('j1');
        expect(res.body.status).toBe('finished');
    });
});

// ============================================================
describe('POST /api/game/:gameId/vsBot/move', () => {

    test('devuelve el tablero actualizado tras el movimiento del bot', async () => {
        const start = await startGame();
        const { gameId } = start.body;

        // Primero validamos un movimiento para pasar el turno a j2
        axios.post.mockResolvedValueOnce(rustMoveOk);
        await request(app)
            .post(`/api/game/${gameId}/validateMove`)
            .send({ userId: 'j1', move: '(10,0,0)' });

        // Ahora el bot mueve
        axios.post.mockResolvedValueOnce(rustMoveOk);
        const res = await request(app)
            .post(`/api/game/${gameId}/vsBot/move`)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('board');
        expect(res.body).toHaveProperty('turn');
    }, 10000); // timeout generoso por el sleep del bot

    test('devuelve 404 para un gameId inexistente', async () => {
        const res = await request(app)
            .post('/api/game/fake_id_xyz/vsBot/move')
            .send({});
        expect(res.status).toBe(404);
    });

    test('devuelve 400 si no es turno del bot', async () => {
        const start = await startGame();
        const { gameId } = start.body;

        // Sin haber jugado, el turno es j1, no j2
        const res = await request(app)
            .post(`/api/game/${gameId}/vsBot/move`)
            .send({});
        expect(res.status).toBe(400);
    });
});

// ============================================================
describe('GET /api/game/:gameId', () => {

    test('devuelve el estado de una partida existente', async () => {
        const start = await startGame();
        const { gameId } = start.body;

        const res = await request(app).get(`/api/game/${gameId}`);
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBe(gameId);
        expect(res.body).toHaveProperty('board');
        expect(res.body).toHaveProperty('players');
        expect(res.body).toHaveProperty('status');
    });

    test('devuelve 404 para un gameId inexistente', async () => {
        const res = await request(app).get('/api/game/fake_id_xyz');
        expect(res.status).toBe(404);
    });
});

// ============================================================
describe('GET /health', () => {

    test('responde con status running', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toMatch(/running/i);
    });
});