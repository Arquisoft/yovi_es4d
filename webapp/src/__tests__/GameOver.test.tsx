import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { describe, test, expect, vi } from 'vitest'
import GameOver from '../components/GameOver'
import * as reactRouter from 'react-router-dom'
import { I18nProvider } from '../i18n'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof reactRouter>('react-router-dom')),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}))

vi.mock('../components/game/Triangle', () => ({
  default: ({ onHexClick }: { onHexClick: () => void }) => (
    <button data-testid="triangle" onClick={onHexClick}>Triangle</button>
  ),
}))

const resources = {
  es: {
    gameOver: {
      noGame: "No hay partida",
      goHome: "Volver al inicio",
      title: "Fin de la partida",
      hasWon: "ha ganado",
      winner: "Ganador",
      finalScore: "Puntuación final",
      completed: "· tablero completado",
      score: "Score",
      newGame: "Nueva partida"
    }
  }
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <reactRouter.MemoryRouter>
      <I18nProvider defaultLang="es" resources={resources}>
        {ui}
      </I18nProvider>
    </reactRouter.MemoryRouter>
  )
}

const baseState = {
  winner: 'j1',
  players: [
    { id: 'p1', name: 'Alice', points: 5 },
    { id: 'p2', name: 'Bot', points: 3 },
  ],
  hexData: [],
}

describe('GameOver', () => {

  test('muestra mensaje de no hay partida cuando no hay state', () => {
    renderWithProviders(<GameOver />)

    expect(screen.getByText(/no hay partida/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volver al inicio/i })).toBeInTheDocument()
  })

  test('botón volver al inicio navega a / cuando no hay state', async () => {
    const user = userEvent.setup()

    renderWithProviders(<GameOver />)

    await user.click(screen.getByRole('button', { name: /volver al inicio/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('muestra el nombre del ganador j1 en el título', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    const title = screen.getByRole('heading', { level: 1 })

    expect(title).toHaveTextContent('Alice')
    expect(title).toHaveTextContent('ha ganado')
  })

  test('muestra el nombre del ganador j2 en el título', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({
      state: { ...baseState, winner: 'j2' },
    } as any)

    renderWithProviders(<GameOver />)

    const title = screen.getByRole('heading', { level: 1 })

    expect(title).toHaveTextContent('Bot')
    expect(title).toHaveTextContent('ha ganado')
  })

  test('muestra las tarjetas de ambos jugadores', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    const names = screen.getAllByText(/Alice|Bot/).filter(
      el => el.classList.contains('go-player-name')
    )

    expect(names).toHaveLength(2)
  })

  test('muestra los puntos de los jugadores con padding a 4 dígitos', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    expect(screen.getByText('0005')).toBeInTheDocument()
    expect(screen.getByText('0003')).toBeInTheDocument()
  })

  test('muestra el trofeo 🏆', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    expect(screen.getByText('🏆')).toBeInTheDocument()
  })

  test('botón Nueva partida navega a /select', async () => {
    const user = userEvent.setup()

    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    await user.click(screen.getByRole('button', { name: /nueva partida/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/select')
  })

  test('botón Inicio navega a /', async () => {
    const user = userEvent.setup()

    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    await user.click(screen.getByRole('button', { name: /volver al inicio/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('renderiza el Triangle con los hexData', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    expect(screen.getByTestId('triangle')).toBeInTheDocument()
  })

  test('click en triangle no hace nada (onHexClick vacío)', async () => {
    const user = userEvent.setup()

    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: baseState } as any)

    renderWithProviders(<GameOver />)

    await user.click(screen.getByTestId('triangle'))
  })

  test('usa "Ganador" cuando el ganador no tiene nombre', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({
      state: {
        ...baseState,
        players: [
          { id: 'p1', name: undefined, points: 5 },
          { id: 'p2', name: 'Bot', points: 3 },
        ],
        winner: 'j1',
      },
    } as any)

    renderWithProviders(<GameOver />)

    expect(screen.getByText('Ganador')).toBeInTheDocument()
  })

  test('muestra "tablero completado" cuando hexData tiene celdas', () => {
    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({
      state: {
        ...baseState,
        hexData: [{ id: 1 }],
      },
    } as any)

    renderWithProviders(<GameOver />)

    expect(
      screen.getByText(/puntuación final · tablero completado/i)
    ).toBeInTheDocument()
  })

})