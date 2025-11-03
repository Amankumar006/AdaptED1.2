import { apiClient } from './client'
import { 
  ChatMessage, 
  ChatSession, 
  ChatContext,

  ApiResponse 
} from '../../types'

export interface ChatRequest {
  message: string
  sessionId?: string
  context?: Partial<ChatContext>
  attachments?: File[]
  inputType?: 'text' | 'voice' | 'image'
}

export interface ChatResponse {
  message: ChatMessage
  session: ChatSession
  suggestedActions?: Array<{
    type: 'lesson' | 'practice' | 'help' | 'resource'
    label: string
    action: string
    data?: any
  }>
}

export interface VoiceTranscriptionResponse {
  text: string
  confidence: number
  language: string
}

export interface ImageAnalysisResponse {
  description: string
  text?: string
  objects: Array<{
    name: string
    confidence: number
    boundingBox?: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
  isEducational: boolean
  suggestedQuestions: string[]
}

export interface SafetyCheckResponse {
  isSafe: boolean
  flaggedContent?: string[]
  severity: 'low' | 'medium' | 'high'
  action: 'allow' | 'filter' | 'block' | 'escalate'
  reason?: string
}

class AIAPI {
  // Chat functionality
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const formData = new FormData()
    formData.append('message', request.message)
    formData.append('inputType', request.inputType || 'text')
    
    if (request.sessionId) {
      formData.append('sessionId', request.sessionId)
    }
    
    if (request.context) {
      formData.append('context', JSON.stringify(request.context))
    }
    
