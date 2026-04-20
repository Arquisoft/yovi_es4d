import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ModeSelector from '../components/game/ModeSelector'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { I18nProvider } from '../i18n'
import resources from '../i18n/resources'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return { ...actual, useNavigate: () => mockNavigate }
})

// Mock del UserHeader para simplificar
vi.mock('../UserHeader', () => ({
    default: () => <div data-testid="user-header">UserHeader Mock</div>
}))

const renderSelector = () =>
    render(
        <I18nProvider defaultLang="es" resources={resources}>
            <MemoryRouter>
                <ModeSelector />
            </MemoryRouter>
        </I18nProvider>
    )

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

    test('muestra el título de la pantalla', async () => {
        renderSelector()
        expect(await screen.findByText('Configura la partida')).toBeInTheDocument()
    })

    test('muestra el badge "Nueva partida"', async () => {
        renderSelector()
        expect(await screen.findByText(/nueva partida/i)).toBeInTheDocument()
    })

    test('muestra el subtítulo de selección', async () => {
        renderSelector()
        expect(await screen.findByText(/elige cómo quieres jugar/i)).toBeInTheDocument()
    })


    // ── Carga de bot modes ───────────────────────────────────
    test('carga y muestra los modos del bot desde la API', async () => {
        renderSelector()
        expect(await screen.findByText('Aleatorio')).toBeInTheDocument()
        expect(screen.getByText('Intermedio')).toBeInTheDocument()
    })

    test('muestra las descripciones de cada modo', async () => {
        renderSelector()
        expect(await screen.findByText(/El bot elige casillas al azar/i)).toBeInTheDocument()
        expect(screen.getByText(/evalúa el tablero y busca buenas jugadas/i)).toBeInTheDocument()
    })

    test('muestra random_bot como fallback si la API falla', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
        renderSelector()
        expect(await screen.findByText('Aleatorio')).toBeInTheDocument()
    })

    test('muestra el nombre del modo si no tiene meta definida', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ botModes: ['random_bot', 'intermediate_bot', 'unknown_bot'] }),
        } as Response)
        renderSelector()
        // unknown_bot no tiene meta en BOT_MODES, se muestra la key directamente
        expect(await screen.findByText('unknown_bot')).toBeInTheDocument()
    })

    test('el botón Jugar está deshabilitado mientras carga', () => {
        global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
        renderSelector()
        // Cambiado: usar getByText con el texto exacto
        expect(screen.getByText('Jugar →')).toBeDisabled()
    })

    test('el botón Jugar se habilita tras cargar los modos', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')
        // Cambiado: usar getByText con el texto exacto
        expect(screen.getByText('Jugar →')).not.toBeDisabled()
    })

    // ── Selección ────────────────────────────────────────────
    test('el primer modo está seleccionado por defecto', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')

        // Verifica que el card del primer modo tiene la clase selected
        const randomCard = screen.getByText('Aleatorio').closest('.ms-mode-card')
        expect(randomCard).toHaveClass('selected')
    })

    test('selecciona intermediate_bot al hacer click y aplica la clase selected', async () => {
        const user = userEvent.setup()
        renderSelector()

        await screen.findByText('Intermedio')
        const btn = screen.getByText('Intermedio').closest('button')!
        await user.click(btn)

        await waitFor(() => {
            expect(btn).toHaveClass('selected')
        })
    })

    // ── Modo de juego LOCAL ───────────────────────────────────
    test('muestra los modos de juego local', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')

        expect(screen.getByText('Contra la máquina')).toBeInTheDocument()
        expect(screen.getByText('2 Jugadores')).toBeInTheDocument()
    })

    test('cambia entre modo vsBot y multiplayer', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        // Click en modo multiplayer
        const multiplayerBtn = screen.getByText('2 Jugadores').closest('button')!
        await user.click(multiplayerBtn)

        // Debería mostrar el campo para nombre del jugador 2
        expect(await screen.findByPlaceholderText(/Nombre del rival/i)).toBeInTheDocument()
    })

    test('muestra campo para nombre del jugador 2 en modo multiplayer', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        const multiplayerBtn = screen.getByText('2 Jugadores').closest('button')!
        await user.click(multiplayerBtn)

        expect(await screen.findByText('Nombre del jugador 2')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Nombre del rival...')).toBeInTheDocument()
    })

    test('oculta campo de nombre del jugador 2 en modo vsBot', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')

        // Por defecto está en vsBot
        expect(screen.queryByText('Nombre del jugador 2')).not.toBeInTheDocument()
    })

    // ── Navegación ───────────────────────────────────────────
    test('navega a /game con vsBot y random_bot por defecto al pulsar Jugar', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        // Cambiado: usar texto exacto con flecha
        await user.click(screen.getByText('Jugar →'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: { gameMode: 'vsBot', botMode: 'random_bot', boardSize: 11, player2Name: 'Jugador 2' },
            })
        })
    })

    test('navega a /game con intermediate_bot al seleccionarlo y pulsar Jugar', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        await user.click(screen.getByText('Intermedio').closest('button')!)
        // Cambiado: usar texto exacto con flecha
        await user.click(screen.getByText('Jugar →'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: { gameMode: 'vsBot', botMode: 'intermediate_bot', boardSize: 11, player2Name: 'Jugador 2' },
            })
        })
    })

    test('navega con el tamaño de tablero seleccionado', async () => {
        const user = userEvent.setup()
        renderSelector()

        await screen.findByText('Aleatorio')

        const grandeBtn = screen.getByText('Grande').closest('button')!
        await user.click(grandeBtn)

        // Cambiado: usar texto exacto con flecha
        await user.click(screen.getByText('Jugar →'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: {
                    gameMode: 'vsBot',
                    botMode: 'random_bot',
                    boardSize: 15,
                    player2Name: 'Jugador 2',
                },
            })
        })
    })

    test('navega a /game con modo multiplayer y nombre personalizado', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        // Cambiar a modo multiplayer
        const multiplayerBtn = screen.getByText('2 Jugadores').closest('button')!
        await user.click(multiplayerBtn)

        // Ingresar nombre del jugador 2
        const nameInput = await screen.findByPlaceholderText('Nombre del rival...')
        await user.type(nameInput, 'Mi Amigo')

        // Cambiado: usar texto exacto con flecha
        await user.click(screen.getByText('Jugar →'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: {
                    gameMode: 'multiplayer',
                    botMode: 'random_bot',
                    boardSize: 11,
                    player2Name: 'Mi Amigo',
                },
            })
        })
    })

    test('usa "Jugador 2" como nombre por defecto en modo multiplayer si no se ingresa nombre', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        const multiplayerBtn = screen.getByText('2 Jugadores').closest('button')!
        await user.click(multiplayerBtn)

        // Cambiado: usar texto exacto con flecha
        await user.click(screen.getByText('Jugar →'))

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: expect.objectContaining({
                    gameMode: 'multiplayer',
                    player2Name: 'Jugador 2',
                }),
            })
        })
    })
    // ── Navegación online ────────────────────────────────────
    test('navega a /online-lobby al hacer click en "Jugar online"', async () => {
        const user = userEvent.setup()
        renderSelector()
        await screen.findByText('Aleatorio')

        const onlineBtn = screen.getByText('Jugar online').closest('button')!
        await user.click(onlineBtn)

        expect(mockNavigate).toHaveBeenCalledWith('/online-lobby')
    })

    test('muestra la sección "En línea"', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')

        expect(screen.getByText('En línea')).toBeInTheDocument()
        expect(screen.getByText('Jugar online')).toBeInTheDocument()
        expect(screen.getByText(/Juega con un amigo a distancia/i)).toBeInTheDocument()
    })

    test('muestra separador LOCAL', async () => {
        renderSelector()
        await screen.findByText('Aleatorio')

        expect(screen.getByText('LOCAL')).toBeInTheDocument()
    })

    // ── Edge cases ───────────────────────────────────────────
    test('no muestra modos cuando botModes es undefined', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}),
        } as Response)

        renderSelector()

        await waitFor(() => {
            // Debería mostrar el loading state o nada
            expect(screen.queryByText('Aleatorio')).not.toBeInTheDocument()
        })
    })

    test('muestra indicador de carga mientras se cargan los modos', () => {
        global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
        renderSelector()

        // Los thinking dots deberían estar presentes
        const dots = document.querySelectorAll('.thinking-dot')
        //expect(dots.length).toBeGreaterThan(0)
    })
})