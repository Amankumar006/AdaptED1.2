import React, { useState, useEffect, useRef } from 'react'
import { Lesson, LessonContent } from '../../types'
import { TextContent } from './content/TextContent'
import { VideoContent } from './content/VideoContent'
import { AudioContent } from './content/AudioContent'
import { ImageContent } from './content/ImageContent'
import { InteractiveContent } from './content/InteractiveContent'
import { QuizContent } from './content/QuizContent'
import { ARVRContent } from './content/ARVRContent'

interface InteractiveLessonViewerProps {
  lesson: Lesson
  currentContent: LessonContent
  currentIndex: number
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  onAddNote: (content: string, position?: number) => void
  onProgressUpdate: () => void
  isOffline: boolean
}

export const InteractiveLessonViewer: React.FC<InteractiveLessonViewerProps> = ({
  lesson,
  currentContent,
  currentIndex,
  viewMode,
  accessibilityMode,
  onAddNote,
  onProgressUpdate,
  isOffline
}) => {
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState<number | undefined>()
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentStartTime] = useState(Date.now())
  
  useEffect(() => {
    // Track content view time
    const timer = setTimeout(() => {
      onProgressUpdate()
    }, 5000) // Update progress after 5 seconds of viewing
    
    return () => clearTimeout(timer)
  }, [currentIndex, onProgressUpdate])
  
  // Handle text selection for note-taking
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim())
        const range = selection.getRangeAt(0)
        setSelectionPosition(range.startOffset)
      } else {
        setSelectedText('')
        setSelectionPosition(undefined)
      }
    }
    
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])
  
  const handleAddNoteFromSelection = () => {
    if (selectedText) {
      setNoteContent(`"${selectedText}" - `)
      setShowNoteDialog(true)
    }
  }
  
  const handleSaveNote = () => {
    if (noteContent.trim()) {
      onAddNote(noteContent, selectionPosition)
      setNoteContent('')
      setShowNoteDialog(false)
      setSelectedText('')
    }
  }
  
  const renderContent = () => {
    const commonProps = {
      content: currentContent,
      viewMode,
      accessibilityMode,
      isOffline,
      onInteraction: onProgressUpdate
    }
    
    switch (currentContent.type) {
      case 'text':
        return <TextContent {...commonProps} />
      case 'video':
        return <VideoContent {...commonProps} />
      case 'audio':
        return <AudioContent {...commonProps} />
      case 'image':
        return <ImageContent {...commonProps} />
      case 'interactive':
        return viewMode === 'immersive' ? 
          <ARVRContent {...commonProps} /> : 
          <InteractiveContent {...commonProps} />
      case 'quiz':
        return <QuizContent {...commonProps} />
      default:
        return <div className="p-4 text-gray-500">Unsupported content type</div>
    }
  }
  
  return (
    <div 
      ref={contentRef}
      className={`lesson-content-viewer ${viewMode} ${accessibilityMode ? 'a11y-mode' : ''}`}
    >
      {/* Content Area */}
      <div className="content-area relative">
        {renderContent()}
        
        {/* Text Selection Toolbar */}
        {selectedText && (
          <div className="selection-toolbar fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50">
            <button
              onClick={handleAddNoteFromSelection}
              className="btn btn-sm btn-primary"
            >
              📝 Add Note
            </button>
          </div>
        )}
      </div>
      
      {/* Learning Objectives */}
      {viewMode === 'reading' && lesson.learningObjectives.length > 0 && (
        <div className="learning-objectives bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Learning Objectives</h3>
          <ul className="list-disc list-inside space-y-1">
            {lesson.learningObjectives.map((objective, index) => (
              <li key={index} className="text-blue-800 text-sm">
                {objective}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Progress Indicator */}
      <div className="progress-indicator mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(((currentIndex + 1) / lesson.content.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / lesson.content.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Note</h3>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter your note..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowNoteDialog(false)
                  setNoteContent('')
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="btn btn-primary"
                disabled={!noteContent.trim()}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}