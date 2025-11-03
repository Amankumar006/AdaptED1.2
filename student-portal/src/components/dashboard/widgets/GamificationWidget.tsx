import React, { useState, useEffect } from 'react'
import { gamificationAPI, UserStats } from '../../../services/api/gamificationAPI'
import { DashboardWidget } from '../DashboardWidget'

export const GamificationWidget: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [streakInfo, setStreakInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadGamificationData()
  }, [])

  const loadGamificationData = async () => {
    setIsLoading(true)
    try {
      const [stats, streak] = await Promise.all([
        gamificationAPI.getUserStats(),
        gamificationAPI.getStreakInfo()
      ])
      setUserStats(stats)
      setStreakInfo(streak)
    } catch (error) {
      console.error('Failed to load gamification data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardWidget title="Your Progress" className="h-48">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </DashboardWidget>
    )
  }

  if (!userStats) {
    return (
      <DashboardWidget title="Your Progress" className="h-48">
        <div className="flex items-center justify-center h-full text-gray-500">
          Unable to load progress data
        </div>
      </DashboardWidget>
    )
  }

  return (
    <DashboardWidget title="Your Progress" className="h-48">
      <div className="space-y-4">
        {/* Level and XP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {userStats.level}
            </div>
            <div>
              <div className="font-semibold text-gray-900">Level {userStats.level}</div>
              <div className="text-sm text-gray-600">{userStats.totalPoints.toLocaleString()} points</div>
            </div>
          </div>
          {streakInfo && (
            <div className="flex items-center space-x-1 text-orange-600">
              <span className="text-lg">🔥</span>
              <span className="font-semibold">{streakInfo.currentStreak}</span>
              <span className="text-sm">days</span>
            </div>
          )}
        </div>

        {/* Level Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress to Level {userStats.level + 1}</span>
            <span>{userStats.experienceToNextLevel} XP needed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(userStats.experiencePoints / (userStats.experiencePoints + userStats.experienceToNextLevel)) * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{userStats.badgesEarned}</div>
            <div className="text-xs text-gray-600">Badges</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">#{userStats.rank}</div>
            <div className="text-xs text-gray-600">Rank</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">{userStats.achievementsUnlocked}</div>
            <div className="text-xs text-gray-600">Achievements</div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-medium text-gray-900">This Week</div>
              <div className="text-xs text-gray-600">Keep up the great work!</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-orange-600">+{userStats.weeklyPoints}</div>
              <div className="text-xs text-gray-600">points earned</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardWidget>
  )
}