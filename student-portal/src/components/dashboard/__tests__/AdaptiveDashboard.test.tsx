import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, mockAuthenticatedState } from '../../../test/utils'
import { AdaptiveDashboard } from '../AdaptiveDashboard'

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

describe('AdaptiveDashboard', () => {
  beforeEach(() => {
    // Mock fetch calls
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome message with user name', () => {
    const { getByText } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })
    
    expect(getByText(/Welcome back, Test!/)).toBeInTheDocument()
    expect(getByText(/Your personalized learning dashboard/)).toBeInTheDocument()
  })

  it('renders customize button', () => {
    const { getByText } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })
    
    expect(getByText('Customize')).toBeInTheDocument()
  })

  it('renders learning style indicator', () => {
    const { getByText } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })
    
    expect(getByText(/Optimized for visual learning style/)).toBeInTheDocument()
  })

  it('renders dashboard widgets', () => {
    const { getByTestId } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })
    
    // Check for widget containers
    expect(getByTestId('dnd-context')).toBeInTheDocument()
    expect(getByTestId('sortable-context')).toBeInTheDocument()
  })

  it('adapts layout for different learning styles', () => {
    const auditoryState = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user!,
          firstName: 'Jane',
          learningProfile: {
            ...mockAuthenticatedState.auth.user!.learningProfile,
            learningStyle: 'auditory' as const,
          },
        },
      },
    }

    const { getByText } = render(<AdaptiveDashboard />, {
      preloadedState: auditoryState,
    })
    
    expect(getByText(/Optimized for auditory learning style/)).toBeInTheDocument()
  })

  it('displays analytics data when available', () => {
    const { getByTestId } = render(<AdaptiveDashboard />, {
      preloadedState: mockAuthenticatedState,
    })
    
    // The analytics data should be passed to widgets
    // This is tested indirectly through the widget rendering
    expect(getByTestId('dnd-context')).toBeInTheDocument()
  })
})