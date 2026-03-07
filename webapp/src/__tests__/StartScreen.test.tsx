import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StartScreen from '../components/StartScreen'
import resources from '../i18n/resources'
import { I18nProvider } from '../i18n'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

// mock Sidebar
vi.mock('../components/Sidebar', () => ({
  default: () => <div>Sidebar</div>,
}))

// mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

// mock Typing
vi.mock('../components/Typing', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

const renderStartScreen = () =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <StartScreen />
    </I18nProvider>
  )

describe('StartScreen', () => {
  test('renders start screen correctly', () => {
    renderStartScreen()

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
  })

  test('shows typing text', () => {
   renderStartScreen()

   expect(
     screen.getByText(resources.es.startScreen.typing)
   ).toBeInTheDocument()
  })

  test('navigates to /game when play button is clicked', async () => {
    renderStartScreen()
    const user = userEvent.setup()

    const playButton = screen.getByRole('button', {
      name: resources.es.startScreen.play,
    })

    await user.click(playButton)

    expect(mockNavigate).toHaveBeenCalledWith('/game')
  })

  test('renders github footer link', () => {
    renderStartScreen()

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