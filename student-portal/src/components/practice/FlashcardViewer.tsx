import React, { useState, useEffect } from 'react'
import { practiceAPI } from '../../services/api/practiceAPI'

interface Flashcard {
  id: string
  front: string
  back: string
  difficulty: number
  lastReviewed?: string
  nextReview?: string
  reviewCount: number
}

interface FlashcardViewerProps {
  topicId: string
  onComplete: (reviewedCount: number) => void
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({
  topicId,
  onComplete
}) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [sessionStats, setSessionStats] = useState({
    easy: 0,
    medium: 0,
    hard: 0
  })

  const currentCard = flashcards[currentIndex]

  useEffect(() => {
    loadFlashcards()
  }, [topicId])

  const loadFlashcards = async () => {
    setIsLoading(true)
    try {
      const cards = await practiceAPI.getFlashcards(topicId)
      setFlashcards(cards)
    } catch (error) {
      console.error('Failed to load flashcards:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReveal = () => {
    setShowBack(true)
  }

  const handleReview = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return

    try {
      await practiceAPI.reviewFlashcard(currentCard.id, difficulty)
      setReviewedCount(prev => prev + 1)
      setSessionStats(prev => ({
        ...prev,
        [difficulty]: prev[difficulty] + 1
      }))

      // Move to next card or complete session
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setShowBack(false)
      } else {
        onComplete(reviewedCount + 1)
      }
    } catch (error) {
      console.error('Failed to review flashcard:', error)
    }
  }

  const handleSkip = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setShowBack(false)
    } else {
      onComplete(reviewedCount)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setShowBack(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No flashcards available for this topic</div>
        <button
          onClick={() => onComplete(0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Practice
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <span className="text-sm text-gray-600">
            Reviewed: {reviewedCount}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative">
        <div
          className={`bg-white rounded-lg shadow-lg p-8 min-h-64 flex items-center justify-center cursor-pointer transition-all duration-300 ${
            showBack ? 'transform rotateY-180' : ''
          }`}
          onClick={!showBack ? handleReveal : undefined}
        >
          <div className="text-center">
            {!showBack ? (
              <>
                <div className="text-lg font-medium text-gray-900 mb-4">
                  {currentCard.front}
                </div>
                <div className="text-sm text-gray-500">
                  Click to reveal answer
                </div>
              </>
            ) : (
              <div className="text-lg text-gray-900">
                {currentCard.back}
              </div>
            )}
          </div>
        </div>

        {/* Card Info */}
        <div className="mt-4 flex justify-between text-sm text-gray-500">
          <span>Reviews: {currentCard.reviewCount}</span>
          {currentCard.lastReviewed && (
            <span>Last reviewed: {new Date(currentCard.lastReviewed).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6">
        {!showBack ? (
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleReveal}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reveal Answer
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Skip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center text-sm text-gray-600 mb-4">
              How well did you know this?
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => handleReview('hard')}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Hard
              </button>
              <button
                onClick={() => handleReview('medium')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                Medium
              </button>
              <button
                onClick={() => handleReview('easy')}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Easy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Session Stats */}
      {reviewedCount > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Session Progress</h4>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Easy: {sessionStats.easy}</span>
            <span>Medium: {sessionStats.medium}</span>
            <span>Hard: {sessionStats.hard}</span>
          </div>
        </div>
      )}
    </div>
  )
}