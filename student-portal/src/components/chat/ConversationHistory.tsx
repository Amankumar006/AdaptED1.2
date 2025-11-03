import React, { useState, useEffect } from 'react'
import { aiAPI } from '../../services/api/aiAPI'
import { ChatSession } from '../../types'

interface ConversationHistoryProps {
  onClose: () => void
  onSelectSession: (sessionId: string) => void
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onClose,
  onSelectSession
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'recent'>('all')

  useEffect(() => {
    loadSessions()
  }, [filter])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await aiAPI.getChatSessions({
        page: 1,
        limit: 50,
        active: filter === 'active' ? true : undefined
      })
      
      let filteredSessions = response.sessions
      
      if (filter === 'recent') {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        filteredSessions = filteredSessions.filter(
          session => new Date(session.lastMessageAt).getTime() > oneWeekAgo
        )
      }
      
      setSessions(filteredSessions)
    } catch (error: any) {
      console.error('Failed to load chat sessions:', error)
      setError('Failed to load conversation history. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }

    try {
      await aiAPI.deleteChatSession(sessionId)
      setSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (error) {
      console.error('Failed to delete session:', error)
      setError('Failed to delete conversation. Please try again.')
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const hasMatchingMessage = session.messages.some(message =>
      message.content.toLowerCase().includes(query)
    )
    
    return hasMatchingMessage ||
           session.context.currentLesson?.toLowerCase().includes(query) ||
           session.context.recentTopics.some(topic => 
             topic.toLowerCase().includes(query)
           )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const getSessionPreview = (session: ChatSession) => {
    const lastUserMessage = session.messages
      .filter(msg => msg.type === 'user')
      .pop()
    
    return lastUserMessage?.content || 'New conversation'
  }

  const getSessionTitle = (session: ChatSession) => {
    if (session.context.currentLesson) {
      return `Lesson: ${session.context.currentLesson}`
    }
    
    if (session.context.recentTopics.length > 0) {
      return session.context.recentTopics[0]
    }
    
    const firstUserMessage = session.messages.find(msg => msg.type === 'user')
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
    }
    
    return 'Chat Session'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Conversation History</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'recent', label: 'Recent' },
              { key: 'active', label: 'Active' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadSessions}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-600 mb-2">No conversations found</p>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try adjusting your search terms' : 'Start chatting with BuddyAI to see your conversation history here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {getSessionTitle(session)}
                        </h3>
                        {session.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {getSessionPreview(session)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatDate(session.lastMessageAt)}</span>
                        <span>{session.messages.length} messages</span>
                        {session.context.recentTopics.length > 0 && (
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span>{session.context.recentTopics.slice(0, 2).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete conversation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Conversations are automatically saved and synced across devices
            </span>
            <button
              onClick={loadSessions}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}