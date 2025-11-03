export interface LearningEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  eventData: EventData;
  timestamp: Date;
  context: EventContext;
  metadata?: Record<string, any>;
}

export enum EventType {
  // Content interaction events
  CONTENT_VIEW = 'content_view',
  CONTENT_COMPLETE = 'content_complete',
  CONTENT_PAUSE = 'content_pause',
  CONTENT_RESUME = 'content_resume',
  CONTENT_SEEK = 'content_seek',
  
  // Assessment events
  ASSESSMENT_START = 'assessment_start',
  ASSESSMENT_SUBMIT = 'assessment_submit',
  ASSESSMENT_COMPLETE = 'assessment_complete',
  QUESTION_ANSWER = 'question_answer',
  
  // Learning events
  LESSON_START = 'lesson_start',
  LESSON_COMPLETE = 'lesson_complete',
  EXERCISE_ATTEMPT = 'exercise_attempt',
  EXERCISE_COMPLETE = 'exercise_complete',
  
  // Engagement events
  LOGIN = 'login',
  LOGOUT = 'logout',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  
  // Collaboration events
  DISCUSSION_POST = 'discussion_post',
  PEER_INTERACTION = 'peer_interaction',
  GROUP_ACTIVITY = 'group_activity',
  
  // AI interaction events
  AI_CHAT_START = 'ai_chat_start',
  AI_QUESTION_ASK = 'ai_question_ask',
  AI_RESPONSE_RECEIVE = 'ai_response_receive',
}

export interface EventData {
  contentId?: string;
  assessmentId?: string;
  questionId?: string;
  lessonId?: string;
  exerciseId?: string;
  score?: number;
  duration?: number;
  progress?: number;
  difficulty?: string;
  answer?: any;
  correct?: boolean;
  attempts?: number;
  [key: string]: any;
}

export interface EventContext {
  courseId?: string;
  organizationId?: string;
  deviceType: string;
  platform: string;
  userAgent: string;
  ipAddress: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  learningStyle?: string;
  userRole: string;
}

export interface LearningMetrics {
  userId: string;
  timeSpent: number;
  completionRate: number;
  engagementScore: number;
  masteryLevel: number;
  strugglingIndicators: string[];
  learningVelocity: number;
  retentionScore: number;
  collaborationScore: number;
  aiInteractionScore: number;
  lastUpdated: Date;
}

export interface AnalyticsAggregation {
  id: string;
  level: AnalyticsLevel;
  entityId: string; // userId, classId, or organizationId
  timeframe: TimeFrame;
  metrics: AggregatedMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export enum AnalyticsLevel {
  MICRO = 'micro', // Individual student
  MESO = 'meso',   // Classroom/cohort
  MACRO = 'macro', // Institutional
}

export interface TimeFrame {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AggregatedMetrics {
  totalUsers?: number;
  activeUsers?: number;
  totalSessions?: number;
  avgSessionDuration?: number;
  totalTimeSpent?: number;
  completionRates?: {
    lessons: number;
    assessments: number;
    courses: number;
  };
  engagementMetrics?: {
    avgEngagementScore: number;
    peakEngagementTime: string;
    dropoffPoints: string[];
  };
  performanceMetrics?: {
    avgScore: number;
    passRate: number;
    improvementRate: number;
  };
  collaborationMetrics?: {
    discussionPosts: number;
    peerInteractions: number;
    groupActivities: number;
  };
  aiInteractionMetrics?: {
    totalQuestions: number;
    avgResponseTime: number;
    satisfactionScore: number;
  };
  [key: string]: any;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  features: string[];
  accuracy: number;
  lastTrained: Date;
  isActive: boolean;
  parameters: Record<string, any>;
}

export enum ModelType {
  RISK_PREDICTION = 'risk_prediction',
  OUTCOME_FORECASTING = 'outcome_forecasting',
  RECOMMENDATION = 'recommendation',
  ENGAGEMENT_PREDICTION = 'engagement_prediction',
  PERFORMANCE_PREDICTION = 'performance_prediction',
}

export interface Prediction {
  id: string;
  modelId: string;
  userId: string;
  predictionType: ModelType;
  prediction: any;
  confidence: number;
  features: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  contentId?: string;
  title: string;
  description: string;
  reason: string;
  confidence: number;
  priority: number;
  createdAt: Date;
  expiresAt: Date;
  isViewed: boolean;
  isAccepted?: boolean;
}

export enum RecommendationType {
  CONTENT = 'content',
  EXERCISE = 'exercise',
  ASSESSMENT = 'assessment',
  STUDY_GROUP = 'study_group',
  LEARNING_PATH = 'learning_path',
  REMEDIATION = 'remediation',
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  level: AnalyticsLevel;
  filters: ReportFilters;
  visualizations: Visualization[];
  schedule?: ReportSchedule;
  recipients: string[];
  createdBy: string;
  createdAt: Date;
  lastGenerated?: Date;
}

export enum ReportType {
  PERFORMANCE = 'performance',
  ENGAGEMENT = 'engagement',
  PROGRESS = 'progress',
  COMPARISON = 'comparison',
  TREND = 'trend',
  CUSTOM = 'custom',
}

export interface ReportFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  userIds?: string[];
  courseIds?: string[];
  organizationIds?: string[];
  userRoles?: string[];
  contentTypes?: string[];
  [key: string]: any;
}

export interface Visualization {
  id: string;
  type: VisualizationType;
  title: string;
  dataSource: string;
  configuration: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export enum VisualizationType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  SCATTER_PLOT = 'scatter_plot',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  METRIC_CARD = 'metric_card',
  GAUGE = 'gauge',
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string; // HH:MM format
  timezone: string;
  isActive: boolean;
}

export interface DataExport {
  id: string;
  name: string;
  format: ExportFormat;
  filters: ReportFilters;
  status: ExportStatus;
  fileUrl?: string;
  recordCount?: number;
  fileSize?: number;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  JSON = 'json',
  PDF = 'pdf',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface AnalyticsAlert {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  threshold: number;
  isActive: boolean;
  recipients: string[];
  lastTriggered?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow: number; // in minutes
  aggregation: 'avg' | 'sum' | 'count' | 'min' | 'max';
}

export interface ProcessingJob {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  data: Record<string, any>;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export enum JobType {
  EVENT_PROCESSING = 'event_processing',
  METRICS_CALCULATION = 'metrics_calculation',
  MODEL_TRAINING = 'model_training',
  PREDICTION_GENERATION = 'prediction_generation',
  REPORT_GENERATION = 'report_generation',
  DATA_EXPORT = 'data_export',
  DATA_ARCHIVAL = 'data_archival',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}