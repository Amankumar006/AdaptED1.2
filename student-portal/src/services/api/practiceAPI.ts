import { apiClient } from './client'
import { 
  PracticeSession, 
  PracticeQuestion,
  ApiResponse,
  PaginatedResponse 
} from '../../types'

export interface PracticeGenerationRequest {
  topicId: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  questionTypes?: ('multiple_choice' | 'true_false' | 'fill_blank' | 'essay')[]
}

export interface PracticeStats {
  totalSessions: number
  averageScore: number
  timeSpent: number
  strongTopics: string[]
  improvementAreas: string[]
  streakDays: number
  weeklyProgress: Array<{
    week: string
    sessionsCompleted: number
    averageScore: number
  }>
}

class PracticeAPI {
  // Practice session management
  async generatePracticeSession(request: PracticeGenerationRequest): Promise<PracticeSession> {
    const response = await apiClient.post<ApiResponse<PracticeSession>>('/practice/generate', request)
    return response.data
  }

  async startPracticeSession(sessionId: string): Promise<PracticeSession> {
    const response = await apiClient.post<ApiResponse<PracticeSession>>(`/practice/sessions/${sessionId}/start`)
    return response.data
  }

  async submitAnswer(sessionId: string, questionId: string, answer: any): Promise<{
    isCorrect: boolean
    explanation: string
    correctAnswer: any
  }> {
    const response = await apiClient.post<ApiResponse<{
      isCorrect: boolean
      explanation: string
      correctAnswer: any
    }>>(`/practice/sessions/${sessionId}/questions/${questionId}/answer`, { answer })
    return response.data
  }

  async completePracticeSession(sessionId: string): Promise<PracticeSession> {
    const response = await apiClient.post<ApiResponse<PracticeSession>>(`/practice/sessions/${sessionId}/complete`)
    return response.data
  }

  async getPracticeSessions(params?: {
    topicId?: string
    page?: number
    limit?: number
    dateFrom?: string
    dateTo?: string
  }): Promise<PaginatedResponse<PracticeSession>> {
    const response = await apiClient.get<PaginatedResponse<PracticeSession>>('/practice/sessions', {
      params,
    })
    return response
  }

  async getPracticeSession(sessionId: string): Promise<PracticeSession> {
    const response = await apiClient.get<ApiResponse<PracticeSession>>(`/practice/sessions/${sessionId}`)
    return response.data
  }

  // Practice statistics and analytics
  async getPracticeStats(params?: {
    timeframe?: 'week' | 'month' | 'quarter' | 'year'
    topicId?: string
  }): Promise<PracticeStats> {
    const response = await apiClient.get<ApiResponse<PracticeStats>>('/practice/stats', {
      params,
    })
    return response.data
  }

  async getTopicRecommendations(): Promise<Array<{
    topicId: string
    topicName: string
    difficulty: 'easy' | 'medium' | 'hard'
    reason: string
    estimatedTime: number
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      topicId: string
      topicName: string
      difficulty: 'easy' | 'medium' | 'hard'
      reason: string
      estimatedTime: number
    }>>>('/practice/recommendations')
    return response.data
  }

  // Flashcards
  async getFlashcards(topicId: string): Promise<Array<{
    id: string
    front: string
    back: string
    difficulty: number
    lastReviewed?: string
    nextReview?: string
    reviewCount: number
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      id: string
      front: string
      back: string
      difficulty: number
      lastReviewed?: string
      nextReview?: string
      reviewCount: number
    }>>>(`/practice/flashcards/${topicId}`)
    return response.data
  }

  async reviewFlashcard(cardId: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<{
    nextReview: string
    interval: number
  }> {
    const response = await apiClient.post<ApiResponse<{
      nextReview: string
      interval: number
    }>>(`/practice/flashcards/${cardId}/review`, { difficulty })
    return response.data
  }

  async createCustomFlashcard(data: {
    topicId: string
    front: string
    back: string
  }): Promise<{ id: string }> {
    const response = await apiClient.post<ApiResponse<{ id: string }>>('/practice/flashcards', data)
    return response.data
  }

  async updateFlashcard(cardId: string, data: {
    front?: string
    back?: string
  }): Promise<void> {
    await apiClient.patch(`/practice/flashcards/${cardId}`, data)
  }

  async deleteFlashcard(cardId: string): Promise<void> {
    await apiClient.delete(`/practice/flashcards/${cardId}`)
  }

  // Problem solving
  async generateProblem(params: {
    topicId: string
    difficulty: 'easy' | 'medium' | 'hard'
    type: 'step_by_step' | 'open_ended' | 'scenario'
  }): Promise<{
    id: string
    problem: string
    hints: string[]
    solution: string
    steps: Array<{
      step: number
      description: string
      explanation: string
    }>
  }> {
    const response = await apiClient.post<ApiResponse<{
      id: string
      problem: string
      hints: string[]
      solution: string
      steps: Array<{
        step: number
        description: string
        explanation: string
      }>
    }>>('/practice/problems/generate', params)
    return response.data
  }

  async submitProblemSolution(problemId: string, solution: string): Promise<{
    score: number
    feedback: string
    correctSolution: string
    improvements: string[]
  }> {
    const response = await apiClient.post<ApiResponse<{
      score: number
      feedback: string
      correctSolution: string
      improvements: string[]
    }>>(`/practice/problems/${problemId}/submit`, { solution })
    return response.data
  }

  async getHint(problemId: string, hintIndex: number): Promise<{
    hint: string
    penaltyApplied: boolean
  }> {
    const response = await apiClient.post<ApiResponse<{
      hint: string
      penaltyApplied: boolean
    }>>(`/practice/problems/${problemId}/hints/${hintIndex}`)
    return response.data
  }
}

export const practiceAPI = new PracticeAPI()
export default practiceAPI