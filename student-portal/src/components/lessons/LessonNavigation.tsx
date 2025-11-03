import React from 'react'
import { Lesson, LearningProgress } from '../../types'

interface LessonNavigationProps {
  lesson: Lesson
  currentIndex: number
  onNavigate: (index: number) => void
  progress?: LearningProgress | null
}

export const LessonNavigation: React.FC<LessonNavigationProps> = ({
  lesson,
  currentIndex,
  onNavigate,
  progress
}) => {
  const canGoNext = currentIndex < lesson.content.length - 1
  const canGoPrevious = currentIndex > 0
  
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📄'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      case 'image':
        return '🖼️'
      case 'interactive':
        return '🎮'
      case 'quiz':
        return '❓'
      default:
        return '📋'
    }
  }
  
  const getContentDuration = (content: any) => {
    if (content.duration) {
      const minutes = Math.floor(content.duration / 60)
      const seconds = content.duration % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return null
  }
  
  const isContentCompleted = (index: number) => {
    // This would typically check against actual completion data
    return progress && index < currentIndex
  }
  
  return (
    <div className="lesson-navigation bg-white border-t border-gray-200 p-6">
      {/* Main Navigation Controls */}
      <div className="main-controls flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canGoPrevious}
          className={`btn ${canGoPrevious ? 'btn-primary' : 'btn-disabled'}`}
          aria-label="Previous content"
        >
          ← Previous
        </button>
        
        <div className="current-position text-center">
          <div className="text-sm text-gray-600">
            {currentIndex + 1} of {lesson.content.length}
          </div>
          <div className="text-lg font-semibold">
            {lesson.content[currentIndex]?.title || `Content ${currentIndex + 1}`}
          </div>
        </div>
        
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canGoNext}
          className={`btn ${canGoNext ? 'btn-primary' : 'btn-disabled'}`}
          aria-label="Next content"
        >
          Next →
        </button>
      </div>
      
      {/* Content Overview */}
      <div className="content-overview">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Lesson Contents</h3>
        
        <div className="content-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lesson.content.map((content, index) => (
            <button
              key={content.id}
              onClick={() => onNavigate(index)}
              className={`content-item p-3 rounded-lg border text-left transition-all duration-200 ${
                index === currentIndex
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : isContentCompleted(index)
                  ? 'border-green-200 bg-green-50 hover:bg-green-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
              aria-label={`Go to ${content.title || `content ${index + 1}`}`}
            >
              <div className="flex items-start space-x-3">
                <div className="content-icon text-lg">
                  {getContentIcon(content.type)}
                </div>
                
                <div className="content-info flex-1 min-w-0">
                  <div className="content-title font-medium text-sm truncate">
                    {content.title || `Content ${index + 1}`}
                  </div>
                  
                  <div className="content-meta flex items-center space-x-2 mt-1">
                    <span className="content-type text-xs text-gray-500 capitalize">
                      {content.type}
                    </span>
                    
                    {getContentDuration(content) && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="content-duration text-xs text-gray-500">
                          {getContentDuration(content)}
                        </span>
                      </>
                    )}
                    
                    {content.isRequired && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="required-badge text-xs text-red-600">
                          Required
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="content-status">
                  {index === currentIndex && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                  {isContentCompleted(index) && (
                    <div className="text-green-500 text-sm">✓</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Progress Indicator */}
      <div className="progress-section mt-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Lesson Progress</span>
          <span>{Math.round(((currentIndex + 1) / lesson.content.length) * 100)}%</span>
        </div>
        
        <div className="progress-bar w-full bg-gray-200 rounded-full h-2">
          <div 
            className="progress-fill bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / lesson.content.length) * 100}%` }}
          />
        </div>
        
        <div className="progress-details flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>
            {lesson.content.filter((_, index) => isContentCompleted(index)).length} completed
          </span>
          <span>
            {lesson.content.filter(c => c.isRequired).length} required
          </span>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions flex items-center justify-center space-x-4 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={() => onNavigate(0)}
          className="btn btn-ghost btn-sm"
          disabled={currentIndex === 0}
        >
          ⏮️ Start
        </button>
        
        <button
          onClick={() => onNavigate(lesson.content.length - 1)}
          className="btn btn-ghost btn-sm"
          disabled={currentIndex === lesson.content.length - 1}
        >
          ⏭️ End
        </button>
        
        {/* Jump to next required content */}
        {(() => {
          const nextRequired = lesson.content.findIndex((content, index) => 
            index > currentIndex && content.isRequired && !isContentCompleted(index)
          )
          return nextRequired !== -1 && (
            <button
              onClick={() => onNavigate(nextRequired)}
              className="btn btn-ghost btn-sm"
            >
              📌 Next Required
            </button>
          )
        })()}
      </div>
      
      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-shortcuts mt-4 text-center">
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Keyboard Shortcuts
          </summary>
          <div className="mt-2 space-y-1">
            <div>← → Arrow keys: Navigate content</div>
            <div>Space: Play/Pause media</div>
            <div>N: Add note</div>
            <div>B: Toggle bookmark</div>
          </div>
        </details>
      </div>
    </div>
  )
}