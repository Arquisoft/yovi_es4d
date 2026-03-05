import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, test, expect, vi } from 'vitest'
import Typing from '../components/Typing'

describe('Typing', () => {

  test('types text progressively', () => {
    vi.useFakeTimers()

    render(<Typing text="Hola" speed={50} tag="h2" />)

    const element = screen.getByRole('heading')

    expect(element.textContent).toBe('')

    act(() => {
      vi.advanceTimersByTime(50)
    })

    expect(element.textContent).toContain('H')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(element.textContent).toContain('Ho')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(element.textContent).toContain('Hol')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(element.textContent).toContain('Hola')


    vi.useRealTimers()
  })


  test('renders the correct HTML tag', () => {
    render(<Typing text="Hola" tag="h1" />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })


  test('applies custom className', () => {
    render(<Typing text="Hola" className="mi-clase" />)

    const element = screen.getByRole('heading')
    expect(element).toHaveClass('mi-clase')
  })


  test('has aria-live polite for accessibility', () => {
    render(<Typing text="Hola" />)

    const element = screen.getByRole('heading')
    expect(element).toHaveAttribute('aria-live', 'polite')
  })


  test('renders typing cursor', () => {
    const { container } = render(<Typing text="Hola" />)

    const cursor = container.querySelector('.typing-cursor')
    expect(cursor).toBeInTheDocument()
  })

})