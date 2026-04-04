import { render, screen } from '@testing-library/react'
import Jugador from '../components/game/player'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

const defaultProps = {
    name: 'Jugador',
    imgSrc: 'logo.png',
    points: 0,
}

describe('Jugador', () => {

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // ── Renderizado básico ───────────────────────────────────
    test('muestra el nombre del jugador', () => {
        render(<Jugador {...defaultProps} />)
        expect(screen.getByText('Jugador')).toBeInTheDocument()
    })

    test('muestra el score formateado con 4 dígitos', () => {
        render(<Jugador {...defaultProps} points={42} />)
        expect(screen.getByText('0042')).toBeInTheDocument()
    })

    test('muestra 0000 cuando los puntos son 0', () => {
        render(<Jugador {...defaultProps} points={0} />)
        expect(screen.getByText('0000')).toBeInTheDocument()
    })

    test('muestra la etiqueta Score', () => {
        render(<Jugador {...defaultProps} />)
        expect(screen.getByText('Score')).toBeInTheDocument()
    })

    test('renderiza la imagen con el alt correcto', () => {
        render(<Jugador {...defaultProps} />)
        expect(screen.getByAltText('Jugador')).toBeInTheDocument()
    })

    // ── Estado activo ────────────────────────────────────────
    test('aplica la clase active-j1 cuando isActive y color violet', () => {
        const { container } = render(<Jugador {...defaultProps} isActive={true} color="violet" />)
        expect(container.firstChild).toHaveClass('active-j1')
    })

    test('aplica la clase active-j2 cuando isActive y color coral', () => {
        const { container } = render(<Jugador {...defaultProps} isActive={true} color="coral" />)
        expect(container.firstChild).toHaveClass('active-j2')
    })

    test('no aplica clase active cuando isActive es false', () => {
        const { container } = render(<Jugador {...defaultProps} isActive={false} />)
        expect(container.firstChild).not.toHaveClass('active-j1')
        expect(container.firstChild).not.toHaveClass('active-j2')
    })

    test('muestra el punto indicador cuando isActive es true', () => {
        const { container } = render(<Jugador {...defaultProps} isActive={true} />)
        expect(container.querySelector('.player-active-dot')).toBeInTheDocument()
    })

    test('no muestra el punto indicador cuando isActive es false', () => {
        const { container } = render(<Jugador {...defaultProps} isActive={false} />)
        expect(container.querySelector('.player-active-dot')).not.toBeInTheDocument()
    })

    // ── Estado pensando ──────────────────────────────────────
    test('muestra los puntos de pensando cuando isPlaying es true', () => {
        const { container } = render(<Jugador {...defaultProps} isPlaying={true} />)
        expect(container.querySelector('.player-thinking')).toBeInTheDocument()
        expect(container.querySelectorAll('.thinking-dot')).toHaveLength(3)
    })

    test('no muestra los puntos de pensando cuando isPlaying es false', () => {
        const { container } = render(<Jugador {...defaultProps} isPlaying={false} />)
        expect(container.querySelector('.player-thinking')).not.toBeInTheDocument()
    })


    test('los puntos de pensando usan color coral cuando el jugador es coral', () => {
        const { container } = render(
            <Jugador {...defaultProps} isPlaying={true} color="coral" />
        )

        const dots = container.querySelectorAll('.thinking-dot')
        expect(dots).toHaveLength(3)

        dots.forEach(dot => {
            expect(dot).toHaveStyle('background: var(--coral)')
        })
    })


})