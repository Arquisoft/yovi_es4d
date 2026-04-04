import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Triangle from '../components/game/Triangle'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock Hexagon para simplificar — renderiza un botón con data-position
vi.mock('../components/game/Hexagon', () => ({
  default: ({ position, player, onClick }: { position: string; player: string | null; onClick: () => void }) => (
    <button
      data-testid="hexagon"
      data-position={position}
      data-player={player ?? ''}
      disabled={!!player}
      onClick={onClick}
    >
      {position}
    </button>
  ),
}))

const makeBoard = (size: number) => {
  const total = (size * (size + 1)) / 2
  return Array.from({ length: total }, (_, i) => ({ position: `hex-${i}`, player: null as null }))
}

// Tablero real de tamaño 3 (6 celdas) con posiciones que usa Triangle
const board3 = [
  { position: '(2,0,0)', player: null as "j1" | "j2" | null },
  { position: '(1,0,1)', player: null as "j1" | "j2" | null },
  { position: '(1,1,0)', player: null as "j1" | "j2" | null },
  { position: '(0,0,2)', player: null as "j1" | "j2" | null },
  { position: '(0,1,1)', player: null as "j1" | "j2" | null },
  { position: '(0,2,0)', player: null as "j1" | "j2" | null },
]

describe('Triangle', () => {

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('renderiza el número correcto de hexágonos para un tablero de tamaño 3', () => {
    render(<Triangle hexData={board3} onHexClick={() => {}} />)
    expect(screen.getAllByTestId('hexagon')).toHaveLength(6)
  })

  test('renderiza 10 hexágonos para un tablero de tamaño 4', () => {
    const board4 = Array.from({ length: 10 }, (_, i) => ({ position: `p${i}`, player: null as null }))
    render(<Triangle hexData={board4} onHexClick={() => {}} />)
    expect(screen.getAllByTestId('hexagon')).toHaveLength(10)
  })

  test('usa tamaño 4 como fallback si hexData está vacío', () => {
    render(<Triangle hexData={[]} onHexClick={() => {}} />)
    // boardSize=4 → 10 hexágonos
    expect(screen.getAllByTestId('hexagon')).toHaveLength(10)
  })

  test('llama a onHexClick con la posición correcta al hacer click', async () => {
    const user = userEvent.setup()
    const onHexClick = vi.fn()
    render(<Triangle hexData={board3} onHexClick={onHexClick} />)

    await user.click(screen.getAllByTestId('hexagon')[0])
    expect(onHexClick).toHaveBeenCalledTimes(1)
    expect(onHexClick).toHaveBeenCalledWith(expect.stringMatching(/\(\d+,\d+,\d+\)/))
  })

  test('los hexágonos ocupados están deshabilitados', () => {
    const boardConJugador = board3.map((h, i) =>
      i === 0 ? { ...h, player: 'j1' as const } : h
    )
    render(<Triangle hexData={boardConJugador} onHexClick={() => {}} />)
    const hexes = screen.getAllByTestId('hexagon')
    expect(hexes[0]).toBeDisabled()
    expect(hexes[1]).not.toBeDisabled()
  })

  test('los hexágonos libres no están deshabilitados', () => {
    render(<Triangle hexData={board3} onHexClick={() => {}} />)
    screen.getAllByTestId('hexagon').forEach(hex => {
      expect(hex).not.toBeDisabled()
    })
  })

  test('el contenedor tiene posición relative', () => {
    const { container } = render(<Triangle hexData={board3} onHexClick={() => {}} />)
    const div = container.querySelector('.triangle-container')
    expect(div).toHaveStyle({ position: 'relative' })
  })

  test('actualiza windowSize cuando ocurre resize', () => {
    render(<Triangle hexData={board3} onHexClick={() => {}} />)

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 400 })

    window.dispatchEvent(new Event('resize'))

    expect(screen.getAllByTestId('hexagon').length).toBeGreaterThan(0)
 })

 test('remueve el listener de resize al desmontar', () => {
  const removeSpy = vi.spyOn(window, 'removeEventListener')

  const { unmount } = render(<Triangle hexData={board3} onHexClick={() => {}} />)

  unmount()

  expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
})

})