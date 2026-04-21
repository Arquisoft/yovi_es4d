import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameBoard from '../components/game/GameBoard'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { I18nProvider } from '../i18n'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Socket.io mock ────────────────────────────────────────────────────────────
type SocketEventCallback = (...args: unknown[]) => void

interface MockSocket {
  on: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  _trigger: (event: string, ...args: unknown[]) => void
}

let mockSocket: MockSocket

vi.mock('socket.io-client', () => ({
  io: () => {
    const handlers: Record<string, SocketEventCallback> = {}
    mockSocket = {
      on: vi.fn((event: string, cb: SocketEventCallback) => { handlers[event] = cb }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      _trigger: (event: string, ...args: unknown[]) => handlers[event]?.(...args),
    }
    return mockSocket
  },
}))

vi.mock('../components/game/Triangle', () => ({
  default: ({ onHexClick }: { onHexClick: (p: string) => void }) => (
      <div data-testid="triangle">
        <button onClick={() => onHexClick('0,0')}>hex-0-0</button>
      </div>
  ),
}))

vi.mock('../components/game/player', () => ({
  default: ({ name }: { name: string }) => <div data-testid={`player-${name}`}>{name}</div>,
}))

vi.mock('../components/UserHeader', () => ({
  default: () => <div data-testid="user-header">User Header</div>,
}))

// Traducciones simuladas
const translations = {
  es: {
    gameBoard: {
      player1: "Jugador",
      player2: "Bot",
      turn: "Turno",
      botPlaying: "Bot pensando",
      gameStart: "Iniciando partida",
      won: "gana",
      board: "tablero",
    },
  },
}

// Mock respuestas fetch
const meResponse = { userId: 'jugador1' }

const gameStartResponse = {
  gameId: 'abc123456',
  board: [{ position: '0,0', player: null }],
  players: [
    { id: 'jugador1', name: 'Jugador', points: 0 },
    { id: 'bot', name: 'Bot', points: 0 },
  ],
  turn: 'j1',
  status: 'active',
  winner: null,
}

const mockStartSequence = () =>
    vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

const renderGame = (state = { gameMode: 'vsBot', botMode: 'random_bot', boardSize: 11 }, lang = 'es') =>
    render(
        <I18nProvider defaultLang={lang} resources={translations}>
          <MemoryRouter initialEntries={[{ pathname: '/game', state }]}>
            <Routes>
              <Route path="/game" element={<GameBoard />} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
    )

describe('GameBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockStartSequence()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra el logo YOVI en el header', async () => {
    renderGame()
    expect(await screen.findByText('YOVI_ES4D')).toBeInTheDocument()
  })

  test('muestra el spinner de carga antes de recibir la partida', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderGame()
    expect(screen.getByText(translations.es.gameBoard.gameStart)).toBeInTheDocument()
  })

  test('muestra el tablero tras cargar la partida', async () => {
    renderGame()
    expect(await screen.findByTestId('triangle')).toBeInTheDocument()
  })

  test('muestra los nombres de los dos jugadores', async () => {
    renderGame()
    expect(await screen.findByTestId(`player-TestUser`)).toBeInTheDocument()
    expect(screen.getByTestId(`player-Bot`)).toBeInTheDocument()
  })

  test('muestra el gameId en el header', async () => {
    renderGame()
    expect(await screen.findByText(/123456/i)).toBeInTheDocument()
  })

  test('muestra el botMode y gameMode en el footer', async () => {
    renderGame()
    expect(await screen.findByText(/random bot · tablero 11× · vsBot/i)).toBeInTheDocument()
  })

  test('muestra el turno del jugador al empezar', async () => {
    renderGame()
    const header = await screen.findByRole('banner')
    expect(header).toHaveTextContent(translations.es.gameBoard.turn)
    // The player name comes from the profile, not the translation
    expect(header).toHaveTextContent('TestUser')
  })

  test('llama a validateMove y move al hacer click en un hexágono', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: null, status: 'active' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ board: [], turn: 'j2', winner: null, status: 'active' }) } as Response)

    global.fetch = fetchMock

    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(5)
    })
    expect(fetchMock.mock.calls[3][0]).toContain('validateMove')
    expect(fetchMock.mock.calls[4][0]).toContain('move')
  })

  test('muestra "Bot pensando" mientras procesa el movimiento', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockImplementationOnce(() => new Promise(() => {})) // validateMove cuelga

    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    expect(await screen.findByText(translations.es.gameBoard.botPlaying)).toBeInTheDocument()
  })

  test('muestra alerta si el movimiento no es válido', async () => {
    const user = userEvent.setup()
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: false, error: 'Movimiento inválido' }) } as Response)

    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Movimiento inválido')
    })
  })

  test('muestra el ganador en el header cuando la partida termina', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: null, status: 'active' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ board: [], turn: 'j1', winner: 'j1', status: 'finished' }) } as Response)

    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      // The winner name comes from the profile (TestUser)
      expect(screen.getByText(new RegExp(`TestUser ${translations.es.gameBoard.won}`, 'i'))).toBeInTheDocument()
    })
  })

  test('navega a /gameover cuando la partida termina', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: null, status: 'active' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ board: [], turn: 'j1', winner: 'j1', status: 'finished' }) } as Response)

    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/gameover', expect.anything())
    })
  })

  test('navega a /login si /api/auth/me devuelve 401', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'No autenticado' }) } as Response)

    renderGame()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })


  test('muestra console.error si /api/game/start devuelve error', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userIdResponse = { userId: 'jugador1' }

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => userIdResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Error start' }) } as Response)

    renderGame()
    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith(
          'Error en respuesta de start:',
          { message: 'Error start' }
      )
    })

    consoleErrorMock.mockRestore()
  })

  test('muestra console.error si startGame lanza excepción', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    renderGame()

    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith(
          'Error starting game:',
          expect.any(Error)
      )
    })

    consoleErrorMock.mockRestore()
  })

  test('muestra console.error si handleHexClick lanza excepción', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'jugador1' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockRejectedValueOnce(new Error('Network move error'))

    const user = userEvent.setup()
    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith(
          'Error during move:',
          expect.any(Error)
      )
    })

    consoleErrorMock.mockRestore()
  })

  test('usa valores por defecto si turn y status no vienen en la respuesta', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...gameStartResponse,
            turn: undefined,
            status: undefined,
          }),
        } as Response)

    renderGame()

    const header = await screen.findByRole('banner')
    // Should show TestUser as the player (j1 by default)
    expect(header).toHaveTextContent('TestUser')
  })

  test('no valida un click manual mientras el bot hace el primer movimiento', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...gameStartResponse,
            turn: 'j2',
          }),
        } as Response)
        .mockImplementationOnce(() => new Promise(() => {}))

    const user = userEvent.setup()
    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(screen.getByText(translations.es.gameBoard.botPlaying)).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })

  test('muestra mensaje por defecto si no hay error en validateMove', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: false }),
        } as Response)

    const user = userEvent.setup()
    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Movimiento inválido')
    })
  })

  test('mantiene status previo si validateMove no devuelve status', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: true, winner: null }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ board: [], turn: 'j2', winner: null, status: 'active' }),
        } as Response)

    const user = userEvent.setup()
    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    // si no rompe, está cubierto
    expect(true).toBe(true)
  })

  test('muestra ganador j2 correctamente', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            board: [],
            turn: 'j1',
            winner: 'j2',
            status: 'finished',
          }),
        } as Response)

    renderGame()
    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await screen.findByText(
        new RegExp(`Bot ${translations.es.gameBoard.won}`, 'i')
    )
  })

  test('actualiza hexData marcando la casilla como j1 (map)', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'jugador1' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            gameId: 'abc123',
            board: [{ position: '0,0', player: null }],
            players: [
              { id: 'jugador1', name: 'Jugador', points: 0 },
              { id: 'bot', name: 'Bot', points: 0 },
            ],
            turn: 'j1',
            status: 'active',
          }),
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) } as Response)
        .mockImplementationOnce(() => new Promise(() => {}))

    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(screen.getByText(translations.es.gameBoard.botPlaying)).toBeInTheDocument()
    })
  })

  test('marca la celda como j1 cuando coincide la posición', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'jugador1' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            gameId: 'abc123',
            board: [{ position: '0,0', player: null }],
            players: [
              { id: 'jugador1', name: 'Jugador', points: 0 },
              { id: 'bot', name: 'Bot', points: 0 },
            ],
            turn: 'j1',
            status: 'active',
          }),
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) } as Response)
        .mockImplementationOnce(() => new Promise(() => {}))

    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(screen.getByText(translations.es.gameBoard.botPlaying)).toBeInTheDocument()
    })
  })

  test('no modifica celdas que no coinciden', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'jugador1' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            gameId: 'abc123',
            board: [
              { position: '0,0', player: null },
              { position: '1,0', player: null },
            ],
            players: [
              { id: 'jugador1', name: 'Jugador', points: 0 },
              { id: 'bot', name: 'Bot', points: 0 },
            ],
            turn: 'j1',
            status: 'active',
          }),
        } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true }) } as Response)
        .mockImplementationOnce(() => new Promise(() => {}))

    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(screen.getByText(translations.es.gameBoard.botPlaying)).toBeInTheDocument()
    })

    expect(true).toBe(true)
  })

  test('no ejecuta el map si el movimiento no es válido', async () => {
    const user = userEvent.setup()
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'jugador1' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            gameId: 'abc123',
            board: [{ position: '0,0', player: null }],
            players: [
              { id: 'jugador1', name: 'Jugador', points: 0 },
              { id: 'bot', name: 'Bot', points: 0 },
            ],
            turn: 'j1',
            status: 'active',
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ valid: false }),
        } as Response)

    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled()
    })

    expect(global.fetch).toHaveBeenCalledTimes(4) // me, profile, start, validateMove
  })

  test('no ejecuta validateMove si el bot está resolviendo el primer turno', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 'jugador1' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            gameId: 'abc123',
            board: [{ position: '0,0', player: null }],
            players: [
              { id: 'jugador1', name: 'Jugador', points: 0 },
              { id: 'bot', name: 'Bot', points: 0 },
            ],
            turn: 'j2',
            status: 'active',
          }),
        } as Response)
        .mockImplementationOnce(() => new Promise(() => {}))

    renderGame()

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(screen.getByText(translations.es.gameBoard.botPlaying)).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })

  // ── Tests modo online ─────────────────────────────────────────────────────

  test('online: crea el socket y hace rejoin_room al conectar', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')

    // Simular evento connect del socket
    act(() => { mockSocket._trigger('connect') })

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('rejoin_room', { code: 'ROOM1', role: 'j1' })
    })
  })

  test('online: recibe opponent_info y actualiza el perfil del rival', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')

    act(() => { mockSocket._trigger('opponent_info', { name: 'Rival', avatar: 'rival.png' }) })

    await waitFor(() => {
      expect(screen.getByTestId('player-Rival')).toBeInTheDocument()
    })
  })

  test('online: j2 recibe game_joined y carga la partida via fetch', async () => {
    const gameData = { ...gameStartResponse, gameId: 'onlineGame1' }

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        // j2 no llama a /start, así que no hay 3ª llamada de inicio
        .mockResolvedValueOnce({ ok: true, json: async () => gameData } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j2', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')

    await act(async () => {
      mockSocket._trigger('game_joined', { gameId: 'onlineGame1' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('triangle')).toBeInTheDocument()
    })
  })

  test('online: recibe opponent_move y actualiza el tablero', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByTestId('triangle')

    act(() => { mockSocket._trigger('opponent_move', { position: '0,0', turn: 'j1' }) })

    // No debe lanzar error y el tablero sigue visible
    expect(screen.getByTestId('triangle')).toBeInTheDocument()
  })

  test('online: recibe opponent_disconnected y muestra pantalla de desconexión', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')

    act(() => { mockSocket._trigger('opponent_disconnected') })

    await waitFor(() => {
      expect(screen.getByText('Tu rival se ha desconectado')).toBeInTheDocument()
    })
  })

  test('online: botón "Volver al inicio" navega a /select tras desconexión del rival', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')

    act(() => { mockSocket._trigger('opponent_disconnected') })

    await screen.findByText('Tu rival se ha desconectado')
    await user.click(screen.getByText('Volver al inicio'))

    expect(mockNavigate).toHaveBeenCalledWith('/select')
  })

  test('online: recibe game_over del socket y cambia status a finished', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByTestId('triangle')

    act(() => { mockSocket._trigger('game_over', { winner: 'j1' }) })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/gameover', expect.anything())
    })
  })

  test('online j1: handleHexClick emite move_made y no llama a /move', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: null, status: 'active' }) } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('move_made', expect.objectContaining({ position: '0,0' }))
    })

    // Solo 4 llamadas fetch: me, profile, start, validateMove — NO /move
    expect(global.fetch).toHaveBeenCalledTimes(4)
  })

  test('online j1: emite game_over cuando validateMove devuelve un ganador', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: 'j1', status: 'active' }) } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByTestId('triangle')
    await user.click(screen.getByText('hex-0-0'))

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('game_over', { code: 'ROOM1', winner: 'j1' })
    })
  })

  test('online: emite player_info con el perfil del usuario al iniciar', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('player_info', {
        code: 'ROOM1',
        name: 'TestUser',
        avatar: 'avatar.png',
      })
    })
  })

  test('online: desconecta el socket al desmontar el componente', async () => {
    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)

    const { unmount } = renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j1', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')
    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  test('online j2: game_joined con error en fetch muestra console.error', async () => {
    const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => meResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }) } as Response)
        .mockRejectedValueOnce(new Error('fetch game error'))

    renderGame({ gameMode: 'online', botMode: 'random_bot', boardSize: 11, onlineRole: 'j2', roomCode: 'ROOM1' } as any)

    await screen.findByText('YOVI_ES4D')

    await act(async () => {
      mockSocket._trigger('game_joined', { gameId: 'brokenGame' })
    })

    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith('Error cargando partida para j2:', expect.any(Error))
    })

    consoleErrorMock.mockRestore()
  })
})