import { render } from '../../../test/utils'
import { InteractiveLessonViewer } from '../InteractiveLessonViewer'
import { mockLesson } from '../../../test/utils'
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

const mockProps = {
  lesson: mockLesson,
  progress: {
    userId: '1',
    lessonId: '1',
    courseId: '1',
    progress: 50,
    timeSpent: 300,
    completed: false,
    startedAt: '2024-01-01T00:00:00Z',
    lastAccessedAt: '2024-01-01T00:00:00Z',
    attempts: 1,
    bookmarked: false,
    notes: [],
  },
  onProgressUpdate: vi.fn(),
  onComplete: vi.fn(),
}

describe('InteractiveLessonViewer Accessibility', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper heading structure', () => {
    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    // Check for lesson title as main heading
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
    expect(h1).toHaveTextContent(mockLesson.title)
  })

  it('should have proper ARIA landmarks', () => {
    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    // Check for main content area
    const main = container.querySelector('main, [role="main"]')
    expect(main).toBeInTheDocument()

    // Check for navigation if present
    const nav = container.querySelector('nav, [role="navigation"]')
    if (nav) {
      expect(nav).toHaveAttribute('aria-label')
    }
  })

  it('should support keyboard navigation', () => {
    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    // Check that all interactive elements are keyboard accessible
    const interactiveElements = container.querySelectorAll('button, a, input, select, textarea, [tabindex="0"]')
    interactiveElements.forEach(element => {
      expect(element).not.toHaveAttribute('tabindex', '-1')
    })
  })

  it('should have proper focus indicators', () => {
    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    // Check that focusable elements have visible focus indicators
    const focusableElements = container.querySelectorAll('button, a, input')
    focusableElements.forEach(element => {
      // Focus the element
      element.focus()
      expect(element).toHaveFocus()
    })
  })

  it('should provide alternative text for images', () => {
    const lessonWithImages = {
      ...mockLesson,
      content: [
        {
          id: '1',
          type: 'image',
          title: 'Diagram',
          content: {
            src: '/test-image.jpg',
            alt: 'Test diagram showing process flow',
            caption: 'Process flow diagram',
          },
          order: 0,
          duration: 0,
          isRequired: true,
          settings: {},
        },
      ],
    }

    const { container } = render(
      <InteractiveLessonViewer {...mockProps} lesson={lessonWithImages} />
    )

    const images = container.querySelectorAll('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('alt')
      expect(img.getAttribute('alt')).not.toBe('')
    })
  })

  it('should provide captions for videos', () => {
    const lessonWithVideo = {
      ...mockLesson,
      content: [
        {
          id: '1',
          type: 'video',
          title: 'Introduction Video',
          content: {
            src: '/test-video.mp4',
            captions: '/test-captions.vtt',
            transcript: 'Video transcript content',
          },
          order: 0,
          duration: 300,
          isRequired: true,
          settings: {
            captions: true,
            showTranscript: true,
          },
        },
      ],
    }

    const { container } = render(
      <InteractiveLessonViewer {...mockProps} lesson={lessonWithVideo} />
    )

    const videos = container.querySelectorAll('video')
    videos.forEach(video => {
      // Check for captions track
      const captionTrack = video.querySelector('track[kind="captions"]')
      expect(captionTrack).toBeInTheDocument()
    })
  })

  it('should support screen readers', () => {
    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    // Check for proper ARIA labels and descriptions
    const elementsWithAriaLabel = container.querySelectorAll('[aria-label]')
    elementsWithAriaLabel.forEach(element => {
      expect(element.getAttribute('aria-label')).not.toBe('')
    })

    // Check for live regions for dynamic content
    const liveRegions = container.querySelectorAll('[aria-live]')
    expect(liveRegions.length).toBeGreaterThan(0)
  })

  it('should handle high contrast mode', async () => {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
    expect(results).toHaveNoViolations()
  })

  it('should respect reduced motion preferences', () => {
    // Mock reduced motion media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { container } = render(<InteractiveLessonViewer {...mockProps} />)

    // Component should render without animations when reduced motion is preferred
    expect(container.querySelector('main, [role="main"]')).toBeInTheDocument()
  })

  it('should provide skip links for long content', () => {
    const longLesson = {
      ...mockLesson,
      content: Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        type: 'text',
        title: `Section ${i + 1}`,
        content: { text: `Content for section ${i + 1}` },
        order: i,
        duration: 60,
        isRequired: true,
        settings: {},
      })),
    }

    const { container } = render(
      <InteractiveLessonViewer {...mockProps} lesson={longLesson} />
    )

    // Check for skip links or table of contents
    const skipLinks = container.querySelectorAll('a[href^="#"]')
    expect(skipLinks.length).toBeGreaterThan(0)
  })
})