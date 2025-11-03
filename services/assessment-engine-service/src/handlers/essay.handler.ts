import { 
  Question, 
  QuestionType, 
  Response, 
  EssayQuestion,
  Feedback,
  RubricScore
} from '../types/assessment.types';
import { 
  ValidationResult, 
  GradingResult, 
  ValidationError,
  ValidationWarning
} from '../interfaces/question.interface';
import { BaseQuestionHandler } from './base-question.handler';

export class EssayHandler extends BaseQuestionHandler {
  getSupportedType(): QuestionType {
    return QuestionType.ESSAY;
  }

  protected async validateQuestionType(question: Question): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const essayQuestion = question as EssayQuestion;

    // Validate word limit
    if (essayQuestion.wordLimit !== undefined) {
      if (essayQuestion.wordLimit <= 0) {
        errors.push({
          field: 'wordLimit',
          message: 'Word limit must be greater than 0',
          code: 'INVALID_WORD_LIMIT'
        });
      } else if (essayQuestion.wordLimit < 10) {
        warnings.push({
          field: 'wordLimit',
          message: 'Very low word limit may not allow for meaningful responses',
          code: 'LOW_WORD_LIMIT'
        });
      }
    }

    // Validate rubric if present
    if (essayQuestion.rubric) {
      const rubricValidation = this.validateRubric(essayQuestion.rubric);
      errors.push(...rubricValidation.errors);
      warnings.push(...rubricValidation.warnings);
    } else {
      warnings.push({
        field: 'rubric',
        message: 'Consider adding a rubric for consistent grading',
        code: 'MISSING_RUBRIC'
      });
    }

