import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../store'
import { startLesson, updateProgress, addBookmark, removeBookmark, addNote } from '../../store/slices/learningSlice'
import { addPendingAction } from '../../store/slices/offlineSlice'
import { InteractiveLessonViewer } from '../../components/lessons/InteractiveLessonViewer'
import { LessonNavigation } from '../../components/lessons/LessonNavigation'
import { NoteTakingPanel } from '../../components/lessons/NoteTakingPanel'
import { BookmarkButton } from '../../components/lessons/BookmarkButton'
import { AccessibilityControls } from '../../components/lessons/AccessibilityControls'
import { OfflineIndicator } from '../../components/common/OfflineIndicator'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { ErrorMessage } from '../../components/common/ErrorMessage'

export const LessonViewerPage = () => {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const { 
    currentLesson, 
    progress, 
    bookmarks, 
    notes, 
    isLoading, 
    error 
  } = useSelector((state: RootState) => state.learning)
  
  const { isOnline, offlineContent } = useSelector((state: RootState) => state.offline)
  const { preferences } = useSelector((state: RootState) => state.auth.user || { preferences: null })
  
  const [currentContentIndex, setCurrentContentIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [viewMode, setViewMode] = useState<'reading' | 'presentation' | 'immersive'>('reading')
  const [accessibilityMode, setAccessibilityMode] = useState(false)
  const [sessionStartTime] = useState(Date.now())
  const progressUpdateRef = useRef<number | null>(null)
  
  // Check if lesson is available offline
  const isOfflineAvailable = lessonId ? offlineContent[lessonId] : false
  const canViewLesson = isOnline || isOfflineAvailable
  
  useEffect(() => {
    if (!lessonId) {
      navigate('/lessons')
      return
    }
    
    if (canViewLesson) {
      dispatch(startLesson(lessonId) as any)
    }
    
    // Set up accessibility mode based on user preferences
    if (preferences?.accessibility) {
      setAccessibilityMode(
        preferences.accessibility.screenReader || 
        preferences.accessibility.keyboardNavigation ||
        preferences.accessibility.highContrast
      )
    }
    
    return () => {
      // Save progress on unmount
      if (progressUpdateRef.current) {
        clearTimeout(progressUpdateRef.current)
        handleProgressUpdate()
      }
    }
  }, [lessonId, canViewLesson, dispatch, navigate, preferences])
  
  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (currentLesson && lessonId) {
      const interval = setInterval(() => {
        handleProgressUpdate()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [currentLesson, lessonId, currentContentIndex])
  
  const handleProgressUpdate = useCallback(() => {
    if (!currentLesson || !lessonId) return
    
    const timeSpent = Date.now() - sessionStartTime
    const progressPercentage = Math.min(
      ((currentContentIndex + 1) / currentLesson.content.length) * 100,
      100
    )
    
    const progressData = {
      lessonId,
      progress: progressPercentage,
      timeSpent: Math.floor(timeSpent / 1000)
    }
    
    if (isOnline) {
      dispatch(updateProgress(progressData) as any)
    } else {
      dispatch(addPendingAction({
        type: 'UPDATE_PROGRESS',
        data: progressData
      }))
    }
  }, [currentLesson, lessonId, currentContentIndex, sessionStartTime, isOnline, dispatch])
  
  const handleContentNavigation = (index: number) => {
    setCurrentContentIndex(index)
    handleProgressUpdate()
  }
  
  const handleBookmarkToggle = () => {
    if (!lessonId) return
    
    const isBookmarked = bookmarks.includes(lessonId)
    
    if (isOnline) {
      if (isBookmarked) {
        dispatch(removeBookmark(lessonId))
      } else {
        dispatch(addBookmark(lessonId))
      }
    } else {
      dispatch(addPendingAction({
        type: 'BOOKMARK',
        data: { lessonId, action: isBookmarked ? 'remove' : 'add' }
      }))
      
      // Update local state immediately for better UX
      if (isBookmarked) {
        dispatch(removeBookmark(lessonId))
      } else {
        dispatch(addBookmark(lessonId))
      }
    }
  }
  
  const handleAddNote = (content: string, position?: number) => {
    if (!lessonId) return
    
    const noteData = {
      lessonId,
      content,
      position
    }
    
    if (isOnline) {
      dispatch(addNote(noteData))
    } else {
      dispatch(addPendingAction({
        type: 'ADD_NOTE',
        data: noteData
      }))
      
      // Add to local state immediately
      dispatch(addNote(noteData))
    }
  }
  
  const handleViewModeChange = (mode: 'reading' | 'presentation' | 'immersive') => {
    setViewMode(mode)
  }
  
  const handleAccessibilityToggle = () => {
    setAccessibilityMode(!accessibilityMode)
  }
  
  if (!canViewLesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <OfflineIndicator />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Lesson Not Available Offline
          </h2>
          <p className="text-gray-600 mb-4">
            This lesson is not downloaded for offline viewing. Please connect to the internet to access it.
          </p>
          <button
            onClick={() => navigate('/lessons')}
            className="btn btn-primary"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <ErrorMessage message={error} />
        <button
          onClick={() => navigate('/lessons')}
          className="btn btn-primary"
        >
          Back to Lessons
        </button>
      </div>
    )
  }
  
  if (!currentLesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Lesson Not Found</h2>
        <p className="text-gray-600">The requested lesson could not be loaded.</p>
        <button
          onClick={() => navigate('/lessons')}
          className="btn btn-primary"
        >
          Back to Lessons
        </button>
      </div>
    )
  }
  
  const currentContent = currentLesson.content[currentContentIndex]
  const lessonNotes = notes.filter(note => note.lessonId === lessonId)
  const isBookmarked = bookmarks.includes(lessonId || '')
  
  return (
    <div className={`lesson-viewer ${viewMode} ${accessibilityMode ? 'accessibility-mode' : ''}`}>
      {/* Header */}
      <div className="lesson-header bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/lessons')}
              className="btn btn-ghost btn-sm"
              aria-label="Back to lessons"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentLesson.title}
              </h1>
              <p className="text-sm text-gray-600">
                {currentContentIndex + 1} of {currentLesson.content.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <AccessibilityControls
              isEnabled={accessibilityMode}
              onToggle={handleAccessibilityToggle}
              preferences={preferences?.accessibility}
            />
            
            <BookmarkButton
              isBookmarked={isBookmarked}
              onToggle={handleBookmarkToggle}
            />
            
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`btn btn-sm ${showNotes ? 'btn-primary' : 'btn-ghost'}`}
              aria-label="Toggle notes panel"
            >
              📝 Notes ({lessonNotes.length})
            </button>
            
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange('reading')}
                className={`btn btn-xs ${viewMode === 'reading' ? 'btn-primary' : 'btn-ghost'}`}
                aria-label="Reading mode"
              >
                📖
              </button>
              <button
                onClick={() => handleViewModeChange('presentation')}
                className={`btn btn-xs ${viewMode === 'presentation' ? 'btn-primary' : 'btn-ghost'}`}
                aria-label="Presentation mode"
              >
                🎯
              </button>
              <button
                onClick={() => handleViewModeChange('immersive')}
                className={`btn btn-xs ${viewMode === 'immersive' ? 'btn-primary' : 'btn-ghost'}`}
                aria-label="Immersive mode"
              >
                🥽
              </button>
            </div>
            
            {!isOnline && <OfflineIndicator />}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="lesson-content flex flex-1 overflow-hidden">
        {/* Lesson Viewer */}
        <div className={`flex-1 ${showNotes ? 'mr-80' : ''} transition-all duration-300`}>
          <InteractiveLessonViewer
            lesson={currentLesson}
            currentContent={currentContent}
            currentIndex={currentContentIndex}
            viewMode={viewMode}
            accessibilityMode={accessibilityMode}
            onAddNote={handleAddNote}
            onProgressUpdate={handleProgressUpdate}
            isOffline={!isOnline}
          />
          
          {/* Navigation */}
          <LessonNavigation
            lesson={currentLesson}
            currentIndex={currentContentIndex}
            onNavigate={handleContentNavigation}
            progress={progress}
          />
        </div>
        
        {/* Notes Panel */}
        {showNotes && (
          <NoteTakingPanel
            lessonId={lessonId || ''}
            notes={lessonNotes}
            onAddNote={handleAddNote}
            onClose={() => setShowNotes(false)}
            isOffline={!isOnline}
          />
        )}
      </div>
    </div>
  )
}