import React, { useState, useEffect } from 'react'
import { practiceAPI } from '../../services/api/practiceAPI'
import { PracticeSession as PracticeSessionType, PracticeQuestion } from '../../types'

interface PracticeSessionProps {
  session: PracticeSessionType
  onComplete: (completedSession: PracticeSessionType) => void
  onExit: () => void
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  session,
  onComplete,
  onExit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({})
  const [showExplanation, setShowExplanation] = useState(false)
  const [questionResult, setQuestionResult] = useState<{
    isCorrect: boolean
    explanation: string
    correctAnswer: any
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)

  const currentQuestion = session.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === session.questions.length - 1

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleAnswerChange = (answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }))
  }

  const handleSubmitAnswer = async () => {
    const answer = answers[currentQuestion.id]
    if (answer === undefined || answer === '') return

    setIsSubmitting(true)
    try {
      const result = await practiceAPI.submitAnswer(session.id, currentQuestion.id, answer)
      setQuestionResult(result)
      setShowExplanation(true)
    } catch (error) {
      console.error('Failed to submit answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextQuestion = () => {
    setShowExplanation(false)
    setQuestionResult(null)
    
    if (isLastQuestion) {
      handleCompleteSession()
    } else {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handleCompleteSession = async () => {
    try {
      const completedSession = await practiceAPI.completePracticeSession(session.id)
      onComplete(completedSession)
    } catch (error) {
      console.error('Failed to complete session:', error)
    }
  }

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <label key={index} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="mr-3"
                  disabled={showExplanation}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )

      case 'true_false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map(option => (
              <label key={option} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={answers[currentQuestion.id] === option}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="mr-3"
                  disabled={showExplanation}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )

      case 'fill_blank':
        return (
          <input
            type="text"
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Enter your answer"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={showExplanation}
          />
        )

      case 'essay':
        return (
          <textarea
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Enter your answer"
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={showExplanation}
          />
        )

      default:
        return null
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Practice Session</h2>
          <p className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {session.questions.length}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Time: {formatTime(timeSpent)}
          </div>
          <button
            onClick={onExit}
            className="text-gray-500 hover:text-gray-700"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / session.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {currentQuestion.question}
          </h3>
          {renderQuestion()}
        </div>

        {/* Explanation */}
        {showExplanation && questionResult && (
          <div className={`p-4 rounded-lg mb-6 ${
            questionResult.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                questionResult.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {questionResult.isCorrect ? '✓' : '✗'}
              </div>
              <span className={`font-medium ${
                questionResult.isCorrect ? 'text-green-800' : 'text-red-800'
              }`}>
                {questionResult.isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            <p className="text-gray-700 mb-2">{questionResult.explanation}</p>
            {!questionResult.isCorrect && (
              <p className="text-sm text-gray-600">
                Correct answer: {questionResult.correctAnswer}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0 || showExplanation}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {!showExplanation ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={!answers[currentQuestion.id] || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isLastQuestion ? 'Complete Session' : 'Next Question'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}