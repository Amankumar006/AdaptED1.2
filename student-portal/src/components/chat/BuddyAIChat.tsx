import React, { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { aiAPI } from '../../services/api/aiAPI'
import { ChatMessage, ChatSession, ChatContext } from '../../types'
import { ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { VoiceInput } from './VoiceInput'
import { ImageInput } from './ImageInput'
import { ChatSafety } from './ChatSafety'
import { ConversationHistory } from './ConversationHistory'

interface BuddyAIChatProps {
  initialMessage?: string
  context?: Partial<ChatContext>
  className?: string
  isMobile?: boolean
}

export const BuddyAIChat: React.FC<BuddyAIChatProps> = ({
  initialMessage,
  context,
  className = '',
  isMobile = false
}) => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [session, setSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'image'>('text')
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Initialize chat session
  useEffect(() => {
    initializeSession()
  }, [])

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && session) {
      handleSendMessage(initialMessage)
    }
  }, [initialMessage, session])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const initializeSession = async () => {
    try {
      setIsLoading(true)
      const newSession = await aiAPI.createChatSession(context)
      setSession(newSession)
      setMessages(newSession.messages || [])
      
      // Add welcome message if no existing messages
      if (!newSession.messages || newSession.messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          type: 'assistant',
          content: `Hi ${user?.firstName || 'there'}! I'm BuddyAI, your personal learning assistant. I'm here to help you with your studies, answer questions, and support your learning journey. What would you like to explore today?`,
          timestamp: Date.now(),
          metadata: {
            suggestedActions: [
              { type: 'help', label: 'Get study help', action: 'study_help' },
              { type: 'practice', label: 'Practice problems', action: 'practice' },
              { type: 'lesson', label: 'Find lessons', action: 'find_lessons' },
              { type: 'resource', label: 'Learning resources', action: 'resources' }
            ]
          }
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('Failed to initialize chat session:', error)
      setError('Failed to start chat session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async (
    content: string, 
    attachments?: File[], 
    inputType: 'text' | 'voice' | 'image' = 'text'
  ) => {
    if (!session || !content.trim()) return

    try {
      setIsLoading(true)
      setError(null)

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        type: 'user',
        content,
        timestamp: Date.now(),
        attachments: attachments?.map(file => ({
          type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size
        }))
      }

      setMessages(prev => [...prev, userMessage])
      setIsTyping(true)

      // Send message to AI
      const response = await aiAPI.sendMessage({
        message: content,
        sessionId: session.id,
        context: session.context,
        attachments,
        inputType
      })

      // Update session and add AI response
      setSession(response.session)
      setMessages(prev => [...prev, response.message])

    } catch (error: any) {
      console.error('Failed to send message:', error)
      setError(error.message || 'Failed to send message. Please try again.')
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const handleVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      const audioFile = new File([audioBlob], 'voice_input.wav', { type: 'audio/wav' })
      const transcription = await aiAPI.transcribeAudio(audioFile)
      
      if (transcription.text) {
        await handleSendMessage(transcription.text, undefined, 'voice')
      }
    } catch (error) {
      console.error('Voice input failed:', error)
      setError('Failed to process voice input. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageInput = async (imageFile: File) => {
    try {
      setIsLoading(true)
      const analysis = await aiAPI.analyzeImage(imageFile)
      
      let message = "I've uploaded an image. "
      if (analysis.description) {
        message += `Can you help me understand this: ${analysis.description}`
      }
      if (analysis.text) {
        message += ` The image contains text: "${analysis.text}"`
      }
      
      await handleSendMessage(message, [imageFile], 'image')
    } catch (error) {
      console.error('Image input failed:', error)
      setError('Failed to process image. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedAction = (action: string, data?: any) => {
    switch (action) {
      case 'study_help':
        handleSendMessage("I need help with my studies. Can you assist me?")
        break
      case 'practice':
        handleSendMessage("Can you give me some practice problems?")
        break
      case 'find_lessons':
        handleSendMessage("Help me find relevant lessons for my current studies")
        break
      case 'resources':
        handleSendMessage("What learning resources do you recommend?")
        break
      case 'lesson':
        if (data?.lessonId) {
          handleSendMessage(`Can you help me with lesson: ${data.lessonId}`)
        }
        break
      default:
        handleSendMessage(action)
    }
  }

  const handleRateMessage = async (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    try {
      await aiAPI.rateChatResponse(messageId, rating)
    } catch (error) {
      console.error('Failed to rate message:', error)
    }
  }

  const handleReportContent = async (messageId: string, reason: string) => {
    try {
      await aiAPI.reportInappropriateContent({ messageId, reason })
      setError(null)
      // Show success message
    } catch (error) {
      console.error('Failed to report content:', error)
      setError('Failed to report content. Please try again.')
    }
  }

  const handleEscalateToHuman = async (reason: string) => {
    if (!session) return
    
    try {
      const result = await aiAPI.escalateToHuman({
        sessionId: session.id,
        reason,
        urgency: 'medium'
      })
      
      const escalationMessage: ChatMessage = {
        id: `escalation_${Date.now()}`,
        type: 'system',
        content: `I've connected you with a human teacher. Your ticket ID is ${result.ticketId}. Estimated wait time: ${result.estimatedWaitTime} minutes.`,
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, escalationMessage])
    } catch (error) {
      console.error('Failed to escalate to human:', error)
      setError('Failed to connect with human teacher. Please try again.')
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const clearError = () => setError(null)

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">BuddyAI</h3>
            <p className="text-sm text-green-600">Online • Ready to help</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Input mode selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setInputMode('text')}
              className={`p-2 rounded-md transition-colors ${
                inputMode === 'text' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Text input"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={() => setInputMode('voice')}
              className={`p-2 rounded-md transition-colors ${
                inputMode === 'voice' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Voice input"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button
              onClick={() => setInputMode('image')}
              className={`p-2 rounded-md transition-colors ${
                inputMode === 'image' 
                  ? 'bg-white text-purple-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Image input"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          
          {/* History button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            title="Conversation history"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Chat messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: isMobile ? 'calc(100vh - 200px)' : '500px' }}
      >
        {messages.map((message) => (
          <ChatMessageComponent
            key={message.id}
            message={message}
            onRate={handleRateMessage}
            onReport={handleReportContent}
            onSuggestedAction={handleSuggestedAction}
          />
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">BuddyAI is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        {inputMode === 'text' && (
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask me anything about your studies..."
          />
        )}
        
        {inputMode === 'voice' && (
          <VoiceInput
            onVoiceInput={handleVoiceInput}
            isLoading={isLoading}
          />
        )}
        
        {inputMode === 'image' && (
          <ImageInput
            onImageInput={handleImageInput}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Safety and escalation */}
      <ChatSafety
        onEscalateToHuman={handleEscalateToHuman}
        sessionId={session?.id}
      />

      {/* Conversation history sidebar */}
      {showHistory && (
        <ConversationHistory
          onClose={() => setShowHistory(false)}
          onSelectSession={(_sessionId) => {
            // Load selected session
            setShowHistory(false)
          }}
        />
      )}
    </div>
  )
}