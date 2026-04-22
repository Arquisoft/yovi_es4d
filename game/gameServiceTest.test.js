process.env.SKIP_MONGO = 'true';

const request = require('supertest');
const axios = require('axios');

jest.mock('axios');

jest.setTimeout(15000);

const appModule = require('./game-service');
const app = appModule;
const {
  GameModel,
  BOT_ROUTES,
  games,
  initializeBoard,
  initializeTetraBoard,
  parseTetraPosition,
  updateTetraBoardFromRust,
  mapConnectedFaces,
  mapConnectionEdges,
  mapHasBranch,
  convertToYEN,
  getPlayerMapping,
  indexToCoords,
  sleep,
  finishGameAndSave,
} = appModule._test;

const rustClassicStartOk = { data: {} };
const rustTetraStartOk = { data: {} };

const rustClassicMoveOk = {
  data: {
    board: [{ x: 0, y: 0, z: 10, player: 0 }],
    turn: 1,
    status: 'active',
    winner: null,
  },
};

const rustClassicFinishedOk = {
  data: {
    board: [{ x: 0, y: 0, z: 10, player: 0 }],
    turn: 1,
    status: 'finished',
    winner: 0,
  },
};

const rustTetraMoveOk = {
  data: {
    board: [
      { a: 0, b: 0, c: 0, d: 3, player: 0 },
      { a: 0, b: 0, c: 1, d: 2, player: 1 },
      { a: 0, b: 1, c: 1, d: 1, player: null },
    ],
    turn: 1,
    status: 'active',
    winner: null,
    connectedFaces: { 0: ['A', 'B'], 1: ['C'] },
    connectionEdges: {
      0: [{ from: { a: 0, b: 0, c: 0, d: 3 }, to: { a: 0, b: 0, c: 1, d: 2 } }],
      1: [],
    },
    hasBranch: { 0: true, 1: false },
  },
};

const rustTetraFinishedValidateOk = {
  data: {
    board: [
      { a: 0, b: 0, c: 0, d: 3, player: 0 },
      { a: 0, b: 1, c: 0, d: 2, player: 0 },
    ],
    turn: 0,
    status: 'finished',
    winner: 0,
    connectedFaces: { 0: ['A', 'B', 'C', 'D'] },
    connectionEdges: {
      0: [{ from: { a: 0, b: 0, c: 0, d: 3 }, to: { a: 0, b: 1, c: 0, d: 2 } }],
    },
    hasBranch: { 0: true },
  },
};

const rustTetraFinishedBotOk = {
  data: {
    board: [
      { a: 0, b: 0, c: 0, d: 3, player: 0 },
      { a: 0, b: 1, c: 0, d: 2, player: 0 },
    ],
    turn: 0,
    status: 'finished',
    winner: 0,
    connectedFaces: { 0: ['A', 'B', 'C', 'D'] },
    connectionEdges: {
      0: [{ from: { a: 0, b: 0, c: 0, d: 3 }, to: { a: 0, b: 1, c: 0, d: 2 } }],
    },
    hasBranch: { 0: true },
    lastMove: { a: 0, b: 1, c: 0, d: 2 },
  },
};

function mockHistory(result, reject = false) {
  const lean = reject
    ? jest.fn().mockRejectedValue(new Error('db error'))
    : jest.fn().mockResolvedValue(result);
  GameModel.find = jest.fn(() => ({ lean }));
  return { lean };
}

async function startClassicGame(overrides = {}) {
  axios.post.mockResolvedValueOnce(rustClassicStartOk);
  return request(app).post('/api/game/start').send({
    userId: 'jugador1',
    gameMode: 'vsBot',
    botMode: 'random_bot',
    ...overrides,
  });
}

