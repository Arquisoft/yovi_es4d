import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../components/RegisterForm'
import resources from '../i18n/resources'
import { I18nProvider } from '../i18n'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import * as userService from '../services/userService'

// mock the navigation hook so we can assert redirection
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

// mock the register service
vi.mock('../services/userService', () => ({
  register: vi.fn(),
}))

// after mocking we can grab the mock reference
const mockedRegister = userService.register as unknown as ReturnType<typeof vi.fn>

const renderForm = () =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <RegisterForm />
    </I18nProvider>
  )

describe('RegisterForm', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders register form correctly', () => {
      renderForm()
  
      expect(screen.getByLabelText(/Nombre de usuario:/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Correo electrónico:/i)).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('repassword-input')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    test('shows error message when register fails', async () => {
      mockedRegister.mockRejectedValue({
        response: { data: { error: 'Usuario ya existe' } },
      });

      renderForm();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'pablo');
      await user.type(screen.getByLabelText(/Correo electrónico:/i), 'pablo@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password1');
      await user.type(screen.getByTestId('repassword-input'), 'Password1');

      await user.click(screen.getByRole('button', { name: /registrarse/i }));

      const errorMessage = await screen.findByText('Usuario ya existe');
      expect(errorMessage).toBeInTheDocument();

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('shows error message when register fails with err.message', async () => {
      mockedRegister.mockRejectedValue(new Error('Error de red'));

      renderForm();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'pablo');
      await user.type(screen.getByLabelText(/Correo electrónico:/i), 'pablo@example.com');
      await user.type(screen.getByTestId('password-input'), 'Password1');
      await user.type(screen.getByTestId('repassword-input'), 'Password1');

      await user.click(screen.getByRole('button', { name: /registrarse/i }));

      const errorMessage = await screen.findByText('Error de red');
      expect(errorMessage).toBeInTheDocument();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  
    test('allows user to type email and password', async () => {
      renderForm()
      const user = userEvent.setup()
  
      const usernameInput = screen.getByLabelText(/Nombre de usuario:/i)
      const emailInput = screen.getByLabelText(/Correo electrónico:/i)
      const passwordInput = screen.getByTestId('password-input')
      const repasswordInput = screen.getByTestId('repassword-input')
  
      await user.type(usernameInput, 'prueba')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'Password1')
      await user.type(repasswordInput, 'Password1')
  
      expect(usernameInput).toHaveValue('prueba')
      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('Password1')
      expect(repasswordInput).toHaveValue('Password1')
    })

  test('shows username validation error if username is too short', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'ab')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password1')
    await user.type(screen.getByTestId('repassword-input'), 'Password1')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /El nombre de usuario debe tener al menos 3 caracteres/i
      )
    ).toBeInTheDocument()
  })

  test('shows username validation error if username is empty', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), ' ')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password1')
    await user.type(screen.getByTestId('repassword-input'), 'Password1')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /El nombre de usuario debe tener al menos 3 caracteres/i
      )
    ).toBeInTheDocument()
  })

  test('shows email validation error', async () => {
    renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'invalidemail')
    await user.type(screen.getByTestId('password-input'), 'Password1')
    await user.type(screen.getByTestId('repassword-input'), 'Password1')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /Correo electrónico inválido/i
      )
    ).toBeInTheDocument()
  })

  test('shows email validation error when the email is empty', async () => {
    renderForm()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), ' ')
    await user.type(screen.getByTestId('password-input'), 'Password1')
    await user.type(screen.getByTestId('repassword-input'), 'Password1')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /Correo electrónico inválido/i
      )
    ).toBeInTheDocument()
  })

  test('shows password content validation error when it is too short', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'aa')
    await user.type(screen.getByTestId('repassword-input'), 'aa')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /La contraseña debe tener al menos 8 caracteres/i
      )
    ).toBeInTheDocument()
  })

  test('shows password content validation error when it does not have UpperCase && not Numbers', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'pruebasinmayusculas')
    await user.type(screen.getByTestId('repassword-input'), 'pruebasinmayusculas')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y sin espacios/i
      )
    ).toBeInTheDocument()
  })

  test('shows password content validation error when it does not have Numbers', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'pruebasinmayusculasAAA')
    await user.type(screen.getByTestId('repassword-input'), 'pruebasinmayusculasAAA')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y sin espacios/i
      )
    ).toBeInTheDocument()
  })

  test('shows password content validation error when it does not have UperCase', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'pruebasinmayusculas123')
    await user.type(screen.getByTestId('repassword-input'), 'pruebasinmayusculas123')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
      await screen.findByText(
        /La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y sin espacios/i
      )
    ).toBeInTheDocument()
  })

  test('shows password content validation error when it does have white spaces', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'pruebasinmayusculas AAA123')
    await user.type(screen.getByTestId('repassword-input'), 'pruebasinmayusculas AAA123')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(
        await screen.findByText(
          /La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y sin espacios/i
        )
    ).toBeInTheDocument()
  })

  test('shows mismatch error when passwords differ', async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'prueba')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password1')
    await user.type(screen.getByTestId('repassword-input'), 'Password123445')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(await screen.findByText(/contraseñas no coinciden/i)).toBeInTheDocument()
  })

  test('calls register and navigates on successful submit', async () => {
    mockedRegister.mockResolvedValue({})

    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Nombre de usuario:/i), 'pablo')
    await user.type(screen.getByLabelText(/Correo electrónico:/i), 'pablo@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password1')
    await user.type(screen.getByTestId('repassword-input'), 'Password1')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith({
        username: 'pablo',
        email: 'pablo@example.com',
        password: 'Password1',
      })
      expect(mockNavigate).toHaveBeenCalledWith('/login')
      expect(screen.getByText(/registro exitoso/i)).toBeInTheDocument()
    })
  })
})