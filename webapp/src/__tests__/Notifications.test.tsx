import { render, screen } from '@testing-library/react'
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

    const { container } = renderNotifications()

    expect(await screen.findByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText(resources.es.notifications.friendRequest)).toBeInTheDocument()
    expect(container.querySelector('.notification-card.unread')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: resources.es.notifications.accept })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: resources.es.notifications.reject })).not.toBeInTheDocument()
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

    expect(await screen.findAllByText(resources.es.notifications.errorLoading))
  .toHaveLength(2)
  })

  test('renders multiple notifications returned by the api', async () => {
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
          {
            _id: 'n2',
            type: 'friend_request',
            read: true,
            createdAt: '2026-01-02T10:00:00.000Z',
            relatedUser: {
              _id: 'u2',
              username: 'Ana',
              email: 'ana@test.com',
            },
          },
        ],
      },
    })

    renderNotifications()

    expect(await screen.findByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  test('renders the back button after loading notifications', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        notifications: [],
      },
    })

    renderNotifications()

    expect(await screen.findByRole('button', { name: resources.es.common.back })).toBeInTheDocument()
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