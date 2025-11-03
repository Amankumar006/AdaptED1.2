export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

export enum QueryType {
  GENERAL_QUESTION = 'general_question',
  HOMEWORK_HELP = 'homework_help',
  CONCEPT_EXPLANATION = 'concept_explanation',
  PROBLEM_SOLVING = 'problem_solving',
  CREATIVE_WRITING = 'creative_writing',
  CODE_ASSISTANCE = 'code_assistance',
  MATH_PROBLEM = 'math_problem',
  LANGUAGE_LEARNING = 'language_learning',
}

export enum InputType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  MULTIMODAL = 'multimodal',
}

export enum SafetyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface LLMRequest {
  id: string;
  userId: string;
  sessionId: string;
  query: string;
  queryType: QueryType;
  inputType: InputType;
  context?: ConversationContext;
  courseContext?: CourseContext;
  userProfile?: UserProfile;
  timestamp: Date;
}

export interface LLMResponse {
  id: string;
  requestId: string;
  response: string;
  provider: LLMProvider;
  model: string;
  confidence: number;
  safetyLevel: SafetyLevel;
  tokensUsed: number;
  responseTime: number;
  cached: boolean;
  timestamp: Date;
  metadata?: ResponseMetadata;
}

export interface ConversationContext {
  conversationId: string;
  history: ConversationMessage[];
  topic?: string;
  subject?: string;
  gradeLevel?: string;
  learningObjectives?: string[];
  learningInsights?: any;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface CourseContext {
  courseId: string;
  courseName: string;
  subject: string;
  gradeLevel: string;
  currentLesson?: string;
  learningObjectives: string[];
  materials: CourseMaterial[];
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'lesson' | 'exercise' | 'reading' | 'video' | 'document';
  content: string;
  relevanceScore?: number;
}

export interface UserProfile {
  userId: string;
  age?: number;
  gradeLevel?: string;
  learningStyle?: string;
  subjects: string[];
  language: string;
  timezone: string;
  parentalControls?: ParentalControls;
}

export interface ParentalControls {
  enabled: boolean;
  restrictedTopics: string[];
  timeRestrictions?: TimeRestriction[];
  contentFilterLevel: 'strict' | 'moderate' | 'basic';
}

export interface TimeRestriction {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ResponseMetadata {
  sources?: string[];
  citations?: Citation[];
  suggestedFollowUps?: string[];
  escalationRecommended?: boolean;
  contentWarnings?: string[];
  safetyChecks?: SafetyCheck[];
  moderationResult?: any;
}

export interface Citation {
  source: string;
  title: string;
  url?: string;
  relevance: number;
}

export interface MessageMetadata {
  inputType: InputType;
  processingTime: number;
  safetyChecks: SafetyCheck[];
  modelUsed: string;
  provider: LLMProvider;
}

export interface SafetyCheck {
  type: string;
  passed: boolean;
  confidence: number;
  details?: string;
}

export interface ModelCapabilities {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  supportsImages: boolean;
  supportsAudio: boolean;
  supportsCode: boolean;
  languages: string[];
  specialties: QueryType[];
  costPerToken: number;
  averageResponseTime: number;
}

export interface CacheKey {
  query: string;
  context: string;
  userProfile: string;
  provider: LLMProvider;
  model: string;
}

export interface EscalationEvent {
  id: string;
  userId: string;
  sessionId: string;
  requestId: string;
  reason: string;
  severity: SafetyLevel;
  teacherId?: string;
  resolved: boolean;
  timestamp: Date;
}

export interface MultiModalInput {
  text?: string;
  audioData?: Buffer;
  imageData?: Buffer;
  audioFormat?: string;
  imageFormat?: string;
  transcription?: string;
  imageDescription?: string;
}