    // Validate sample answer
    if (essayQuestion.sampleAnswer) {
      if (essayQuestion.wordLimit && this.countWords(essayQuestion.sampleAnswer) > essayQuestion.wordLimit) {
        warnings.push({
          field: 'sampleAnswer',
          message: 'Sample answer exceeds the word limit',
          code: 'SAMPLE_EXCEEDS_LIMIT'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  protected async validateResponseType(question: Question, response: Response): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const essayQuestion = question as EssayQuestion;

    // Validate response format
    if (typeof response.answer !== 'string') {
      errors.push({
        field: 'answer',
        message: 'Essay response must be a string',
        code: 'INVALID_RESPONSE_FORMAT'
      });
      return { isValid: false, errors, warnings };
    }

    const essayText = response.answer as string;

    // Validate minimum content
    if (essayText.trim().length === 0) {
      errors.push({
        field: 'answer',
        message: 'Essay response cannot be empty',
        code: 'EMPTY_RESPONSE'
      });
    }

    // Validate word limit
    if (essayQuestion.wordLimit) {
      const wordCount = this.countWords(essayText);
      if (wordCount > essayQuestion.wordLimit) {
        errors.push({
          field: 'answer',
          message: `Essay exceeds word limit of ${essayQuestion.wordLimit} words (current: ${wordCount})`,
          code: 'EXCEEDS_WORD_LIMIT'
        });
      } else if (wordCount < essayQuestion.wordLimit * 0.1) {
        warnings.push({
          field: 'answer',
          message: 'Essay is significantly shorter than the expected length',
          code: 'VERY_SHORT_RESPONSE'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async gradeResponse(question: Question, response: Response): Promise<GradingResult> {
    const essayQuestion = question as EssayQuestion;
    const essayText = response.answer as string;

    // For now, essays require manual grading
    // In a full implementation, this would integrate with AI grading services
    const basicAnalysis = this.performBasicAnalysis(essayText, essayQuestion);

    return {
      score: 0, // Requires manual grading
      maxScore: question.points,
      isCorrect: false, // Cannot determine automatically
      partialCredit: 0,
      explanation: 'This essay requires manual grading by an instructor.',
      metadata: {
        wordCount: this.countWords(essayText),
        characterCount: essayText.length,
        requiresManualGrading: true,
        basicAnalysis
      }
    };
  }

  async generateFeedback(question: Question, response: Response, gradingResult: GradingResult): Promise<Feedback> {
    const essayQuestion = question as EssayQuestion;
    const essayText = response.answer as string;
    
    const feedback: Feedback = {
      questionId: question.id,
      score: gradingResult.score,
      maxScore: gradingResult.maxScore,
      comments: this.generateEssayComments(essayQuestion, essayText, gradingResult),
      suggestions: this.generateEssaySuggestions(essayQuestion, essayText)
    };

    // Add rubric scores if available and graded
    if (essayQuestion.rubric && gradingResult.score > 0) {
      feedback.rubricScores = this.generatePlaceholderRubricScores(essayQuestion.rubric);
    }

    return feedback;
  }

  protected getBaseTimeEstimate(): number {
    return 600; // 10 minutes base time for essays
  }

  protected getContentComplexityMultiplier(question: Question): number {
    const essayQuestion = question as EssayQuestion;
    let multiplier = super.getContentComplexityMultiplier(question);

    // Adjust for word limit
    if (essayQuestion.wordLimit) {
      if (essayQuestion.wordLimit > 500) multiplier += 0.5;
      if (essayQuestion.wordLimit > 1000) multiplier += 1.0;
    }

    // Adjust for rubric complexity
    if (essayQuestion.rubric) {
      const criteriaCount = essayQuestion.rubric.criteria.length;
      multiplier += criteriaCount * 0.1;
    }

    return multiplier;
  }

  private validateRubric(rubric: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!rubric.criteria || rubric.criteria.length === 0) {
      errors.push({
        field: 'rubric.criteria',
        message: 'Rubric must have at least one criterion',
        code: 'NO_RUBRIC_CRITERIA'
      });
    } else {
      rubric.criteria.forEach((criterion: any, index: number) => {
        if (!criterion.name || criterion.name.trim() === '') {
          errors.push({
            field: `rubric.criteria[${index}].name`,
            message: 'Criterion name is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (!criterion.levels || criterion.levels.length === 0) {
          errors.push({
            field: `rubric.criteria[${index}].levels`,
            message: 'Criterion must have at least one level',
            code: 'NO_CRITERION_LEVELS'
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private performBasicAnalysis(essayText: string, question: EssayQuestion): any {
    const wordCount = this.countWords(essayText);
    const sentenceCount = essayText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    return {
      wordCount,
      sentenceCount,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
      hasIntroduction: this.hasIntroductionPattern(essayText),
      hasConclusion: this.hasConclusionPattern(essayText),
      readabilityScore: this.calculateSimpleReadabilityScore(essayText)
    };
  }

  private hasIntroductionPattern(text: string): boolean {
    const introPatterns = [
      /^(in this essay|this essay will|i will discuss|the purpose of this)/i,
      /^(introduction|to begin|first|initially)/i
    ];
    return introPatterns.some(pattern => pattern.test(text.trim()));
  }

  private hasConclusionPattern(text: string): boolean {
    const conclusionPatterns = [
      /(in conclusion|to conclude|in summary|finally|to sum up)/i,
      /(therefore|thus|hence|as a result)/i
    ];
    const lastParagraph = text.split('\n').pop() || '';
    return conclusionPatterns.some(pattern => pattern.test(lastParagraph));
  }

  private calculateSimpleReadabilityScore(text: string): number {
    const words = this.countWords(text);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const syllables = this.estimateSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    // Simplified Flesch Reading Ease formula
    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private estimateSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    return words.reduce((total, word) => {
      const syllableCount = word.match(/[aeiouy]+/g)?.length || 1;
      return total + Math.max(1, syllableCount);
    }, 0);
  }

  private generateEssayComments(question: EssayQuestion, essayText: string, gradingResult: GradingResult): string {
    const comments: string[] = [];
    const analysis = gradingResult.metadata?.basicAnalysis;

    if (analysis) {
      comments.push(`Word count: ${analysis.wordCount}`);
      
      if (question.wordLimit) {
        const percentage = (analysis.wordCount / question.wordLimit) * 100;
        comments.push(`Length: ${Math.round(percentage)}% of target`);
      }

      if (analysis.readabilityScore) {
        comments.push(`Readability score: ${analysis.readabilityScore}/100`);
      }
    }

    comments.push('This response requires manual review and grading by an instructor.');

    return comments.join('\n');
  }

  private generateEssaySuggestions(question: EssayQuestion, essayText: string): string[] {
    const suggestions: string[] = [];
    const wordCount = this.countWords(essayText);

    if (question.wordLimit && wordCount < question.wordLimit * 0.8) {
      suggestions.push('Consider expanding your response with more details and examples.');
    }

    if (!this.hasIntroductionPattern(essayText)) {
      suggestions.push('Consider adding a clear introduction that outlines your main points.');
    }

    if (!this.hasConclusionPattern(essayText)) {
      suggestions.push('Consider adding a conclusion that summarizes your key arguments.');
    }

    if (question.rubric) {
      suggestions.push('Review the rubric criteria to ensure you address all required elements.');
    }

    return suggestions;
  }

  private generatePlaceholderRubricScores(rubric: any): RubricScore[] {
    // This would be populated by actual grading
    return rubric.criteria.map((criterion: any) => ({
      criterionId: criterion.id,
      levelId: criterion.levels[0]?.id || '',
      points: 0,
      comments: 'Requires manual evaluation'
    }));
  }
}