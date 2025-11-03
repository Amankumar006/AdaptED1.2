import { MultipleChoiceHandler } from '../../handlers/multiple-choice.handler';
import { QuestionType, DifficultyLevel, MultipleChoiceQuestion, Response } from '../../types/assessment.types';

describe('MultipleChoiceHandler', () => {
  let handler: MultipleChoiceHandler;

  beforeEach(() => {
    handler = new MultipleChoiceHandler();
  });

  describe('getSupportedType', () => {
    it('should return MULTIPLE_CHOICE type', () => {
      expect(handler.getSupportedType()).toBe(QuestionType.MULTIPLE_CHOICE);
    });
  });

  describe('validateQuestion', () => {
    it('should validate a correct multiple choice question', async () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: {
          text: 'What is 2 + 2?',
          instructions: 'Select the correct answer'
        },
        options: [
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true },
          { id: 'opt3', text: '5', isCorrect: false }
        ],
        allowMultiple: false,
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['math', 'arithmetic'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject question with no correct answers', async () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: {
          text: 'What is 2 + 2?'
        },
        options: [
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: false },
          { id: 'opt3', text: '5', isCorrect: false }
        ],
        allowMultiple: false,
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_CORRECT_ANSWER')).toBe(true);
    });

    it('should reject single-select question with multiple correct answers', async () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: {
          text: 'What is 2 + 2?'
        },
        options: [
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true },
          { id: 'opt3', text: '4', isCorrect: true }
        ],
        allowMultiple: false,
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const result = await handler.validateQuestion(question);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MULTIPLE_CORRECT_SINGLE_SELECT')).toBe(true);
    });
  });

  describe('validateResponse', () => {
    const question: MultipleChoiceQuestion = {
      id: 'q1',
      type: QuestionType.MULTIPLE_CHOICE,
      content: {
        text: 'What is 2 + 2?'
      },
      options: [
        { id: 'opt1', text: '3', isCorrect: false },
        { id: 'opt2', text: '4', isCorrect: true },
        { id: 'opt3', text: '5', isCorrect: false }
      ],
      allowMultiple: false,
      points: 1,
      difficulty: DifficultyLevel.BEGINNER,
      tags: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'teacher1'
    };

    it('should validate correct response format', async () => {
      const response: Response = {
        questionId: 'q1',
        answer: ['opt2'],
        timeSpent: 30,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid response format', async () => {
      const response: Response = {
        questionId: 'q1',
        answer: 'opt2', // Should be array
        timeSpent: 30,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_RESPONSE_FORMAT')).toBe(true);
    });

    it('should reject multiple selections for single-select question', async () => {
      const response: Response = {
        questionId: 'q1',
        answer: ['opt1', 'opt2'],
        timeSpent: 30,
        attempts: 1
      };

      const result = await handler.validateResponse(question, response);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MULTIPLE_SELECTION_NOT_ALLOWED')).toBe(true);
    });
  });

  describe('gradeResponse', () => {
    const question: MultipleChoiceQuestion = {
      id: 'q1',
      type: QuestionType.MULTIPLE_CHOICE,
      content: {
        text: 'What is 2 + 2?'
      },
      options: [
        { id: 'opt1', text: '3', isCorrect: false },
        { id: 'opt2', text: '4', isCorrect: true },
        { id: 'opt3', text: '5', isCorrect: false }
      ],
      allowMultiple: false,
      points: 10,
      difficulty: DifficultyLevel.BEGINNER,
      tags: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'teacher1'
    };

    it('should grade correct answer as full points', async () => {
      const response: Response = {
        questionId: 'q1',
        answer: ['opt2'],
        timeSpent: 30,
        attempts: 1
      };

      const result = await handler.gradeResponse(question, response);
      expect(result.score).toBe(10);
      expect(result.maxScore).toBe(10);
      expect(result.isCorrect).toBe(true);
      expect(result.partialCredit).toBe(1.0);
    });

    it('should grade incorrect answer as zero points', async () => {
      const response: Response = {
        questionId: 'q1',
        answer: ['opt1'],
        timeSpent: 30,
        attempts: 1
      };

      const result = await handler.gradeResponse(question, response);
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(10);
      expect(result.isCorrect).toBe(false);
      expect(result.partialCredit).toBe(0);
    });
  });

  describe('estimateTimeToComplete', () => {
    it('should estimate time based on difficulty and content', () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: {
          text: 'Simple question?'
        },
        options: [
          { id: 'opt1', text: 'Yes', isCorrect: true },
          { id: 'opt2', text: 'No', isCorrect: false }
        ],
        allowMultiple: false,
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const time = handler.estimateTimeToComplete(question);
      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
    });
  });
});