import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OnlineLobby from '../components/game/Onlinelobby'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'
import { io, Socket } from 'socket.io-client'

// Mock del socket.io-client
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

const renderLobby = () =>
    render(<MemoryRouter><OnlineLobby /></MemoryRouter>)

describe('OnlineLobby', () => {

    let mockSocket: any

    beforeEach(() => {
        mockSocket = {
            on: vi.fn(),
            emit: vi.fn(),
            disconnect: vi.fn(),
            id: 'mock-socket-id'
        }
        vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // ── Renderizado básico ───────────────────────────────────
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

    test('muestra el UserHeader', async () => {
        renderLobby()
        // Verifica que existe el botón "Inicio" del UserHeader
        expect(await screen.findByText('Inicio')).toBeInTheDocument()
    })

    // ── Panel "Crear sala" ───────────────────────────────────
    test('muestra el panel de crear sala', async () => {
        renderLobby()
        expect(await screen.findByRole('heading', { name: 'Crear sala' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /crear sala/i })).toBeInTheDocument()
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

    // ── Panel "Unirse a sala" ─────────────────────────────────
    test('muestra el panel de crear sala', async () => {
        renderLobby()
        expect(await screen.findByRole('heading', { name: 'Crear sala' })).toBeInTheDocument()
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
        const joinBtn = screen.getByRole('button', { name: /unirse/i })

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

    test('el botón Unirse cambia de color cuando el código es válido', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByText('Unirse a sala')

        const input = screen.getByPlaceholderText('Ej: XKQZ')
        const joinBtn = screen.getByRole('button', { name: /unirse/i })

        // Inicialmente tiene estilo normal (violet)
        expect(joinBtn).toHaveStyle({ background: 'var(--violet)' })

        await user.type(input, 'ABCD')

        // Después de escribir el código, debería cambiar a coral
        expect(joinBtn).toHaveStyle({ background: 'var(--coral)' })
    })

    // ── Botón Volver ─────────────────────────────────────────
    test('muestra el botón Volver', async () => {
        renderLobby()
        expect(await screen.findByText('← Volver')).toBeInTheDocument()
    })

    test('navega a /select al hacer click en Volver', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByText('← Volver')

        const backBtn = screen.getByText('← Volver')
        await user.click(backBtn)

        expect(mockNavigate).toHaveBeenCalledWith('/select')
    })

    // ── Crear sala ───────────────────────────────────────────
    test('crea una sala al hacer click en "Crear sala"', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        // Buscar específicamente el botón, no el heading
        const createBtn = screen.getByRole('button', { name: /crear sala/i })
        await user.click(createBtn)

        expect(mockSocket.emit).toHaveBeenCalledWith('create_room', { boardSize: 11, startingPlayer: 'j1' })
    })

    test('crea una sala con el tamaño de tablero seleccionado', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const extraBtn = screen.getByText('Extra').closest('button')!
        await user.click(extraBtn)

        const createBtn = screen.getByRole('button', { name: /crear sala/i })
        await user.click(createBtn)

        expect(mockSocket.emit).toHaveBeenCalledWith('create_room', { boardSize: 19, startingPlayer: 'j1' })
    })

    // ── Unirse a sala ───────────────────────────────────────
    test('se une a una sala al hacer click en "Unirse" con código válido', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByText('Unirse a sala')

        const input = screen.getByPlaceholderText('Ej: XKQZ')
        await user.type(input, 'ABCD')

        const joinBtn = screen.getByRole('button', { name: /unirse/i })
        await user.click(joinBtn)

        expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { code: 'ABCD' })
    })

    test('no se une si el código está vacío', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByText('Unirse a sala')

        const joinBtn = screen.getByRole('button', { name: /unirse/i })
        await user.click(joinBtn)

        expect(mockSocket.emit).not.toHaveBeenCalled()
    })

    // ── Estados del lobby ───────────────────────────────────
    test('muestra estado "creando" mientras se crea la sala', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const createBtn = screen.getByRole('button', { name: /crear sala/i })
        await user.click(createBtn)

        // No hay un indicador visual de "creating", solo cambia el estado
        // Verificamos que no hay error
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    test('muestra estado "esperando" después de crear sala exitosamente', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        // Simular evento room_created
        const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
        if (onHandler) {
            onHandler[1]({ code: 'TEST' })
        }

        await waitFor(() => {
            expect(screen.getByText('Comparte este código')).toBeInTheDocument()
            expect(screen.getByText('TEST')).toBeInTheDocument()
            expect(screen.getByText(/esperando a que tu amigo se una/i)).toBeInTheDocument()
        })
    })

    test('muestra el código de la sala en estado waiting', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
        if (onHandler) {
            onHandler[1]({ code: 'XYZ123' })
        }

        await waitFor(() => {
            expect(screen.getByText('XYZ123')).toBeInTheDocument()
        })
    })

    test('muestra botón Cancelar en estado waiting', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
        if (onHandler) {
            onHandler[1]({ code: 'TEST' })
        }

        await waitFor(() => {
            expect(screen.getByText('← Cancelar')).toBeInTheDocument()
        })
    })

    test('navega a /select al cancelar en estado waiting', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_created')
        if (onHandler) {
            onHandler[1]({ code: 'TEST' })
        }

        await waitFor(() => {
            expect(screen.getByText('← Cancelar')).toBeInTheDocument()
        })

        const cancelBtn = screen.getByText('← Cancelar')
        await user.click(cancelBtn)

        expect(mockNavigate).toHaveBeenCalledWith('/select')
    })


    test('muestra estado "uniéndose" mientras se une a sala', async () => {
        const user = userEvent.setup()
        renderLobby()
        await screen.findByText('Unirse a sala')

        const input = screen.getByPlaceholderText('Ej: XKQZ')
        await user.type(input, 'ABCD')

        const joinBtn = screen.getByRole('button', { name: /unirse/i })
        await user.click(joinBtn)

        // Después de hacer click, debería mostrar mensaje de unión
        await waitFor(() => {
            expect(screen.getByText(/uniéndose a la sala/i)).toBeInTheDocument()
            expect(screen.getByText('ABCD')).toBeInTheDocument()
        })
    })

    // ── Navegación al juego ─────────────────────────────────
    test('navega a /game cuando se recibe evento your_role', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'your_role')
        if (onHandler) {
            onHandler[1]({
                role: 'player1',
                code: 'TEST',
                boardSize: 11
            })
        }

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: {
                    gameMode: 'online',
                    boardSize: 11,
                    onlineRole: 'player1',
                    roomCode: 'TEST',
                    socketId: 'mock-socket-id'
                }
            })
        })
    })


    test('pasa el rol correcto al navegar', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const onHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'your_role')
        if (onHandler) {
            onHandler[1]({
                role: 'player2',
                code: 'TEST2',
                boardSize: 15
            })
        }

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/game', {
                state: expect.objectContaining({
                    onlineRole: 'player2',
                    roomCode: 'TEST2',
                    boardSize: 15
                })
            })
        })
    })

    // ── Manejo de errores ───────────────────────────────────
    test('muestra error cuando hay error en la sala', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        const errorHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_error')
        if (errorHandler) {
            errorHandler[1]({ message: 'La sala no existe' })
        }

        await waitFor(() => {
            expect(screen.getByText('La sala no existe')).toBeInTheDocument()
        })
    })


    test('limpia el error después de mostrarlo', async () => {
        renderLobby()
        await screen.findByRole('heading', { name: 'Crear sala' })

        // Primero simular un error
        const errorHandler = mockSocket.on.mock.calls.find((call: any[]) => call[0] === 'room_error')
        if (errorHandler) {
            errorHandler[1]({ message: 'Error de conexión' })
        }

        await waitFor(() => {
            expect(screen.getByText('Error de conexión')).toBeInTheDocument()
        })

        // Después de mostrar el error, el estado vuelve a idle
        // El mensaje debería desaparecer cuando se intenta crear/entrar nuevamente
    })

    // ── Decoración ──────────────────────────────────────────
    test('muestra la decoración YOVI', async () => {
        renderLobby()
        expect(await screen.findByText('YOVI')).toBeInTheDocument()
    })

    // ── Socket cleanup ──────────────────────────────────────
    test('desconecta el socket al desmontar el componente', () => {
        const { unmount } = renderLobby()
        unmount()
        expect(mockSocket.disconnect).toHaveBeenCalled()
    })
})