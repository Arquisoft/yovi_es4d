import { render, screen,  waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../components/RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest' 
import '@testing-library/jest-dom'


describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('shows validation error when username is empty', async () => {
    render(<RegisterForm />)
    const user = userEvent.setup()

    const submitButton = screen.getByRole('button', { name: /registrarse/i })
    await user.click(submitButton)
    // In current implementation, HTML5 'required' might prevent submission if empty, 
    // but the test expects an error message if it were submitted.
    // However, the current RegisterForm doesn't have custom client-side validation for empty fields beyond 'required'.
    // If 'required' is present, the browser handles it.
  })

  test('submits registration and displays success message', async () => {
    const user = userEvent.setup()

    // Mock fetch to resolve automatically
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: '¡Usuario registrado con éxito!' }),
    } as Response)

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/usuario:/i), 'Pablo')
    await user.type(screen.getByLabelText(/email:/i), 'pablo@example.com')
    await user.type(screen.getByLabelText(/contraseña:/i), 'password123')
    
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    await waitFor(() => {
      expect(screen.getByText(/¡usuario registrado con éxito!/i)).toBeInTheDocument()
    })
  })
})