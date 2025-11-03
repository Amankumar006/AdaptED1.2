// Common types used across the application

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId?: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

// UI Types
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface TableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: any) => React.ReactNode;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

// Lesson and Content Types
export interface Lesson {
  id: string;
  title: string;
  description: string;
  modules: LessonModule[];
  prerequisites: string[];
  learningObjectives: string[];
  estimatedDuration: number;
  difficulty: DifficultyLevel;
  tags: string[];
  status: ContentStatus;
  authorId: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  isPublished: boolean;
}

export interface LessonModule {
  id: string;
  title: string;
  type: ModuleType;
  content: ModuleContent;
  order: number;
  duration: number;
}

export interface ModuleContent {
  text?: string;
  html?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  interactiveElements?: InteractiveElement[];
  metadata?: Record<string, any>;
}

export interface InteractiveElement {
  id: string;
  type: 'quiz' | 'poll' | 'annotation' | 'bookmark' | 'discussion';
  position: number;
  data: Record<string, any>;
}

export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  modules: Partial<LessonModule>[];
  tags: string[];
  difficulty: DifficultyLevel;
  estimatedDuration: number;
}

export interface AIContentSuggestion {
  type: 'outline' | 'content' | 'objectives' | 'assessment';
  content: string;
  confidence: number;
  sources?: string[];
}

export interface CollaborationSession {
  id: string;
  lessonId: string;
  participants: CollaborationParticipant[];
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface CollaborationParticipant {
  userId: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  cursor?: {
    moduleId: string;
    position: number;
  };
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  uploadedAt: Date;
  uploadedBy: string;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';
export type ModuleType = 'text' | 'video' | 'audio' | 'image' | 'interactive' | 'assessment' | 'file';
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'presentation' | '3d-model';

// Student Management Types
export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  enrollmentDate: Date;
  status: StudentStatus;
  grade?: string;
  classrooms: string[];
  parentGuardians: ParentGuardian[];
  learningProfile: LearningProfile;
  progressSummary: ProgressSummary;
  lastActivity: Date;
  riskScore?: number;
  tags: string[];
}

export interface ParentGuardian {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  relationship: 'parent' | 'guardian' | 'emergency_contact';
  isPrimary: boolean;
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    phone: boolean;
  };
}

export interface LearningProfile {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  strengths: string[];
  challenges: string[];
  accommodations: string[];
  interests: string[];
  preferredLanguage: string;
}

export interface ProgressSummary {
  overallProgress: number;
  completedLessons: number;
  totalLessons: number;
  averageScore: number;
  engagementScore: number;
  timeSpent: number;
  lastAssessmentScore?: number;
  streakDays: number;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  subject: string;
  grade?: string;
  teacherId: string;
  students: string[];
  schedule: ClassSchedule[];
  settings: ClassroomSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  location?: string;
}

export interface ClassroomSettings {
  allowLateSubmissions: boolean;
  autoGrading: boolean;
  showLeaderboard: boolean;
  enableDiscussions: boolean;
  parentVisibility: boolean;
}

export interface Attendance {
  id: string;
  studentId: string;
  classroomId: string;
  date: Date;
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface Grade {
  id: string;
  studentId: string;
  assessmentId: string;
  classroomId: string;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade?: string;
  feedback?: string;
  gradedBy: string;
  gradedAt: Date;
  submittedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  recipientIds: string[];
  subject: string;
  content: string;
  type: MessageType;
  priority: MessagePriority;
  attachments: MessageAttachment[];
  sentAt: Date;
  readBy: MessageRead[];
  parentMessage?: string;
  tags: string[];
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface MessageRead {
  userId: string;
  readAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  targetAudience: AnnouncementAudience;
  classroomIds?: string[];
  studentIds?: string[];
  parentIds?: string[];
  priority: MessagePriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  attachments: MessageAttachment[];
  createdAt: Date;
  updatedAt: Date;
  readBy: MessageRead[];
}

export interface InterventionAlert {
  id: string;
  studentId: string;
  type: InterventionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  triggeredBy: string;
  triggeredAt: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  resolvedAt?: Date;
  notes?: string;
}

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred' | 'suspended';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type MessageType = 'direct' | 'announcement' | 'reminder' | 'alert';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementAudience = 'all' | 'students' | 'parents' | 'specific';
export type InterventionType = 'academic' | 'engagement' | 'attendance' | 'behavior' | 'technical';

// API Filter Types
export interface StudentFilters {
  classroomId?: string;
  status?: string;
  grade?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  search?: string;
  sortBy?: 'name' | 'lastActivity' | 'progress' | 'riskScore';
  sortOrder?: 'asc' | 'desc';
}