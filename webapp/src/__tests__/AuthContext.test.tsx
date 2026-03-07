import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { AuthProvider, AuthContext } from '../context/AuthContext'
import { useContext } from 'react'

vi.mock('axios')

const mockedAxios = axios as any

const TestComponent = () => {
  const { user, logout, checkAuth } = useContext(AuthContext)

  return (
    <div>
      <div data-testid="user">{user ? user.name : 'no-user'}</div>
      <button onClick={logout}>logout</button>
      <button onClick={checkAuth}>checkAuth</button>
    </div>
  )
}

describe('AuthProvider', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('sets user when checkAuth succeeds', async () => {

    mockedAxios.get.mockResolvedValue({
      data: { name: 'Alice' }
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice')
    })

    expect(mockedAxios.get).toHaveBeenCalled()
  })

  test('sets user to null when checkAuth fails', async () => {

    mockedAxios.get.mockRejectedValue(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })
  })

  test('logout calls api and clears user', async () => {

    mockedAxios.get.mockResolvedValue({
      data: { name: 'Alice' }
    })

    mockedAxios.post.mockResolvedValue({})

    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Alice')
    })

    const logoutButton = screen.getByRole('button', { name: 'logout' })
    await user.click(logoutButton)

    expect(mockedAxios.post).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })
  })

  test('manual checkAuth button updates user', async () => {

    mockedAxios.get
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce({ data: { name: 'Bob' } })

    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('no-user')
    })

    const checkButton = screen.getByRole('button', { name: 'checkAuth' })
    await user.click(checkButton)

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Bob')
    })
  })

})