import { apiClient } from './client'
import { ApiResponse } from '../../types'

export interface LearningAnalytics {
  userId: string
  overallProgress: number
  completedLessons: number
  totalLessons: number
  currentStreak: number
  weeklyGoal: number
  weeklyProgress: number
  timeSpent: number
  averageScore: number
  strongSubjects: string[]
  improvementAreas: string[]
  learningVelocity: number
  retentionRate: number
  engagementScore: number
  optimalStudyTime: string
  recentAchievements: Array<{
    id: string
    title: string
    icon: string
    unlockedAt: string
  }>
  weeklyProgressData: Array<{
    week: string
    timeSpent: number
    lessonsCompleted: number
    engagementScore: number
  }>
  performanceBySubject: Array<{
    subject: string
    score: number
    progress: number
    timeSpent: number
  }>
}

export interface PersonalizationData {
  learningStyleConfidence: {
    visual: number
    auditory: number
    kinesthetic: number
    mixed: number
  }
  preferredContentTypes: string[]
  optimalSessionLength: number
  bestPerformanceTime: string
  difficultyPreference: 'easy' | 'medium' | 'hard' | 'adaptive'
  pacePreference: 'slow' | 'medium' | 'fast' | 'adaptive'
  engagementPatterns: {
    peakEngagementTime: string
    averageSessionLength: number
    preferredBreakFrequency: number
  }
  socialLearningPreference: number // 0-100 scale
  gamificationEffectiveness: number // 0-100 scale
}

export interface DashboardRecommendations {
  widgetRecommendations: Array<{
    widgetId: string
    priority: number
    reason: string
  }>
  layoutRecommendations: {
    suggestedLayout: string
    reason: string
  }
  contentRecommendations: Array<{
    contentId: string
    type: 'lesson' | 'exercise' | 'assessment'
    title: string
    reason: string
    confidence: number
  }>
  studyTimeRecommendations: {
    optimalTimes: string[]
    suggestedDuration: number
    breakFrequency: number
  }
}

