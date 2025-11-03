import React, { useEffect, useState } from 'react'
import { LessonContent } from '../../../types'

interface TextContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

export const TextContent: React.FC<TextContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const [fontSize, setFontSize] = useState('text-base')
  const [isReading, setIsReading] = useState(false)
  const [readingPosition, setReadingPosition] = useState(0)
  
  useEffect(() => {
    // Track reading time
    const timer = setTimeout(() => {
      onInteraction()
    }, 10000) // Track after 10 seconds of reading
    
    return () => clearTimeout(timer)
  }, [onInteraction])
  
  const handleTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isReading) {
        speechSynthesis.cancel()
        setIsReading(false)
      } else {
        const utterance = new SpeechSynthesisUtterance(content.content.text)
        utterance.onstart = () => setIsReading(true)
        utterance.onend = () => setIsReading(false)
        utterance.onerror = () => setIsReading(false)
        
        // Highlight text as it's being read
        utterance.onboundary = (event) => {
          setReadingPosition(event.charIndex)
        }
        
        speechSynthesis.speak(utterance)
      }
    }
  }
  
  const adjustFontSize = (direction: 'increase' | 'decrease') => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl']
    const currentIndex = sizes.indexOf(fontSize)
    
    if (direction === 'increase' && currentIndex < sizes.length - 1) {
      setFontSize(sizes[currentIndex + 1])
    } else if (direction === 'decrease' && currentIndex > 0) {
      setFontSize(sizes[currentIndex - 1])
    }
  }
  
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'presentation':
        return 'text-center text-xl leading-relaxed max-w-4xl mx-auto'
      case 'immersive':
        return 'text-lg leading-loose max-w-3xl mx-auto bg-gradient-to-b from-blue-50 to-white p-8 rounded-xl'
      default:
        return 'max-w-4xl mx-auto'
    }
  }
  
  const renderTextWithHighlight = (text: string) => {
    if (!isReading || readingPosition === 0) {
      return text
    }
    
    const beforeHighlight = text.substring(0, readingPosition)
    const highlighted = text.substring(readingPosition, readingPosition + 50)
    const afterHighlight = text.substring(readingPosition + 50)
    
    return (
      <>
        {beforeHighlight}
        <span className="bg-yellow-200 px-1 rounded">{highlighted}</span>
        {afterHighlight}
      </>
    )
  }
  
  return (
    <div className={`text-content p-6 ${getViewModeClasses()}`}>
      {/* Accessibility Controls */}
      {accessibilityMode && (
        <div className="accessibility-controls mb-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Font Size:</span>
            <button
              onClick={() => adjustFontSize('decrease')}
              className="btn btn-sm btn-ghost"
              aria-label="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={() => adjustFontSize('increase')}
              className="btn btn-sm btn-ghost"
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
          
          <button
            onClick={handleTextToSpeech}
            className={`btn btn-sm ${isReading ? 'btn-secondary' : 'btn-primary'}`}
            aria-label={isReading ? 'Stop reading' : 'Read aloud'}
          >
            {isReading ? '⏸️ Stop' : '🔊 Read Aloud'}
          </button>
        </div>
      )}
      
      {/* Content Title */}
      {content.title && (
        <h2 className={`font-bold mb-6 ${viewMode === 'presentation' ? 'text-3xl' : 'text-2xl'}`}>
          {content.title}
        </h2>
      )}
      
      {/* Main Text Content */}
      <div 
        className={`prose prose-lg max-w-none ${fontSize} ${
          accessibilityMode ? 'prose-blue high-contrast' : ''
        }`}
        dangerouslySetInnerHTML={{ 
          __html: content.content.html || content.content.text 
        }}
      />
      
      {/* Key Points */}
      {content.content.keyPoints && content.content.keyPoints.length > 0 && (
        <div className="key-points mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
          <h3 className="font-semibold text-blue-900 mb-4">Key Points</h3>
          <ul className="space-y-2">
            {content.content.keyPoints.map((point: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span className="text-blue-800">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Vocabulary */}
      {content.content.vocabulary && content.content.vocabulary.length > 0 && (
        <div className="vocabulary mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-4">Vocabulary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.content.vocabulary.map((term: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded border border-green-200">
                <dt className="font-medium text-green-900">{term.word}</dt>
                <dd className="text-green-700 text-sm mt-1">{term.definition}</dd>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Reading Time Estimate */}
      <div className="reading-time mt-6 text-sm text-gray-500 text-center">
        Estimated reading time: {Math.ceil((content.content.text?.length || 0) / 200)} minutes
      </div>
    </div>
  )
}