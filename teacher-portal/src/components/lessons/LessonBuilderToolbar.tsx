import React, { useState } from 'react';
import { Lesson, CollaborationSession } from '../../types';

interface LessonBuilderToolbarProps {
  lesson: Lesson | null;
  onSave: () => void;
  onClose?: () => void;
  isSaving: boolean;
  onToggleAI: () => void;
  onToggleSidebar: () => void;
  showAIPanel: boolean;
  collaborationSession: CollaborationSession | null;
}

const LessonBuilderToolbar: React.FC<LessonBuilderToolbarProps> = ({
  lesson,
  onSave,
  onClose,
  isSaving,
  onToggleAI,
  onToggleSidebar,
  showAIPanel,
  collaborationSession
}) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            title="Toggle Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Lesson Title */}
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-900">
              {lesson?.title || 'Untitled Lesson'}
            </h1>
            {lesson?.status === 'draft' && (
              <span className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                Draft
              </span>
            )}
            {lesson?.isPublished && (
              <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                Published
              </span>
            )}
          </div>

          {/* Collaboration Indicator */}
          {collaborationSession && collaborationSession.participants.length > 1 && (
            <div className="flex items-center space-x-1">
              <div className="flex -space-x-2">
                {collaborationSession.participants.slice(0, 3).map((participant) => (
                  <div
                    key={participant.userId}
                    className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                    title={participant.name}
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {collaborationSession.participants.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium">
                    +{collaborationSession.participants.length - 3}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {collaborationSession.participants.length} collaborator{collaborationSession.participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* AI Assistant Toggle */}
          <button
            onClick={onToggleAI}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              showAIPanel
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="AI Assistant"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>AI Assistant</span>
            </div>
          </button>

          {/* Preview Button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            title="Preview Lesson"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Preview</span>
            </div>
          </button>

          {/* Version History */}
          <button
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            title="Version History"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>History</span>
            </div>
          </button>

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </div>
            ) : (
              'Save'
            )}
          </button>

          {/* Publish Button */}
          {lesson && !lesson.isPublished && (
            <button
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              title="Publish Lesson"
            >
              Publish
            </button>
          )}

          {/* More Options */}
          <div className="relative">
            <button
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="More Options"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="mt-2 text-xs text-gray-500">
        Auto-save enabled • Last saved: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default LessonBuilderToolbar;