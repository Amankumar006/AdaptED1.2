import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../store'
import { DashboardWidget } from '../DashboardWidget'

interface ProgressData {
  overallProgress: number
  completedLessons: number
  totalLessons: number
  currentStreak: number
  weeklyGoal: number
  weeklyProgress: number
  recentAchievements: Array<{
    id: string
    title: string
    icon: string
    unlockedAt: string
  }>
}

interface ProgressWidgetProps {
  id: string
  data?: ProgressData
  isLoading?: boolean
  error?: string
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  analytics?: any
  personalizationData?: any
}

export const ProgressWidget: React.FC<ProgressWidgetProps> = ({
  id,
  data,
  isLoading,
  error,
  learningStyle,
  analytics,
  personalizationData,
}) => {
  const { user } = useSelector((state: RootState) => state.auth)

  // Use analytics data if available, otherwise use provided data or mock data
  const progressData: ProgressData = data || (analytics ? {
    overallProgress: analytics.overallProgress || 68,
    completedLessons: analytics.completedLessons || 12,
    totalLessons: analytics.totalLessons || 18,
    currentStreak: analytics.currentStreak || 7,
    weeklyGoal: analytics.weeklyGoal || 5,
    weeklyProgress: analytics.weeklyProgress || 3,
    recentAchievements: analytics.recentAchievements || [
      { id: '1', title: 'Week Warrior', icon: '🔥', unlockedAt: '2024-01-15' },
      { id: '2', title: 'Quick Learner', icon: '⚡', unlockedAt: '2024-01-14' },
    ],
  } : {
    overallProgress: 68,
    completedLessons: 12,
    totalLessons: 18,
    currentStreak: 7,
    weeklyGoal: 5,
    weeklyProgress: 3,
    recentAchievements: [
      { id: '1', title: 'Week Warrior', icon: '🔥', unlockedAt: '2024-01-15' },
      { id: '2', title: 'Quick Learner', icon: '⚡', unlockedAt: '2024-01-14' },
    ],
  })

  const renderVisualProgress = () => (
    <div className="space-y-4">
      {/* Circular Progress */}
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressData.overallProgress / 100)}`}
              className="text-primary-600 transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{progressData.overallProgress}%</span>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-primary-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-primary-600">{progressData.completedLessons}</div>
          <div className="text-xs text-primary-700">Lessons Done</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-600">{progressData.currentStreak}</div>
          <div className="text-xs text-yellow-700">Day Streak</div>
        </div>
      </div>

      {/* Weekly Goal */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Weekly Goal</span>
          <span className="text-sm text-gray-500">{progressData.weeklyProgress}/{progressData.weeklyGoal}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(progressData.weeklyProgress / progressData.weeklyGoal) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )

  const renderAuditoryProgress = () => (
    <div className="space-y-4">
      {/* Text-based progress with audio cues */}
      <div className="text-center">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          Great progress, {user?.firstName}! 🎉
        </h4>
        <p className="text-gray-600">
          You've completed {progressData.completedLessons} out of {progressData.totalLessons} lessons
        </p>
      </div>

      {/* Progress bar with sound indicators */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Overall Progress</span>
          <span>{progressData.overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-500 relative"
            style={{ width: `${progressData.overallProgress}%` }}
          >
            <div className="absolute right-0 top-0 h-full w-1 bg-primary-800 rounded-r-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Achievements with descriptions */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium text-gray-700">Recent Achievements</h5>
        {progressData.recentAchievements.map((achievement) => (
          <div key={achievement.id} className="flex items-center space-x-2 text-sm">
            <span className="text-lg">{achievement.icon}</span>
            <span className="text-gray-900">{achievement.title}</span>
            <span className="text-gray-500">unlocked</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderKinestheticProgress = () => (
    <div className="space-y-4">
      {/* Interactive progress elements */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: progressData.totalLessons }, (_, i) => (
          <div
            key={i}
            className={`h-8 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:scale-105 ${
              i < progressData.completedLessons
                ? 'bg-green-500 border-green-600 shadow-md'
                : 'bg-gray-100 border-gray-300'
            }`}
            title={`Lesson ${i + 1} ${i < progressData.completedLessons ? 'completed' : 'pending'}`}
          />
        ))}
      </div>

      {/* Interactive streak counter */}
      <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{progressData.currentStreak} 🔥</div>
            <div className="text-sm opacity-90">Day Streak</div>
          </div>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg p-3 text-sm font-medium transition-colors">
          Continue Learning
        </button>
        <button className="bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg p-3 text-sm font-medium transition-colors">
          View Details
        </button>
      </div>
    </div>
  )

  const renderMixedProgress = () => (
    <div className="space-y-4">
      {/* Combination of visual and interactive elements */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-200" />
              <circle
                cx="50"
                cy="50"
                r="35"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - progressData.overallProgress / 100)}`}
                className="text-primary-600 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-900">{progressData.overallProgress}%</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{progressData.completedLessons}/{progressData.totalLessons}</div>
            <div className="text-sm text-gray-600">Lessons completed</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-yellow-600">{progressData.currentStreak} 🔥</div>
          <div className="text-sm text-gray-600">Day streak</div>
        </div>
      </div>

      {/* Interactive weekly goal */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">This Week's Goal</span>
          <span className="text-sm text-indigo-600 font-medium">{progressData.weeklyProgress}/{progressData.weeklyGoal}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(progressData.weeklyProgress / progressData.weeklyGoal) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Keep going!</span>
          <span>{progressData.weeklyGoal - progressData.weeklyProgress} more to go</span>
        </div>
      </div>
    </div>
  )

  const renderProgressContent = () => {
    switch (learningStyle) {
      case 'visual':
        return renderVisualProgress()
      case 'auditory':
        return renderAuditoryProgress()
      case 'kinesthetic':
        return renderKinestheticProgress()
      case 'mixed':
      default:
        return renderMixedProgress()
    }
  }

  return (
    <DashboardWidget
      id={id}
      title="Learning Progress"
      isLoading={isLoading}
      error={error}
    >
      {renderProgressContent()}
    </DashboardWidget>
  )
}