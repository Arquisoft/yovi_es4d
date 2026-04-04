import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import Notifications from '../components/Notifications'
import { I18nProvider } from '../i18n'
import resources from '../i18n/resources'
import '@testing-library/jest-dom'

const mockNavigate = vi.fn()

vi.mock('axios')
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

vi.mock('../config', () => ({
  API_URL: 'http://localhost:8000',
}))

const renderNotifications = () =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <Notifications />
    </I18nProvider>
  )

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders loading state initially', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise(() => {}))

    renderNotifications()

    expect(screen.getByText(resources.es.notifications.loading)).toBeInTheDocument()
  })

  test('loads and renders notifications', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [
          {
            _id: 'n1',
            type: 'friend_request',
            read: false,
            createdAt: '2026-01-01T10:00:00.000Z',
            requestId: 'r1',
            relatedUser: {
              _id: 'u1',
              username: 'Carlos',
              email: 'carlos@test.com',
              avatar: '/avatar.png',
            },
          },
        ],
      },
    })

    renderNotifications()

    expect(await screen.findByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText(resources.es.notifications.friendRequest)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: resources.es.notifications.accept })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: resources.es.notifications.reject })).toBeInTheDocument()
  })

  test('shows empty message when there are no notifications', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { notifications: [] },
    })

    renderNotifications()

    expect(await screen.findByText(resources.es.notifications.empty)).toBeInTheDocument()
  })

  test('shows empty message when api returns invalid notifications payload', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {},
    })

    renderNotifications()

    expect(await screen.findByText(resources.es.notifications.empty)).toBeInTheDocument()
  })

  test('shows loading error when initial fetch fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('fail'))

    renderNotifications()

    expect(await screen.findByText(resources.es.notifications.errorLoading)).toBeInTheDocument()
  })

  test('accepts a notification request and reloads data', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          notifications: [
            {
              _id: 'n1',
              type: 'friend_request',
              read: false,
              createdAt: '2026-01-01T10:00:00.000Z',
              requestId: 'r1',
              relatedUser: {
                _id: 'u1',
                username: 'Carlos',
                email: 'carlos@test.com',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { notifications: [] },
      })

    vi.mocked(axios.patch).mockResolvedValue({ data: { success: true } })

    const user = userEvent.setup()
    renderNotifications()

    const acceptButton = await screen.findByRole('button', {
      name: resources.es.notifications.accept,
    })
    await user.click(acceptButton)

    expect(axios.patch).toHaveBeenCalledWith(
      'http://localhost:8000/api/friends/accept',
      { requestId: 'r1' },
      { withCredentials: true }
    )

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2)
    })
  })

  test('shows accept error if accept request fails', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [
          {
            _id: 'n1',
            type: 'friend_request',
            read: false,
            createdAt: '2026-01-01T10:00:00.000Z',
            requestId: 'r1',
            relatedUser: {
              _id: 'u1',
              username: 'Carlos',
              email: 'carlos@test.com',
            },
          },
        ],
      },
    })

    vi.mocked(axios.patch).mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    renderNotifications()

    const acceptButton = await screen.findByRole('button', {
      name: resources.es.notifications.accept,
    })
    await user.click(acceptButton)

    expect(await screen.findByText(resources.es.notifications.errorAccept)).toBeInTheDocument()
  })

  test('rejects a notification request and reloads data', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          notifications: [
            {
              _id: 'n1',
              type: 'friend_request',
              read: false,
              createdAt: '2026-01-01T10:00:00.000Z',
              requestId: 'r1',
              relatedUser: {
                _id: 'u1',
                username: 'Carlos',
                email: 'carlos@test.com',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { notifications: [] },
      })

    vi.mocked(axios.patch).mockResolvedValue({ data: { success: true } })

    const user = userEvent.setup()
    renderNotifications()

    const rejectButton = await screen.findByRole('button', {
      name: resources.es.notifications.reject,
    })
    await user.click(rejectButton)

    expect(axios.patch).toHaveBeenCalledWith(
      'http://localhost:8000/api/friends/reject',
      { requestId: 'r1' },
      { withCredentials: true }
    )

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2)
    })
  })

  test('shows reject error if reject request fails', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [
          {
            _id: 'n1',
            type: 'friend_request',
            read: false,
            createdAt: '2026-01-01T10:00:00.000Z',
            requestId: 'r1',
            relatedUser: {
              _id: 'u1',
              username: 'Carlos',
              email: 'carlos@test.com',
            },
          },
        ],
      },
    })

    vi.mocked(axios.patch).mockRejectedValue(new Error('fail'))

    const user = userEvent.setup()
    renderNotifications()

    const rejectButton = await screen.findByRole('button', {
      name: resources.es.notifications.reject,
    })
    await user.click(rejectButton)

    expect(await screen.findByText(resources.es.notifications.errorReject)).toBeInTheDocument()
  })

  test('does nothing on accept if notification has no requestId', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [
          {
            _id: 'n1',
            type: 'friend_request',
            read: false,
            createdAt: '2026-01-01T10:00:00.000Z',
            relatedUser: {
              _id: 'u1',
              username: 'Carlos',
              email: 'carlos@test.com',
            },
          },
        ],
      },
    })

    const user = userEvent.setup()
    renderNotifications()

    const acceptButton = await screen.findByRole('button', {
      name: resources.es.notifications.accept,
    })
    await user.click(acceptButton)

    expect(axios.patch).not.toHaveBeenCalled()
  })

  test('does nothing on reject if notification has no requestId', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [
          {
            _id: 'n1',
            type: 'friend_request',
            read: false,
            createdAt: '2026-01-01T10:00:00.000Z',
            relatedUser: {
              _id: 'u1',
              username: 'Carlos',
              email: 'carlos@test.com',
            },
          },
        ],
      },
    })

    const user = userEvent.setup()
    renderNotifications()

    const rejectButton = await screen.findByRole('button', {
      name: resources.es.notifications.reject,
    })
    await user.click(rejectButton)

    expect(axios.patch).not.toHaveBeenCalled()
  })

  test('navigates back to home when back button is clicked', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { notifications: [] },
    })

    const user = userEvent.setup()
    renderNotifications()

    const backButton = await screen.findByRole('button', {
      name: resources.es.common.back,
    })
    await user.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  test('uses default avatar when related user avatar is missing', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [
          {
            _id: 'n1',
            type: 'friend_request',
            read: false,
            createdAt: '2026-01-01T10:00:00.000Z',
            requestId: 'r1',
            relatedUser: {
              _id: 'u1',
              username: 'Carlos',
              email: 'carlos@test.com',
            },
          },
        ],
      },
    })

    renderNotifications()

    const avatar = await screen.findByAltText('Carlos')
    expect(avatar).toHaveAttribute('src', '/default-avatar.png')
  })
})
