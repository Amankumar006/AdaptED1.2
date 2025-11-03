import { apiRequest } from './client';
import { 
  Lesson, 
  LessonTemplate, 
  AIContentSuggestion, 
  MediaAsset,
  CollaborationSession,
  ApiResponse,
  PaginatedResponse 
} from '../../types';

export interface CreateLessonRequest {
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  learningObjectives: string[];
  tags: string[];
  templateId?: string;
}

export interface UpdateLessonRequest extends Partial<CreateLessonRequest> {
  modules?: any[];
  status?: string;
}

export interface AIGenerateRequest {
  type: 'outline' | 'content' | 'objectives' | 'assessment';
  topic: string;
  difficulty: string;
  duration?: number;
  context?: string;
  existingContent?: string;
}

export interface MediaUploadRequest {
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  lessonId?: string;
}

// Lesson CRUD operations
export const lessonsAPI = {
  // Get all lessons with pagination and filtering
  getLessons: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    difficulty?: string;
    tags?: string[];
  }): Promise<PaginatedResponse<Lesson>> =>
    apiRequest.get('/lessons', { params }),

  // Get single lesson by ID
  getLesson: (id: string): Promise<ApiResponse<Lesson>> =>
    apiRequest.get(`/lessons/${id}`),

  // Create new lesson
  createLesson: (data: CreateLessonRequest): Promise<ApiResponse<Lesson>> =>
    apiRequest.post('/lessons', data),

  // Update existing lesson
  updateLesson: (id: string, data: UpdateLessonRequest): Promise<ApiResponse<Lesson>> =>
    apiRequest.put(`/lessons/${id}`, data),

  // Delete lesson
  deleteLesson: (id: string): Promise<ApiResponse<void>> =>
    apiRequest.delete(`/lessons/${id}`),

  // Publish lesson
  publishLesson: (id: string): Promise<ApiResponse<Lesson>> =>
    apiRequest.post(`/lessons/${id}/publish`),

  // Duplicate lesson
  duplicateLesson: (id: string, title?: string): Promise<ApiResponse<Lesson>> =>
    apiRequest.post(`/lessons/${id}/duplicate`, { title }),

  // Get lesson versions
  getLessonVersions: (id: string): Promise<ApiResponse<Lesson[]>> =>
    apiRequest.get(`/lessons/${id}/versions`),

  // Restore lesson version
  restoreVersion: (id: string, version: string): Promise<ApiResponse<Lesson>> =>
    apiRequest.post(`/lessons/${id}/versions/${version}/restore`),
};

// Template operations
export const templatesAPI = {
  // Get all templates
  getTemplates: (params?: {
    category?: string;
    difficulty?: string;
    search?: string;
  }): Promise<ApiResponse<LessonTemplate[]>> =>
    apiRequest.get('/templates', { params }),

  // Get template by ID
  getTemplate: (id: string): Promise<ApiResponse<LessonTemplate>> =>
    apiRequest.get(`/templates/${id}`),

  // Create lesson from template
  createFromTemplate: (templateId: string, data: Partial<CreateLessonRequest>): Promise<ApiResponse<Lesson>> =>
    apiRequest.post(`/templates/${templateId}/create-lesson`, data),
};

// AI-powered content generation
export const aiContentAPI = {
  // Generate lesson outline
  generateOutline: (data: AIGenerateRequest): Promise<ApiResponse<AIContentSuggestion>> =>
    apiRequest.post('/ai/generate-outline', data),

  // Generate lesson content
  generateContent: (data: AIGenerateRequest): Promise<ApiResponse<AIContentSuggestion>> =>
    apiRequest.post('/ai/generate-content', data),

  // Generate learning objectives
  generateObjectives: (data: AIGenerateRequest): Promise<ApiResponse<AIContentSuggestion>> =>
    apiRequest.post('/ai/generate-objectives', data),

  // Generate assessment questions
  generateAssessment: (data: AIGenerateRequest): Promise<ApiResponse<AIContentSuggestion>> =>
    apiRequest.post('/ai/generate-assessment', data),

  // Improve existing content
  improveContent: (content: string, instructions?: string): Promise<ApiResponse<AIContentSuggestion>> =>
    apiRequest.post('/ai/improve-content', { content, instructions }),

  // Get content suggestions
  getSuggestions: (lessonId: string, moduleId?: string): Promise<ApiResponse<AIContentSuggestion[]>> =>
    apiRequest.get(`/ai/suggestions/${lessonId}`, { params: { moduleId } }),
};

// Media and asset management
export const mediaAPI = {
  // Upload media file
  uploadMedia: (data: MediaUploadRequest): Promise<ApiResponse<MediaAsset>> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('type', data.type);
    if (data.lessonId) {
      formData.append('lessonId', data.lessonId);
    }

    return apiRequest.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get media assets
  getMediaAssets: (params?: {
    type?: string;
    lessonId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<MediaAsset>> =>
    apiRequest.get('/media', { params }),

  // Delete media asset
  deleteMedia: (id: string): Promise<ApiResponse<void>> =>
    apiRequest.delete(`/media/${id}`),

  // Get media asset details
  getMediaAsset: (id: string): Promise<ApiResponse<MediaAsset>> =>
    apiRequest.get(`/media/${id}`),
};

// Collaboration features
export const collaborationAPI = {
  // Start collaboration session
  startCollaboration: (lessonId: string): Promise<ApiResponse<CollaborationSession>> =>
    apiRequest.post(`/lessons/${lessonId}/collaborate`),

  // Join collaboration session
  joinCollaboration: (sessionId: string): Promise<ApiResponse<CollaborationSession>> =>
    apiRequest.post(`/collaboration/${sessionId}/join`),

  // Leave collaboration session
  leaveCollaboration: (sessionId: string): Promise<ApiResponse<void>> =>
    apiRequest.post(`/collaboration/${sessionId}/leave`),

  // Get collaboration session
  getCollaborationSession: (sessionId: string): Promise<ApiResponse<CollaborationSession>> =>
    apiRequest.get(`/collaboration/${sessionId}`),

  // Update cursor position
  updateCursor: (sessionId: string, moduleId: string, position: number): Promise<ApiResponse<void>> =>
    apiRequest.post(`/collaboration/${sessionId}/cursor`, { moduleId, position }),
};