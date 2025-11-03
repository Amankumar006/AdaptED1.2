import { QuestionBankService } from '../../services/question-bank.service';
import { QuestionType, DifficultyLevel, MultipleChoiceQuestion } from '../../types/assessment.types';

// Mock the question factory
jest.mock('../../factories/question.factory', () => ({
  questionFactory: {
    createHandler: jest.fn(() => ({
      validateQuestion: jest.fn(() => Promise.resolve({ isValid: true, errors: [], warnings: [] }))
    }))
  }
}));

describe('QuestionBankService', () => {
  let service: QuestionBankService;

  beforeEach(() => {
    service = new QuestionBankService();
  });

  describe('createQuestionBank', () => {
    it('should create a new question bank', async () => {
      const bankData = {
        name: 'Math Questions',
        description: 'Basic math questions',
        tags: ['math', 'basic'],
        organizationId: 'org1',
        isPublic: false,
        createdBy: 'teacher1'
      };

      const bank = await service.createQuestionBank(bankData);

      expect(bank.id).toBeDefined();
      expect(bank.name).toBe(bankData.name);
      expect(bank.description).toBe(bankData.description);
      expect(bank.tags).toEqual(bankData.tags);
      expect(bank.organizationId).toBe(bankData.organizationId);
      expect(bank.isPublic).toBe(bankData.isPublic);
      expect(bank.createdBy).toBe(bankData.createdBy);
      expect(bank.questions).toEqual([]);
      expect(bank.createdAt).toBeInstanceOf(Date);
      expect(bank.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getQuestionBank', () => {
    it('should return question bank by id', async () => {
      const bankData = {
        name: 'Test Bank',
        description: 'Test description',
        tags: [],
        organizationId: 'org1',
        isPublic: true,
        createdBy: 'teacher1'
      };

      const createdBank = await service.createQuestionBank(bankData);
      const retrievedBank = await service.getQuestionBank(createdBank.id);

      expect(retrievedBank).toEqual(createdBank);
    });

    it('should return null for non-existent bank', async () => {
      const bank = await service.getQuestionBank('non-existent-id');
      expect(bank).toBeNull();
    });
  });

  describe('addQuestionToBank', () => {
    it('should add a valid question to the bank', async () => {
      const bank = await service.createQuestionBank({
        name: 'Test Bank',
        description: 'Test',
        tags: [],
        organizationId: 'org1',
        isPublic: false,
        createdBy: 'teacher1'
      });

      const questionData: Omit<MultipleChoiceQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
        type: QuestionType.MULTIPLE_CHOICE,
        content: {
          text: 'What is 2 + 2?'
        },
        options: [
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true }
        ],
        allowMultiple: false,
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['math'],
        metadata: {},
        createdBy: 'teacher1'
      };

      const question = await service.addQuestionToBank(bank.id, questionData);

      expect(question).toBeDefined();
      expect(question!.id).toBeDefined();
      expect(question!.type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(question!.content.text).toBe('What is 2 + 2?');

      // Verify question was added to bank
      const updatedBank = await service.getQuestionBank(bank.id);
      expect(updatedBank!.questions).toHaveLength(1);
      expect(updatedBank!.questions[0].id).toBe(question!.id);
    });

    it('should return null for non-existent bank', async () => {
      const questionData: Omit<MultipleChoiceQuestion, 'id' | 'createdAt' | 'updatedAt'> = {
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'Test question' },
        options: [{ id: 'opt1', text: 'Answer', isCorrect: true }],
        allowMultiple: false,
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdBy: 'teacher1'
      };

      const question = await service.addQuestionToBank('non-existent-bank', questionData);
      expect(question).toBeNull();
    });
  });

  describe('searchQuestions', () => {
    beforeEach(async () => {
      // Create a bank with some questions
      const bank = await service.createQuestionBank({
        name: 'Search Test Bank',
        description: 'For testing search',
        tags: [],
        organizationId: 'org1',
        isPublic: false,
        createdBy: 'teacher1'
      });

      // Add questions with different properties
      await service.addQuestionToBank(bank.id, {
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'Math question about addition' },
        points: 1,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['math', 'addition'],
        metadata: { 
          options: [{ id: 'opt1', text: 'Answer', isCorrect: true }],
          allowMultiple: false
        },
        createdBy: 'teacher1'
      } as any);

      await service.addQuestionToBank(bank.id, {
        type: QuestionType.ESSAY,
        content: { text: 'Science question about physics' },
        points: 5,
        difficulty: DifficultyLevel.ADVANCED,
        tags: ['science', 'physics'],
        metadata: {},
        createdBy: 'teacher2'
      } as any);
    });

    it('should search questions by type', async () => {
      const results = await service.searchQuestions({ type: QuestionType.MULTIPLE_CHOICE });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(QuestionType.MULTIPLE_CHOICE);
    });

    it('should search questions by difficulty', async () => {
      const results = await service.searchQuestions({ difficulty: DifficultyLevel.ADVANCED });
      expect(results).toHaveLength(1);
      expect(results[0].difficulty).toBe(DifficultyLevel.ADVANCED);
    });

    it('should search questions by tags', async () => {
      const results = await service.searchQuestions({ tags: ['math'] });
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('math');
    });

    it('should search questions by text content', async () => {
      const results = await service.searchQuestions({ search: 'physics' });
      expect(results).toHaveLength(1);
      expect(results[0].content.text).toContain('physics');
    });

    it('should search questions by creator', async () => {
      const results = await service.searchQuestions({ createdBy: 'teacher2' });
      expect(results).toHaveLength(1);
      expect(results[0].createdBy).toBe('teacher2');
    });
  });

  describe('getQuestionStatistics', () => {
    it('should return statistics for all questions', async () => {
      const bank = await service.createQuestionBank({
        name: 'Stats Test Bank',
        description: 'For testing statistics',
        tags: [],
        organizationId: 'org1',
        isPublic: false,
        createdBy: 'teacher1'
      });

      // Add questions with different properties
      await service.addQuestionToBank(bank.id, {
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'Question 1' },
        points: 2,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['tag1'],
        metadata: {
          options: [{ id: 'opt1', text: 'Answer', isCorrect: true }],
          allowMultiple: false
        },
        createdBy: 'teacher1'
      } as any);

      await service.addQuestionToBank(bank.id, {
        type: QuestionType.ESSAY,
        content: { text: 'Question 2' },
        points: 5,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['tag1', 'tag2'],
        metadata: {},
        createdBy: 'teacher1'
      } as any);

      const stats = await service.getQuestionStatistics(bank.id);

      expect(stats.total).toBe(2);
      expect(stats.byType[QuestionType.MULTIPLE_CHOICE]).toBe(1);
      expect(stats.byType[QuestionType.ESSAY]).toBe(1);
      expect(stats.byDifficulty[DifficultyLevel.BEGINNER]).toBe(2);
      expect(stats.byTag['tag1']).toBe(2);
      expect(stats.byTag['tag2']).toBe(1);
      expect(stats.averagePoints).toBe(3.5); // (2 + 5) / 2
    });
  });
});