import React, { useState } from 'react'
import { PracticeGenerator } from '../../components/practice/PracticeGenerator'
import { PracticeSession } from '../../components/practice/PracticeSession'
import { FlashcardViewer } from '../../components/practice/FlashcardViewer'
import { PracticeSession as PracticeSessionType } from '../../types'

type PracticeMode = 'generator' | 'session' | 'flashcards' | 'results'

export const PracticePage = () => {
  const [mode, setMode] = useState<PracticeMode>('generator')
  const [currentSession, setCurrentSession] = useState<PracticeSessionType | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleSessionGenerated = (session: PracticeSessionType) => {
    setCurrentSession(session)
    setMode('session')
    setError('')
  }

  const handleSessionComplete = (completedSession: PracticeSessionType) => {
    setCurrentSession(completedSession)
    setMode('results')
  }

  const handleFlashcardComplete = (reviewedCount: number) => {
    setMode('generator')
    // Could show a success message here
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const resetToGenerator = () => {
    setMode('generator')
    setCurrentSession(null)
    setSelectedTopic('')
    setError('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Practice</h1>
        <p className="mt-2 text-gray-600">Practice problems and self-study tools</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {mode === 'generator' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PracticeGenerator
              onSessionGenerated={handleSessionGenerated}
              onError={handleError}
            />
          </div>
          
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Practice</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSelectedTopic('math-algebra')
                    setMode('flashcards')
                  }}
                  className="w-full px-4 py-2 text-left bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  <div className="font-medium text-blue-900">Algebra Flashcards</div>
                  <div className="text-sm text-blue-700">Review key concepts</div>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedTopic('science-physics')
                    setMode('flashcards')
                  }}
                  className="w-full px-4 py-2 text-left bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                >
                  <div className="font-medium text-green-900">Physics Flashcards</div>
                  <div className="text-sm text-green-700">Formula practice</div>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedTopic('english-grammar')
                    setMode('flashcards')
                  }}
                  className="w-full px-4 py-2 text-left bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                >
                  <div className="font-medium text-purple-900">Grammar Flashcards</div>
                  <div className="text-sm text-purple-700">Language rules</div>
                </button>
              </div>
            </div>

            {/* Practice Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sessions completed</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average score</span>
                  <span className="font-medium">85%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time practiced</span>
                  <span className="font-medium">4h 32m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Streak</span>
                  <span className="font-medium text-orange-600">🔥 5 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'session' && currentSession && (
        <PracticeSession
          session={currentSession}
          onComplete={handleSessionComplete}
          onExit={resetToGenerator}
        />
      )}

      {mode === 'flashcards' && selectedTopic && (
        <div>
          <div className="mb-4">
            <button
              onClick={resetToGenerator}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Practice
            </button>
          </div>
          <FlashcardViewer
            topicId={selectedTopic}
            onComplete={handleFlashcardComplete}
          />
        </div>
      )}

      {mode === 'results' && currentSession && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Complete!</h2>
            <p className="text-gray-600 mb-6">Great job on completing your practice session</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{currentSession.score}%</div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{currentSession.questions.length}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.floor(currentSession.timeSpent / 60)}m</div>
                <div className="text-sm text-gray-600">Time</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={resetToGenerator}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Practice Again
              </button>
              <button
                onClick={() => setMode('generator')}
                className="w-full px-6 py-3 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to Practice Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}