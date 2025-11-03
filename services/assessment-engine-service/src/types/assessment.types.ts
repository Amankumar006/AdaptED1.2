export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  ESSAY = 'essay',
  CODE_SUBMISSION = 'code_submission',
  FILE_UPLOAD = 'file_upload',
  TRUE_FALSE = 'true_false',
  FILL_IN_BLANK = 'fill_in_blank',
  MATCHING = 'matching',
  ORDERING = 'ordering'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum AssessmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum SubmissionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RETURNED = 'returned'
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
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

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  content: QuestionContent;
  points: number;
  difficulty: DifficultyLevel;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: QuestionType.MULTIPLE_CHOICE;
  options: QuestionOption[];
  allowMultiple: boolean;
}

export interface EssayQuestion extends BaseQuestion {
  type: QuestionType.ESSAY;
  wordLimit?: number;
  rubric?: Rubric;
  sampleAnswer?: string;
}

export interface CodeSubmissionQuestion extends BaseQuestion {
  type: QuestionType.CODE_SUBMISSION;
  language: string;
  starterCode?: string;
  testCases: TestCase[];
  allowedLibraries?: string[];
}

export interface FileUploadQuestion extends BaseQuestion {
  type: QuestionType.FILE_UPLOAD;
  allowedFileTypes: string[];
  maxFileSize: number;
  maxFiles: number;
  rubric?: Rubric;
}

export type Question = MultipleChoiceQuestion | EssayQuestion | CodeSubmissionQuestion | FileUploadQuestion;

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  points: number;
}

export interface Rubric {
  id: string;
  criteria: RubricCriterion[];
  totalPoints: number;
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
  timeLimit?: number; // in minutes
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
  proctoring?: ProctoringSettings;
}

export interface ProctoringSettings {
  enabled: boolean;
  requireWebcam: boolean;
  requireMicrophone: boolean;
  lockdownBrowser: boolean;
  flagSuspiciousActivity: boolean;
}

export interface Response {
  questionId: string;
  answer: any;
  timeSpent: number;
  attempts: number;
  confidence?: number;
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  userId: string;
  responses: Response[];
  startedAt: Date;
  submittedAt?: Date;
  score?: number;
  maxScore: number;
  feedback?: Feedback[];
  status: SubmissionStatus;
  metadata: Record<string, any>;
}

export interface Feedback {
  questionId: string;
  score: number;
  maxScore: number;
  comments: string;
  rubricScores?: RubricScore[];
  suggestions?: string[];
}

export interface RubricScore {
  criterionId: string;
  levelId: string;
  points: number;
  comments?: string;
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

export interface QuestionBankFilter {
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  tags?: string[];
  createdBy?: string;
  organizationId?: string;
  search?: string;
}

export interface AdaptiveTestingConfig {
  initialDifficulty: DifficultyLevel;
  difficultyAdjustmentFactor: number;
  minQuestions: number;
  maxQuestions: number;
  targetAccuracy: number;
  confidenceThreshold: number;
  selectionStrategy?: 'information_gain' | 'difficulty_match' | 'content_coverage' | 'balanced';
  contentCoverageTargets?: string[];
}

export interface ItemResponseTheoryParams {
  discrimination: number; // a parameter - item discrimination
  difficulty: number; // b parameter - item difficulty
  guessing: number; // c parameter - pseudo-guessing parameter
}

export interface AdaptiveTestingMetrics {
  questionsAsked: number;
  currentAbility: number;
  confidenceLevel: number;
  estimatedCompletion: number;
  averageInformationGain: number;
  difficultyProgression: DifficultyLevel[];
}