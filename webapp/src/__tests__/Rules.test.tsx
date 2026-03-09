import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../components/LoginForm'
import resources from '../i18n/resources'
import { I18nProvider } from '../i18n'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import * as userService from '../services/userService'
import { AuthContext } from '../context/AuthContext'
import Rules from '../components/Rules'

// mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

// mock login service
vi.mock('../services/userService', () => ({
  login: vi.fn(),
}))

const mockedLogin = userService.login as unknown as ReturnType<typeof vi.fn>

// mock auth context
const mockCheckAuth = vi.fn()

const renderForm = () =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider value={{ checkAuth: mockCheckAuth } as any}>
        <Rules />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('Rules', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

test('go back button works', () => {
    renderForm()

    const t = resources.es

    expect(
  screen.getByRole('heading', { name: t.menu.rules })
).toBeInTheDocument()

expect(screen.getByText(t.rules.description1)).toBeInTheDocument()
expect(screen.getByText(t.rules.description2)).toBeInTheDocument()
expect(screen.getByText(t.rules.description3)).toBeInTheDocument()
expect(screen.getByText(t.rules.description4)).toBeInTheDocument()

expect(
  screen.getByRole('link', { name: /wikipedia/i })
).toBeInTheDocument()

expect(
  screen.getByRole('link', { name: /wikipedia/i })
).toHaveAttribute(
  'href',
  'https://en.wikipedia.org/wiki/Y_(board_game)'
)

expect(
  screen.getByRole('button', { name: t.startScreen.goback })
).toBeInTheDocument()
  })

})

test('renders rules correctly', () => {
    renderForm()

    const t = resources.es

    expect(
  screen.getByRole('heading', { name: t.menu.rules })
).toBeInTheDocument()

expect(screen.getByText(t.rules.description1)).toBeInTheDocument()
expect(screen.getByText(t.rules.description2)).toBeInTheDocument()
expect(screen.getByText(t.rules.description3)).toBeInTheDocument()
expect(screen.getByText(t.rules.description4)).toBeInTheDocument()

expect(
  screen.getByRole('link', { name: /wikipedia/i })
).toBeInTheDocument()

expect(
  screen.getByRole('link', { name: /wikipedia/i })
).toHaveAttribute(
  'href',
  'https://en.wikipedia.org/wiki/Y_(board_game)'
)

expect(
  screen.getByRole('button', { name: t.startScreen.goback })
).toBeInTheDocument()


})

test('goBack button navigates to home', async () => {
    const user = userEvent.setup()
    renderForm()

    const t = resources.es

    const goBackButton = screen.getByRole('button', {
      name: t.startScreen.goback,
    })

    await user.click(goBackButton)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

