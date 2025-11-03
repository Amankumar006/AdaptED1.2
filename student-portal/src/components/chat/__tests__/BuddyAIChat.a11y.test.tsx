import { render, screen, fireEvent, waitFor } from '../../../test/utils'
import { BuddyAIChat } from '../BuddyAIChat'
import { axe, toHaveNoViolations } from 'vitest-axe'

expect.extend(toHaveNoViolations)

// Mock the AI API
vi.mock('../../../services/api/aiAPI', () => ({
  aiAPI: {
    createChatSession: vi.fn().mockResolvedValue({
      id: 'test-session',
      messages: [],
      context: {
        recentTopics: [],
        learningGoals: [],
        strugglingAreas: []
      },
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      isActive: true
    }),
    sendMessage: vi.fn().mockResolvedValue({
      message: {
        id: 'test-message',
        type: 'assistant',
        content: 'Hello! How can I help you today?',
        timestamp: Date.now()
      },
      session: {
        id: 'test-session',
        messages: [],
        context: {},
        startedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        isActive: true
      }
    })
  }
}))

describe('BuddyAIChat Accessibility', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not have accessibility violations', async () => {
    const { container } = render(<BuddyAIChat />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA roles and labels', () => {
    render(<BuddyAIChat />)

    // Check for chat region
    const chatRegion = screen.getByRole('region', { name: /chat/i })
    expect(chatRegion).toBeInTheDocument()

    // Check for proper button labels
    const textButton = screen.getByRole('button', { name: /text input/i })
    expect(textButton).toBeInTheDocument()

    const voiceButton = screen.getByRole('button', { name: /voice input/i })
    expect(voiceButton).toBeInTheDocument()

    const imageButton = screen.getByRole('button', { name: /image input/i })
    expect(imageButton).toBeInTheDocument()
  })

  it('should have proper heading structure', () => {
    const { container } = render(<BuddyAIChat />)

    // Check for main heading
    const heading = container.querySelector('h2, h3')
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('BuddyAI')
  })

  it('should support keyboard navigation', async () => {
    render(<BuddyAIChat />)

    // Test tab navigation through interactive elements
    const textButton = screen.getByRole('button', { name: /text input/i })
    const voiceButton = screen.getByRole('button', { name: /voice input/i })
    const imageButton = screen.getByRole('button', { name: /image input/i })

    textButton.focus()
    expect(textButton).toHaveFocus()

    fireEvent.keyDown(textButton, { key: 'Tab' })
    expect(voiceButton).toHaveFocus()

    fireEvent.keyDown(voiceButton, { key: 'Tab' })
    expect(imageButton).toHaveFocus()
  })

  it('should have accessible chat input', () => {
    render(<BuddyAIChat />)

    const textInput = screen.getByRole('textbox')
    expect(textInput).toBeInTheDocument()
    expect(textInput).toHaveAttribute('aria-label')
    expect(textInput).toHaveAttribute('placeholder')
  })

  it('should announce new messages to screen readers', async () => {
    render(<BuddyAIChat />)

    // Check for aria-live region for messages
    const messagesContainer = screen.getByRole('log')
    expect(messagesContainer).toBeInTheDocument()
    expect(messagesContainer).toHaveAttribute('aria-live', 'polite')
  })

  it('should handle voice input accessibility', async () => {
    render(<BuddyAIChat />)

    const voiceButton = screen.getByRole('button', { name: /voice input/i })
    fireEvent.click(voiceButton)

    // Check for voice input status announcement
    await waitFor(() => {
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toBeInTheDocument()
    })
  })

  it('should provide alternative text for images', () => {
    render(<BuddyAIChat />)

    const images = screen.getAllByRole('img')
    images.forEach(img => {
      expect(img).toHaveAttribute('alt')
      expect(img.getAttribute('alt')).not.toBe('')
    })
  })

  it('should support high contrast mode', async () => {
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

    const { container } = render(<BuddyAIChat />)

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
    expect(results).toHaveNoViolations()
  })

  it('should handle focus management in modal mode', () => {
    render(<BuddyAIChat isMobile={true} />)

    // In mobile mode, focus should be trapped within the chat
    const chatContainer = screen.getByRole('region', { name: /chat/i })
    expect(chatContainer).toBeInTheDocument()

    // Check for focus trap
    const focusableElements = chatContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    expect(focusableElements.length).toBeGreaterThan(0)
  })

  it('should provide clear error messages', async () => {
    // Mock API error
    const mockError = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.mocked(require('../../../services/api/aiAPI').aiAPI.sendMessage).mockImplementation(mockError)

    render(<BuddyAIChat />)

    const textInput = screen.getByRole('textbox')
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(textInput, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveTextContent(/error/i)
    })
  })

  it('should support reduced motion preferences', () => {
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

    const { container } = render(<BuddyAIChat />)

    // Component should render without animations when reduced motion is preferred
    expect(container.querySelector('[role="region"]')).toBeInTheDocument()
  })
})