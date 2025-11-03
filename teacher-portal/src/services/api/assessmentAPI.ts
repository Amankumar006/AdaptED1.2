import apiClient from './client';
import { ApiResponse, PaginatedResponse } from '../../types';

// Assessment Types
export interface Question {
  id: string;
  type: QuestionType;
  content: QuestionContent;
  options?: QuestionOption[];
  correctAnswer: any;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuestionContent {
  text: string;
  instructions?: string;
  hints?: string[];
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    alt?: string;
  }[];
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: Question[];
  settings: AssessmentSettings;
  status: AssessmentStatus;
  tags: string[];
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentSettings {
  timeLimit?: number;
  allowRetakes: boolean;
  maxAttempts?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  passingScore?: number;
  isAdaptive: boolean;
}

export interface Rubric {
  id: string;
  name: string;
  description: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  points: number;
}

export interface QuestionBank {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  tags: string[];
  organizationId?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuestionType = 
  | 'multiple_choice' 
  | 'essay' 
  | 'code_submission' 
  | 'file_upload' 
  | 'true_false' 
  | 'fill_in_blank' 
  | 'matching' 
  | 'ordering';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AssessmentStatus = 'draft' | 'published' | 'archived';

export interface QuestionBankFilter {
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  tags?: string[];
  createdBy?: string;
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AssessmentFilter {
  status?: AssessmentStatus;
  tags?: string[];
  createdBy?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Assessment API Service
export const assessmentAPI = {
  // Question Bank Management
  async getQuestionBanks(filter?: QuestionBankFilter): Promise<PaginatedResponse<QuestionBank>> {
    const response = await apiClient.get('/api/question-banks', { params: filter });
    return response.data;
  },

  async getQuestionBank(id: string): Promise<ApiResponse<QuestionBank>> {
    const response = await apiClient.get(`/api/question-banks/${id}`);
    return response.data;
  },

  async createQuestionBank(data: Omit<QuestionBank, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<QuestionBank>> {
    const response = await apiClient.post('/api/question-banks', data);
    return response.data;
  },

  async updateQuestionBank(id: string, data: Partial<QuestionBank>): Promise<ApiResponse<QuestionBank>> {
    const response = await apiClient.put(`/api/question-banks/${id}`, data);
    return response.data;
  },

  async deleteQuestionBank(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/api/question-banks/${id}`);
    return response.data;
  },

  // Question Management
  async getQuestions(filter?: QuestionBankFilter): Promise<PaginatedResponse<Question>> {
    const response = await apiClient.get('/api/questions', { params: filter });
    return response.data;
  },

  async getQuestion(id: string): Promise<ApiResponse<Question>> {
    const response = await apiClient.get(`/api/questions/${id}`);
    return response.data;
  },

  async createQuestion(data: Omit<Question, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ApiResponse<Question>> {
    const response = await apiClient.post('/api/questions', data);
    return response.data;
  },

  async updateQuestion(id: string, data: Partial<Question>): Promise<ApiResponse<Question>> {
    const response = await apiClient.put(`/api/questions/${id}`, data);
    return response.data;
  },

  async deleteQuestion(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/api/questions/${id}`);
    return response.data;
  },

  async bulkImportQuestions(file: File, questionBankId?: string): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (questionBankId) {
      formData.append('questionBankId', questionBankId);
    }
    
    const response = await apiClient.post('/api/questions/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async exportQuestions(questionIds: string[], format: 'json' | 'csv' | 'qti'): Promise<Blob> {
    const response = await apiClient.post('/api/questions/export', 
      { questionIds, format },
      { responseType: 'blob' }
    );
    return response.data;
  },

  // Assessment Management
  async getAssessments(filter?: AssessmentFilter): Promise<PaginatedResponse<Assessment>> {
    const response = await apiClient.get('/api/assessments', { params: filter });
    return response.data;
  },

  async getAssessment(id: string): Promise<ApiResponse<Assessment>> {
    const response = await apiClient.get(`/api/assessments/${id}`);
    return response.data;
  },

  async createAssessment(data: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ApiResponse<Assessment>> {
    const response = await apiClient.post('/api/assessments', data);
    return response.data;
  },

  async updateAssessment(id: string, data: Partial<Assessment>): Promise<ApiResponse<Assessment>> {
    const response = await apiClient.put(`/api/assessments/${id}`, data);
    return response.data;
  },

  async deleteAssessment(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/api/assessments/${id}`);
    return response.data;
  },

  async publishAssessment(id: string): Promise<ApiResponse<Assessment>> {
    const response = await apiClient.post(`/api/assessments/${id}/publish`);
    return response.data;
  },

  async duplicateAssessment(id: string, title?: string): Promise<ApiResponse<Assessment>> {
    const response = await apiClient.post(`/api/assessments/${id}/duplicate`, { title });
    return response.data;
  },

  async previewAssessment(id: string): Promise<ApiResponse<Assessment>> {
    const response = await apiClient.get(`/api/assessments/${id}/preview`);
    return response.data;
  },

  // Rubric Management
  async getRubrics(filter?: { search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Rubric>> {
    const response = await apiClient.get('/api/rubrics', { params: filter });
    return response.data;
  },

  async getRubric(id: string): Promise<ApiResponse<Rubric>> {
    const response = await apiClient.get(`/api/rubrics/${id}`);
    return response.data;
  },

  async createRubric(data: Omit<Rubric, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ApiResponse<Rubric>> {
    const response = await apiClient.post('/api/rubrics', data);
    return response.data;
  },

  async updateRubric(id: string, data: Partial<Rubric>): Promise<ApiResponse<Rubric>> {
    const response = await apiClient.put(`/api/rubrics/${id}`, data);
    return response.data;
  },

  async deleteRubric(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/api/rubrics/${id}`);
    return response.data;
  },

  // Assessment Analytics
  async getAssessmentAnalytics(id: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/api/assessments/${id}/analytics`);
    return response.data;
  },

  // Bulk Operations
  async bulkImportAssessments(file: File): Promise<ApiResponse<{ imported: number; errors: string[] }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/assessments/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async exportAssessments(assessmentIds: string[], format: 'json' | 'qti'): Promise<Blob> {
    const response = await apiClient.post('/api/assessments/export', 
      { assessmentIds, format },
      { responseType: 'blob' }
    );
    return response.data;
  },
};