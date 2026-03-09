import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Hexagon from '../components/game/Hexagon'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

const defaultProps = {
    width: 50,
    height: 50,
    left: 10,
    top: 20,
    position: '(2,0,0)',
    player: null as "j1" | "j2" | null,
    onClick: vi.fn(),
}

describe('Hexagon', () => {

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('renderiza un botón', () => {
        render(<Hexagon {...defaultProps} />)
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    test('tiene el atributo data-position correcto', () => {
        render(<Hexagon {...defaultProps} />)
        expect(screen.getByRole('button')).toHaveAttribute('data-position', '(2,0,0)')
    })

    test('aplica la clase hex-cell', () => {
        render(<Hexagon {...defaultProps} />)
        expect(screen.getByRole('button')).toHaveClass('hex-cell')
    })

    test('aplica la clase j1 cuando player es j1', () => {
        render(<Hexagon {...defaultProps} player="j1" />)
        expect(screen.getByRole('button')).toHaveClass('j1')
    })

    test('aplica la clase j2 cuando player es j2', () => {
        render(<Hexagon {...defaultProps} player="j2" />)
        expect(screen.getByRole('button')).toHaveClass('j2')
    })

    test('no aplica clase de jugador cuando player es null', () => {
        render(<Hexagon {...defaultProps} player={null} />)
        const btn = screen.getByRole('button')
        expect(btn).not.toHaveClass('j1')
        expect(btn).not.toHaveClass('j2')
    })

    test('está deshabilitado si player no es null', () => {
        render(<Hexagon {...defaultProps} player="j1" />)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    test('no está deshabilitado si player es null', () => {
        render(<Hexagon {...defaultProps} player={null} />)
        expect(screen.getByRole('button')).not.toBeDisabled()
    })

    test('llama a onClick al hacer click', async () => {
        const user = userEvent.setup()
        const onClick = vi.fn()
        render(<Hexagon {...defaultProps} onClick={onClick} />)
        await user.click(screen.getByRole('button'))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    test('no llama a onClick si está deshabilitado', async () => {
        const user = userEvent.setup()
        const onClick = vi.fn()
        render(<Hexagon {...defaultProps} player="j2" onClick={onClick} />)
        await user.click(screen.getByRole('button'))
        expect(onClick).not.toHaveBeenCalled()
    })

    test('aplica los estilos de posición y tamaño correctamente', () => {
        render(<Hexagon {...defaultProps} />)
        expect(screen.getByRole('button')).toHaveStyle({
            width: '50px',
            height: '50px',
            left: '10px',
            top: '20px',
            position: 'absolute',
        })
    })
})