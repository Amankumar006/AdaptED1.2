import React, { useState, useRef, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { updateNote, deleteNote } from '../../store/slices/learningSlice'
import { addPendingAction } from '../../store/slices/offlineSlice'

interface Note {
  id: string
  lessonId: string
  content: string
  timestamp: number
  position?: number
}

interface NoteTakingPanelProps {
  lessonId: string
  notes: Note[]
  onAddNote: (content: string, position?: number) => void
  onClose: () => void
  isOffline: boolean
}

export const NoteTakingPanel: React.FC<NoteTakingPanelProps> = ({
  lessonId,
  notes,
  onAddNote,
  onClose,
  isOffline
}) => {
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNoteType, setSelectedNoteType] = useState<'text' | 'highlight' | 'bookmark'>('text')
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dispatch = useDispatch()
  
  // Voice recording support
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  
  useEffect(() => {
    // Auto-focus on new note textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])
  
  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim())
      setNewNote('')
    }
  }
  
  const handleEditNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setEditingNote(noteId)
      setEditContent(note.content)
    }
  }
  
  const handleSaveEdit = () => {
    if (editingNote && editContent.trim()) {
      const updateData = {
        id: editingNote,
        content: editContent.trim()
      }
      
      if (isOffline) {
        dispatch(addPendingAction({
          type: 'API_REQUEST',
          data: {
            method: 'PATCH',
            url: `/learning/notes/${editingNote}`,
            body: { content: editContent.trim() }
          }
        }))
      }
      
      dispatch(updateNote(updateData))
      setEditingNote(null)
      setEditContent('')
    }
  }
  
  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      if (isOffline) {
        dispatch(addPendingAction({
          type: 'API_REQUEST',
          data: {
            method: 'DELETE',
            url: `/learning/notes/${noteId}`
          }
        }))
      }
      
      dispatch(deleteNote(noteId))
    }
  }
  
  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditContent('')
  }
  
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data])
        }
      }
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        // Here you would typically convert speech to text
        // For now, we'll add a placeholder note
        onAddNote('🎤 Voice note recorded (transcription pending)')
        setAudioChunks([])
        stream.getTracks().forEach(track => track.stop())
      }
      
      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting voice recording:', error)
    }
  }
  
  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }
  
  const filteredNotes = notes.filter(note =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleAddNote()
    }
  }
  
  const exportNotes = () => {
    const notesText = notes
      .map(note => `${formatTimestamp(note.timestamp)}: ${note.content}`)
      .join('\n\n')
    
    const blob = new Blob([notesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lesson-notes-${lessonId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="notes-panel fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="notes-header p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Notes</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close notes panel"
          >
            ✕
          </button>
        </div>
        
        {/* Search */}
        <div className="search-container mb-3">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Note Type Selector */}
        <div className="note-type-selector flex space-x-1 mb-3">
          {(['text', 'highlight', 'bookmark'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedNoteType(type)}
              className={`btn btn-xs ${
                selectedNoteType === type ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {type === 'text' ? '📝' : type === 'highlight' ? '🖍️' : '🔖'}
            </button>
          ))}
        </div>
        
        {/* Stats */}
        <div className="notes-stats text-xs text-gray-500">
          {filteredNotes.length} of {notes.length} notes
          {isOffline && (
            <span className="ml-2 text-orange-600">• Offline</span>
          )}
        </div>
      </div>
      
      {/* New Note Input */}
      <div className="new-note-section p-4 border-b border-gray-200">
        <textarea
          ref={textareaRef}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new note... (Ctrl+Enter to save)"
          className="w-full h-20 p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <div className="new-note-actions flex items-center justify-between mt-3">
          <div className="voice-recording">
            {isRecording ? (
              <button
                onClick={stopVoiceRecording}
                className="btn btn-sm btn-secondary"
              >
                🔴 Stop Recording
              </button>
            ) : (
              <button
                onClick={startVoiceRecording}
                className="btn btn-sm btn-ghost"
                title="Voice note"
              >
                🎤
              </button>
            )}
          </div>
          
          <div className="text-actions space-x-2">
            <button
              onClick={() => setNewNote('')}
              className="btn btn-sm btn-ghost"
              disabled={!newNote.trim()}
            >
              Clear
            </button>
            <button
              onClick={handleAddNote}
              className="btn btn-sm btn-primary"
              disabled={!newNote.trim()}
            >
              Add Note
            </button>
          </div>
        </div>
      </div>
      
      {/* Notes List */}
      <div className="notes-list flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="empty-state p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm">
              {searchQuery ? 'No notes match your search' : 'No notes yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs mt-1">
                Start taking notes to remember key points
              </p>
            )}
          </div>
        ) : (
          <div className="notes-container p-4 space-y-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="note-item bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                {editingNote === note.id ? (
                  <div className="edit-mode">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-20 p-2 text-sm border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <div className="edit-actions flex items-center justify-end space-x-2 mt-2">
                      <button
                        onClick={handleCancelEdit}
                        className="btn btn-xs btn-ghost"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="btn btn-xs btn-primary"
                        disabled={!editContent.trim()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="view-mode">
                    <div className="note-content text-sm text-gray-800 mb-2 whitespace-pre-wrap">
                      {note.content}
                    </div>
                    
                    <div className="note-meta flex items-center justify-between text-xs text-gray-500">
                      <span className="timestamp">
                        {formatTimestamp(note.timestamp)}
                      </span>
                      
                      <div className="note-actions space-x-1">
                        <button
                          onClick={() => handleEditNote(note.id)}
                          className="hover:text-blue-600"
                          title="Edit note"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="hover:text-red-600"
                          title="Delete note"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      {notes.length > 0 && (
        <div className="notes-footer p-4 border-t border-gray-200">
          <div className="footer-actions flex items-center justify-between">
            <button
              onClick={exportNotes}
              className="btn btn-sm btn-ghost"
              title="Export notes"
            >
              📤 Export
            </button>
            
            <div className="text-xs text-gray-500">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
      
      {/* Offline Sync Status */}
      {isOffline && (
        <div className="sync-status p-2 bg-orange-50 border-t border-orange-200">
          <p className="text-xs text-orange-800 text-center">
            📱 Notes will sync when you're back online
          </p>
        </div>
      )}
    </div>
  )
}