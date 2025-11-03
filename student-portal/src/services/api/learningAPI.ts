import { apiClient } from './client'
import { 
  Lesson, 
  LearningProgress, 
  Assignment, 
  StudySession,
  LearningPath,
  Achievement,
  ApiResponse,
  PaginatedResponse 
} from '../../types'

class LearningAPI {
  // Progress tracking
  async getProgress(): Promise<LearningProgress> {
    const response = await apiClient.get<ApiResponse<LearningProgress>>('/learning/progress')
    return response.data
  }

  async updateProgress(data: {
    lessonId: string
    progress: number
    timeSpent: number
  }): Promise<LearningProgress> {
    const response = await apiClient.post<ApiResponse<LearningProgress>>('/learning/progress', data)
    return response.data
  }

  async getProgressByLesson(lessonId: string): Promise<LearningProgress> {
    const response = await apiClient.get<ApiResponse<LearningProgress>>(`/learning/progress/${lessonId}`)
    return response.data
  }

  // Lessons
  async getLesson(lessonId: string): Promise<Lesson> {
    const response = await apiClient.get<ApiResponse<Lesson>>(`/learning/lessons/${lessonId}`)
    return response.data
  }

  async getLessons(params?: {
    courseId?: string
    page?: number
    limit?: number
    search?: string
    difficulty?: string
    tags?: string[]
  }): Promise<PaginatedResponse<Lesson>> {
    const response = await apiClient.get<PaginatedResponse<Lesson>>('/learning/lessons', {
      params,
    })
    return response
  }

  async getRecommendations(): Promise<Lesson[]> {
    const response = await apiClient.get<ApiResponse<Lesson[]>>('/learning/recommendations')
    return response.data
  }

  async searchLessons(query: string, filters?: {
    difficulty?: string
    duration?: string
    tags?: string[]
  }): Promise<Lesson[]> {
    const response = await apiClient.get<ApiResponse<Lesson[]>>('/learning/lessons/search', {
      params: { query, ...filters },
    })
    return response.data
  }

