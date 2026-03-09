import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GameBoard from '../components/game/GameBoard'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

// ── Mocks de navegación ──────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

// ── Mock Triangle ────────────────────────────────────────────
vi.mock('../components/game/Triangle', () => ({
    default: ({ onHexClick }: { onHexClick: (p: string) => void }) => (
        <div data-testid="triangle">
            <button onClick={() => onHexClick('0,0')}>hex-0-0</button>
        </div>
    ),
}))

// ── Mock Jugador ─────────────────────────────────────────────
vi.mock('../components/game/player', () => ({
    default: ({ name }: { name: string }) => (
        <div data-testid={`player-${name}`}>{name}</div>
    ),
}))

// ── Respuesta base de /api/game/start ────────────────────────
const gameStartResponse = {
    gameId: 'abc123456',
    board: [{ position: '0,0', player: null }],
    players: [
        { id: 'jugador1', name: 'Jugador', points: 0 },
        { id: 'bot',      name: 'Bot',     points: 0 },
    ],
    turn: 'j1',
    status: 'active',
    winner: null,
}

// ── Helper para montar el componente con estado de /select ───
const renderGame = (state = { gameMode: 'vsBot', botMode: 'random_bot' }) =>
    render(
        <MemoryRouter initialEntries={[{ pathname: '/game', state }]}>
            <Routes>
                <Route path="/game" element={<GameBoard />} />
            </Routes>
        </MemoryRouter>
    )

describe('GameBoard', () => {

    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => gameStartResponse,
        } as Response)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // ── Renderizado inicial ──────────────────────────────────
    test('muestra el logo YOVI en el header', async () => {
        renderGame()
        expect(await screen.findByText('YOVI')).toBeInTheDocument()
    })

    test('muestra el spinner de carga antes de recibir la partida', () => {
        global.fetch = vi.fn(() => new Promise(() => {}))
        renderGame()
        expect(screen.getByText(/iniciando partida/i)).toBeInTheDocument()
    })

    test('muestra el tablero tras cargar la partida', async () => {
        renderGame()
        expect(await screen.findByTestId('triangle')).toBeInTheDocument()
    })

    test('muestra los nombres de los dos jugadores', async () => {
        renderGame()
        expect(await screen.findByTestId('player-Jugador')).toBeInTheDocument()
        expect(screen.getByTestId('player-Bot')).toBeInTheDocument()
    })

    test('muestra el gameId en el header', async () => {
        renderGame()
        // El componente muestra gameId.slice(-6), el gameId es 'abc123456' → '123456'
        expect(await screen.findByText(/123456/i)).toBeInTheDocument()
    })

    test('muestra el botMode y gameMode en el footer', async () => {
        renderGame()
        expect(await screen.findByText(/random bot · tablero 11× · vsbot/i)).toBeInTheDocument()
    })

    // ── Turno ────────────────────────────────────────────────
    test('muestra el turno del jugador al empezar', async () => {
        renderGame()
        // El span de turno está dentro del header
        const header = await screen.findByRole('banner')
        expect(header).toHaveTextContent(/turno/i)
        expect(header).toHaveTextContent('Jugador')
    })

    // ── Movimiento ───────────────────────────────────────────
    test('llama a validateMove y move al hacer click en un hexágono', async () => {
        const user = userEvent.setup()
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: null, status: 'active' }) } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ board: [], turn: 'j1', winner: null, status: 'active' }) } as Response)

        renderGame()
        await screen.findByTestId('triangle')
        await user.click(screen.getByText('hex-0-0'))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(3)
        })
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain('validateMove')
        expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[2][0]).toContain('move')
    })

    test('muestra "Bot pensando" mientras procesa el movimiento', async () => {
        const user = userEvent.setup()
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
            .mockImplementationOnce(() => new Promise(() => {})) // validateMove cuelga

        renderGame()
        await screen.findByTestId('triangle')
        await user.click(screen.getByText('hex-0-0'))

        expect(await screen.findByText(/bot pensando/i)).toBeInTheDocument()
    })

    test('muestra alerta si el movimiento no es válido', async () => {
        const user = userEvent.setup()
        const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: false, error: 'Movimiento inválido' }) } as Response)

        renderGame()
        await screen.findByTestId('triangle')
        await user.click(screen.getByText('hex-0-0'))

        await waitFor(() => {
            expect(alertMock).toHaveBeenCalledWith('Movimiento inválido')
        })
    })

    // ── Fin de partida ───────────────────────────────────────
    test('muestra el ganador en el header cuando la partida termina', async () => {
        const user = userEvent.setup()
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => gameStartResponse } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ valid: true, winner: null, status: 'active' }) } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ board: [], turn: 'j1', winner: 'j1', status: 'finished' }) } as Response)

        renderGame()
        await screen.findByTestId('triangle')
        await user.click(screen.getByText('hex-0-0'))

        await waitFor(() => {
            expect(screen.getByText(/gana/i)).toBeInTheDocument()
        })
    })

    test('navega a /gameover cuando la partida termina', async () => {
        const user = userEvent.setup()
        global.fetch = vi.fn()
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

    // ── Sin estado (acceso directo) ──────────────────────────
    test('inicia partida con valores por defecto si no hay estado de navegación', async () => {
        render(
            <MemoryRouter initialEntries={['/game']}>
                <Routes>
                    <Route path="/game" element={<GameBoard />} />
                </Routes>
            </MemoryRouter>
        )

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/game/start'),
                expect.objectContaining({
                    body: expect.stringContaining('"gameMode":"vsBot"'),
                })
            )
        })
    })
})
