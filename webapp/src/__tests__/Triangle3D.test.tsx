import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Triangle3D from '../components/game/Triangle3D'
import { describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

const tetraBoard = [
  { position: '(2,0,0,0)', player: null as 'j1' | 'j2' | null },
  { position: '(1,1,0,0)', player: 'j1' as const },
  { position: '(1,0,1,0)', player: null as 'j1' | 'j2' | null },
  { position: '(1,0,0,1)', player: null as 'j1' | 'j2' | null },
]

describe('Triangle3D', () => {
  test('renderiza controles, caras y nodos tetraedricos', () => {
    render(<Triangle3D hexData={tetraBoard} onHexClick={() => {}} />)

    expect(screen.getByText('Vista')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cara A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cara D' })).toBeInTheDocument()
    expect(screen.getByText('Cada cara tiene 6 nodos visibles.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Nodo tetraedrico/i })).toHaveLength(4)
    expect(document.querySelectorAll('.tetra-face-label')).toHaveLength(4)
  })

  test('llama a onHexClick cuando pulsas un nodo libre', async () => {
    const user = userEvent.setup()
    const onHexClick = vi.fn()

    render(<Triangle3D hexData={tetraBoard} onHexClick={onHexClick} />)

    await user.click(screen.getByRole('button', { name: 'Nodo tetraedrico (2,0,0,0)' }))

    expect(onHexClick).toHaveBeenCalledTimes(1)
    expect(onHexClick).toHaveBeenCalledWith('(2,0,0,0)')
  })

  test('deshabilita los nodos ocupados', async () => {
    const user = userEvent.setup()
    const onHexClick = vi.fn()

    render(<Triangle3D hexData={tetraBoard} onHexClick={onHexClick} />)

    const occupiedNode = screen.getByRole('button', { name: 'Nodo tetraedrico (1,1,0,0)' })
    expect(occupiedNode).toBeDisabled()

    await user.click(occupiedNode)
    expect(onHexClick).not.toHaveBeenCalled()
  })

  test('renderiza solo los segmentos con nodos existentes', () => {
    render(
      <Triangle3D
        hexData={tetraBoard}
        onHexClick={() => {}}
        connectionEdges={{
          j1: [
            { from: '(2,0,0,0)', to: '(1,0,1,0)' },
            { from: '(missing)', to: '(1,0,0,1)' },
          ],
          j2: [
            { from: '(1,0,0,1)', to: '(1,1,0,0)' },
          ],
        }}
      />
    )

    expect(document.querySelectorAll('.tetra-link-j1')).toHaveLength(1)
    expect(document.querySelectorAll('.tetra-link-j2')).toHaveLength(1)
  })

  test('permite cambiar entre vistas predefinidas y hacer reset', async () => {
    const user = userEvent.setup()

    render(<Triangle3D hexData={tetraBoard} onHexClick={() => {}} />)

    const faceAButton = screen.getByRole('button', { name: 'Cara A' })
    const faceDButton = screen.getByRole('button', { name: 'Cara D' })
    expect(faceAButton).toHaveClass('active')

    await user.click(faceDButton)
    expect(faceDButton).toHaveClass('active')
    expect(faceAButton).not.toHaveClass('active')

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(faceAButton).toHaveClass('active')
  })

  test('los controles de navegacion modifican la orientacion visible', async () => {
    const user = userEvent.setup()

    render(<Triangle3D hexData={tetraBoard} onHexClick={() => {}} />)

    const faceAButton = screen.getByRole('button', { name: 'Cara A' })
    expect(faceAButton).toHaveClass('active')

    await user.click(screen.getByRole('button', { name: 'Girar a la derecha' }))
    expect(faceAButton).not.toHaveClass('active')
  })

  test('arrastrar la escena rota el tablero sin disparar clicks de nodo', () => {
    const onHexClick = vi.fn()
    const { container } = render(<Triangle3D hexData={tetraBoard} onHexClick={onHexClick} />)

    const scene = container.querySelector('.tetra-scene')
    const faceAButton = screen.getByRole('button', { name: 'Cara A' })

    expect(scene).not.toBeNull()
    expect(faceAButton).toHaveClass('active')

    fireEvent.pointerDown(scene as Element, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(scene as Element, { pointerId: 1, clientX: 140, clientY: 120 })
    fireEvent.pointerUp(scene as Element, { pointerId: 1, clientX: 140, clientY: 120 })

    expect(faceAButton).not.toHaveClass('active')
    expect(onHexClick).not.toHaveBeenCalled()
  })
})
