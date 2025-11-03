import { 
  Question, 
  QuestionType, 
  Response, 
  Feedback, 
  DifficultyLevel 
} from '../types/assessment.types';
import { 
  IQuestionHandler, 
  ValidationResult, 
  GradingResult, 
  QuestionPreview,
  ValidationError,
  ValidationWarning
} from '../interfaces/question.interface';

export abstract class BaseQuestionHandler implements IQuestionHandler {
  abstract getSupportedType(): QuestionType;
  abstract gradeResponse(question: Question, response: Response): Promise<GradingResult>;

  async validateQuestion(question: Question): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Common validation rules
    if (!question.id || question.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Question ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!question.content?.text || question.content.text.trim() === '') {
      errors.push({
        field: 'content.text',
        message: 'Question text is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (question.points <= 0) {
      errors.push({
        field: 'points',
        message: 'Question points must be greater than 0',
        code: 'INVALID_VALUE'
      });
    }

    if (!Object.values(DifficultyLevel).includes(question.difficulty)) {
      errors.push({
        field: 'difficulty',
        message: 'Invalid difficulty level',
        code: 'INVALID_VALUE'
      });
    }

    if (question.type !== this.getSupportedType()) {
      errors.push({
        field: 'type',
        message: `Question type ${question.type} is not supported by this handler`,
        code: 'UNSUPPORTED_TYPE'
      });
    }

    // Add type-specific validation
    const typeSpecificResult = await this.validateQuestionType(question);
    errors.push(...typeSpecificResult.errors);
    warnings.push(...typeSpecificResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateResponse(question: Question, response: Response): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Common response validation
    if (response.questionId !== question.id) {
      errors.push({
        field: 'questionId',
        message: 'Response question ID does not match question ID',
        code: 'ID_MISMATCH'
      });
    }

    if (response.timeSpent < 0) {
      errors.push({
        field: 'timeSpent',
        message: 'Time spent cannot be negative',
        code: 'INVALID_VALUE'
      });
    }

    if (response.attempts < 1) {
      errors.push({
        field: 'attempts',
        message: 'Attempts must be at least 1',
        code: 'INVALID_VALUE'
      });
    }

    // Add type-specific response validation
    const typeSpecificResult = await this.validateResponseType(question, response);
    errors.push(...typeSpecificResult.errors);
    warnings.push(...typeSpecificResult.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async generateFeedback(question: Question, response: Response, gradingResult: GradingResult): Promise<Feedback> {
    const feedback: Feedback = {
      questionId: question.id,
      score: gradingResult.score,
      maxScore: gradingResult.maxScore,
      comments: this.generateComments(question, response, gradingResult),
      suggestions: this.generateSuggestions(question, response, gradingResult)
    };

    return feedback;
  }

  estimateTimeToComplete(question: Question): number {
    // Base estimation in seconds
    const baseTime = this.getBaseTimeEstimate();
    const difficultyMultiplier = this.getDifficultyMultiplier(question.difficulty);
    const contentMultiplier = this.getContentComplexityMultiplier(question);

    return Math.round(baseTime * difficultyMultiplier * contentMultiplier);
  }

  generatePreview(question: Question): QuestionPreview {
    return {
      type: question.type,
      content: this.truncateContent(question.content.text, 100),
      estimatedTime: this.estimateTimeToComplete(question),
      difficulty: question.difficulty,
      points: question.points
    };
  }

  // Abstract methods for type-specific implementations
  protected abstract validateQuestionType(question: Question): Promise<ValidationResult>;
  protected abstract validateResponseType(question: Question, response: Response): Promise<ValidationResult>;
  protected abstract getBaseTimeEstimate(): number;

  // Helper methods
  protected getDifficultyMultiplier(difficulty: DifficultyLevel): number {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER:
        return 0.8;
      case DifficultyLevel.INTERMEDIATE:
        return 1.0;
      case DifficultyLevel.ADVANCED:
        return 1.3;
      case DifficultyLevel.EXPERT:
        return 1.6;
      default:
        return 1.0;
    }
  }

  protected getContentComplexityMultiplier(question: Question): number {
    const textLength = question.content.text.length;
    const hasMedia = question.content.media && question.content.media.length > 0;
    const hasHints = question.content.hints && question.content.hints.length > 0;

    let multiplier = 1.0;

    // Adjust for text length
    if (textLength > 500) multiplier += 0.2;
    if (textLength > 1000) multiplier += 0.3;

    // Adjust for media
    if (hasMedia) multiplier += 0.1;

    // Adjust for hints (might reduce time as they help)
    if (hasHints) multiplier -= 0.05;

    return Math.max(0.5, multiplier);
  }

  protected truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  protected generateComments(question: Question, response: Response, gradingResult: GradingResult): string {
    if (gradingResult.isCorrect) {
      return 'Correct! Well done.';
    } else if (gradingResult.partialCredit && gradingResult.partialCredit > 0) {
      return `Partially correct. You earned ${gradingResult.partialCredit}% credit.`;
    } else {
      return 'Incorrect. Please review the material and try again.';
    }
  }

  protected generateSuggestions(question: Question, response: Response, gradingResult: GradingResult): string[] {
    const suggestions: string[] = [];

    if (!gradingResult.isCorrect) {
      suggestions.push('Review the question carefully and consider all options.');
      
      if (question.content.hints && question.content.hints.length > 0) {
        suggestions.push('Consider the hints provided with the question.');
      }

      if (question.tags && question.tags.length > 0) {
        suggestions.push(`Review topics related to: ${question.tags.join(', ')}`);
      }
    }

    return suggestions;
  }
}