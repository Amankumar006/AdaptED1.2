import { 
  Question, 
  QuestionType, 
  Response, 
  MultipleChoiceQuestion 
} from '../types/assessment.types';
import { 
  ValidationResult, 
  GradingResult, 
  ValidationError,
  ValidationWarning
} from '../interfaces/question.interface';
import { BaseQuestionHandler } from './base-question.handler';

export class MultipleChoiceHandler extends BaseQuestionHandler {
  getSupportedType(): QuestionType {
    return QuestionType.MULTIPLE_CHOICE;
  }

  protected async validateQuestionType(question: Question): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const mcQuestion = question as MultipleChoiceQuestion;

    // Validate options exist
    if (!mcQuestion.options || mcQuestion.options.length < 2) {
      errors.push({
        field: 'options',
        message: 'Multiple choice questions must have at least 2 options',
        code: 'INSUFFICIENT_OPTIONS'
      });
    } else {
      // Validate correct answers
      const correctOptions = mcQuestion.options.filter(opt => opt.isCorrect);
      
      if (correctOptions.length === 0) {
        errors.push({
          field: 'options',
          message: 'At least one option must be marked as correct',
          code: 'NO_CORRECT_ANSWER'
        });
      }

      if (!mcQuestion.allowMultiple && correctOptions.length > 1) {
        errors.push({
          field: 'options',
          message: 'Single-select questions cannot have multiple correct answers',
          code: 'MULTIPLE_CORRECT_SINGLE_SELECT'
        });
      }

      // Validate option content
      mcQuestion.options.forEach((option, index) => {
        if (!option.id || option.id.trim() === '') {
          errors.push({
            field: `options[${index}].id`,
            message: 'Option ID is required',
            code: 'REQUIRED_FIELD'
          });
        }

        if (!option.text || option.text.trim() === '') {
          errors.push({
            field: `options[${index}].text`,
            message: 'Option text is required',
            code: 'REQUIRED_FIELD'
          });
        }
      });

      // Check for duplicate option IDs
      const optionIds = mcQuestion.options.map(opt => opt.id);
      const duplicateIds = optionIds.filter((id, index) => optionIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        errors.push({
          field: 'options',
          message: `Duplicate option IDs found: ${duplicateIds.join(', ')}`,
          code: 'DUPLICATE_OPTION_IDS'
        });
      }

      // Warnings for best practices
      if (mcQuestion.options.length > 6) {
        warnings.push({
          field: 'options',
          message: 'Consider reducing the number of options for better usability',
          code: 'TOO_MANY_OPTIONS'
        });
      }

      const optionsWithoutExplanation = mcQuestion.options.filter(opt => !opt.explanation);
      if (optionsWithoutExplanation.length > 0) {
        warnings.push({
          field: 'options',
          message: 'Consider adding explanations to all options for better learning',
          code: 'MISSING_EXPLANATIONS'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  protected async validateResponseType(question: Question, response: Response): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const mcQuestion = question as MultipleChoiceQuestion;

    // Validate response format
    if (!Array.isArray(response.answer)) {
      errors.push({
        field: 'answer',
        message: 'Multiple choice response must be an array of option IDs',
        code: 'INVALID_RESPONSE_FORMAT'
      });
      return { isValid: false, errors, warnings };
    }

    const selectedOptions = response.answer as string[];

    // Validate single vs multiple selection
    if (!mcQuestion.allowMultiple && selectedOptions.length > 1) {
      errors.push({
        field: 'answer',
        message: 'Single-select questions allow only one option to be selected',
        code: 'MULTIPLE_SELECTION_NOT_ALLOWED'
      });
    }

    // Validate selected option IDs exist
    const validOptionIds = mcQuestion.options.map(opt => opt.id);
    const invalidSelections = selectedOptions.filter(id => !validOptionIds.includes(id));
    if (invalidSelections.length > 0) {
      errors.push({
        field: 'answer',
        message: `Invalid option IDs selected: ${invalidSelections.join(', ')}`,
        code: 'INVALID_OPTION_IDS'
      });
    }

    // Check for duplicate selections
    const duplicateSelections = selectedOptions.filter((id, index) => selectedOptions.indexOf(id) !== index);
    if (duplicateSelections.length > 0) {
      errors.push({
        field: 'answer',
        message: `Duplicate option selections: ${duplicateSelections.join(', ')}`,
        code: 'DUPLICATE_SELECTIONS'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  async gradeResponse(question: Question, response: Response): Promise<GradingResult> {
    const mcQuestion = question as MultipleChoiceQuestion;
    const selectedOptions = response.answer as string[];
    
    const correctOptionIds = mcQuestion.options
      .filter(opt => opt.isCorrect)
      .map(opt => opt.id);

    let score = 0;
    let isCorrect = false;
    let partialCredit = 0;

    if (mcQuestion.allowMultiple) {
      // For multiple selection, use partial credit scoring
      const totalCorrect = correctOptionIds.length;
      const totalIncorrect = mcQuestion.options.length - totalCorrect;
      
      let correctSelections = 0;
      let incorrectSelections = 0;

      selectedOptions.forEach(selectedId => {
        if (correctOptionIds.includes(selectedId)) {
          correctSelections++;
        } else {
          incorrectSelections++;
        }
      });

      // Calculate partial credit
      const correctScore = totalCorrect > 0 ? (correctSelections / totalCorrect) : 0;
      const incorrectPenalty = totalIncorrect > 0 ? (incorrectSelections / totalIncorrect) : 0;
      
      partialCredit = Math.max(0, correctScore - incorrectPenalty);
      score = Math.round(question.points * partialCredit);
      isCorrect = partialCredit >= 1.0;
    } else {
      // For single selection, all or nothing scoring
      isCorrect = selectedOptions.length === 1 && correctOptionIds.includes(selectedOptions[0]);
      score = isCorrect ? question.points : 0;
      partialCredit = isCorrect ? 1.0 : 0;
    }

    return {
      score,
      maxScore: question.points,
      isCorrect,
      partialCredit,
      explanation: this.generateExplanation(mcQuestion, selectedOptions, correctOptionIds),
      metadata: {
        selectedOptions,
        correctOptions: correctOptionIds,
        gradingMethod: mcQuestion.allowMultiple ? 'partial_credit' : 'all_or_nothing'
      }
    };
  }

  protected getBaseTimeEstimate(): number {
    return 30; // 30 seconds base time for multiple choice
  }

  private generateExplanation(
    question: MultipleChoiceQuestion, 
    selectedOptions: string[], 
    correctOptions: string[]
  ): string {
    const explanations: string[] = [];

    // Add explanations for selected options
    selectedOptions.forEach(selectedId => {
      const option = question.options.find(opt => opt.id === selectedId);
      if (option?.explanation) {
        const prefix = option.isCorrect ? '✓ Correct:' : '✗ Incorrect:';
        explanations.push(`${prefix} ${option.explanation}`);
      }
    });

    // Add explanations for unselected correct options
    correctOptions.forEach(correctId => {
      if (!selectedOptions.includes(correctId)) {
        const option = question.options.find(opt => opt.id === correctId);
        if (option?.explanation) {
          explanations.push(`✓ You missed: ${option.explanation}`);
        }
      }
    });

    return explanations.join('\n');
  }
}