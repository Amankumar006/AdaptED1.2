import React, { useState, useEffect } from 'react'
import { LessonContent } from '../../../types'

interface QuizContentProps {
  content: LessonContent
  viewMode: 'reading' | 'presentation' | 'immersive'
  accessibilityMode: boolean
  isOffline: boolean
  onInteraction: () => void
}

interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching'
  question: string
  options?: string[]
  correctAnswer: any
  explanation?: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export const QuizContent: React.FC<QuizContentProps> = ({
  content,
  viewMode,
  accessibilityMode,
  isOffline,
  onInteraction
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [showResults, setShowResults] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [quizStarted, setQuizStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [showExplanations, setShowExplanations] = useState(false)
  
  const questions: QuizQuestion[] = content.content.questions || []
  const timeLimit = content.content.timeLimit // in seconds
  
  useEffect(() => {
    if (quizStarted && timeLimit && timeRemaining === null) {
      setTimeRemaining(timeLimit)
    }
  }, [quizStarted, timeLimit, timeRemaining])
  
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && quizStarted && !showResults) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0) {
      handleSubmitQuiz()
    }
  }, [timeRemaining, quizStarted, showResults])
  
  const startQuiz = () => {
    setQuizStarted(true)
    onInteraction()
  }
  
  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    onInteraction()
  }
  
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }
  
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }
  
  const calculateScore = () => {
    let totalScore = 0
    let maxScore = 0
    
    questions.forEach(question => {
      maxScore += question.points
      const userAnswer = answers[question.id]
      
      if (question.type === 'multiple_choice' || question.type === 'true_false') {
        if (userAnswer === question.correctAnswer) {
          totalScore += question.points
        }
      } else if (question.type === 'fill_blank') {
        const correctAnswers = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer 
          : [question.correctAnswer]
        
        if (correctAnswers.some((correct: string) => 
          userAnswer?.toLowerCase().trim() === correct.toLowerCase().trim()
        )) {
          totalScore += question.points
        }
      } else if (question.type === 'matching') {
        const correctMatches = question.correctAnswer
        const userMatches = userAnswer || {}
        let correctCount = 0
        
        Object.keys(correctMatches).forEach(key => {
          if (userMatches[key] === correctMatches[key]) {
            correctCount++
          }
        })
        
        totalScore += (correctCount / Object.keys(correctMatches).length) * question.points
      }
    })
    
    return { totalScore, maxScore, percentage: Math.round((totalScore / maxScore) * 100) }
  }
  
  const handleSubmitQuiz = () => {
    const results = calculateScore()
    setScore(results.percentage)
    setShowResults(true)
    onInteraction()
  }
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  const renderQuestion = (question: QuizQuestion, index: number) => {
    const userAnswer = answers[question.id]
    
    return (
      <div key={question.id} className="question-container">
        <div className="question-header mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Question {index + 1} of {questions.length}
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs ${
                question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {question.difficulty}
              </span>
              <span className="text-sm text-gray-600">{question.points} pts</span>
            </div>
          </div>
        </div>
        
        <div className="question-content mb-6">
          <p className="text-gray-900 mb-4">{question.question}</p>
          
          {question.type === 'multiple_choice' && (
            <div className="space-y-3">
              {question.options?.map((option, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    userAnswer === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={userAnswer === option}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}
          
          {question.type === 'true_false' && (
            <div className="space-y-3">
              {['True', 'False'].map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    userAnswer === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={userAnswer === option}
                    onChange={(e) => handleAnswer(question.id, e.target.value)}
                    className="mr-3"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}
          
          {question.type === 'fill_blank' && (
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your answer..."
              value={userAnswer || ''}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
            />
          )}
          
          {question.type === 'essay' && (
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your essay response..."
              value={userAnswer || ''}
              onChange={(e) => handleAnswer(question.id, e.target.value)}
            />
          )}
          
          {question.type === 'matching' && (
            <div className="matching-container">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="left-column">
                  <h4 className="font-medium mb-3">Match these items:</h4>
                  {question.options?.slice(0, Math.ceil(question.options.length / 2)).map((item, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded mb-2">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="right-column">
                  <h4 className="font-medium mb-3">With these options:</h4>
                  {question.options?.slice(Math.ceil(question.options.length / 2)).map((item, index) => (
                    <select
                      key={index}
                      className="w-full p-2 border border-gray-300 rounded mb-2"
                      value={userAnswer?.[index] || ''}
                      onChange={(e) => {
                        const newAnswer = { ...userAnswer }
                        newAnswer[index] = e.target.value
                        handleAnswer(question.id, newAnswer)
                      }}
                    >
                      <option value="">Select match...</option>
                      {question.options?.slice(0, Math.ceil(question.options.length / 2)).map((option, optIndex) => (
                        <option key={optIndex} value={option}>{option}</option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {showResults && question.explanation && (
          <div className={`explanation p-4 rounded-lg ${
            userAnswer === question.correctAnswer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h4 className="font-medium mb-2">
              {userAnswer === question.correctAnswer ? '✅ Correct!' : '❌ Incorrect'}
            </h4>
            <p className="text-sm">{question.explanation}</p>
            {userAnswer !== question.correctAnswer && (
              <p className="text-sm mt-2">
                <strong>Correct answer:</strong> {question.correctAnswer}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
  
  const renderQuizStart = () => (
    <div className="quiz-start text-center py-8">
      <h2 className="text-2xl font-bold mb-4">{content.title}</h2>
      {content.content.description && (
        <p className="text-gray-600 mb-6">{content.content.description}</p>
      )}
      
      <div className="quiz-info bg-gray-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Questions:</span>
            <span className="font-medium">{questions.length}</span>
          </div>
          {timeLimit && (
            <div className="flex justify-between">
              <span>Time Limit:</span>
              <span className="font-medium">{formatTime(timeLimit)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Total Points:</span>
            <span className="font-medium">
              {questions.reduce((sum, q) => sum + q.points, 0)}
            </span>
          </div>
        </div>
      </div>
      
      <button
        onClick={startQuiz}
        className="btn btn-primary btn-lg"
      >
        Start Quiz
      </button>
    </div>
  )
  
  const renderQuizResults = () => (
    <div className="quiz-results text-center py-8">
      <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
      
      <div className="results-summary bg-gray-50 rounded-lg p-6 mb-6 max-w-md mx-auto">
        <div className={`text-4xl font-bold mb-2 ${
          score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {score}%
        </div>
        <p className="text-gray-600">
          {score >= 80 ? 'Excellent work!' : score >= 60 ? 'Good job!' : 'Keep practicing!'}
        </p>
      </div>
      
      <div className="results-actions space-x-4">
        <button
          onClick={() => setShowExplanations(!showExplanations)}
          className="btn btn-ghost"
        >
          {showExplanations ? 'Hide' : 'Show'} Explanations
        </button>
        
        <button
          onClick={() => {
            setQuizStarted(false)
            setShowResults(false)
            setCurrentQuestion(0)
            setAnswers({})
            setTimeRemaining(null)
            setScore(0)
          }}
          className="btn btn-primary"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  )
  
  const getViewModeClasses = () => {
    switch (viewMode) {
      case 'presentation':
        return 'max-w-4xl mx-auto text-center'
      case 'immersive':
        return 'w-full min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-8'
      default:
        return 'max-w-4xl mx-auto'
    }
  }
  
  if (!quizStarted) {
    return (
      <div className={`quiz-content p-6 ${getViewModeClasses()}`}>
        {renderQuizStart()}
      </div>
    )
  }
  
  if (showResults) {
    return (
      <div className={`quiz-content p-6 ${getViewModeClasses()}`}>
        {renderQuizResults()}
        
        {showExplanations && (
          <div className="explanations mt-8">
            <h3 className="text-xl font-bold mb-6">Review Questions</h3>
            <div className="space-y-8">
              {questions.map((question, index) => renderQuestion(question, index))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className={`quiz-content p-6 ${getViewModeClasses()}`}>
      {/* Quiz Header */}
      <div className="quiz-header flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{content.title}</h2>
        
        <div className="quiz-status flex items-center space-x-4">
          {timeRemaining !== null && (
            <div className={`time-remaining px-3 py-1 rounded-full text-sm font-medium ${
              timeRemaining < 60 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              ⏰ {formatTime(timeRemaining)}
            </div>
          )}
          
          <div className="progress-indicator">
            <span className="text-sm text-gray-600">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="progress-bar mb-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Current Question */}
      {questions[currentQuestion] && renderQuestion(questions[currentQuestion], currentQuestion)}
      
      {/* Navigation */}
      <div className="quiz-navigation flex items-center justify-between mt-8">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestion === 0}
          className="btn btn-ghost"
        >
          ← Previous
        </button>
        
        <div className="question-indicators flex space-x-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestion ? 'bg-blue-600 text-white' :
                answers[questions[index].id] ? 'bg-green-100 text-green-800' :
                'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        {currentQuestion < questions.length - 1 ? (
          <button
            onClick={handleNextQuestion}
            className="btn btn-primary"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            className="btn btn-success"
            disabled={Object.keys(answers).length === 0}
          >
            Submit Quiz
          </button>
        )}
      </div>
      
      {/* Offline Notice */}
      {isOffline && (
        <div className="offline-notice mt-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-orange-800 text-sm">
            ⚠️ Quiz responses will be saved locally and submitted when you're back online.
          </p>
        </div>
      )}
    </div>
  )
}