async function startTetraGame(overrides = {}) {
  axios.post.mockResolvedValueOnce(rustTetraStartOk);
  return request(app).post('/api/game/start').send({
    userId: 'jugador1',
    gameMode: 'vsBot',
    botMode: 'random_bot',
    boardVariant: 'tetra3d',
    boardSize: 4,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  games.clear();
  GameModel.find = jest.fn();
  GameModel.findOneAndUpdate = jest.fn().mockResolvedValue({});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Carga del modulo y conexion mongo', () => {
  test('no levanta el servidor al importar el modulo en tests', () => {
    jest.resetModules();

    const listen = jest.fn();
    const expressApp = {
      disable: jest.fn(),
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      listen,
    };
    const expressFactory = jest.fn(() => expressApp);
    expressFactory.json = jest.fn(() => 'json-middleware');

    const schemaCtor = function Schema(definition) {
      this.definition = definition;
    };
    schemaCtor.Types = { Mixed: 'Mixed' };

    jest.doMock('express', () => expressFactory);
    jest.doMock('axios', () => ({ post: jest.fn(), get: jest.fn() }));
    jest.doMock('cors', () => () => (_req, _res, next) => next());
    jest.doMock('mongoose', () => ({
      connect: jest.fn().mockResolvedValue(),
      Schema: schemaCtor,
      model: jest.fn(() => ({ find: jest.fn(), findOneAndUpdate: jest.fn() })),
    }));

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    jest.isolateModules(() => {
      require('./game-service');
    });

    process.env.NODE_ENV = previousNodeEnv;
    expect(listen).not.toHaveBeenCalled();
  });

  test('evalua PORT y GAMEY_BOT_URL cuando existen en entorno', () => {
    jest.resetModules();

    const connect = jest.fn().mockReturnValue(Promise.resolve());
    const schemaCtor = function Schema(definition) {
      this.definition = definition;
    };
    schemaCtor.Types = { Mixed: 'Mixed' };

    jest.doMock('axios', () => ({ post: jest.fn() }));
    jest.doMock('cors', () => () => (_req, _res, next) => next());
    jest.doMock('mongoose', () => ({
      connect,
      Schema: schemaCtor,
      model: jest.fn(() => ({ find: jest.fn(), findOneAndUpdate: jest.fn() })),
    }));

    const previousSkip = process.env.SKIP_MONGO;
    const previousPort = process.env.PORT;
    const previousBotUrl = process.env.GAMEY_BOT_URL;
    process.env.SKIP_MONGO = 'true';
    process.env.PORT = '9999';
    process.env.GAMEY_BOT_URL = 'http://custom-bot';

    jest.isolateModules(() => {
      require('./game-service');
    });

    process.env.SKIP_MONGO = previousSkip;
    process.env.PORT = previousPort;
    process.env.GAMEY_BOT_URL = previousBotUrl;
  });

  test('intenta conectar a mongo cuando SKIP_MONGO no es true y resuelve', async () => {
    jest.resetModules();

    const connect = jest.fn().mockReturnValue(Promise.resolve());
    const schemaCtor = function Schema(definition) {
      this.definition = definition;
    };
    schemaCtor.Types = { Mixed: 'Mixed' };

    jest.doMock('axios', () => ({ post: jest.fn() }));
    jest.doMock('cors', () => () => (_req, _res, next) => next());
    jest.doMock('mongoose', () => ({
      connect,
      Schema: schemaCtor,
      model: jest.fn(() => ({ find: jest.fn(), findOneAndUpdate: jest.fn() })),
    }));

    const previous = process.env.SKIP_MONGO;
    delete process.env.SKIP_MONGO;

    jest.isolateModules(() => {
      require('./game-service');
    });

    await Promise.resolve();

    process.env.SKIP_MONGO = previous;
    expect(connect).toHaveBeenCalled();
  });

  test('maneja error de conexion mongo al cargar el modulo', async () => {
    jest.resetModules();

    const connect = jest.fn().mockReturnValue(Promise.reject(new Error('mongo fail')));
    const schemaCtor = function Schema(definition) {
      this.definition = definition;
    };
    schemaCtor.Types = { Mixed: 'Mixed' };

    jest.doMock('axios', () => ({ post: jest.fn() }));
    jest.doMock('cors', () => () => (_req, _res, next) => next());
    jest.doMock('mongoose', () => ({
      connect,
      Schema: schemaCtor,
      model: jest.fn(() => ({ find: jest.fn(), findOneAndUpdate: jest.fn() })),
    }));

    const previous = process.env.SKIP_MONGO;
    delete process.env.SKIP_MONGO;

    jest.isolateModules(() => {
      require('./game-service');
    });

    await Promise.resolve();
    await Promise.resolve();

    process.env.SKIP_MONGO = previous;
    expect(connect).toHaveBeenCalled();
  });
});

describe('GET /api/game/bot-modes', () => {
  test('devuelve la lista de bots disponibles', async () => {
    const res = await request(app).get('/api/game/bot-modes');

    expect(res.status).toBe(200);
    expect(res.body.botModes).toEqual(Object.keys(BOT_ROUTES));
  });
});

describe('GET /api/game/history', () => {
  test('falla si falta userId', async () => {
    const res = await request(app).get('/api/game/history');

    expect(res.status).toBe(400);
  });

  test('devuelve el historial cuando la consulta funciona', async () => {
    const history = [{
      gameId: 'g1',
      userId: 'u1',
      createdAt: '2026-04-21T10:00:00.000Z',
      moves: [],
      winner: null,
    }];
    const chain = mockHistory(history);

    const res = await request(app).get('/api/game/history').query({ userId: 'u1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      games: history,
      pagination: {
        page: 1,
        limit: 5,
        hasPrev: false,
        hasNext: false,
      },
      summary: {
        totalGames: 1,
        totalWins: 0,
        totalDraws: 1,
        totalLosses: 0,
        winPercentage: 0,
      }
    });
    expect(GameModel.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(chain.lean).toHaveBeenCalled();
  });

  test('maneja errores al obtener el historial', async () => {
    mockHistory([], true);

    const res = await request(app).get('/api/game/history').query({ userId: 'u1' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/historial/i);
  });
});

describe('POST /api/game/start', () => {
  test('crea una partida clasica con valores por defecto', async () => {
    const res = await startClassicGame();

    expect(res.status).toBe(200);
    expect(res.body.turn).toBe('j1');
    expect(res.body.status).toBe('active');
    expect(res.body.boardVariant).toBe('classic');
    expect(res.body.board).toHaveLength(66);
    expect(res.body.players.map((player) => player.id)).toEqual(['jugador1', 'bot']);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/game/start'),
      { board_size: 11,
        game_id: res.body.gameId,
       },
      { timeout: 5000 }
    );
  });

  test('normaliza tamano clasico invalido a 11', async () => {
    const res = await startClassicGame({ boardSize: 99, botMode: 'super_bot' });

    expect(res.status).toBe(200);
    expect(res.body.board).toHaveLength(66);
  });

  test('permite que empiece j2', async () => {
    const res = await startClassicGame({ startingPlayer: 'j2' });

    expect(res.status).toBe(200);
    expect(res.body.turn).toBe('j2');
  });

  test('crea una partida tetra con sus campos extra', async () => {
    const res = await startTetraGame();

    expect(res.status).toBe(200);
    expect(res.body.boardVariant).toBe('tetra3d');
    expect(res.body.board).toHaveLength(20);
    expect(res.body.connectedFaces).toEqual({ j1: [], j2: [] });
    expect(res.body.connectionEdges).toEqual({ j1: [], j2: [] });
    expect(res.body.hasBranch).toEqual({ j1: false, j2: false });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/v1/tetra/start'),
      { size: 4 },
      { timeout: 5000 }
    );
  });

  test('normaliza tamano tetra invalido a 4', async () => {
    const res = await startTetraGame({ boardSize: 20 });

    expect(res.status).toBe(200);
    expect(res.body.board).toHaveLength(20);
  });

  test('crea partida multijugador con player2', async () => {
    const res = await startClassicGame({ gameMode: 'multiplayer' });

    expect(res.status).toBe(200);
    expect(res.body.players[1].id).toBe('player2');
    expect(res.body.players[1].name).toBe('Player 2');
  });

  test('devuelve 500 si falla el arranque en rust', async () => {
    axios.post.mockRejectedValueOnce(new Error('boom'));

    const res = await request(app).post('/api/game/start').send({ userId: 'jugador1' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/iniciando juego/i);
  });
});

describe('POST /api/game/:gameId/validateMove', () => {
  test('devuelve 404 si la partida no existe', async () => {
    const res = await request(app)
      .post('/api/game/fake/validateMove')
      .send({ userId: 'u1', move: '(10,0,0)' });

    expect(res.status).toBe(404);
  });

  test('valida un movimiento clasico activo', async () => {
    const start = await startClassicGame();
    axios.post.mockResolvedValueOnce(rustClassicMoveOk);

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(10,0,0)' });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.winner).toBeNull();
    expect(res.body.status).toBe('active');
  });

  test('finaliza una partida clasica y la guarda', async () => {
    const start = await startClassicGame();
    axios.post.mockResolvedValueOnce(rustClassicFinishedOk);

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(10,0,0)' });

    expect(res.status).toBe(200);
    expect(res.body.winner).toBe('j1');
    expect(GameModel.findOneAndUpdate).toHaveBeenCalled();
  });

  test('valida un movimiento tetra activo', async () => {
    const start = await startTetraGame();
    axios.post.mockResolvedValueOnce(rustTetraMoveOk);

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(0,0,0,3)' });

    expect(res.status).toBe(200);
    expect(res.body.connectedFaces).toEqual({ j1: ['A', 'B'], j2: ['C'] });
    expect(res.body.connectionEdges).toEqual({
      j1: [{ from: '(0,0,0,3)', to: '(0,0,1,2)' }],
      j2: [],
    });
    expect(res.body.hasBranch).toEqual({ j1: true, j2: false });
  });

  test('mantiene el turno tetra si rust devuelve turn null', async () => {
    const start = await startTetraGame();
    axios.post.mockResolvedValueOnce({
      data: {
        ...rustTetraMoveOk.data,
        turn: null,
      },
    });

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(0,0,0,3)' });

    expect(res.status).toBe(200);
    expect(games.get(start.body.gameId).currentPlayer).toBe('j1');
  });

  test('finaliza una partida tetra y la guarda', async () => {
    const start = await startTetraGame();
    axios.post.mockResolvedValueOnce(rustTetraFinishedValidateOk);

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(0,0,0,3)' });

    expect(res.status).toBe(200);
    expect(res.body.winner).toBe('j1');
    expect(GameModel.findOneAndUpdate).toHaveBeenCalled();
  });

  test('devuelve error tetra si rust rechaza el movimiento', async () => {
    const start = await startTetraGame();
    axios.post.mockRejectedValueOnce({
      response: { status: 422, data: { message: 'Invalid tetra move' } },
    });

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(0,0,0,3)' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/invalid tetra move/i);
  });

  test('usa error por defecto si la validacion tetra falla sin response', async () => {
    const start = await startTetraGame();
    axios.post.mockRejectedValueOnce(new Error('tetra fail'));

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(0,0,0,3)' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid tetra move/i);
  });

  test('alterna el turno clasico tambien cuando empieza j2', async () => {
    const start = await startClassicGame({ startingPlayer: 'j2' });
    axios.post.mockResolvedValueOnce(rustClassicMoveOk);

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(10,0,0)' });

    expect(res.status).toBe(200);
    expect(games.get(start.body.gameId).currentPlayer).toBe('j1');
  });

  test('ignora celdas clasicas que no existen en el tablero', async () => {
    const start = await startClassicGame();
    axios.post.mockResolvedValueOnce({
      data: {
        board: [{ x: 99, y: 99, z: 99, player: 0 }],
        turn: 1,
        status: 'active',
        winner: null,
      },
    });

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(10,0,0)' });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/game/:gameId/vsBot/move', () => {
  test('devuelve 404 si la partida no existe', async () => {
    const res = await request(app).post('/api/game/fake/vsBot/move').send({});

    expect(res.status).toBe(404);
  });

  test('devuelve 400 si no es turno del bot', async () => {
    const start = await startClassicGame();

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  test('procesa un movimiento del bot en clasico', async () => {
    const start = await startClassicGame();
    axios.post.mockResolvedValueOnce(rustClassicMoveOk);

    await request(app)
      .post(`/api/game/${start.body.gameId}/validateMove`)
      .send({ userId: 'u1', move: '(10,0,0)' });

    axios.post.mockResolvedValueOnce(rustClassicMoveOk);

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(200);
    expect(res.body.board).toBeDefined();
    expect(res.body.turn).toBe('j2');
  });

  test('devuelve error si rust no devuelve tablero en clasico', async () => {
    const start = await startClassicGame({ startingPlayer: 'j2' });
    axios.post.mockResolvedValueOnce({ data: { turn: 1, status: 'active' } });

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/tablero/i);
  });

  test('finaliza un movimiento clasico del bot y guarda la partida', async () => {
    const start = await startClassicGame({ startingPlayer: 'j2' });
    axios.post.mockResolvedValueOnce(rustClassicFinishedOk);

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('finished');
    expect(res.body.winner).toBe('j2');
    expect(GameModel.findOneAndUpdate).toHaveBeenCalled();
  });

  test('usa la ruta fallback random cuando el botMode no existe', async () => {
    const start = await startClassicGame({ startingPlayer: 'j2', botMode: 'super_bot' });
    axios.post.mockResolvedValueOnce(rustClassicMoveOk);

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(200);
    expect(axios.post).toHaveBeenLastCalledWith(
      expect.stringContaining(BOT_ROUTES.random_bot),
      expect.any(Object)
    );
  });

  test('procesa un movimiento tetra del bot y finaliza', async () => {
    const start = await startTetraGame({ startingPlayer: 'j2' });
    axios.post.mockResolvedValueOnce(rustTetraFinishedBotOk);

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('finished');
    expect(res.body.winner).toBe('j2');
    expect(res.body.connectionEdges.j2).toEqual([{ from: '(0,0,0,3)', to: '(0,1,0,2)' }]);
    expect(res.body.hasBranch.j2).toBe(true);
    expect(GameModel.findOneAndUpdate).toHaveBeenCalled();
  });

  test('procesa un movimiento tetra activo sin lastMove y con turn undefined', async () => {
    const start = await startTetraGame({ startingPlayer: 'j2' });
    axios.post.mockResolvedValueOnce({
      data: {
        board: [{ a: 0, b: 0, c: 0, d: 3, player: 0 }],
        turn: undefined,
        status: 'active',
        winner: null,
        connectedFaces: { 0: ['A'] },
        connectionEdges: { 0: [] },
        hasBranch: { 0: false },
      },
    });

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.moves).toHaveLength(0);
    expect(games.get(start.body.gameId).currentPlayer).toBe('j2');
  });

  test('maneja errores inesperados del bot', async () => {
    const start = await startClassicGame({ startingPlayer: 'j2' });
    axios.post.mockRejectedValueOnce(new Error('bot fail'));

    const res = await request(app).post(`/api/game/${start.body.gameId}/vsBot/move`).send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/bot fail/i);
  });
});

describe('POST /api/game/:gameId/multiplayer/move', () => {
  test('devuelve 404 si la partida no existe', async () => {
    const res = await request(app).post('/api/game/fake/multiplayer/move').send({});

    expect(res.status).toBe(404);
  });

  test('devuelve el estado actual en multijugador', async () => {
    const start = await startClassicGame({ gameMode: 'multiplayer' });

    const res = await request(app)
      .post(`/api/game/${start.body.gameId}/multiplayer/move`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.gameId).toBe(start.body.gameId);
    expect(res.body.status).toBe('active');
  });
});

describe('GET /api/game/:gameId', () => {
  test('devuelve 404 si no existe', async () => {
    const res = await request(app).get('/api/game/fake');

    expect(res.status).toBe(404);
  });

  test('devuelve el estado de una partida tetra', async () => {
    const start = await startTetraGame();

    const res = await request(app).get(`/api/game/${start.body.gameId}`);

    expect(res.status).toBe(200);
    expect(res.body.boardVariant).toBe('tetra3d');
    expect(res.body.connectedFaces).toEqual({ j1: [], j2: [] });
  });

  test('devuelve valores por defecto al consultar una partida clasica', async () => {
    const start = await startClassicGame();

    const res = await request(app).get(`/api/game/${start.body.gameId}`);

    expect(res.status).toBe(200);
    expect(res.body.boardVariant).toBe('classic');
    expect(res.body.connectedFaces).toEqual({ j1: [], j2: [] });
    expect(res.body.connectionEdges).toEqual({ j1: [], j2: [] });
    expect(res.body.hasBranch).toEqual({ j1: false, j2: false });
  });

  test('usa todos los fallbacks si el estado guardado no trae campos tetra', async () => {
    games.set('manual_game', {
      gameId: 'manual_game',
      board: [],
      players: [],
      moves: [],
      currentPlayer: 'j1',
      status: 'active',
      winner: null,
    });

    const res = await request(app).get('/api/game/manual_game');

    expect(res.status).toBe(200);
    expect(res.body.boardVariant).toBe('classic');
    expect(res.body.connectedFaces).toEqual({ j1: [], j2: [] });
    expect(res.body.connectionEdges).toEqual({ j1: [], j2: [] });
    expect(res.body.hasBranch).toEqual({ j1: false, j2: false });
  });
});

describe('Auxiliares internas', () => {
  test('initializeBoard crea las celdas correctas', () => {
    const board = initializeBoard(3);

    expect(board).toHaveLength(6);
    expect(board[0]).toEqual({ position: '(2,0,0)', player: null });
  });

  test('initializeTetraBoard crea el volumen correcto', () => {
    const board = initializeTetraBoard(4);

    expect(board).toHaveLength(20);
    expect(board).toContainEqual({ position: '(0,0,0,3)', player: null });
  });

  test('parseTetraPosition parsea posiciones validas e invalidas', () => {
    expect(parseTetraPosition('(1,2,3,4)')).toEqual({ a: 1, b: 2, c: 3, d: 4 });
    expect(() => parseTetraPosition('(1,2,3)')).toThrow(/invalid tetra position/i);
  });

  test('updateTetraBoardFromRust traduce jugadores y nulos', () => {
    const board = updateTetraBoardFromRust(
      [
        { a: 0, b: 0, c: 0, d: 3, player: 0 },
        { a: 0, b: 1, c: 0, d: 2, player: null },
      ],
      { 0: 'j1', 1: 'j2' }
    );

    expect(board).toEqual([
      { position: '(0,0,0,3)', player: 'j1' },
      { position: '(0,1,0,2)', player: null },
    ]);
  });

  test('mapConnectedFaces cubre datos validos e invalidos', () => {
    expect(mapConnectedFaces(null, { 0: 'j1', 1: 'j2' })).toEqual({ j1: [], j2: [] });
    expect(mapConnectedFaces({ 0: ['A'], 1: 'bad', 9: ['Z'] }, { 0: 'j1', 1: 'j2' })).toEqual({
      j1: ['A'],
      j2: [],
    });
  });

  test('mapConnectionEdges cubre datos validos e invalidos', () => {
    expect(mapConnectionEdges(null, { 0: 'j1', 1: 'j2' })).toEqual({ j1: [], j2: [] });
    expect(
      mapConnectionEdges(
        {
          0: [{ from: { a: 0, b: 0, c: 0, d: 3 }, to: { a: 0, b: 0, c: 1, d: 2 } }],
          1: 'bad',
          9: [],
        },
        { 0: 'j1', 1: 'j2' }
      )
    ).toEqual({
      j1: [{ from: '(0,0,0,3)', to: '(0,0,1,2)' }],
      j2: [],
    });
  });

  test('mapHasBranch cubre datos validos e invalidos', () => {
    expect(mapHasBranch(null, { 0: 'j1', 1: 'j2' })).toEqual({ j1: false, j2: false });
    expect(mapHasBranch({ 0: 1, 1: 0, 9: true }, { 0: 'j1', 1: 'j2' })).toEqual({
      j1: true,
      j2: false,
    });
  });

  test('convertToYEN transforma el tablero clasico con ambos mapeos', () => {
    expect(
      convertToYEN({
        boardSize: 3,
        currentPlayer: 'j1',
        startingPlayer: 'j1',
        board: [
          { position: '(2,0,0)', player: 'j1' },
          { position: '(1,0,1)', player: null },
          { position: '(1,1,0)', player: 'j2' },
          { position: '(0,0,2)', player: null },
          { position: '(0,1,1)', player: null },
          { position: '(0,2,0)', player: null },
        ],
      })
    ).toEqual({
      size: 3,
      turn: 0,
      players: ['B', 'R'],
      layout: 'B/.R/...',
    });

    expect(
      convertToYEN({
        boardSize: 1,
        currentPlayer: 'j2',
        startingPlayer: 'j2',
        board: [{ position: '(0,0,0)', player: 'j1' }],
      })
    ).toEqual({
      size: 1,
      turn: 0,
      players: ['B', 'R'],
      layout: 'R',
    });

    expect(
      convertToYEN({
        boardSize: 1,
        currentPlayer: 'j1',
        startingPlayer: 'j1',
        board: [{ position: '(0,0,0)', player: 'j2' }],
      })
    ).toEqual({
      size: 1,
      turn: 0,
      players: ['B', 'R'],
      layout: 'R',
    });

    expect(
      convertToYEN({
        boardSize: 2,
        currentPlayer: 'j1',
        startingPlayer: 'j1',
        board: [{ position: '(1,0,0)', player: null }],
      })
    ).toEqual({
      size: 2,
      turn: 0,
      players: ['B', 'R'],
      layout: './..',
    });
  });

  test('getPlayerMapping invierte el mapeo cuando empieza j2', () => {
    expect(getPlayerMapping({ startingPlayer: 'j1' })).toEqual({
      toGamey: { j1: 0, j2: 1 },
      toLogical: { 0: 'j1', 1: 'j2' },
    });
    expect(getPlayerMapping({ startingPlayer: 'j2' })).toEqual({
      toGamey: { j1: 1, j2: 0 },
      toLogical: { 0: 'j2', 1: 'j1' },
    });
  });

  test('indexToCoords convierte indices a coordenadas', () => {
    expect(indexToCoords(0, 4)).toEqual({ x: 3, y: 0, z: 0 });
    expect(indexToCoords(5, 4)).toEqual({ x: 1, y: 2, z: 0 });
  });

  test('sleep resuelve la promesa', async () => {
    const start = Date.now();
    await sleep(5);
    expect(Date.now()).toBeGreaterThanOrEqual(start);
  });

  test('finishGameAndSave guarda el juego y marca finishedAt', async () => {
    const game = {
      gameId: 'g1',
      userId: 'u1',
      gameMode: 'vsBot',
      boardVariant: 'classic',
      connectedFaces: undefined,
      connectionEdges: undefined,
      hasBranch: undefined,
      boardSize: 11,
      players: [],
      moves: [],
      status: 'active',
      winner: 'j1',
      createdAt: new Date('2026-01-01'),
    };

    await finishGameAndSave(game);

    expect(game.status).toBe('finished');
    expect(game.finishedAt).toBeInstanceOf(Date);
    expect(GameModel.findOneAndUpdate).toHaveBeenCalled();
  });

  test('finishGameAndSave maneja errores de guardado', async () => {
    GameModel.findOneAndUpdate.mockRejectedValueOnce(new Error('db fail'));
    const game = {
      gameId: 'g2',
      userId: 'u1',
      gameMode: 'vsBot',
      boardVariant: 'classic',
      connectedFaces: undefined,
      connectionEdges: undefined,
      hasBranch: undefined,
      boardSize: 11,
      players: [],
      moves: [],
      status: 'active',
      winner: 'j1',
      createdAt: new Date('2026-01-01'),
    };

    await finishGameAndSave(game);

    expect(console.error).toHaveBeenCalled();
  });
});

describe('GET /health', () => {
  test('responde con el estado del servicio', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toMatch(/running/i);
  });
});
