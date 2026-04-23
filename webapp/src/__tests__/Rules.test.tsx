import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import resources from '../i18n/resources'
import { I18nProvider } from '../i18n'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import Rules from '../components/Rules'
import { AuthContext } from '../context/AuthContext'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}))

const renderRules = () =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider value={{ user: null, logout: vi.fn() } as any}>
        <Rules />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('Rules', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renderiza las secciones de reglas clasicas y 3D', () => {
    renderRules()

    const t = resources.es

    expect(
      screen.getByRole('heading', { name: t.menu.rules })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { level: 2, name: t.rules.classicTitle })
    ).toBeInTheDocument()
    expect(screen.getByText(t.rules.description1)).toBeInTheDocument()
    expect(screen.getByText(t.rules.description2)).toBeInTheDocument()
    expect(screen.getByText(t.rules.classicRule1)).toBeInTheDocument()
    expect(screen.getByText(t.rules.classicRule2)).toBeInTheDocument()
    expect(screen.getByText(t.rules.classicRule3)).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { level: 2, name: t.rules.tetraTitle })
    ).toBeInTheDocument()
    expect(screen.getByText(t.rules.tetraIntro)).toBeInTheDocument()
    expect(screen.getByText(t.rules.tetraRule1)).toBeInTheDocument()
    expect(screen.getByText(t.rules.tetraRule2)).toBeInTheDocument()
    expect(screen.getByText(t.rules.tetraRule3)).toBeInTheDocument()
    expect(screen.getByText(t.rules.tetraRule4)).toBeInTheDocument()
  })

  test('renderiza el enlace a Wikipedia y el boton de volver', () => {
    renderRules()

    const t = resources.es

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

  test('el boton volver navega al inicio', async () => {
    const user = userEvent.setup()
    renderRules()

    const t = resources.es

    const goBackButton = screen.getByRole('button', {
      name: t.startScreen.goback,
    })

    await user.click(goBackButton)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