    if (request.attachments) {
      request.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })
    }

    const response = await apiClient.post<ApiResponse<ChatResponse>>('/ai/chat', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await apiClient.get<ApiResponse<ChatSession>>(`/ai/sessions/${sessionId}`)
    return response.data
  }

  async getChatSessions(params?: {
    page?: number
    limit?: number
    active?: boolean
  }): Promise<{
    sessions: ChatSession[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const response = await apiClient.get<ApiResponse<{
      sessions: ChatSession[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>>('/ai/sessions', { params })
    return response.data
  }

  async createChatSession(context?: Partial<ChatContext>): Promise<ChatSession> {
    const response = await apiClient.post<ApiResponse<ChatSession>>('/ai/sessions', {
      context: context || {}
    })
    return response.data
  }

  async updateChatContext(sessionId: string, context: Partial<ChatContext>): Promise<ChatSession> {
    const response = await apiClient.patch<ApiResponse<ChatSession>>(`/ai/sessions/${sessionId}/context`, {
      context
    })
    return response.data
  }

  async endChatSession(sessionId: string): Promise<void> {
    await apiClient.post(`/ai/sessions/${sessionId}/end`)
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/ai/sessions/${sessionId}`)
  }

  // Voice functionality
  async transcribeAudio(audioFile: File): Promise<VoiceTranscriptionResponse> {
    const formData = new FormData()
    formData.append('audio', audioFile)

    const response = await apiClient.post<ApiResponse<VoiceTranscriptionResponse>>(
      '/ai/voice/transcribe',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  async synthesizeSpeech(text: string, options?: {
    voice?: 'male' | 'female' | 'neutral'
    speed?: number
    language?: string
  }): Promise<Blob> {
    const response = await apiClient.post('/ai/voice/synthesize', {
      text,
      ...options
    }, {
      responseType: 'blob'
    })
    return response as Blob
  }

  // Image analysis
  async analyzeImage(imageFile: File): Promise<ImageAnalysisResponse> {
    const formData = new FormData()
    formData.append('image', imageFile)

    const response = await apiClient.post<ApiResponse<ImageAnalysisResponse>>(
      '/ai/vision/analyze',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  async extractTextFromImage(imageFile: File): Promise<{ text: string; confidence: number }> {
    const formData = new FormData()
    formData.append('image', imageFile)

    const response = await apiClient.post<ApiResponse<{ text: string; confidence: number }>>(
      '/ai/vision/ocr',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  // Safety and moderation
  async checkContentSafety(content: string, context?: {
    userAge?: number
    contentType?: 'text' | 'image' | 'voice'
  }): Promise<SafetyCheckResponse> {
    const response = await apiClient.post<ApiResponse<SafetyCheckResponse>>('/ai/safety/check', {
      content,
      context
    })
    return response.data
  }

  async reportInappropriateContent(data: {
    messageId: string
    reason: string
    description?: string
  }): Promise<void> {
    await apiClient.post('/ai/safety/report', data)
  }

  async escalateToHuman(data: {
    sessionId: string
    reason: string
    urgency: 'low' | 'medium' | 'high'
    context?: string
  }): Promise<{ ticketId: string; estimatedWaitTime: number }> {
    const response = await apiClient.post<ApiResponse<{ ticketId: string; estimatedWaitTime: number }>>(
      '/ai/escalate',
      data
    )
    return response.data
  }

  // Personalization and context
  async updateLearningContext(data: {
    currentLesson?: string
    currentCourse?: string
    strugglingTopics?: string[]
    learningGoals?: string[]
    recentActivity?: Array<{
      type: string
      data: any
      timestamp: number
    }>
  }): Promise<void> {
    await apiClient.post('/ai/context/update', data)
  }

  async getLearningInsights(): Promise<{
    knowledgeGaps: string[]
    strengths: string[]
    recommendedTopics: string[]
    studyPatterns: {
      preferredTime: string
      averageSessionLength: number
      mostActiveSubjects: string[]
    }
    aiInteractionStats: {
      totalQuestions: number
      topCategories: string[]
      satisfactionScore: number
    }
  }> {
    const response = await apiClient.get<ApiResponse<{
      knowledgeGaps: string[]
      strengths: string[]
      recommendedTopics: string[]
      studyPatterns: {
        preferredTime: string
        averageSessionLength: number
        mostActiveSubjects: string[]
      }
      aiInteractionStats: {
        totalQuestions: number
        topCategories: string[]
        satisfactionScore: number
      }
    }>>('/ai/insights')
    return response.data
  }

  // Feedback and improvement
  async rateChatResponse(messageId: string, rating: 1 | 2 | 3 | 4 | 5, feedback?: string): Promise<void> {
    await apiClient.post('/ai/feedback/rate', {
      messageId,
      rating,
      feedback
    })
  }

  async suggestImprovement(data: {
    messageId: string
    suggestion: string
    category: 'accuracy' | 'helpfulness' | 'clarity' | 'safety' | 'other'
  }): Promise<void> {
    await apiClient.post('/ai/feedback/suggest', data)
  }

  // Quick actions and shortcuts
  async getQuickSuggestions(context?: {
    currentLesson?: string
    recentTopics?: string[]
    learningStyle?: string
  }): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>('/ai/suggestions', {
      params: context
    })
    return response.data
  }

  async generatePracticeQuestions(topic: string, difficulty?: 'easy' | 'medium' | 'hard', count?: number): Promise<Array<{
    question: string
    type: 'multiple_choice' | 'true_false' | 'short_answer'
    options?: string[]
    correctAnswer: string
    explanation: string
  }>> {
    const response = await apiClient.post<ApiResponse<Array<{
      question: string
      type: 'multiple_choice' | 'true_false' | 'short_answer'
      options?: string[]
      correctAnswer: string
      explanation: string
    }>>>('/ai/practice/generate', {
      topic,
      difficulty: difficulty || 'medium',
      count: count || 5
    })
    return response.data
  }

  async explainConcept(concept: string, level?: 'beginner' | 'intermediate' | 'advanced'): Promise<{
    explanation: string
    examples: string[]
    relatedConcepts: string[]
    practiceQuestions: string[]
  }> {
    const response = await apiClient.post<ApiResponse<{
      explanation: string
      examples: string[]
      relatedConcepts: string[]
      practiceQuestions: string[]
    }>>('/ai/explain', {
      concept,
      level: level || 'intermediate'
    })
    return response.data
  }

  // Study assistance
  async createStudyPlan(data: {
    subject: string
    timeAvailable: number // minutes per day
    deadline?: string
    currentLevel: 'beginner' | 'intermediate' | 'advanced'
    goals: string[]
  }): Promise<{
    plan: Array<{
      day: number
      topics: string[]
      activities: string[]
      estimatedTime: number
    }>
    totalDays: number
    milestones: Array<{
      day: number
      description: string
      assessment: string
    }>
  }> {
    const response = await apiClient.post<ApiResponse<{
      plan: Array<{
        day: number
        topics: string[]
        activities: string[]
        estimatedTime: number
      }>
      totalDays: number
      milestones: Array<{
        day: number
        description: string
        assessment: string
      }>
    }>>('/ai/study-plan', data)
    return response.data
  }

  async getHomeworkHelp(data: {
    subject: string
    question: string
    attachments?: File[]
    needStepByStep?: boolean
  }): Promise<{
    hint: string
    explanation?: string
    steps?: string[]
    similarProblems: string[]
    resources: Array<{
      title: string
      url: string
      type: 'video' | 'article' | 'practice'
    }>
  }> {
    const formData = new FormData()
    formData.append('subject', data.subject)
    formData.append('question', data.question)
    formData.append('needStepByStep', String(data.needStepByStep || false))
    
    if (data.attachments) {
      data.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file)
      })
    }

    const response = await apiClient.post<ApiResponse<{
      hint: string
      explanation?: string
      steps?: string[]
      similarProblems: string[]
      resources: Array<{
        title: string
        url: string
        type: 'video' | 'article' | 'practice'
      }>
    }>>('/ai/homework-help', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

export const aiAPI = new AIAPI()
export default aiAPI