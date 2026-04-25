import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OnlineLobby from '../components/game/Onlinelobby'
import { I18nProvider } from '../i18n'
import resources from '../i18n/resources'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { io, Socket } from 'socket.io-client'

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    id: 'mock-socket-id'
  }))
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../components/UserHeader', () => ({
  default: () => <div data-testid="user-header">UserHeader Mock</div>
}))

const renderLobby = () =>
  render(
    <MemoryRouter>
      <I18nProvider defaultLang="es" resources={resources}>
        <OnlineLobby />
      </I18nProvider>
    </MemoryRouter>
  )

describe('OnlineLobby', () => {
  let mockSocket: any

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      id: 'mock-socket-id'
    }
    vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket)
    mockNavigate.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra el título de la pantalla', async () => {
    renderLobby()
    expect(await screen.findByText('Jugar online')).toBeInTheDocument()
  })

  test('muestra el badge "Partida online"', async () => {
    renderLobby()
    expect(await screen.findByText(/partida online/i)).toBeInTheDocument()
  })

  test('muestra el subtítulo', async () => {
    renderLobby()
    expect(await screen.findByText(/crea una sala o únete con un código/i)).toBeInTheDocument()
  })

  test('muestra el UserHeader mockeado', () => {
    renderLobby()
    expect(screen.getByTestId('user-header')).toBeInTheDocument()
  })

  test('muestra el panel de crear sala', async () => {
    renderLobby()
    expect(await screen.findByRole('heading', { name: 'Crear sala' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /crear sala/i })).toHaveLength(1)
  })

  test('muestra las opciones de tamaño del tablero', async () => {
    renderLobby()
    expect(await screen.findByText('Pequeño')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
    expect(screen.getByText('Grande')).toBeInTheDocument()
    expect(screen.getByText('Extra')).toBeInTheDocument()
  })

  test('el tamaño "Normal" está seleccionado por defecto', async () => {
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const normalCard = screen.getByText('Normal').closest('.ms-size-card')
    expect(normalCard).toHaveClass('selected')
  })

  test('permite cambiar el tamaño del tablero', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const grandeBtn = screen.getByText('Grande').closest('button')!
    await user.click(grandeBtn)

    expect(grandeBtn).toHaveClass('selected')
  })

  test('muestra el panel de unirse a sala', async () => {
    renderLobby()
    expect(await screen.findByRole('heading', { name: 'Unirse a sala' })).toBeInTheDocument()
    expect(screen.getByText('Tamaño del tablero')).toBeInTheDocument()
  })

  test('muestra la descripción del código', async () => {
    renderLobby()
    expect(await screen.findByText(/código de 4 letras/i)).toBeInTheDocument()
  })

  test('el botón Unirse está deshabilitado cuando el código tiene menos de 4 caracteres', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByText('Unirse a sala')

    const input = screen.getByPlaceholderText('Ej: XKQZ')
    const joinBtn = screen.getByRole('button', { name: /^unirse$/i })

    expect(joinBtn).toBeDisabled()

    await user.type(input, 'ABC')
    expect(joinBtn).toBeDisabled()

    await user.type(input, 'D')
    expect(joinBtn).not.toBeDisabled()
  })

  test('convierte el código ingresado a mayúsculas automáticamente', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByText('Unirse a sala')

    const input = screen.getByPlaceholderText('Ej: XKQZ') as HTMLInputElement
    await user.type(input, 'abcd')

    expect(input.value).toBe('ABCD')
  })

  test('muestra el botón Volver', async () => {
    renderLobby()
    expect(await screen.findByRole('button', { name: /volver/i })).toBeInTheDocument()
  })

  test('navega a /select al hacer click en Volver', async () => {
    const user = userEvent.setup()
    renderLobby()

    await user.click(await screen.findByRole('button', { name: /volver/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/select')
  })

  test('crea una sala al hacer click en "Crear sala"', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const createBtn = screen.getByRole('button', { name: /^crear sala$/i })
    await user.click(createBtn)

    expect(mockSocket.emit).toHaveBeenCalledWith('create_room', { boardSize: 11, startingPlayer: 'j1' })
  })

  test('crea una sala con el tamaño de tablero seleccionado', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const extraBtn = screen.getByText('Extra').closest('button')!
    await user.click(extraBtn)

    const createBtn = screen.getByRole('button', { name: /^crear sala$/i })
    await user.click(createBtn)

    expect(mockSocket.emit).toHaveBeenCalledWith('create_room', { boardSize: 19, startingPlayer: 'j1' })
  })

  test('se une a una sala al hacer click en "Unirse" con código válido', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByText('Unirse a sala')

    const input = screen.getByPlaceholderText('Ej: XKQZ')
    await user.type(input, 'ABCD')

    const joinBtn = screen.getByRole('button', { name: /^unirse$/i })
    await user.click(joinBtn)

    expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { code: 'ABCD' })
  })

  test('no se une si el código está vacío', async () => {
    renderLobby()
    await screen.findByText('Unirse a sala')

    const joinBtn = screen.getByRole('button', { name: /^unirse$/i })
    expect(joinBtn).toBeDisabled()
    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  test('muestra estado "esperando" después de crear sala exitosamente', async () => {
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
    onHandler?.[1]({ code: 'TEST' })

    await waitFor(() => {
      expect(screen.getByText('Comparte este código')).toBeInTheDocument()
      expect(screen.getByText('TEST')).toBeInTheDocument()
      expect(screen.getByText(/esperando a que tu amigo se una/i)).toBeInTheDocument()
    })
  })

  test('muestra botón Cancelar en estado waiting', async () => {
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
    onHandler?.[1]({ code: 'TEST' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })
  })

  test('navega a /select al cancelar en estado waiting', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
    onHandler?.[1]({ code: 'TEST' })

    const cancelBtn = await screen.findByRole('button', { name: /cancelar/i })
    await user.click(cancelBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/select')
  })

  test('muestra estado "uniéndose" mientras se une a sala', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByText('Unirse a sala')

    const input = screen.getByPlaceholderText('Ej: XKQZ')
    await user.type(input, 'ABCD')

    const joinBtn = screen.getByRole('button', { name: /^unirse$/i })
    await user.click(joinBtn)

    await waitFor(() => {
      expect(screen.getByText(/uniéndose a la sala/i)).toBeInTheDocument()
      expect(screen.getByText('ABCD')).toBeInTheDocument()
    })
  })

  test('navega a /game cuando se recibe evento your_role', async () => {
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'your_role')
    onHandler?.[1]({
      role: 'player1',
      code: 'TEST',
      boardSize: 11,
      startingPlayer: 'j1'
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: {
          gameMode: 'online',
          boardSize: 11,
          onlineRole: 'player1',
          roomCode: 'TEST',
          socketId: 'mock-socket-id',
          startingPlayer: 'j1'
        }
      })
    })
  })

  test('pasa el rol correcto al navegar', async () => {
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'your_role')
    onHandler?.[1]({
      role: 'player2',
      code: 'TEST2',
      boardSize: 15,
      startingPlayer: 'j2'
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/game', {
        state: expect.objectContaining({
          onlineRole: 'player2',
          roomCode: 'TEST2',
          boardSize: 15,
          startingPlayer: 'j2'
        })
      })
    })
  })

  test('muestra error cuando hay error en la sala', async () => {
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const errorHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_error')
    errorHandler?.[1]({ message: 'La sala no existe' })

    await waitFor(() => {
      expect(screen.getByText('La sala no existe')).toBeInTheDocument()
    })
  })

  test('limpia el error al intentar crear una nueva sala', async () => {
    const user = userEvent.setup()
    renderLobby()
    await screen.findByRole('heading', { name: 'Crear sala' })

    const errorHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_error')
    errorHandler?.[1]({ message: 'Error de conexión' })

    await screen.findByText('Error de conexión')
    await user.click(screen.getByRole('button', { name: /^crear sala$/i }))

    await waitFor(() => {
      expect(screen.queryByText('Error de conexión')).not.toBeInTheDocument()
    })
  })

  test('muestra la decoración YOVI', () => {
    renderLobby()
    expect(screen.getByText('YOVI')).toBeInTheDocument()
  })

  test('desconecta el socket al desmontar el componente', () => {
    const { unmount } = renderLobby()
    unmount()
    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})
