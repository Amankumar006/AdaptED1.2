import { render, screen, fireEvent } from '../../../test/utils'
import { PracticeSession } from '../PracticeSession'
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

const mockProps = {
  sessionId: 'session-1',
  subject: 'math',
  difficulty: 'medium' as const,
  onComplete: vi.fn(),
  onExit: vi.fn(),
}

describe('PracticeSession Accessibility', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<PracticeSession {...mockProps} />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper heading structure', () => {
    render(<PracticeSession {...mockProps} />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent(/practice session/i)
  })

  it('should have accessible form controls', () => {
    render(<PracticeSession {...mockProps} />)

    // Check for proper labels
    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      expect(input).toHaveAttribute('aria-label')
    })

    // Check for submit button
    const submitButton = screen.getByRole('button', { name: /submit/i })
    expect(submitButton).toBeInTheDocument()
  })

  it('should provide feedback in accessible way', async () => {
    render(<PracticeSession {...mockProps} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /submit/i })

    fireEvent.change(input, { target: { value: '42' } })
    fireEvent.click(submitButton)

    // Check for feedback region
    const feedback = await screen.findByRole('status')
    expect(feedback).toBeInTheDocument()
  })

  it('should support keyboard navigation', () => {
    render(<PracticeSession {...mockProps} />)

    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /submit/i })

    input.focus()
    expect(input).toHaveFocus()

    fireEvent.keyDown(input, { key: 'Tab' })
    expect(submitButton).toHaveFocus()
  })

  it('should announce progress to screen readers', () => {
    render(<PracticeSession {...mockProps} />)

    const progressRegion = screen.getByRole('progressbar')
    expect(progressRegion).toBeInTheDocument()
    expect(progressRegion).toHaveAttribute('aria-label')
  })

  it('should handle timer accessibility', () => {
    render(<PracticeSession {...mockProps} />)

    const timer = screen.getByRole('timer')
    expect(timer).toBeInTheDocument()
    expect(timer).toHaveAttribute('aria-live', 'polite')
  })
})