class AnalyticsAPI {
  // Get comprehensive learning analytics
  async getLearningAnalytics(timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<LearningAnalytics> {
    const response = await apiClient.get<ApiResponse<LearningAnalytics>>('/analytics/learning', {
      params: { timeframe }
    })
    return response.data
  }

  // Get personalization data based on learning behavior
  async getPersonalizationData(): Promise<PersonalizationData> {
    const response = await apiClient.get<ApiResponse<PersonalizationData>>('/analytics/personalization')
    return response.data
  }

  // Get dashboard-specific recommendations
  async getDashboardRecommendations(): Promise<DashboardRecommendations> {
    const response = await apiClient.get<ApiResponse<DashboardRecommendations>>('/analytics/dashboard-recommendations')
    return response.data
  }

  // Track dashboard interaction events
  async trackDashboardEvent(event: {
    eventType: 'widget_view' | 'widget_interact' | 'layout_change' | 'customization_start' | 'customization_end'
    widgetId?: string
    data?: any
  }): Promise<void> {
    await apiClient.post('/analytics/dashboard-events', event)
  }

  // Get learning style analysis
  async getLearningStyleAnalysis(): Promise<{
    detectedStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
    confidence: number
    evidence: Array<{
      indicator: string
      weight: number
      description: string
    }>
    recommendations: string[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      detectedStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
      confidence: number
      evidence: Array<{
        indicator: string
        weight: number
        description: string
      }>
      recommendations: string[]
    }>>('/analytics/learning-style')
    return response.data
  }

  // Get engagement patterns
  async getEngagementPatterns(timeframe: 'week' | 'month' = 'week'): Promise<{
    dailyEngagement: Array<{
      day: string
      engagementScore: number
      timeSpent: number
      activitiesCompleted: number
    }>
    hourlyPatterns: Array<{
      hour: number
      averageEngagement: number
      sessionCount: number
    }>
    contentTypeEngagement: Array<{
      contentType: string
      engagementScore: number
      completionRate: number
    }>
    peakPerformanceTimes: string[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      dailyEngagement: Array<{
        day: string
        engagementScore: number
        timeSpent: number
        activitiesCompleted: number
      }>
      hourlyPatterns: Array<{
        hour: number
        averageEngagement: number
        sessionCount: number
      }>
      contentTypeEngagement: Array<{
        contentType: string
        engagementScore: number
        completionRate: number
      }>
      peakPerformanceTimes: string[]
    }>>('/analytics/engagement-patterns', {
      params: { timeframe }
    })
    return response.data
  }

  // Get predictive insights
  async getPredictiveInsights(): Promise<{
    riskFactors: Array<{
      factor: string
      riskLevel: 'low' | 'medium' | 'high'
      description: string
      recommendations: string[]
    }>
    successPredictors: Array<{
      predictor: string
      impact: number
      description: string
    }>
    nextBestActions: Array<{
      action: string
      expectedImpact: number
      timeToComplete: number
      priority: 'low' | 'medium' | 'high'
    }>
    learningOutcomePrediction: {
      expectedGrade: number
      confidence: number
      factors: string[]
    }
  }> {
    const response = await apiClient.get<ApiResponse<{
      riskFactors: Array<{
        factor: string
        riskLevel: 'low' | 'medium' | 'high'
        description: string
        recommendations: string[]
      }>
      successPredictors: Array<{
        predictor: string
        impact: number
        description: string
      }>
      nextBestActions: Array<{
        action: string
        expectedImpact: number
        timeToComplete: number
        priority: 'low' | 'medium' | 'high'
      }>
      learningOutcomePrediction: {
        expectedGrade: number
        confidence: number
        factors: string[]
      }
    }>>('/analytics/predictive-insights')
    return response.data
  }

  // Update learning preferences based on behavior
  async updateLearningPreferences(preferences: {
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
    difficultyPreference?: 'easy' | 'medium' | 'hard' | 'adaptive'
    pacePreference?: 'slow' | 'medium' | 'fast' | 'adaptive'
    contentTypePreferences?: string[]
    studyTimePreferences?: string[]
  }): Promise<void> {
    await apiClient.patch('/analytics/learning-preferences', preferences)
  }

  // Get dashboard performance metrics
  async getDashboardMetrics(): Promise<{
    widgetEngagement: Array<{
      widgetId: string
      viewCount: number
      interactionCount: number
      averageTimeSpent: number
      userSatisfaction: number
    }>
    layoutEffectiveness: {
      currentLayout: string
      engagementScore: number
      completionRate: number
      timeToAction: number
    }
    personalizationImpact: {
      beforePersonalization: {
        engagementScore: number
        completionRate: number
        timeSpent: number
      }
      afterPersonalization: {
        engagementScore: number
        completionRate: number
        timeSpent: number
      }
      improvement: {
        engagementImprovement: number
        completionImprovement: number
        efficiencyImprovement: number
      }
    }
  }> {
    const response = await apiClient.get<ApiResponse<{
      widgetEngagement: Array<{
        widgetId: string
        viewCount: number
        interactionCount: number
        averageTimeSpent: number
        userSatisfaction: number
      }>
      layoutEffectiveness: {
        currentLayout: string
        engagementScore: number
        completionRate: number
        timeToAction: number
      }
      personalizationImpact: {
        beforePersonalization: {
          engagementScore: number
          completionRate: number
          timeSpent: number
        }
        afterPersonalization: {
          engagementScore: number
          completionRate: number
          timeSpent: number
        }
        improvement: {
          engagementImprovement: number
          completionImprovement: number
          efficiencyImprovement: number
        }
      }
    }>>('/analytics/dashboard-metrics')
    return response.data
  }
}

export const analyticsAPI = new AnalyticsAPI()
export default analyticsAPI