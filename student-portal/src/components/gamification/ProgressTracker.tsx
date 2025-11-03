import React, { useState, useEffect } from 'react'
import { gamificationAPI, UserStats, Leaderboard } from '../../services/api/gamificationAPI'

interface ProgressTrackerProps {
  compact?: boolean
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  compact = false
}) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [streakInfo, setStreakInfo] = useState<any>(null)
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([])
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProgressData()
  }, [])

  const loadProgressData = async () => {
    setIsLoading(true)
    try {
      const [stats, streak, boards] = await Promise.all([
        gamificationAPI.getUserStats(),
        gamificationAPI.getStreakInfo(),
        gamificationAPI.getLeaderboards()
      ])
      
      setUserStats(stats)
      setStreakInfo(streak)
      setLeaderboards(boards)
      
      if (boards.length > 0) {
        setSelectedLeaderboard(boards[0].id)
      }
    } catch (error) {
      console.error('Failed to load progress data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (compact) {
    return <CompactProgressTracker userStats={userStats} streakInfo={streakInfo} />
  }

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      {userStats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.totalPoints.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.level}</div>
              <div className="text-sm text-gray-600">Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.badgesEarned}</div>
              <div className="text-sm text-gray-600">Badges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{userStats.streakDays}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Level {userStats.level} Progress</span>
              <span>{userStats.experiencePoints}/{userStats.experiencePoints + userStats.experienceToNextLevel} XP</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${(userStats.experiencePoints / (userStats.experiencePoints + userStats.experienceToNextLevel)) * 100}%` 
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {userStats.experienceToNextLevel} XP to next level
            </div>
          </div>

          {/* Rank */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  Rank #{userStats.rank.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  out of {userStats.totalUsers.toLocaleString()} students
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">This week</div>
                <div className="text-lg font-semibold text-blue-600">
                  +{userStats.weeklyPoints} points
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Streak Information */}
      {streakInfo && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Streak</h3>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🔥</div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {streakInfo.currentStreak} days
                </div>
                <div className="text-sm text-gray-600">Current streak</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                {streakInfo.longestStreak} days
              </div>
              <div className="text-sm text-gray-600">Longest streak</div>
            </div>
          </div>

          {/* Streak Milestones */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900 mb-2">
              Next milestone: {streakInfo.nextMilestone} days
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ 
                  width: `${(streakInfo.currentStreak / streakInfo.nextMilestone) * 100}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Streak Rewards */}
          {streakInfo.streakRewards && streakInfo.streakRewards.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-900 mb-2">Streak Rewards</div>
              <div className="flex flex-wrap gap-2">
                {streakInfo.streakRewards.slice(0, 3).map((reward: any, index: number) => (
                  <div
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs ${
                      reward.isEarned
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {reward.days} days: {reward.reward.description}
                    {reward.isEarned && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboards */}
      {leaderboards.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leaderboards</h3>
            <select
              value={selectedLeaderboard}
              onChange={(e) => setSelectedLeaderboard(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {leaderboards.map(board => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          <LeaderboardDisplay 
            leaderboard={leaderboards.find(b => b.id === selectedLeaderboard)} 
          />
        </div>
      )}
    </div>
  )
}

interface CompactProgressTrackerProps {
  userStats: UserStats | null
  streakInfo: any
}

const CompactProgressTracker: React.FC<CompactProgressTrackerProps> = ({
  userStats,
  streakInfo
}) => {
  if (!userStats) return null

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-lg font-semibold text-gray-900">
            Level {userStats.level}
          </div>
          <div className="text-sm text-gray-600">
            {userStats.totalPoints.toLocaleString()} pts
          </div>
        </div>
        {streakInfo && (
          <div className="flex items-center space-x-1 text-orange-600">
            <span>🔥</span>
            <span className="text-sm font-medium">{streakInfo.currentStreak}</span>
          </div>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
          style={{ 
            width: `${(userStats.experiencePoints / (userStats.experiencePoints + userStats.experienceToNextLevel)) * 100}%` 
          }}
        ></div>
      </div>
      
      <div className="text-xs text-gray-600 mt-1">
        {userStats.experienceToNextLevel} XP to level {userStats.level + 1}
      </div>
    </div>
  )
}

interface LeaderboardDisplayProps {
  leaderboard?: Leaderboard
}

const LeaderboardDisplay: React.FC<LeaderboardDisplayProps> = ({ leaderboard }) => {
  if (!leaderboard) return null

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗️'
    if (change < 0) return '↘️'
    return '➡️'
  }

  return (
    <div>
      <div className="text-sm text-gray-600 mb-3">
        {leaderboard.totalParticipants.toLocaleString()} participants
        {leaderboard.userRank && (
          <span className="ml-2">• Your rank: #{leaderboard.userRank}</span>
        )}
      </div>

      <div className="space-y-2">
        {leaderboard.entries.slice(0, 10).map(entry => (
          <div
            key={entry.userId}
            className={`flex items-center justify-between p-3 rounded-lg ${
              entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="text-lg font-semibold">
                {getRankIcon(entry.rank)}
              </div>
              <div className="flex items-center space-x-2">
                {entry.avatar && (
                  <img
                    src={entry.avatar}
                    alt={entry.userName}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="font-medium text-gray-900">{entry.userName}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 flex items-center">
                  {getChangeIcon(entry.change)}
                  <span className="ml-1">{Math.abs(entry.change)}</span>
                </div>
              </div>
              {entry.badges.length > 0 && (
                <div className="flex space-x-1">
                  {entry.badges.slice(0, 3).map((badge, index) => (
                    <div key={index} className="w-4 h-4 bg-yellow-400 rounded-full text-xs flex items-center justify-center">
                      🏆
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}