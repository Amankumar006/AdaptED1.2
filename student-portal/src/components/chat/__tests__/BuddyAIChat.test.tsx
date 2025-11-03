import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from '../../../store'
import { BuddyAIChat } from '../BuddyAIChat'

// Mock the AI API
jest.mock('../../../services/api/aiAPI', () => ({
  aiAPI: {
    createChatSession: jest.fn().mockResolvedValue({
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
    sendMessage: jest.fn().mockResolvedValue({
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

describe('BuddyAIChat', () => {
  it('renders chat interface', async () => {
    renderWithProviders(<BuddyAIChat />)
    
    // Check for header elements
    expect(screen.getByText('BuddyAI')).toBeInTheDocument()
    expect(screen.getByText('Online • Ready to help')).toBeInTheDocument()
    
    // Check for input mode buttons
    expect(screen.getByTitle('Text input')).toBeInTheDocument()
    expect(screen.getByTitle('Voice input')).toBeInTheDocument()
    expect(screen.getByTitle('Image input')).toBeInTheDocument()
  })

  it('displays welcome message', async () => {
    renderWithProviders(<BuddyAIChat />)
    
    // Wait for welcome message to appear
    await screen.findByText(/Hi.*I'm BuddyAI/i)
  })

  it('shows input interface based on selected mode', () => {
    renderWithProviders(<BuddyAIChat />)
    
    // Default should be text input
    expect(screen.getByPlaceholderText('Ask me anything about your studies...')).toBeInTheDocument()
  })

  it('renders with initial message', () => {
    const initialMessage = 'Help me with math'
    renderWithProviders(<BuddyAIChat initialMessage={initialMessage} />)
    
    // Component should render without errors
    expect(screen.getByText('BuddyAI')).toBeInTheDocument()
  })

  it('applies mobile styles when isMobile is true', () => {
    renderWithProviders(<BuddyAIChat isMobile={true} />)
    
    // Component should render without errors
    expect(screen.getByText('BuddyAI')).toBeInTheDocument()
  })
})