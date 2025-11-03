// Authentication types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: 'student' | 'teacher' | 'admin'
  preferences: UserPreferences
  learningProfile: LearningProfile
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: NotificationPreferences
  accessibility: AccessibilityPreferences
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large'
  highContrast: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  inApp: boolean
  assignments: boolean
  grades: boolean
  announcements: boolean
}

export interface LearningProfile {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  difficultyPreference: 'easy' | 'medium' | 'hard' | 'adaptive'
  pacePreference: 'slow' | 'medium' | 'fast' | 'adaptive'
  subjects: string[]
  goals: string[]
  strengths: string[]
  challenges: string[]
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  mfaCode?: string
}

export interface AuthToken {
  token: string
  refreshToken: string
  user: User
  expiresAt: string
  mfaRequired?: boolean
}

// Learning types
export interface Lesson {
  id: string
  title: string
  description: string
  content: LessonContent[]
  duration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  prerequisites: string[]
  learningObjectives: string[]
  tags: string[]
  courseId: string
  moduleId: string
  order: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
  metadata: LessonMetadata
}

export interface LessonContent {
  id: string
  type: 'text' | 'video' | 'audio' | 'image' | 'interactive' | 'quiz' | 'assignment'
  title: string
  content: any
  order: number
  duration?: number
  isRequired: boolean
  settings: ContentSettings
}

export interface ContentSettings {
  allowSkip: boolean
  showTranscript: boolean
  autoplay: boolean
  speed: number
  captions: boolean
}

export interface LessonMetadata {
  views: number
  completions: number
  averageRating: number
  totalRatings: number
  estimatedTime: number
  lastUpdated: string
}

export interface LearningProgress {
  userId: string
  lessonId: string
  courseId: string
  progress: number
  timeSpent: number
  completed: boolean
  startedAt: string
  completedAt?: string
  lastAccessedAt: string
  score?: number
  attempts: number
  bookmarked: boolean
  notes: Note[]
}

export interface Note {
  id: string
  content: string
  timestamp: number
  position?: number
  type: 'text' | 'highlight' | 'bookmark'
}

export interface Assignment {
  id: string
  title: string
  description: string
  type: 'quiz' | 'essay' | 'project' | 'discussion'
  dueDate: string
  points: number
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded'
  submission?: AssignmentSubmission
  feedback?: AssignmentFeedback
  courseId: string
  lessonId?: string
}

export interface AssignmentSubmission {
  id: string
  content: any
  submittedAt: string
  files?: FileAttachment[]
  status: 'draft' | 'submitted' | 'late'
}

export interface AssignmentFeedback {
  score: number
  maxScore: number
  comments: string
  rubricScores?: RubricScore[]
  gradedAt: string
  gradedBy: string
}

export interface RubricScore {
  criterion: string
  score: number
  maxScore: number
  feedback: string
}

export interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: string
}

export interface StudySession {
  id: string
  userId: string
  lessonId: string
  startTime: string
  endTime?: string
  duration: number
  progress: number
  interactions: SessionInteraction[]
  completed: boolean
}

export interface SessionInteraction {
  type: 'view' | 'click' | 'pause' | 'seek' | 'note' | 'bookmark'
  timestamp: number
  data: any
}

export interface LearningPath {
  id: string
  title: string
  description: string
  lessons: string[]
  estimatedDuration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  progress: number
  isRecommended: boolean
  tags: string[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  type: 'completion' | 'streak' | 'score' | 'participation'
  points: number
  unlockedAt?: string
  progress: number
  maxProgress: number
  isUnlocked: boolean
}

// BuddyAI types
export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  attachments?: MessageAttachment[]
  metadata?: MessageMetadata
}

export interface MessageAttachment {
  type: 'image' | 'audio' | 'file'
  url: string
  name: string
  size: number
}

export interface MessageMetadata {
  lessonId?: string
  confidence?: number
  sources?: string[]
  suggestedActions?: SuggestedAction[]
}

export interface SuggestedAction {
  type: 'lesson' | 'practice' | 'help' | 'resource'
  label: string
  action: string
  data?: any
}

export interface ChatSession {
  id: string
  userId: string
  messages: ChatMessage[]
  context: ChatContext
  startedAt: string
  lastMessageAt: string
  isActive: boolean
}

export interface ChatContext {
  currentLesson?: string
  currentCourse?: string
  recentTopics: string[]
  learningGoals: string[]
  strugglingAreas: string[]
}

// Practice and collaboration types
export interface PracticeSession {
  id: string
  type: 'flashcards' | 'quiz' | 'problem_solving' | 'simulation'
  topicId: string
  questions: PracticeQuestion[]
  score: number
  timeSpent: number
  completedAt?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface PracticeQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay'
  question: string
  options?: string[]
  correctAnswer: any
  userAnswer?: any
  isCorrect?: boolean
  explanation: string
  difficulty: number
}

export interface StudyGroup {
  id: string
  name: string
  description: string
  members: StudyGroupMember[]
  courseId: string
  isPublic: boolean
  maxMembers: number
  createdBy: string
  createdAt: string
  lastActivity: string
}

export interface StudyGroupMember {
  userId: string
  role: 'owner' | 'moderator' | 'member'
  joinedAt: string
  isActive: boolean
}

export interface Discussion {
  id: string
  title: string
  content: string
  author: string
  courseId?: string
  lessonId?: string
  studyGroupId?: string
  replies: DiscussionReply[]
  tags: string[]
  upvotes: number
  isResolved: boolean
  createdAt: string
  updatedAt: string
}

export interface DiscussionReply {
  id: string
  content: string
  author: string
  parentId?: string
  upvotes: number
  isAccepted: boolean
  createdAt: string
  updatedAt: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}