import { apiClient } from './client'
import { 
  Achievement,
  ApiResponse,
  PaginatedResponse 
} from '../../types'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'learning' | 'collaboration' | 'achievement' | 'milestone'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  points: number
  unlockedAt?: string
  progress: number
  maxProgress: number
  isUnlocked: boolean
}

export interface Leaderboard {
  id: string
  name: string
  type: 'points' | 'streak' | 'completion' | 'collaboration'
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time'
  entries: LeaderboardEntry[]
  userRank?: number
  totalParticipants: number
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  userName: string
  avatar?: string
  score: number
  change: number
  badges: string[]
}

export interface Challenge {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'special'
  category: 'learning' | 'practice' | 'collaboration' | 'streak'
  requirements: ChallengeRequirement[]
  rewards: ChallengeReward[]
  startDate: string
  endDate: string
  progress: number
  maxProgress: number
  isCompleted: boolean
  participantCount: number
}

export interface ChallengeRequirement {
  type: 'complete_lessons' | 'practice_sessions' | 'discussion_posts' | 'study_time' | 'streak_days'
  target: number
  current: number
}

export interface ChallengeReward {
  type: 'points' | 'badge' | 'achievement' | 'unlock'
  value: number | string
  description: string
}

export interface UserStats {
  totalPoints: number
  level: number
  experiencePoints: number
  experienceToNextLevel: number
  streakDays: number
  longestStreak: number
  badgesEarned: number
  achievementsUnlocked: number
  rank: number
  totalUsers: number
  weeklyPoints: number
  monthlyPoints: number
}

export interface Quest {
  id: string
  title: string
  description: string
  storyline: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number
  steps: QuestStep[]
  rewards: ChallengeReward[]
  prerequisites: string[]
  isUnlocked: boolean
  isCompleted: boolean
  progress: number
  maxProgress: number
}

export interface QuestStep {
  id: string
  title: string
  description: string
  type: 'lesson' | 'practice' | 'discussion' | 'collaboration'
  requirements: any
  isCompleted: boolean
  rewards: ChallengeReward[]
}

