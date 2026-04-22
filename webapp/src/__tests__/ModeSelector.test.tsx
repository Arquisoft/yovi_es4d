import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ModeSelector from '../components/game/ModeSelector'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { time } from 'console'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../components/UserHeader', () => ({
  default: () => <div data-testid="user-header">UserHeader Mock</div>
}))

const renderSelector = () =>
  render(<MemoryRouter><ModeSelector /></MemoryRouter>)

describe('ModeSelector', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ botModes: ['random_bot', 'intermediate_bot'] }),
    } as Response)
    mockNavigate.mockReset()
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

  test('muestra el subtítulo actualizado', async () => {
    renderSelector()
    expect(await screen.findByText(/tablero clasico o en un tetraedro 3D/i)).toBeInTheDocument()
  })

  test('carga y muestra los modos del bot desde la API', async () => {
    renderSelector()
    expect(await screen.findByText('Aleatorio')).toBeInTheDocument()
    expect(screen.getByText('Intermedio')).toBeInTheDocument()
  })

  test('muestra las descripciones de cada modo', async () => {
    renderSelector()
    expect(await screen.findByText(/El bot elige nodos al azar/i)).toBeInTheDocument()
    expect(screen.getByText(/agrupar conexiones útiles/i)).toBeInTheDocument()
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
    expect(await screen.findByText('unknown_bot')).toBeInTheDocument()
  })

  test('el botón Jugar está deshabilitado mientras carga', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderSelector()
    expect(screen.getByRole('button', { name: /^Jugar/ })).toBeDisabled()
  })

  test('el botón Jugar se habilita tras cargar los modos', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')
    expect(screen.getByRole('button', { name: /^Jugar/ })).not.toBeDisabled()
  })

  test('el primer modo está seleccionado por defecto', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')
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

  test('muestra los modos de juego local', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')

    expect(screen.getByText('Contra la máquina')).toBeInTheDocument()
    expect(screen.getByText('2 Jugadores')).toBeInTheDocument()
  })

  test('muestra las variantes de tablero', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')

    expect(screen.getByText('Tablero clásico')).toBeInTheDocument()
    expect(screen.getByText('Tetraedro 3D')).toBeInTheDocument()
  })

  test('cambia entre modo vsBot y multiplayer', async () => {
    const user = userEvent.setup()
    renderSelector()
    await screen.findByText('Aleatorio')

    const multiplayerBtn = screen.getByText('2 Jugadores').closest('button')!
    await user.click(multiplayerBtn)

    expect(await screen.findByPlaceholderText(/Nombre del rival/i)).toBeInTheDocument()
  })

  test('muestra opciones de turno inicial para vsBot', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')

    expect(screen.getByText('Empiezas tu')).toBeInTheDocument()
    expect(screen.getByText('Empieza el bot')).toBeInTheDocument()
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

    expect(screen.queryByText('Nombre del jugador 2')).not.toBeInTheDocument()
  })

  test('navega a /game con vsBot y random_bot por defecto al pulsar Jugar', async () => {
    const user = userEvent.setup()
    renderSelector()
    await screen.findByText('Aleatorio')

    await user.click(screen.getByRole('button', { name: /^Jugar/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: {
          gameMode: 'vsBot',
          botMode: 'random_bot',
          boardVariant: 'classic',
          boardSize: 11,
          player2Name: 'Jugador 2',
          startingPlayer: 'j1',
          timeLimit: 0,
        },
      })
    })
  })

  test('navega a /game con intermediate_bot al seleccionarlo y pulsar Jugar', async () => {
    renderSelector()
    await screen.findByText('Intermedio')

    const intermediateButton = screen.getByText('Intermedio').closest('button')!
    fireEvent.click(intermediateButton)
    expect(intermediateButton).toHaveClass('selected')

    fireEvent.click(screen.getByRole('button', { name: /^Jugar/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: {
          gameMode: 'vsBot',
          botMode: 'intermediate_bot',
          boardVariant: 'classic',
          boardSize: 11,
          player2Name: 'Jugador 2',
          startingPlayer: 'j1',
          timeLimit: 0,
        },
      })
    })
  })

  test('navega con el tamaño de tablero seleccionado', async () => {
    const user = userEvent.setup()
    renderSelector()
    await screen.findByText('Aleatorio')

    await user.click(screen.getByText('Grande').closest('button')!)
    await user.click(screen.getByRole('button', { name: /^Jugar/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: {
          gameMode: 'vsBot',
          botMode: 'random_bot',
          boardVariant: 'classic',
          boardSize: 15,
          player2Name: 'Jugador 2',
          startingPlayer: 'j1',
          timeLimit: 0,
        },
      })
    })
  })

  test('navega a /game con modo multiplayer y nombre personalizado', async () => {
    const user = userEvent.setup()
    renderSelector()
    await screen.findByText('Aleatorio')

    await user.click(screen.getByText('2 Jugadores').closest('button')!)
    await user.type(await screen.findByPlaceholderText('Nombre del rival...'), 'Mi Amigo')
    await user.click(screen.getByRole('button', { name: /^Jugar/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: {
          gameMode: 'multiplayer',
          botMode: 'random_bot',
          boardVariant: 'classic',
          boardSize: 11,
          player2Name: 'Mi Amigo',
          startingPlayer: 'j1',
          timeLimit: 0,
        },
      })
    })
  })

  test('usa "Jugador 2" como nombre por defecto en modo multiplayer si no se ingresa nombre', async () => {
    const user = userEvent.setup()
    renderSelector()
    await screen.findByText('Aleatorio')

    await user.click(screen.getByText('2 Jugadores').closest('button')!)
    await user.click(screen.getByRole('button', { name: /^Jugar/ }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: expect.objectContaining({
          gameMode: 'multiplayer',
          boardVariant: 'classic',
          player2Name: 'Jugador 2',
          startingPlayer: 'j1',
          timeLimit: 0,
        }),
      })
    })
  })

  test('navega a /online-lobby al hacer click en "Jugar online"', async () => {
    const user = userEvent.setup()
    renderSelector()
    await screen.findByText('Aleatorio')

    await user.click(screen.getByText('Jugar online').closest('button')!)

    expect(mockNavigate).toHaveBeenCalledWith('/online-lobby')
  })

  test('muestra la sección "En línea"', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')

    expect(screen.getByText('En linea')).toBeInTheDocument()
    expect(screen.getByText('Jugar online')).toBeInTheDocument()
    expect(screen.getByText(/mantiene el tablero clasico por ahora/i)).toBeInTheDocument()
  })

  test('muestra separador LOCAL', async () => {
    renderSelector()
    await screen.findByText('Aleatorio')

    expect(screen.getByText('LOCAL')).toBeInTheDocument()
  })

  test('no muestra modos cuando botModes es undefined', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    renderSelector()

    await waitFor(() => {
      expect(screen.queryByText('Aleatorio')).not.toBeInTheDocument()
    })
  })

  test('muestra indicador de carga mientras se cargan los modos', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderSelector()

    const dots = document.querySelectorAll('.thinking-dot')
    expect(dots.length).toBeGreaterThan(0)
  })
})
