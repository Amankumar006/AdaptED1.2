import React, { useState } from 'react'
import { ChatMessage } from '../../types'
import { aiAPI } from '../../services/api/aiAPI'

interface ChatMessageProps {
  message: ChatMessage
  onRate?: (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => void
  onReport?: (messageId: string, reason: string) => void
  onSuggestedAction?: (action: string, data?: any) => void
}

export const ChatMessageComponent: React.FC<ChatMessageProps> = ({
  message,
  onRate,
  onReport,
  onSuggestedAction
}) => {
  const [showActions, setShowActions] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const isUser = message.type === 'user'
  const isSystem = message.type === 'system'

  const handleRate = (newRating: number) => {
    setRating(newRating)
    onRate?.(message.id, newRating as 1 | 2 | 3 | 4 | 5)
  }

  const handleReport = (reason: string) => {
    onReport?.(message.id, reason)
    setShowReportDialog(false)
  }

  const handlePlayAudio = async () => {
    if (isPlayingAudio || isUser || isSystem) return

    try {
      setIsPlayingAudio(true)
      
      if (!audioUrl) {
        const audioBlob = await aiAPI.synthesizeSpeech(message.content, {
          voice: 'neutral',
          speed: 1.0
        })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        const audio = new Audio(url)
        audio.onended = () => setIsPlayingAudio(false)
        await audio.play()
      } else {
        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlayingAudio(false)
        await audio.play()
      }
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsPlayingAudio(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null

    return (
      <div className="mt-2 space-y-2">
        {message.attachments.map((attachment, index) => (
          <div key={index} className="flex items-center space-x-2">
            {attachment.type === 'image' && (
              <div className="relative">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-xs max-h-48 rounded-lg object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {attachment.name}
                </div>
              </div>
            )}
            {attachment.type === 'audio' && (
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm text-gray-700">{attachment.name}</span>
                <audio controls className="h-8">
                  <source src={attachment.url} type="audio/wav" />
                </audio>
              </div>
            )}
            {attachment.type === 'file' && (
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700">{attachment.name}</span>
                <span className="text-xs text-gray-500">
                  ({Math.round(attachment.size / 1024)}KB)
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderSuggestedActions = () => {
    if (!message.metadata?.suggestedActions || message.metadata.suggestedActions.length === 0) {
      return null
    }

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {message.metadata.suggestedActions.map((action, index) => (
          <button
            key={index}
            onClick={() => onSuggestedAction?.(action.action, action.data)}
            className="inline-flex items-center px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded-full transition-colors"
          >
            {action.type === 'lesson' && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            )}
            {action.type === 'practice' && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            )}
            {action.type === 'help' && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {action.type === 'resource' && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isSystem ? 'justify-center' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`relative px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-purple-600 text-white'
              : isSystem
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Attachments */}
          {renderAttachments()}

          {/* Suggested actions */}
          {!isUser && renderSuggestedActions()}

          {/* Timestamp */}
          <div
            className={`text-xs mt-1 ${
              isUser ? 'text-purple-200' : isSystem ? 'text-yellow-600' : 'text-gray-500'
            }`}
          >
            {formatTimestamp(message.timestamp)}
          </div>
        </div>

        {/* Message actions */}
        {showActions && !isUser && !isSystem && (
          <div className="flex items-center space-x-2 mt-2 ml-2">
            {/* Play audio button */}
            <button
              onClick={handlePlayAudio}
              disabled={isPlayingAudio}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Play audio"
            >
              {isPlayingAudio ? (
                <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M8.586 8.586A2 2 0 018 10v4a2 2 0 00.586 1.414L10 17h4a2 2 0 001.414-.586l1.414-1.414A2 2 0 0017 14v-4a2 2 0 00-.586-1.414L15 7h-4a2 2 0 00-1.414.586z" />
                </svg>
              )}
            </button>

            {/* Rating buttons */}
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  className={`p-1 transition-colors ${
                    rating && star <= rating
                      ? 'text-yellow-500'
                      : 'text-gray-300 hover:text-yellow-400'
                  }`}
                  title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Report button */}
            <button
              onClick={() => setShowReportDialog(true)}
              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="Report inappropriate content"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          </div>
        )}

        {/* Report dialog */}
        {showReportDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Report Inappropriate Content
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please select the reason for reporting this message:
              </p>
              <div className="space-y-2">
                {[
                  'Inappropriate language',
                  'Harmful content',
                  'Incorrect information',
                  'Spam or irrelevant',
                  'Other safety concern'
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleReport(reason)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      {!isUser && !isSystem && (
        <div className="order-1 mr-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}