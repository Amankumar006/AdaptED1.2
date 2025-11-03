import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardWidget } from '../DashboardWidget'
import { MobileBuddyAIChat } from '../../chat/MobileBuddyAIChat'

interface BuddyAIWidgetProps {
  id: string
  isLoading?: boolean
  error?: string
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  analytics?: any
  personalizationData?: any
}

export const BuddyAIWidget: React.FC<BuddyAIWidgetProps> = ({
  id,
  isLoading,
  error,
  learningStyle,
  analytics,
  personalizationData,
}) => {
  const navigate = useNavigate()
  const [quickQuestion, setQuickQuestion] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [isMobile] = useState(window.innerWidth < 768)

  const handleQuickChat = () => {
    if (isMobile) {
      setShowMobileChat(true)
    } else {
      if (quickQuestion.trim()) {
        navigate('/chat', { state: { initialMessage: quickQuestion } })
      } else {
        navigate('/chat')
      }
    }
  }

  const suggestedQuestions = [
    "Help me understand this concept",
    "What should I study next?",
    "Explain this topic simply",
    "Give me practice problems",
    "How can I improve my grades?"
  ]

  const renderVisualBuddyAI = () => (
    <div className="space-y-4">
      {/* AI Avatar and Status */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">BuddyAI</h4>
          <p className="text-xs text-green-600">Online • Ready to help</p>
        </div>
      </div>

      {/* Quick Question Input */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={quickQuestion}
          onChange={(e) => setQuickQuestion(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          onKeyPress={(e) => e.key === 'Enter' && handleQuickChat()}
        />
        <button
          onClick={handleQuickChat}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg py-2 text-sm font-medium transition-all duration-200"
        >
          Ask BuddyAI
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Quick suggestions:</p>
        <div className="flex flex-wrap gap-1">
          {suggestedQuestions.slice(0, 3).map((question, index) => (
            <button
              key={index}
              onClick={() => setQuickQuestion(question)}
              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-full transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAuditoryBuddyAI = () => (
    <div className="space-y-4">
      {/* Text-focused interface */}
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-gray-900">BuddyAI Assistant</h4>
        <p className="text-xs text-gray-600">Your 24/7 learning companion</p>
      </div>

      {/* Voice and Text Options */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleQuickChat}
          className="flex flex-col items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-purple-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium text-purple-700">Text Chat</span>
        </button>
        <button
          onClick={handleQuickChat}
          className="flex flex-col items-center p-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-pink-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-xs font-medium text-pink-700">Voice Chat</span>
        </button>
      </div>

      {/* Recent Topics */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Recent help topics:</p>
        <div className="space-y-1">
          {['Mathematics - Algebra', 'Science - Physics', 'History - World War II'].map((topic, index) => (
            <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
              • {topic}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderKinestheticBuddyAI = () => (
    <div className="space-y-4">
      {/* Interactive AI Interface */}
      <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold">BuddyAI</h4>
              <p className="text-xs opacity-90">Ready to learn!</p>
            </div>
          </div>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        <p className="text-xs opacity-90 mb-3">
          "Hi! I'm here to help you learn. What would you like to explore today?"
        </p>
        
        <button
          onClick={handleQuickChat}
          className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg py-2 text-sm font-medium transition-all duration-200 transform hover:scale-105"
        >
          Start Chatting →
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: '📚', label: 'Study Help', action: () => setQuickQuestion('Help me study') },
          { icon: '🧮', label: 'Math Problems', action: () => setQuickQuestion('Give me math problems') },
          { icon: '🔬', label: 'Science Q&A', action: () => setQuickQuestion('Explain science concepts') },
          { icon: '📝', label: 'Essay Help', action: () => setQuickQuestion('Help with essay writing') },
        ].map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className="flex flex-col items-center p-3 bg-white border-2 border-gray-200 hover:border-purple-300 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            <span className="text-lg mb-1">{item.icon}</span>
            <span className="text-xs font-medium text-gray-700">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const renderMixedBuddyAI = () => (
    <div className="space-y-4">
      {/* Balanced interface */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900">BuddyAI</h4>
          <p className="text-xs text-gray-600">Your AI learning assistant</p>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      </div>

      {/* Quick Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Ask a quick question..."
          value={quickQuestion}
          onChange={(e) => setQuickQuestion(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          onKeyPress={(e) => e.key === 'Enter' && handleQuickChat()}
        />
        <button
          onClick={handleQuickChat}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Ask
        </button>
      </div>

      {/* Popular Topics */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Popular topics:</p>
        <div className="grid grid-cols-2 gap-1">
          {['Math Help', 'Science Q&A', 'Study Tips', 'Essay Writing'].map((topic, index) => (
            <button
              key={index}
              onClick={() => setQuickQuestion(`Help me with ${topic.toLowerCase()}`)}
              className="text-xs bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-2 py-1 rounded transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Full Chat Button */}
      <button
        onClick={handleQuickChat}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg py-2 text-sm font-medium transition-all duration-200"
      >
        Open Full Chat
      </button>
    </div>
  )

  const renderBuddyAIContent = () => {
    switch (learningStyle) {
      case 'visual':
        return renderVisualBuddyAI()
      case 'auditory':
        return renderAuditoryBuddyAI()
      case 'kinesthetic':
        return renderKinestheticBuddyAI()
      case 'mixed':
      default:
        return renderMixedBuddyAI()
    }
  }

  return (
    <>
      <DashboardWidget
        id={id}
        title="BuddyAI Assistant"
        isLoading={isLoading}
        error={error}
      >
        {renderBuddyAIContent()}
      </DashboardWidget>
      
      {/* Mobile chat overlay */}
      {showMobileChat && (
        <MobileBuddyAIChat
          initialMessage={quickQuestion.trim() || undefined}
          onClose={() => {
            setShowMobileChat(false)
            setQuickQuestion('')
          }}
        />
      )}
    </>
  )
}