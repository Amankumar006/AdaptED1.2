import { apiClient } from './client';

// Pilot-specific API endpoints and types
export interface PilotCohort {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  participants: PilotParticipant[];
  status: 'active' | 'completed' | 'paused';
}

export interface PilotParticipant {
  id: string;
  userId: string;
  cohortId: string;
  role: 'student' | 'teacher' | 'observer';
  joinedAt: string;
  status: 'active' | 'inactive' | 'completed';
  demographics: {
    ageGroup: string;
    educationLevel: string;
    techExperience: string;
    learningStyle: string;
  };
}

export interface PilotFeedback {
  id?: string;
  userId: string;
  cohortId: string;
  sessionId: string;
  feedbackType: 'usability' | 'feature' | 'bug' | 'suggestion' | 'satisfaction';
  rating: number; // 1-5 scale
  comment: string;
  category: string;
  timestamp: string;
  metadata: {
    page: string;
    feature: string;
    userAgent: string;
    sessionDuration: number;
  };
}

export interface EngagementMetrics {
  userId: string;
  cohortId: string;
  sessionId: string;
  metrics: {
    sessionDuration: number;
    pagesVisited: number;
    featuresUsed: string[];
    interactionCount: number;
    completionRate: number;
    errorCount: number;
    helpRequestCount: number;
    buddyAIInteractions: number;
    offlineUsage: number;
  };
  timestamp: string;
}

export interface PilotSession {
  id: string;
  cohortId: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  facilitator: string;
  participants: string[];
  objectives: string[];
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  feedback: PilotFeedback[];
  metrics: EngagementMetrics[];
}

export interface BuddyAIValidation {
  sessionId: string;
  userId: string;
  interactions: {
    id: string;
    query: string;
    response: string;
    responseTime: number;
    accuracy: number;
    helpfulness: number;
    safety: boolean;
    escalated: boolean;
    timestamp: string;
  }[];
  overallSatisfaction: number;
  issuesReported: string[];
}

export interface LearningWorkflowValidation {
  userId: string;
  workflowType: 'lesson-completion' | 'assessment-taking' | 'practice-session' | 'collaboration';
  steps: {
    stepId: string;
    stepName: string;
    startTime: string;
    endTime: string;
    success: boolean;
    errors: string[];
    userFeedback: string;
  }[];
  overallSuccess: boolean;
  completionTime: number;
  usabilityScore: number;
}

class PilotAPI {
  // Cohort Management
  async getCohorts(): Promise<PilotCohort[]> {
    const response = await apiClient.get('/pilot/cohorts');
    return response.data;
  }

  async getCohort(cohortId: string): Promise<PilotCohort> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}`);
    return response.data;
  }

  async joinCohort(cohortId: string, participantData: Partial<PilotParticipant>): Promise<PilotParticipant> {
    const response = await apiClient.post(`/pilot/cohorts/${cohortId}/join`, participantData);
    return response.data;
  }

  // Feedback Collection
  async submitFeedback(feedback: Omit<PilotFeedback, 'id' | 'timestamp'>): Promise<PilotFeedback> {
    const response = await apiClient.post('/pilot/feedback', {
      ...feedback,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  }

  async getFeedback(cohortId: string, filters?: {
    userId?: string;
    feedbackType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PilotFeedback[]> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}/feedback`, {
      params: filters,
    });
    return response.data;
  }

  // Engagement Metrics
  async trackEngagement(metrics: Omit<EngagementMetrics, 'timestamp'>): Promise<void> {
    await apiClient.post('/pilot/engagement', {
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  async getEngagementMetrics(cohortId: string, userId?: string): Promise<EngagementMetrics[]> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}/engagement`, {
      params: userId ? { userId } : {},
    });
    return response.data;
  }

  // Session Management
  async getSessions(cohortId: string): Promise<PilotSession[]> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}/sessions`);
    return response.data;
  }

  async createSession(session: Omit<PilotSession, 'id' | 'feedback' | 'metrics'>): Promise<PilotSession> {
    const response = await apiClient.post('/pilot/sessions', session);
    return response.data;
  }

  async updateSessionStatus(sessionId: string, status: PilotSession['status']): Promise<PilotSession> {
    const response = await apiClient.patch(`/pilot/sessions/${sessionId}`, { status });
    return response.data;
  }

  // BuddyAI Validation
  async validateBuddyAI(validation: BuddyAIValidation): Promise<void> {
    await apiClient.post('/pilot/buddyai/validation', validation);
  }

  async getBuddyAIValidation(cohortId: string): Promise<BuddyAIValidation[]> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}/buddyai-validation`);
    return response.data;
  }

  // Learning Workflow Validation
  async validateLearningWorkflow(validation: LearningWorkflowValidation): Promise<void> {
    await apiClient.post('/pilot/learning-workflow/validation', validation);
  }

  async getLearningWorkflowValidation(cohortId: string): Promise<LearningWorkflowValidation[]> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}/workflow-validation`);
    return response.data;
  }

  // Training and Onboarding
  async getOnboardingProgress(userId: string): Promise<{
    completedSteps: string[];
    totalSteps: number;
    currentStep: string;
    completionPercentage: number;
  }> {
    const response = await apiClient.get(`/pilot/onboarding/${userId}`);
    return response.data;
  }

  async completeOnboardingStep(userId: string, stepId: string): Promise<void> {
    await apiClient.post(`/pilot/onboarding/${userId}/complete`, { stepId });
  }

  // Pilot Analytics
  async getPilotAnalytics(cohortId: string): Promise<{
    participantCount: number;
    activeUsers: number;
    completionRates: Record<string, number>;
    averageEngagement: number;
    feedbackSummary: {
      averageRating: number;
      totalFeedback: number;
      categoryBreakdown: Record<string, number>;
    };
    issuesSummary: {
      totalIssues: number;
      resolvedIssues: number;
      criticalIssues: number;
    };
  }> {
    const response = await apiClient.get(`/pilot/cohorts/${cohortId}/analytics`);
    return response.data;
  }
}

export const pilotAPI = new PilotAPI();