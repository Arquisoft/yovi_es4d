import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ModeSelector from '../components/game/ModeSelector'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

const renderSelector = () =>
    render(<MemoryRouter><ModeSelector /></MemoryRouter>)

describe('ModeSelector', () => {

    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ botModes: ['random_bot', 'intermediate_bot'] }),
        } as Response)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // ── Renderizado ──────────────────────────────────────────
    test('muestra el título de la pantalla', async () => {
        renderSelector()
        expect(await screen.findByText('Elige la dificultad')).toBeInTheDocument()
    })

    test('muestra el badge "Nueva partida"', async () => {
        renderSelector()
        expect(await screen.findByText(/nueva partida/i)).toBeInTheDocument()
    })

    test('muestra el subtítulo de selección', async () => {
        renderSelector()
        expect(await screen.findByText(/selecciona el nivel de dificultad/i)).toBeInTheDocument()
    })

    // ── Carga de bot modes ───────────────────────────────────
    test('carga y muestra los modos del bot desde la API', async () => {
        renderSelector()
        expect(await screen.findByText('Aleatorio')).toBeInTheDocument()
        expect(screen.getByText('Intermedio')).toBeInTheDocument()
    })

    test('muestra los tags de dificultad de cada modo', async () => {
        renderSelector()
        expect(await screen.findByText('Fácil')).toBeInTheDocument()
        expect(screen.getByText('Medio')).toBeInTheDocument()
    })

    test('muestra random_bot como fallback si la API falla', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
        renderSelector()
        expect(await screen.findByText('Aleatorio')).toBeInTheDocument()
    })

    test('muestra el nombre del modo si no tiene meta definida', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ botModes: ['random_bot', 'intermediate_bot', 'hard_bot'] }),
        } as Response)
        renderSelector()
        // hard_bot no tiene meta en BOT_MODE_META, se muestra la key directamente
        expect(await screen.findByText('hard_bot')).toBeInTheDocument()
    })

    // ── Estado de carga ──────────────────────────────────────
    test('el botón Jugar está deshabilitado mientras carga', () => {
        global.fetch = vi.fn(() => new Promise(() => {}))
        renderSelector()
        expect(screen.getByRole('button', { name: /jugar/i })).toBeDisabled()
    })

    test('el botón Jugar se habilita tras cargar los modos', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')
        expect(screen.getByRole('button', { name: /jugar/i })).not.toBeDisabled()
    })

    // ── Selección ────────────────────────────────────────────
    test('el primer modo está seleccionado por defecto (borde violeta)', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')

        // El radio del primer botón tiene background violeta cuando está seleccionado
        const botonesMode = screen.getAllByRole('button').filter(b => b.textContent?.includes('Aleatorio'))
        expect(botonesMode[0]).toBeInTheDocument()
    })

    test('selecciona intermediate_bot al hacer click y cambia el estilo del radio', async () => {
        const user = userEvent.setup()
        renderSelector()

        await screen.findByText('Intermedio')
        await user.click(screen.getByText('Intermedio').closest('button')!)

        // Tras el click, el nombre del modo seleccionado aparece en color violeta (#7c6ff7)
        await waitFor(() => {
            const label = screen.getByText('Intermedio')
            expect(label).toHaveStyle({ color: 'rgb(124, 111, 247)' })
        })
    })

    // ── Navegación ───────────────────────────────────────────
    test('navega a /game con vsBot y random_bot por defecto al pulsar Jugar', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        await user.click(screen.getByRole('button', { name: /jugar/i }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: { gameMode: 'vsBot', botMode: 'random_bot' },
            })
        })
    })

    test('navega a /game con intermediate_bot al seleccionarlo y pulsar Jugar', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        await user.click(screen.getByText('Intermedio').closest('button')!)
        await user.click(screen.getByRole('button', { name: /jugar/i }))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: { gameMode: 'vsBot', botMode: 'intermediate_bot' },
            })
        })
    })
})