class GamificationAPI {
  // User Stats and Progress
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<ApiResponse<UserStats>>('/gamification/stats')
    return response.data
  }

  async getUserLevel(): Promise<{
    level: number
    title: string
    experiencePoints: number
    experienceToNextLevel: number
    perks: string[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      level: number
      title: string
      experiencePoints: number
      experienceToNextLevel: number
      perks: string[]
    }>>('/gamification/level')
    return response.data
  }

  // Points and Experience
  async getPointsHistory(params?: {
    timeframe?: 'week' | 'month' | 'quarter' | 'year'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<{
    id: string
    points: number
    reason: string
    category: string
    earnedAt: string
    multiplier?: number
  }>> {
    const response = await apiClient.get<PaginatedResponse<{
      id: string
      points: number
      reason: string
      category: string
      earnedAt: string
      multiplier?: number
    }>>('/gamification/points/history', { params })
    return response
  }

  async awardPoints(data: {
    points: number
    reason: string
    category: string
    contextId?: string
    multiplier?: number
  }): Promise<{
    totalPoints: number
    pointsAwarded: number
    levelUp: boolean
    newLevel?: number
    badgesUnlocked?: Badge[]
  }> {
    const response = await apiClient.post<ApiResponse<{
      totalPoints: number
      pointsAwarded: number
      levelUp: boolean
      newLevel?: number
      badgesUnlocked?: Badge[]
    }>>('/gamification/points/award', data)
    return response.data
  }

  // Badges and Achievements
  async getBadges(params?: {
    category?: 'learning' | 'collaboration' | 'achievement' | 'milestone'
    status?: 'unlocked' | 'locked' | 'in_progress'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Badge>> {
    const response = await apiClient.get<PaginatedResponse<Badge>>('/gamification/badges', { params })
    return response
  }

  async getBadge(badgeId: string): Promise<Badge> {
    const response = await apiClient.get<ApiResponse<Badge>>(`/gamification/badges/${badgeId}`)
    return response.data
  }

  async getAchievements(params?: {
    type?: 'completion' | 'streak' | 'score' | 'participation'
    status?: 'unlocked' | 'locked' | 'in_progress'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Achievement>> {
    const response = await apiClient.get<PaginatedResponse<Achievement>>('/gamification/achievements', { params })
    return response
  }

  // Leaderboards
  async getLeaderboards(): Promise<Leaderboard[]> {
    const response = await apiClient.get<ApiResponse<Leaderboard[]>>('/gamification/leaderboards')
    return response.data
  }

  async getLeaderboard(leaderboardId: string, params?: {
    page?: number
    limit?: number
  }): Promise<Leaderboard> {
    const response = await apiClient.get<ApiResponse<Leaderboard>>(`/gamification/leaderboards/${leaderboardId}`, { params })
    return response.data
  }

  async getUserRanking(leaderboardId: string): Promise<{
    rank: number
    score: number
    percentile: number
    nearbyUsers: LeaderboardEntry[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      rank: number
      score: number
      percentile: number
      nearbyUsers: LeaderboardEntry[]
    }>>(`/gamification/leaderboards/${leaderboardId}/ranking`)
    return response.data
  }

  // Challenges
  async getChallenges(params?: {
    type?: 'daily' | 'weekly' | 'monthly' | 'special'
    category?: 'learning' | 'practice' | 'collaboration' | 'streak'
    status?: 'active' | 'completed' | 'upcoming'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Challenge>> {
    const response = await apiClient.get<PaginatedResponse<Challenge>>('/gamification/challenges', { params })
    return response
  }

  async getChallenge(challengeId: string): Promise<Challenge> {
    const response = await apiClient.get<ApiResponse<Challenge>>(`/gamification/challenges/${challengeId}`)
    return response.data
  }

  async joinChallenge(challengeId: string): Promise<Challenge> {
    const response = await apiClient.post<ApiResponse<Challenge>>(`/gamification/challenges/${challengeId}/join`)
    return response.data
  }

  async updateChallengeProgress(challengeId: string, progress: {
    requirementType: string
    value: number
  }): Promise<Challenge> {
    const response = await apiClient.post<ApiResponse<Challenge>>(`/gamification/challenges/${challengeId}/progress`, progress)
    return response.data
  }

  // Quests
  async getQuests(params?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    status?: 'available' | 'in_progress' | 'completed' | 'locked'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Quest>> {
    const response = await apiClient.get<PaginatedResponse<Quest>>('/gamification/quests', { params })
    return response
  }

  async getQuest(questId: string): Promise<Quest> {
    const response = await apiClient.get<ApiResponse<Quest>>(`/gamification/quests/${questId}`)
    return response.data
  }

  async startQuest(questId: string): Promise<Quest> {
    const response = await apiClient.post<ApiResponse<Quest>>(`/gamification/quests/${questId}/start`)
    return response.data
  }

  async completeQuestStep(questId: string, stepId: string): Promise<{
    quest: Quest
    stepCompleted: QuestStep
    rewards: ChallengeReward[]
    questCompleted: boolean
  }> {
    const response = await apiClient.post<ApiResponse<{
      quest: Quest
      stepCompleted: QuestStep
      rewards: ChallengeReward[]
      questCompleted: boolean
    }>>(`/gamification/quests/${questId}/steps/${stepId}/complete`)
    return response.data
  }

  // Streaks
  async getStreakInfo(): Promise<{
    currentStreak: number
    longestStreak: number
    streakType: 'daily_login' | 'daily_practice' | 'weekly_goals'
    lastActivity: string
    nextMilestone: number
    streakRewards: Array<{
      days: number
      reward: ChallengeReward
      isEarned: boolean
    }>
  }> {
    const response = await apiClient.get<ApiResponse<{
      currentStreak: number
      longestStreak: number
      streakType: 'daily_login' | 'daily_practice' | 'weekly_goals'
      lastActivity: string
      nextMilestone: number
      streakRewards: Array<{
        days: number
        reward: ChallengeReward
        isEarned: boolean
      }>
    }>>('/gamification/streaks')
    return response.data
  }

  async updateStreak(activity: 'login' | 'practice' | 'lesson_complete' | 'goal_achieved'): Promise<{
    streakUpdated: boolean
    currentStreak: number
    rewardEarned?: ChallengeReward
  }> {
    const response = await apiClient.post<ApiResponse<{
      streakUpdated: boolean
      currentStreak: number
      rewardEarned?: ChallengeReward
    }>>('/gamification/streaks/update', { activity })
    return response.data
  }

  // Social Features
  async getGamificationFeed(params?: {
    type?: 'achievements' | 'leaderboard' | 'challenges' | 'all'
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<{
    id: string
    type: 'achievement_unlocked' | 'badge_earned' | 'level_up' | 'challenge_completed' | 'leaderboard_rank'
    userId: string
    userName: string
    avatar?: string
    data: any
    createdAt: string
  }>> {
    const response = await apiClient.get<PaginatedResponse<{
      id: string
      type: 'achievement_unlocked' | 'badge_earned' | 'level_up' | 'challenge_completed' | 'leaderboard_rank'
      userId: string
      userName: string
      avatar?: string
      data: any
      createdAt: string
    }>>('/gamification/feed', { params })
    return response
  }

  async celebrateAchievement(achievementId: string, message?: string): Promise<void> {
    await apiClient.post('/gamification/celebrate', { achievementId, message })
  }

  // Analytics
  async getGamificationAnalytics(params?: {
    timeframe?: 'week' | 'month' | 'quarter' | 'year'
  }): Promise<{
    pointsEarned: number
    badgesUnlocked: number
    challengesCompleted: number
    streakDays: number
    levelProgress: number
    engagementScore: number
    topCategories: Array<{
      category: string
      points: number
      percentage: number
    }>
    progressTrend: Array<{
      date: string
      points: number
      level: number
    }>
  }> {
    const response = await apiClient.get<ApiResponse<{
      pointsEarned: number
      badgesUnlocked: number
      challengesCompleted: number
      streakDays: number
      levelProgress: number
      engagementScore: number
      topCategories: Array<{
        category: string
        points: number
        percentage: number
      }>
      progressTrend: Array<{
        date: string
        points: number
        level: number
      }>
    }>>('/gamification/analytics', { params })
    return response.data
  }
}

export const gamificationAPI = new GamificationAPI()
export default gamificationAPI