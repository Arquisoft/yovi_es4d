import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { describe, test, expect, vi } from 'vitest'
import GameOver from '../components/GameOver'
import { I18nProvider } from '../i18n'
import resources from '../i18n/resources'
import * as reactRouter from 'react-router-dom'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual<typeof reactRouter>('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null })
}))

describe('GameOver', () => {

  test('renders noGame message when location.state is undefined', async () => {
    render(
      <I18nProvider defaultLang="es" resources={resources}>
        <GameOver />
      </I18nProvider>
    )

    expect(screen.getByText(resources.es.gameOver.noGame)).toBeInTheDocument()
    const button = screen.getByRole('button', { name: resources.es.gameOver.goHome })
    expect(button).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(button)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('renders winner as a player and players correctly', () => {
  const mockState = {
    winner: 'j1',
    players: [
      { name: 'Alice', points: 5 },
      { name: 'Bot', points: 3 }
    ],
    hexData: []
  }

  vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: mockState } as any)

  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <GameOver />
    </I18nProvider>
  )

  const title = screen.getByRole('heading', { level: 1 })
  expect(title.textContent).toContain('Alice')
  expect(title.textContent).toContain('ha ganado')

  const playerNames = screen.getAllByText(/Alice|Bot/).filter(
        el => el.tagName.toLowerCase() === 'div' // para que no escoja también el título de ganador, que tiene el mismo nombre
  )

  expect(playerNames).toHaveLength(2)
  expect(playerNames[0]).toHaveTextContent('Alice')
  expect(playerNames[1]).toHaveTextContent('Bot')

  const button = screen.getByRole('button', { name: resources.es.gameOver.goHome })
  expect(button).toBeInTheDocument()
})

test('renders winner as a bot and players correctly', () => {
  const mockState = {
    winner: 'j2',
    players: [
      { name: 'Alice', points: 5 },
      { name: 'Bot', points: 3 }
    ],
    hexData: []
  }

  vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: mockState } as any)

  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <GameOver />
    </I18nProvider>
  )

  const title = screen.getByRole('heading', { level: 1 })
  expect(title.textContent).toContain('Bot')
  expect(title.textContent).toContain('ha ganado')

  const playerNames = screen.getAllByText(/Alice|Bot/).filter(
        el => el.tagName.toLowerCase() === 'div' // para que no escoja también el título de ganador, que tiene el mismo nombre
  )

  expect(playerNames).toHaveLength(2)
  expect(playerNames[0]).toHaveTextContent('Alice')
  expect(playerNames[1]).toHaveTextContent('Bot')

  const button = screen.getByRole('button', { name: resources.es.gameOver.goHome })
  expect(button).toBeInTheDocument()
})

test('click rules button navigates to /profile', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider defaultLang="es" resources={resources}>
        <GameOver />
      </I18nProvider>
    )
    const gameOverButton = screen.getByRole('button', { name: resources.es.gameOver.goHome })
    await user.click(gameOverButton)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })


  test('winner is undefined or invalid', () => {
    const mockState = {
      winner: 'unknown',
      players: [
        { name: 'Alice', points: 5 },
        { name: 'Bot', points: 3 }
      ],
      hexData: []
    }

    vi.spyOn(reactRouter, 'useLocation').mockReturnValue({ state: mockState } as any)

    render(
      <I18nProvider defaultLang="es" resources={resources}>
        <GameOver />
      </I18nProvider>
    )

    const title = screen.getByRole('heading', { level: 1 })
    expect(title.textContent).toContain('Bot')
    expect(title.textContent).toContain('ha ganado')
  })
  
})