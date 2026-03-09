import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StartScreen from '../components/StartScreen'
import resources from '../i18n/resources'
import { I18nProvider } from '../i18n'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { AuthContext } from '../context/AuthContext.tsx'

// mock Sidebar
vi.mock('../components/Sidebar', () => ({
  default: () => <div>Sidebar</div>,
}))

// mock Typing
vi.mock('../components/Typing', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

// mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const renderStartScreen = (userValue: any = null) =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider value={{ user: userValue }}>
        <StartScreen />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('StartScreen with AuthContext', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('navigates to /game if user has id', async () => {
    renderStartScreen({ id: '123' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: resources.es.startScreen.play }))
    expect(mockNavigate).toHaveBeenCalledWith('/game')
  })

  test('navigates to /game if user has userId', async () => {
    renderStartScreen({ userId: '456' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: resources.es.startScreen.play }))
    expect(mockNavigate).toHaveBeenCalledWith('/game')
  })

  test('navigates to /game if user has _id', async () => {
    renderStartScreen({ _id: '789' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: resources.es.startScreen.play }))
    expect(mockNavigate).toHaveBeenCalledWith('/game')
  })

  test('navigates to /login if user exists but has no id, userId or _id', async () => {
    renderStartScreen({ username: 'sinId' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: resources.es.startScreen.play }))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('navigates to /login if user is null', async () => {
    renderStartScreen(null)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: resources.es.startScreen.play }))
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('renders start screen content normally', () => {
    renderStartScreen({ id: '123', username: 'pablo' })

    expect(
      screen.getByText(resources.es.startScreen.title)
    ).toBeInTheDocument()

    expect(
      screen.getByText(resources.es.startScreen.subtitle)
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: resources.es.startScreen.play,
      })
    ).toBeInTheDocument()

    expect(
      screen.getByText(resources.es.startScreen.typing)
    ).toBeInTheDocument()
  })

  test('renders github footer link', () => {
    renderStartScreen({ id: '123', username: 'pablo' })

    const link = screen.getByRole('link')

    expect(link).toHaveAttribute(
      'href',
      'https://github.com/Arquisoft/yovi_es4d/tree/master'
    )

    expect(
      screen.getByText(resources.es.footer.credits)
    ).toBeInTheDocument()
  })
})