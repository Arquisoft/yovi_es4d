import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import Sidebar from '../components/Sidebar'
import { AuthContext } from '../context/AuthContext'
import { I18nProvider } from '../i18n'
import resources from '../i18n/resources'
import '@testing-library/jest-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderSidebar = (user: any = null, logout = vi.fn()) =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider
        value={{
          user,
          logout,
          checkAuth: vi.fn(),
        }}
      >
        <Sidebar />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders menu items correctly', () => {
    renderSidebar()

    expect(screen.getByText(resources.es.menu.team)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.rules)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.profile)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.historial)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.friends)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.notification)).toBeInTheDocument()
    expect(screen.getByText(resources.es.menu.initsession)).toBeInTheDocument()
  })

  test('click rules button navigates to /rules', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const rulesButton = screen.getByRole('button', { name: resources.es.menu.rules })
    await user.click(rulesButton)

    expect(mockNavigate).toHaveBeenCalledWith('/rules')
  })

  test('click profile button navigates to /edit', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const profileButton = screen.getByRole('button', { name: resources.es.menu.profile })
    await user.click(profileButton)

    expect(mockNavigate).toHaveBeenCalledWith('/edit')
  })

  test('click historial button navigates to /historial', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const historialButton = screen.getByRole('button', { name: resources.es.menu.historial })
    await user.click(historialButton)

    expect(mockNavigate).toHaveBeenCalledWith('/historial')
  })

  test('click friends button navigates to /friends', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const friendsButton = screen.getByRole('button', { name: resources.es.menu.friends })
    await user.click(friendsButton)

    expect(mockNavigate).toHaveBeenCalledWith('/friends')
  })

  test('click notifications button navigates to /notifications', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const notificationsButton = screen.getByRole('button', { name: resources.es.menu.notification })
    await user.click(notificationsButton)

    expect(mockNavigate).toHaveBeenCalledWith('/notifications')
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

    renderSidebar({ name: 'Test' }, mockLogout)

    const logoutButton = screen.getByRole('button', { name: resources.es.menu.logout })
    await user.click(logoutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  test('changes language when select is used', async () => {
    const user = userEvent.setup()
    renderSidebar()

    const select = screen.getByLabelText(resources.es.menu.selectLanguage)
    await user.selectOptions(select, 'en')

    expect(select).toHaveValue('en')
  })
})
