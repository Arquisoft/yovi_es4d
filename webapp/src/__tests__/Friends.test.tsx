import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import Friends from '../pages/Friends'
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

vi.mock('../components/Sidebar', () => ({
  default: () => <div>Sidebar Mock</div>,
}))

vi.mock('../services/friendService', () => ({
  exploreUsers: vi.fn(),
  getFriends: vi.fn(),
  getFriendRequests: vi.fn(),
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
}))

import {
  exploreUsers,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from '../services/friendService'

const makeExploreResponse = (users: Array<{ _id: string; username: string }> = [], hasNext = false, page = 1) => ({
  users,
  pagination: {
    page,
    limit: 10,
    hasPrev: page > 1,
    hasNext,
  },
})

const renderFriends = (user: any = { _id: 'user1', username: 'TestUser' }) =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider
        value={{
          user,
          logout: vi.fn(),
          checkAuth: vi.fn(),
        }}
      >
        <Friends />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('Friends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  
  test('renders loading fallback when user is undefined', () => {
  renderFriends()

  expect(screen.getByText(resources.es.friends.loadingUser)).toBeInTheDocument()
})

  test('redirects to /login when there is no user', async () => {
    renderFriends(null)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  test('renders explore users on initial load', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(
      makeExploreResponse([
        { _id: 'u1', username: 'Carlos' },
        { _id: 'u2', username: 'Ana' },
      ])
    )

    renderFriends()

    expect(screen.getByText(resources.es.friends.loadingUser)).toBeInTheDocument()
    expect(await screen.findByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(exploreUsers).toHaveBeenCalledWith('', 1)
  })

  test('shows empty message when explore has no users', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())

    renderFriends()

    expect(await screen.findByText(resources.es.friends.emptyExplore)).toBeInTheDocument()
  })

  test('switches to friends tab and loads friends list', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriends).mockResolvedValue([{ _id: 'f1', username: 'Lucia' }])

    const user = userEvent.setup()
    renderFriends()

    const friendsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.friends,
    })
    await user.click(friendsTab)

    expect(await screen.findByText('Lucia')).toBeInTheDocument()
    expect(getFriends).toHaveBeenCalledWith('', 1)
  })

  test('switches to requests tab and loads requests list', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriendRequests).mockResolvedValue([
      {
        _id: 'r1',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
        sender: { _id: 'u2', username: 'Pedro' },
        receiver: { _id: 'user1', username: 'TestUser' },
      },
    ])

    const user = userEvent.setup()
    renderFriends()

    const requestsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.requests,
    })
    await user.click(requestsTab)

    expect(await screen.findByText('Pedro')).toBeInTheDocument()
    expect(getFriendRequests).toHaveBeenCalled()
  })

  test('shows empty message when requests tab has no requests', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriendRequests).mockResolvedValue([])

    const user = userEvent.setup()
    renderFriends()

    const requestsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.requests,
    })
    await user.click(requestsTab)

    expect(await screen.findByText(resources.es.friends.emptyRequests)).toBeInTheDocument()
  })

  test('updates search and reloads explore data', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())

    const user = userEvent.setup()
    renderFriends()

    const input = await screen.findByPlaceholderText(resources.es.friends.search)
    await user.type(input, 'ana')

    await waitFor(() => {
      expect(exploreUsers).toHaveBeenLastCalledWith('ana', 1)
    })
  })

  test('sends friend request when clicking add button', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse([{ _id: 'u5', username: 'Mario' }]))
    vi.mocked(sendFriendRequest).mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderFriends()

    expect(await screen.findByText('Mario')).toBeInTheDocument()

    const addButton = screen.getByRole('button', { name: resources.es.friends.add })
    await user.click(addButton)

    expect(sendFriendRequest).toHaveBeenCalledWith('u5')
  })

  test('shows sending error if send friend request fails', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse([{ _id: 'u5', username: 'Mario' }]))
    vi.mocked(sendFriendRequest).mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    renderFriends()

    expect(await screen.findByText('Mario')).toBeInTheDocument()

    const addButton = screen.getByRole('button', { name: resources.es.friends.add })
    await user.click(addButton)

    expect(await screen.findByText(resources.es.friends.errorSend)).toBeInTheDocument()
  })

  test('accepts a friend request', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriendRequests).mockResolvedValue([
      {
        _id: 'r1',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
        sender: { _id: 'u2', username: 'Pedro' },
        receiver: { _id: 'user1', username: 'TestUser' },
      },
    ])
    vi.mocked(acceptFriendRequest).mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderFriends()

    const requestsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.requests,
    })
    await user.click(requestsTab)

    expect(await screen.findByText('Pedro')).toBeInTheDocument()

    const acceptButton = screen.getByRole('button', { name: resources.es.friends.accept })
    await user.click(acceptButton)

    expect(acceptFriendRequest).toHaveBeenCalledWith('r1')
  })

  test('shows accepting error if accept request fails', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriendRequests).mockResolvedValue([
      {
        _id: 'r1',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
        sender: { _id: 'u2', username: 'Pedro' },
        receiver: { _id: 'user1', username: 'TestUser' },
      },
    ])
    vi.mocked(acceptFriendRequest).mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    renderFriends()

    const requestsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.requests,
    })
    await user.click(requestsTab)

    expect(await screen.findByText('Pedro')).toBeInTheDocument()

    const acceptButton = screen.getByRole('button', { name: resources.es.friends.accept })
    await user.click(acceptButton)

    expect(await screen.findByText(resources.es.friends.errorAccept)).toBeInTheDocument()
  })

  test('rejects a friend request', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriendRequests).mockResolvedValue([
      {
        _id: 'r1',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
        sender: { _id: 'u2', username: 'Pedro' },
        receiver: { _id: 'user1', username: 'TestUser' },
      },
    ])
    vi.mocked(rejectFriendRequest).mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderFriends()

    const requestsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.requests,
    })
    await user.click(requestsTab)

    expect(await screen.findByText('Pedro')).toBeInTheDocument()

    const rejectButton = screen.getByRole('button', { name: resources.es.friends.reject })
    await user.click(rejectButton)

    expect(rejectFriendRequest).toHaveBeenCalledWith('r1')
  })

  test('shows rejecting error if reject request fails', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())
    vi.mocked(getFriendRequests).mockResolvedValue([
      {
        _id: 'r1',
        status: 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
        sender: { _id: 'u2', username: 'Pedro' },
        receiver: { _id: 'user1', username: 'TestUser' },
      },
    ])
    vi.mocked(rejectFriendRequest).mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    renderFriends()

    const requestsTab = await screen.findByRole('button', {
      name: resources.es.friends.tabs.requests,
    })
    await user.click(requestsTab)

    expect(await screen.findByText('Pedro')).toBeInTheDocument()

    const rejectButton = screen.getByRole('button', { name: resources.es.friends.reject })
    await user.click(rejectButton)

    expect(await screen.findByText(resources.es.friends.errorReject)).toBeInTheDocument()
  })

  test('shows generic loading error if initial load fails', async () => {
    vi.mocked(exploreUsers).mockRejectedValue(new Error('fail'))

    renderFriends()

    expect(await screen.findByText(resources.es.friends.errorLoading)).toBeInTheDocument()
  })

  test('changes page when clicking next pagination button', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse([], true))

    const user = userEvent.setup()
    renderFriends()

    const nextButton = await screen.findByRole('button', { name: '⇨' })
    await user.click(nextButton)

    await waitFor(() => {
      expect(exploreUsers).toHaveBeenLastCalledWith('', 2)
    })
  })

  test('does not go below page 1 when clicking previous pagination button', async () => {
    vi.mocked(exploreUsers).mockResolvedValue(makeExploreResponse())

    const user = userEvent.setup()
    renderFriends()

    const prevButton = await screen.findByRole('button', { name: '⇦' })
    await user.click(prevButton)

    await waitFor(() => {
      expect(exploreUsers).toHaveBeenLastCalledWith('', 1)
    })
  })

  test('redirects to login if user has no id', async () => {
  renderFriends({ username: 'test' }) // NO _id, NO id, NO userId

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})

