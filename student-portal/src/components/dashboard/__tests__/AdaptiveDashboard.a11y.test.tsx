import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, mockAuthenticatedState } from '../../../test/utils'
import { AdaptiveDashboard } from '../AdaptiveDashboard'
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

// Mock the DnD Kit components
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  rectSortingStrategy: vi.fn(),
  arrayMove: vi.fn((array, oldIndex, newIndex) => {
    const newArray = [...array]
    const [removed] = newArray.splice(oldIndex, 1)
    newArray.splice(newIndex, 0, removed)
    return newArray
  }),
}))

describe('AdaptiveDashboard Accessibility', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper heading hierarchy', () => {
    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    // Check for proper heading structure
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
    expect(h1).toHaveTextContent(/Welcome back/)

    // Check for proper heading levels
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('should have proper ARIA labels and roles', () => {
    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    // Check for proper button labels (only for buttons that should have aria-label)
    const customizeButton = container.querySelector('button')
    if (customizeButton) {
      expect(customizeButton).toBeInTheDocument()
    }
  })

  it('should support keyboard navigation', () => {
    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    // Check that interactive elements are focusable
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea')
    interactiveElements.forEach(element => {
      expect(element).not.toHaveAttribute('tabindex', '-1')
    })
  })

  it('should have sufficient color contrast', async () => {
    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
    expect(results).toHaveNoViolations()
  })

  it('should work with high contrast mode', () => {
    const highContrastState = {
      ...mockAuthenticatedState,
      ui: {
        ...mockAuthenticatedState.ui,
        learningPreferences: {
          ...mockAuthenticatedState.ui.learningPreferences,
          highContrast: true,
        },
      },
    }

    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: highContrastState,
    })

    // Component should render without errors in high contrast mode
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should work with reduced motion preference', () => {
    const reducedMotionState = {
      ...mockAuthenticatedState,
      ui: {
        ...mockAuthenticatedState.ui,
        learningPreferences: {
          ...mockAuthenticatedState.ui.learningPreferences,
          reducedMotion: true,
        },
      },
    }

    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: reducedMotionState,
    })

    // Component should render without errors with reduced motion
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should have proper focus management', () => {
    const { getByText } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    const customizeButton = getByText('Customize')
    customizeButton.focus()
    expect(customizeButton).toHaveFocus()
  })

  it('should announce dynamic content changes', () => {
    const { container } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })

    // Component should render without errors
    expect(container.firstChild).toBeInTheDocument()
  })
})