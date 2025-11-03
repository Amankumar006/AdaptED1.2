import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../../../store'
import { startLesson } from '../../../store/slices/learningSlice'
import { DashboardWidget } from '../DashboardWidget'
import { Lesson } from '../../../types'

interface RecommendationsWidgetProps {
  id: string
  isLoading?: boolean
  error?: string
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  analytics?: any
  personalizationData?: any
}

export const RecommendationsWidget: React.FC<RecommendationsWidgetProps> = ({
  id,
  isLoading,
  error,
  learningStyle,
  analytics,
  personalizationData,
}) => {
  const dispatch = useDispatch<AppDispatch>()
  const { recommendations } = useSelector((state: RootState) => state.learning)

  const handleStartLesson = (lessonId: string) => {
    dispatch(startLesson(lessonId))
  }

  const renderVisualRecommendations = () => (
    <div className="space-y-3">
      {recommendations.slice(0, 3).map((lesson) => (
        <div
          key={lesson.id}
          className="group relative bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={() => handleStartLesson(lesson.id)}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                {lesson.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{lesson.description}</p>
              <div className="flex items-center mt-2 space-x-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {lesson.difficulty}
                </span>
                <span className="text-xs text-gray-500">{lesson.duration} min</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ))}
      
      {recommendations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-sm">No recommendations available</p>
        </div>
      )}
    </div>
  )

  const renderAuditoryRecommendations = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-1">Recommended for You</h4>
        <p className="text-xs text-gray-600">Based on your learning progress and preferences</p>
      </div>
      
      {recommendations.slice(0, 3).map((lesson, index) => (
        <div
          key={lesson.id}
          className="border-l-4 border-primary-500 bg-primary-50 p-3 rounded-r-lg hover:bg-primary-100 transition-colors cursor-pointer"
          onClick={() => handleStartLesson(lesson.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary-700">Recommendation #{index + 1}</span>
            <button className="text-primary-600 hover:text-primary-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">{lesson.title}</h4>
          <p className="text-xs text-gray-700 mb-2">{lesson.description}</p>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Duration: {lesson.duration} minutes</span>
            <span className="capitalize">{lesson.difficulty} level</span>
          </div>
        </div>
      ))}
    </div>
  )

  const renderKinestheticRecommendations = () => (
    <div className="space-y-3">
      {recommendations.slice(0, 3).map((lesson, index) => (
        <div
          key={lesson.id}
          className="relative bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-primary-300 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
          onClick={() => handleStartLesson(lesson.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {index + 1}
              </div>
              <span className="text-xs font-medium text-gray-500">RECOMMENDED</span>
            </div>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < (lesson.difficulty === 'beginner' ? 2 : lesson.difficulty === 'intermediate' ? 3 : 4)
                      ? 'bg-yellow-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <h4 className="text-sm font-semibold text-gray-900 mb-1">{lesson.title}</h4>
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{lesson.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {lesson.duration}m
              </span>
              <span className="text-xs text-gray-500 capitalize">{lesson.difficulty}</span>
            </div>
            <button className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      
      <button className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-lg p-3 text-sm font-medium transition-all duration-200 transform hover:scale-105">
        Explore More Lessons
      </button>
    </div>
  )

  const renderMixedRecommendations = () => (
    <div className="space-y-3">
      {recommendations.slice(0, 2).map((lesson, index) => (
        <div
          key={lesson.id}
          className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={() => handleStartLesson(lesson.id)}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">{index + 1}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900">{lesson.title}</h4>
                <span className="text-xs text-gray-500">{lesson.duration}m</span>
              </div>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{lesson.description}</p>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                  {lesson.difficulty}
                </span>
                <button className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                  Start Learning →
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {recommendations.length > 2 && (
        <div className="text-center pt-2">
          <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
            View {recommendations.length - 2} more recommendations
          </button>
        </div>
      )}
    </div>
  )

  const renderRecommendationsContent = () => {
    switch (learningStyle) {
      case 'visual':
        return renderVisualRecommendations()
      case 'auditory':
        return renderAuditoryRecommendations()
      case 'kinesthetic':
        return renderKinestheticRecommendations()
      case 'mixed':
      default:
        return renderMixedRecommendations()
    }
  }

  return (
    <DashboardWidget
      id={id}
      title="Recommended for You"
      isLoading={isLoading}
      error={error}
    >
      {renderRecommendationsContent()}
    </DashboardWidget>
  )
}