  // Assignments
  async getAssignments(params?: {
    status?: string
    courseId?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Assignment>> {
    const response = await apiClient.get<PaginatedResponse<Assignment>>('/learning/assignments', {
      params,
    })
    return response
  }

  async getAssignment(assignmentId: string): Promise<Assignment> {
    const response = await apiClient.get<ApiResponse<Assignment>>(`/learning/assignments/${assignmentId}`)
    return response.data
  }

  async submitAssignment(assignmentId: string, submission: {
    content: any
    files?: File[]
  }): Promise<Assignment> {
    const formData = new FormData()
    formData.append('content', JSON.stringify(submission.content))
    
    if (submission.files) {
      submission.files.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })
    }

    const response = await apiClient.post<ApiResponse<Assignment>>(
      `/learning/assignments/${assignmentId}/submit`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  // Study sessions
  async startSession(lessonId: string): Promise<StudySession> {
    const response = await apiClient.post<ApiResponse<StudySession>>('/learning/sessions/start', {
      lessonId,
    })
    return response.data
  }

  async endSession(sessionId: string, data: {
    progress: number
    interactions: any[]
  }): Promise<StudySession> {
    const response = await apiClient.post<ApiResponse<StudySession>>(
      `/learning/sessions/${sessionId}/end`,
      data
    )
    return response.data
  }

  async getSessions(params?: {
    lessonId?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<StudySession>> {
    const response = await apiClient.get<PaginatedResponse<StudySession>>('/learning/sessions', {
      params,
    })
    return response
  }

  // Learning paths
  async getLearningPaths(): Promise<LearningPath[]> {
    const response = await apiClient.get<ApiResponse<LearningPath[]>>('/learning/paths')
    return response.data
  }

  async getLearningPath(pathId: string): Promise<LearningPath> {
    const response = await apiClient.get<ApiResponse<LearningPath>>(`/learning/paths/${pathId}`)
    return response.data
  }

  async enrollInPath(pathId: string): Promise<void> {
    await apiClient.post(`/learning/paths/${pathId}/enroll`)
  }

  async getPathProgress(pathId: string): Promise<{
    pathId: string
    progress: number
    completedLessons: string[]
    currentLesson: string
  }> {
    const response = await apiClient.get<ApiResponse<{
      pathId: string
      progress: number
      completedLessons: string[]
      currentLesson: string
    }>>(`/learning/paths/${pathId}/progress`)
    return response.data
  }

  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    const response = await apiClient.get<ApiResponse<Achievement[]>>('/learning/achievements')
    return response.data
  }

  async getAchievement(achievementId: string): Promise<Achievement> {
    const response = await apiClient.get<ApiResponse<Achievement>>(`/learning/achievements/${achievementId}`)
    return response.data
  }

  // Offline content
  async downloadLesson(lessonId: string): Promise<Lesson> {
    const response = await apiClient.get<ApiResponse<Lesson>>(`/learning/lessons/${lessonId}/download`)
    return response.data
  }

  async syncOfflineData(data: {
    notes: any[]
    bookmarks: string[]
    progress: any
  }): Promise<void> {
    await apiClient.post('/learning/sync', data)
  }

  // Analytics and insights
  async getLearningAnalytics(params?: {
    timeframe?: 'week' | 'month' | 'year'
    courseId?: string
  }): Promise<{
    timeSpent: number
    lessonsCompleted: number
    averageScore: number
    streakDays: number
    strongSubjects: string[]
    improvementAreas: string[]
    weeklyProgress: Array<{
      week: string
      timeSpent: number
      lessonsCompleted: number
    }>
  }> {
    const response = await apiClient.get<ApiResponse<{
      timeSpent: number
      lessonsCompleted: number
      averageScore: number
      streakDays: number
      strongSubjects: string[]
      improvementAreas: string[]
      weeklyProgress: Array<{
        week: string
        timeSpent: number
        lessonsCompleted: number
      }>
    }>>('/learning/analytics', { params })
    return response.data
  }

  async getPerformanceInsights(): Promise<{
    learningVelocity: number
    retentionRate: number
    engagementScore: number
    difficultyPreference: string
    optimalStudyTime: string
    recommendations: string[]
  }> {
    const response = await apiClient.get<ApiResponse<{
      learningVelocity: number
      retentionRate: number
      engagementScore: number
      difficultyPreference: string
      optimalStudyTime: string
      recommendations: string[]
    }>>('/learning/insights')
    return response.data
  }

  // Bookmarks and notes
  async addBookmark(lessonId: string): Promise<void> {
    await apiClient.post('/learning/bookmarks', { lessonId })
  }

  async removeBookmark(lessonId: string): Promise<void> {
    await apiClient.delete(`/learning/bookmarks/${lessonId}`)
  }

  async getBookmarks(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>('/learning/bookmarks')
    return response.data
  }

  async addNote(data: {
    lessonId: string
    content: string
    position?: number
    type?: 'text' | 'highlight' | 'bookmark'
  }): Promise<{ id: string }> {
    const response = await apiClient.post<ApiResponse<{ id: string }>>('/learning/notes', data)
    return response.data
  }

  async updateNote(noteId: string, content: string): Promise<void> {
    await apiClient.patch(`/learning/notes/${noteId}`, { content })
  }

  async deleteNote(noteId: string): Promise<void> {
    await apiClient.delete(`/learning/notes/${noteId}`)
  }

  async getNotes(lessonId?: string): Promise<Array<{
    id: string
    lessonId: string
    content: string
    position?: number
    type: string
    createdAt: string
    updatedAt: string
  }>> {
    const response = await apiClient.get<ApiResponse<Array<{
      id: string
      lessonId: string
      content: string
      position?: number
      type: string
      createdAt: string
      updatedAt: string
    }>>>('/learning/notes', {
      params: lessonId ? { lessonId } : undefined,
    })
    return response.data
  }
}

export const learningAPI = new LearningAPI()
export default learningAPI