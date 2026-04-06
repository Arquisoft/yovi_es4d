import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import UserHeader from '../components/UserHeader'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderHeader() {
  return render(
    <MemoryRouter>
      <UserHeader />
    </MemoryRouter>
  )
}

describe('UserHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra el botón Inicio siempre', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderHeader()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  test('botón Inicio navega a / (línea 32)', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch

    renderHeader()
    await user.click(screen.getByText('Inicio'))

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('muestra nombre y avatar cuando el fetch devuelve perfil', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }),
    } as Response)

    renderHeader()

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })
    expect(screen.getByRole('img', { name: 'TestUser' })).toBeInTheDocument()
  })

  test('no muestra perfil cuando fetch devuelve ok: false (línea 16)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ username: 'TestUser', avatar: 'avatar.png' }),
    } as Response)

    renderHeader()

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  test('no muestra perfil cuando data es null (línea 17)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => null,
    } as Response)

    renderHeader()

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })

  test('no lanza error si el fetch falla (catch silencioso)', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    expect(() => renderHeader()).not.toThrow()

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })
  })
})