test('renders loading fallback when user is undefined', () => {
  renderFriends(undefined)

  expect(screen.getByText("Cargando usuario...")).toBeInTheDocument()
})

test('switches to explore tab when clicking explore button', async () => {
  vi.mocked(getFriends).mockResolvedValue([])
  vi.mocked(exploreUsers).mockResolvedValue([])

  const user = userEvent.setup()
  renderFriends()

  // primero cambia a friends para asegurar estado distinto
  const friendsTab = await screen.findByRole('button', {
    name: resources.es.friends.tabs.friends,
  })
  await user.click(friendsTab)

  // ahora vuelve a explore
  const exploreTab = screen.getByRole('button', {
    name: resources.es.friends.tabs.explore,
  })
  await user.click(exploreTab)

  expect(exploreUsers).toHaveBeenCalledWith('', 1)
})

test('redirects to login when user has no id', async () => {
  renderFriends({ username: 'no-id-user' }) // <- sin _id, id, userId

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})

test('redirects to login when user is invalid object', async () => {
  renderFriends({}) // vacío total

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})

test('shows loading fallback when user is undefined', () => {
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <AuthContext.Provider value={{ user: undefined, logout: vi.fn(), checkAuth: vi.fn() }}>
        <Friends />
      </AuthContext.Provider>
    </I18nProvider>
  )

  expect(screen.getByText(resources.es.back.loading)).toBeInTheDocument()
})


})

