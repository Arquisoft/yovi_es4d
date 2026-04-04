const request = require('supertest');
const axios   = require('axios');
const jwt     = require('jsonwebtoken');

jest.mock('axios');

const privateKey = process.env.TOKEN_SECRET_KEY || 'mi_clave_secreta';

const createCookie = (userId = 'testUser') => {
    const token = jwt.sign({ userId }, privateKey);
    return `token=${token}`;
};

// El gateway exporta el server, no app, así que lo cerramos al acabar
let server;
beforeAll(() => {
    server = require('./gateway-service');
});
afterAll((done) => {
    server.close(done);
});

// ── Respuestas mock del game-service ─────────────────────────
const botModesOk   = { data: { botModes: ['random_bot', 'intermediate_bot'] } };
const gameStartOk  = { data: { gameId: 'game_abc123', board: [], players: [], turn: 'j1', status: 'active', winner: null } };
const validateOk   = { data: { valid: true, winner: null, status: 'active' } };
const moveOk       = { data: { board: [], turn: 'j1', winner: null, status: 'active' } };
const gameStateOk  = { data: { gameId: 'game_abc123', board: [], players: [], status: 'active' } };

// ============================================================
describe('GET /api/game/bot-modes', () => {

    test('devuelve los modos de bot del game-service', async () => {
        axios.get.mockResolvedValueOnce(botModesOk);
        const res = await request(server).get('/api/game/bot-modes');
        expect(res.status).toBe(200);
        expect(res.body.botModes).toContain('random_bot');
        expect(res.body.botModes).toContain('intermediate_bot');
    });

    test('devuelve 500 si el game-service falla', async () => {
        axios.get.mockRejectedValueOnce({ response: { status: 500 } });
        const res = await request(server).get('/api/game/bot-modes');
        expect(res.status).toBe(500);
    });
});

// ============================================================
describe('POST /api/game/start', () => {

    test('inicia una partida y devuelve gameId', async () => {
        axios.post.mockResolvedValueOnce(gameStartOk);
        const res = await request(server)
            .post('/api/game/start')
            .set('Cookie', createCookie())
            .send({ gameMode: 'vsBot', botMode: 'random_bot' });
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBe('game_abc123');
        expect(res.body.turn).toBe('j1');
    });

    test('propaga gameMode y botMode al game-service', async () => {
        axios.post.mockResolvedValueOnce(gameStartOk);
        await request(server)
            .post('/api/game/start')
            .set('Cookie', createCookie())
            .send({ gameMode: 'vsBot', botMode: 'intermediate_bot' });
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/game/start'),
            expect.objectContaining({ botMode: 'intermediate_bot', gameMode: 'vsBot' })
        );
    });

    test('devuelve 500 si el game-service falla', async () => {
        axios.post.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Error' } } });
        const res = await request(server)
            .post('/api/game/start')
            .set('Cookie', createCookie())
            .send({ gameMode: 'vsBot', botMode: 'random_bot' });
        expect(res.status).toBe(500);
    });
});

// ============================================================
describe('POST /api/game/:gameId/validateMove', () => {

    test('devuelve valid: true para un movimiento correcto', async () => {
        axios.post.mockResolvedValueOnce(validateOk);
        const res = await request(server)
            .post('/api/game/game_abc123/validateMove')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(10,0,0)' });
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
    });

    test('devuelve 400 si el game-service rechaza el movimiento', async () => {
        axios.post.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Movimiento inválido' } } });
        const res = await request(server)
            .post('/api/game/game_abc123/validateMove')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(0,0,0)' });
        expect(res.status).toBe(400);
    });

    test('reenvía move y userId al game-service', async () => {
        axios.post.mockResolvedValueOnce(validateOk);
        await request(server)
            .post('/api/game/game_abc123/validateMove')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(10,0,0)' });
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/validateMove'),
            expect.objectContaining({ move: '(10,0,0)' })
        );
    });
});

// ============================================================
describe('POST /api/game/:gameId/move', () => {

    test('mueve en modo vsBot y devuelve el tablero', async () => {
        axios.post.mockResolvedValueOnce(moveOk);
        const res = await request(server)
            .post('/api/game/game_abc123/move')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(10,0,0)', mode: 'vsBot' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('board');
    });

    test('llama al endpoint vsBot/move del game-service', async () => {
        axios.post.mockResolvedValueOnce(moveOk);
        await request(server)
            .post('/api/game/game_abc123/move')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(10,0,0)', mode: 'vsBot' });
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('vsBot/move'),
            expect.anything()
        );
    });

    test('llama al endpoint multiplayer/move del game-service', async () => {
        axios.post.mockResolvedValueOnce(moveOk);
        await request(server)
            .post('/api/game/game_abc123/move')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(10,0,0)', mode: 'multiplayer' });
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('multiplayer/move'),
            expect.anything()
        );
    });

    test('devuelve 400 si falta move o userId', async () => {
        const res = await request(server)
            .post('/api/game/game_abc123/move')
            .set('Cookie', createCookie())
            .send({ mode: 'vsBot' }); // sin move ni userId (userId lo pone el token, pero move falta)
        expect(res.status).toBe(400);
    });

    test('devuelve 400 para un mode inválido', async () => {
        const res = await request(server)
            .post('/api/game/game_abc123/move')
            .set('Cookie', createCookie())
            .send({ userId: 'j1', move: '(10,0,0)', mode: 'unknown_mode' });
        expect(res.status).toBe(400);
    });
});

// ============================================================
describe('GET /api/game/:gameId', () => {

    test('devuelve el estado de la partida', async () => {
        axios.get.mockResolvedValueOnce(gameStateOk);
        const res = await request(server)
            .get('/api/game/game_abc123')
            .set('Cookie', createCookie());
        expect(res.status).toBe(200);
        expect(res.body.gameId).toBe('game_abc123');
    });

    test('devuelve 404 si el game-service falla con 404', async () => {
        axios.get.mockRejectedValueOnce({ response: { status: 404, data: { error: 'Not found' } } });
        const res = await request(server)
            .get('/api/game/fake_id')
            .set('Cookie', createCookie());
        expect(res.status).toBe(404);
    });
});