import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../components/LoginForm'
import resources from '../i18n/resources'
import { I18nProvider } from '../i18n'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import * as userService from '../services/userService'
import { AuthContext } from '../context/AuthContext'

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
        <LoginForm />
      </AuthContext.Provider>
    </I18nProvider>
  )

describe('LoginForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders login form correctly', () => {
    renderForm()

    expect(screen.getByLabelText(/Correo electrónico:/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contraseña:/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('allows user to type email and password', async () => {
    renderForm()
    const user = userEvent.setup()

    const emailInput = screen.getByLabelText(/Correo electrónico:/i)
    const passwordInput = screen.getByLabelText(/Contraseña:/i)

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'Password1')

    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('Password1')
  })

  test('calls login, checkAuth and navigates on successful login', async () => {
    mockedLogin.mockResolvedValue({})

    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'pablo@example.com')
    await user.type(screen.getByLabelText(/Contraseña:/i), 'Password1')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith({
        email: 'pablo@example.com',
        password: 'Password1',
      })

      expect(mockCheckAuth).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  test('shows error message when login fails', async () => {
    mockedLogin.mockRejectedValue(new Error('Credenciales incorrectas'))

    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'pablo@example.com')
    await user.type(screen.getByLabelText(/Contraseña:/i), 'Password1')
    await user.click(screen.getByRole('button'))

    expect(await screen.findByText(/credenciales incorrectas/i)).toBeInTheDocument()
  })

  test('disables button while loading', async () => {
    mockedLogin.mockImplementation(() => new Promise(() => {}))

    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'pablo@example.com')
    await user.type(screen.getByLabelText(/Contraseña:/i), 'Password1')

    const button = screen.getByRole('button')

    await user.click(button)

    expect(button).toBeDisabled()
  })

  test('shows error if email is empty', async () => {
    renderForm()
    const user = userEvent.setup()
    const passwordInput = screen.getByLabelText(/Contraseña:/i)
    await user.type(passwordInput, 'Password1')
    await user.click(screen.getByRole('button'))
    expect(
      await screen.findByText(
        /Correo electrónico inválido/i
      )
    ).toBeInTheDocument()
  })

  test('shows error if email is invalid', async () => {
    renderForm()
    const user = userEvent.setup()
    const emailInput = screen.getByLabelText(/Correo electrónico:/i)
    const passwordInput = screen.getByLabelText(/Contraseña:/i)
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'Password1')
    await user.click(screen.getByRole('button'))
    expect(
      await screen.findByText(
        /Correo electrónico inválido/i
      )
    ).toBeInTheDocument()
  })

  test('shows error if password is empty', async () => {
    renderForm()
    const user = userEvent.setup()
    const emailInput = screen.getByLabelText(/Correo electrónico:/i)
    await user.type(emailInput, 'test@example.com')
    await user.click(screen.getByRole('button'))
    expect(
      await screen.findByText(
        /La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y sin espacios/i
      )
    ).toBeInTheDocument()
  })

  test('continues when email is valid', async () => {
  mockedLogin.mockResolvedValue({})

  renderForm()
  const user = userEvent.setup()

  await user.type(
    screen.getByLabelText(/Correo electrónico:/i),
    'valid@example.com'
  )

  await user.type(
    screen.getByLabelText(/Contraseña:/i),
    'Password1'
  )

  await user.click(screen.getByRole('button'))

  await waitFor(() => {
    expect(mockedLogin).toHaveBeenCalled()
  })
})

test('shows backend response error if exists', async () => {
  mockedLogin.mockRejectedValue({
    response: {
      data: { error: 'Backend error' },
    },
  })

  renderForm()
  const user = userEvent.setup()

  await user.type(
    screen.getByLabelText(/Correo electrónico:/i),
    'test@example.com'
  )

  await user.type(
    screen.getByLabelText(/Contraseña:/i),
    'Password1'
  )

  await user.click(screen.getByRole('button'))

  expect(await screen.findByText(/backend error/i))
    .toBeInTheDocument()
})

test('shows backend response error', async () => {
  mockedLogin.mockRejectedValue({
    response: {
      data: { error: 'Backend error' },
    },
  })

  renderForm()
  const user = userEvent.setup()

  await user.type(screen.getByLabelText(/Correo electrónico/i),'test@test.com')
  await user.type(screen.getByLabelText(/Contraseña/i),'Password1')

  await user.click(screen.getByRole('button'))

  expect(await screen.findByText(/backend error/i))
    .toBeInTheDocument()
})

test('shows generic error when no message exists', async () => {
  mockedLogin.mockRejectedValue({})

  renderForm()
  const user = userEvent.setup()

  await user.type(screen.getByLabelText(/Correo electrónico/i),'test@test.com')
  await user.type(screen.getByLabelText(/Contraseña/i),'Password1')

  await user.click(screen.getByRole('button'))

  expect(await screen.findByText(/login failed/i))
    .toBeInTheDocument()
})

test('uses fallback email error when translation key is missing', async () => {
  const resourcesWithoutEmailError = {
    es: {
      registerForm: {
        email: "Correo electrónico",
        password: "Contraseña",
        enterEmail: "Email",
        enterPassword: "Password",
        loading: "Cargando",
        enter: "Entrar",
        // ❌ NO errorEmail
      },
      menu: {
        initsession: "Login",
      },
    },
  }

  render(
    <I18nProvider defaultLang="es" resources={resourcesWithoutEmailError}>
      <AuthContext.Provider value={{ checkAuth: mockCheckAuth } as any}>
        <LoginForm />
      </AuthContext.Provider>
    </I18nProvider>
  )

  const user = userEvent.setup()

  await user.click(screen.getByRole('button'))

  expect(
    await screen.findByText(/correo electrónico no válido/i)
  ).toBeInTheDocument()
})

test('uses fallback password error when translation key is missing', async () => {
  const resourcesWithoutPasswordError = {
    es: {
      registerForm: {
        email: "Correo electrónico",
        password: "Contraseña",
        errorEmail: "Correo electrónico inválido",
        enterEmail: "Email",
        enterPassword: "Password",
        loading: "Cargando",
        enter: "Entrar",
        // ❌ NO errorPasswordContent
      },
      menu: {
        initsession: "Login",
      },
    },
  }

  render(
    <I18nProvider defaultLang="es" resources={resourcesWithoutPasswordError}>
      <AuthContext.Provider value={{ checkAuth: mockCheckAuth } as any}>
        <LoginForm />
      </AuthContext.Provider>
    </I18nProvider>
  )

  const user = userEvent.setup()

  await user.type(
    screen.getByLabelText(/correo electrónico/i),
    'test@test.com'
  )

  await user.click(screen.getByRole('button'))

  expect(
    await screen.findByText(/contraseña es obligatoria/i)
  ).toBeInTheDocument()
})
})