import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../store'
import { DashboardWidget } from '../DashboardWidget'
import { Assignment } from '../../../types'

interface UpcomingWidgetProps {
  id: string
  isLoading?: boolean
  error?: string
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  analytics?: any
  personalizationData?: any
}

export const UpcomingWidget: React.FC<UpcomingWidgetProps> = ({
  id,
  isLoading,
  error,
  learningStyle,
  analytics,
  personalizationData,
}) => {
  const { assignments } = useSelector((state: RootState) => state.learning)

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitted':
        return 'bg-blue-100 text-blue-800'
      case 'graded':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const renderVisualUpcoming = () => (
    <div className="space-y-3">
      {assignments.slice(0, 4).map((assignment) => {
        const daysUntil = getDaysUntilDue(assignment.dueDate)
        const isOverdue = daysUntil < 0
        const isUrgent = daysUntil <= 2 && daysUntil >= 0

        return (
          <div
            key={assignment.id}
            className={`relative p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md ${
              isOverdue
                ? 'bg-red-50 border-red-500'
                : isUrgent
                ? 'bg-yellow-50 border-yellow-500'
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 mb-1">{assignment.title}</h4>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                    {assignment.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">{assignment.points} points</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {isOverdue ? (
                  <div className="text-red-600 text-xs font-medium">
                    Overdue
                  </div>
                ) : isUrgent ? (
                  <div className="text-yellow-600 text-xs font-medium">
                    {daysUntil === 0 ? 'Due Today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">
                    {daysUntil} day{daysUntil > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
      
      {assignments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No upcoming assignments</p>
        </div>
      )}
    </div>
  )

  const renderAuditoryUpcoming = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-1">Your Schedule</h4>
        <p className="text-xs text-gray-600">Stay on track with your assignments</p>
      </div>
      
      {assignments.slice(0, 4).map((assignment, index) => {
        const daysUntil = getDaysUntilDue(assignment.dueDate)
        const isOverdue = daysUntil < 0
        const isUrgent = daysUntil <= 2 && daysUntil >= 0

        return (
          <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Assignment #{index + 1}</span>
              {isOverdue && (
                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  OVERDUE
                </span>
              )}
              {isUrgent && !isOverdue && (
                <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                  URGENT
                </span>
              )}
            </div>
            
            <h4 className="text-sm font-medium text-gray-900 mb-2">{assignment.title}</h4>
            
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className="capitalize font-medium">{assignment.status.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Points:</span>
                <span className="font-medium">{assignment.points}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Due Date:</span>
                <span className="font-medium">{new Date(assignment.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Time Remaining:</span>
                <span className={`font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {isOverdue ? 'Overdue' : daysUntil === 0 ? 'Due Today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderKinestheticUpcoming = () => (
    <div className="space-y-3">
      {assignments.slice(0, 4).map((assignment, index) => {
        const daysUntil = getDaysUntilDue(assignment.dueDate)
        const isOverdue = daysUntil < 0
        const isUrgent = daysUntil <= 2 && daysUntil >= 0

        return (
          <div
            key={assignment.id}
            className={`relative p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer transform hover:scale-105 ${
              isOverdue
                ? 'border-red-300 bg-red-50 hover:border-red-400'
                : isUrgent
                ? 'border-yellow-300 bg-yellow-50 hover:border-yellow-400'
                : 'border-gray-200 bg-white hover:border-primary-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  isOverdue ? 'bg-red-500' : isUrgent ? 'bg-yellow-500' : 'bg-primary-500'
                }`}>
                  {index + 1}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(assignment.status)}`}>
                  {assignment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {isOverdue ? 'OVERDUE' : daysUntil === 0 ? 'TODAY' : `${daysUntil}D`}
                </div>
              </div>
            </div>
            
            <h4 className="text-sm font-semibold text-gray-900 mb-2">{assignment.title}</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">{assignment.points} pts</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-600 capitalize">{assignment.type}</span>
              </div>
              <button className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                assignment.status === 'not_started'
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : assignment.status === 'in_progress'
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
                {assignment.status === 'not_started' ? 'Start' : 
                 assignment.status === 'in_progress' ? 'Continue' : 'View'}
              </button>
            </div>
          </div>
        )
      })}
      
      {assignments.length > 4 && (
        <button className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-lg p-3 text-sm font-medium transition-all duration-200 transform hover:scale-105">
          View All {assignments.length} Assignments
        </button>
      )}
    </div>
  )

  const renderMixedUpcoming = () => (
    <div className="space-y-3">
      {assignments.slice(0, 3).map((assignment, index) => {
        const daysUntil = getDaysUntilDue(assignment.dueDate)
        const isOverdue = daysUntil < 0
        const isUrgent = daysUntil <= 2 && daysUntil >= 0

        return (
          <div
            key={assignment.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                  isOverdue ? 'bg-red-500' : isUrgent ? 'bg-yellow-500' : 'bg-primary-500'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{assignment.title}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                      {assignment.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{assignment.points} pts</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {isOverdue ? 'Overdue' : daysUntil === 0 ? 'Due Today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(assignment.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 capitalize">{assignment.type}</span>
              <button className="text-primary-600 hover:text-primary-800 text-xs font-medium">
                {assignment.status === 'not_started' ? 'Start →' : 
                 assignment.status === 'in_progress' ? 'Continue →' : 'View →'}
              </button>
            </div>
          </div>
        )
      })}
      
      {assignments.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm">All caught up! No upcoming assignments.</p>
        </div>
      )}
    </div>
  )

  const renderUpcomingContent = () => {
    switch (learningStyle) {
      case 'visual':
        return renderVisualUpcoming()
      case 'auditory':
        return renderAuditoryUpcoming()
      case 'kinesthetic':
        return renderKinestheticUpcoming()
      case 'mixed':
      default:
        return renderMixedUpcoming()
    }
  }

  return (
    <DashboardWidget
      id={id}
      title="Upcoming Assignments"
      isLoading={isLoading}
      error={error}
    >
      {renderUpcomingContent()}
    </DashboardWidget>
  )
}