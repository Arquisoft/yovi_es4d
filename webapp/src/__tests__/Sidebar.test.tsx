import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import Sidebar from '../components/Sidebar'
import { AuthContext } from '../context/AuthContext'
import { I18nProvider } from '../i18n'
import resources from '../i18n/resources'
import '@testing-library/jest-dom'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const renderSidebar = (user = null) =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider
        value={{
          user,
          logout: vi.fn(),
          checkAuth: vi.fn(),
        }}
      >
        <Sidebar />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('Sidebar', () => {

  test('renders menu items correctly', () => {
    renderSidebar()

    expect(screen.getByText(resources.es.menu.team)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.rules)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.profile)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.initsession)).toBeInTheDocument()
  })

  test('click rules button navigates to /rules', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const rulesButton = screen.getByRole('button', { name: resources.es.menu.rules })
    await user.click(rulesButton)
    expect(mockNavigate).toHaveBeenCalledWith('/rules')
  })

  test('click rules button navigates to /profile', async () => {
    const user = userEvent.setup()
    renderSidebar()
    const profileButton = screen.getByRole('button', { name: resources.es.menu.profile })
    await user.click(profileButton)
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  test('login button navigates to /login when no user', async () => {
    const user = userEvent.setup()
    renderSidebar(null)
    const loginButton = screen.getByRole('button', { name: resources.es.menu.initsession })
    await user.click(loginButton)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  test('logout button calls logout when user exists', async () => {
    const user = userEvent.setup()
    const mockLogout = vi.fn()
    render(
      <I18nProvider defaultLang="es" resources={resources}>
        <AuthContext.Provider value={{ user: { name: 'Test' }, logout: mockLogout, checkAuth: vi.fn() }}>
          <Sidebar />
        </AuthContext.Provider>
      </I18nProvider>
    )

    const logoutButton = screen.getByRole('button', { name: resources.es.menu.logout })
    await user.click(logoutButton)
    expect(mockLogout).toHaveBeenCalled()
  })

  test('changes language when select is used', async () => {
    const user = userEvent.setup()
    const setLang = vi.fn()
    render(
      <I18nProvider defaultLang="es" resources={resources}>
        <AuthContext.Provider value={{ user: null, logout: vi.fn(), checkAuth: vi.fn() }}>
          <Sidebar />
        </AuthContext.Provider>
      </I18nProvider>
    )

    const select = screen.getByLabelText(resources.es.menu.selectLanguage)
    await user.selectOptions(select, 'en')
    expect(select).toHaveValue('en')
  })
})