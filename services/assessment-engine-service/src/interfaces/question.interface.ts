import { Question, QuestionType, Response, Feedback } from '../types/assessment.types';

export interface IQuestionHandler {
  /**
   * Validates a question of this type
   */
  validateQuestion(question: Question): Promise<ValidationResult>;

  /**
   * Validates a response for this question type
   */
  validateResponse(question: Question, response: Response): Promise<ValidationResult>;

  /**
   * Grades a response for this question type
   */
  gradeResponse(question: Question, response: Response): Promise<GradingResult>;

  /**
   * Generates automated feedback for this question type
   */
  generateFeedback(question: Question, response: Response, gradingResult: GradingResult): Promise<Feedback>;

  /**
   * Gets the supported question type
   */
  getSupportedType(): QuestionType;

  /**
   * Estimates the time required to answer this question
   */
  estimateTimeToComplete(question: Question): number;

  /**
   * Generates a preview of the question for display
   */
  generatePreview(question: Question): QuestionPreview;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface GradingResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  partialCredit?: number;
  explanation?: string;
  metadata?: Record<string, any>;
}

export interface QuestionPreview {
  type: QuestionType;
  content: string;
  estimatedTime: number;
  difficulty: string;
  points: number;
}

export interface IQuestionFactory {
  /**
   * Creates a question handler for the specified type
   */
  createHandler(type: QuestionType): IQuestionHandler;

  /**
   * Registers a new question handler
   */
  registerHandler(type: QuestionType, handler: IQuestionHandler): void;

  /**
   * Gets all supported question types
   */
  getSupportedTypes(): QuestionType[];

  /**
   * Checks if a question type is supported
   */
  isTypeSupported(type: QuestionType): boolean;
}