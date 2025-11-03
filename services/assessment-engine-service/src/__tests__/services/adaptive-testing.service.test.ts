import { AdaptiveTestingService } from '../../services/adaptive-testing.service';
import { QuestionBankService } from '../../services/question-bank.service';
import { 
  DifficultyLevel, 
  QuestionType, 
  AdaptiveTestingConfig,
  Question,
  Response
} from '../../types/assessment.types';

describe('AdaptiveTestingService', () => {
  let adaptiveTestingService: AdaptiveTestingService;
  let questionBankService: QuestionBankService;

  const mockQuestions: Question[] = [
    {
      id: 'q1',
      type: QuestionType.MULTIPLE_CHOICE,
      content: { text: 'Easy question' },
      points: 1,
      difficulty: DifficultyLevel.BEGINNER,
      tags: ['math', 'basic'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test'
    } as Question,
    {
      id: 'q2',
      type: QuestionType.MULTIPLE_CHOICE,
      content: { text: 'Medium question' },
      points: 2,
      difficulty: DifficultyLevel.INTERMEDIATE,
      tags: ['math', 'algebra'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test'
    } as Question,
    {
      id: 'q3',
      type: QuestionType.MULTIPLE_CHOICE,
      content: { text: 'Hard question' },
      points: 3,
      difficulty: DifficultyLevel.ADVANCED,
      tags: ['math', 'calculus'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test'
    } as Question
  ];

  beforeEach(() => {
    questionBankService = new QuestionBankService();
    adaptiveTestingService = new AdaptiveTestingService(questionBankService);

    // Mock question bank service methods
    jest.spyOn(questionBankService, 'searchQuestions').mockResolvedValue(mockQuestions);
    jest.spyOn(questionBankService, 'getQuestion').mockImplementation(async (id: string) => {
      return mockQuestions.find(q => q.id === id) || null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAdaptiveTest', () => {
    it('should initialize adaptive testing state with correct initial values', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      const state = await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      expect(state.userId).toBe('user1');
      expect(state.assessmentId).toBe('assessment1');
      expect(state.currentAbility).toBe(0.0); // Intermediate maps to 0.0
      expect(state.abilityHistory).toEqual([]);
      expect(state.questionsAsked).toEqual([]);
      expect(state.responses).toEqual([]);
      expect(state.confidenceLevel).toBe(0);
      expect(state.isComplete).toBe(false);
      expect(state.nextQuestionId).toBeDefined();
    });

    it('should select appropriate first question based on initial difficulty', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.BEGINNER,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      const state = await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      expect(state.currentAbility).toBe(-1.5); // Beginner maps to -1.5
      expect(state.nextQuestionId).toBeDefined();
    });
  });

  describe('processResponse', () => {
    it('should update ability estimate based on response', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      // Initialize test
      const initialState = await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      // Process a correct response
      const response: Response = {
        questionId: 'q1',
        answer: 'correct',
        timeSpent: 30000,
        attempts: 1,
        confidence: 0.8
      };

      const updatedState = await adaptiveTestingService.processResponse('user1', 'assessment1', response, config);

      expect(updatedState.responses).toHaveLength(1);
      expect(updatedState.questionsAsked).toContain('q1');
      expect(updatedState.abilityHistory).toHaveLength(1);
      expect(updatedState.confidenceLevel).toBeGreaterThan(0);
    });

    it('should continue test when minimum questions not reached', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      const response: Response = {
        questionId: 'q1',
        answer: 'correct',
        timeSpent: 30000,
        attempts: 1,
        confidence: 0.8
      };

      const state = await adaptiveTestingService.processResponse('user1', 'assessment1', response, config);

      expect(state.isComplete).toBe(false);
      expect(state.nextQuestionId).toBeDefined();
      expect(state.estimatedCompletion).toBeLessThan(100);
    });

    it('should complete test when confidence threshold reached', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 2, // Low minimum for testing
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.1 // Low threshold for testing
      };

      await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      // Process multiple responses to build confidence
      for (let i = 0; i < 3; i++) {
        const response: Response = {
          questionId: `q${i + 1}`,
          answer: 'correct',
          timeSpent: 30000,
          attempts: 1,
          confidence: 0.9
        };

        const state = await adaptiveTestingService.processResponse('user1', 'assessment1', response, config);
        
        if (state.isComplete) {
          expect(state.estimatedCompletion).toBe(100);
          expect(state.nextQuestionId).toBeUndefined();
          break;
        }
      }
    });
  });

  describe('getAdaptiveTestingState', () => {
    it('should return null for non-existent state', () => {
      const state = adaptiveTestingService.getAdaptiveTestingState('nonexistent', 'assessment1');
      expect(state).toBeNull();
    });

    it('should return existing state', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      const initialState = await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);
      const retrievedState = adaptiveTestingService.getAdaptiveTestingState('user1', 'assessment1');

      expect(retrievedState).toEqual(initialState);
    });
  });

  describe('ability estimation', () => {
    it('should increase ability estimate for correct responses', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      const correctResponse: Response = {
        questionId: 'q1',
        answer: 'correct',
        timeSpent: 30000,
        attempts: 1,
        confidence: 0.9 // High confidence indicates correct answer
      };

      const state = await adaptiveTestingService.processResponse('user1', 'assessment1', correctResponse, config);
      
      // Ability should increase from initial 0.0
      expect(state.currentAbility).toBeGreaterThan(0);
    });

    it('should decrease ability estimate for incorrect responses', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      const incorrectResponse: Response = {
        questionId: 'q1',
        answer: 'incorrect',
        timeSpent: 30000,
        attempts: 1,
        confidence: 0.1 // Low confidence indicates incorrect answer
      };

      const state = await adaptiveTestingService.processResponse('user1', 'assessment1', incorrectResponse, config);
      
      // Ability should decrease from initial 0.0
      expect(state.currentAbility).toBeLessThan(0);
    });
  });

  describe('confidence calculation', () => {
    it('should increase confidence level as more questions are answered', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);

      let previousConfidence = 0;

      for (let i = 0; i < 3; i++) {
        const response: Response = {
          questionId: `q${i + 1}`,
          answer: 'correct',
          timeSpent: 30000,
          attempts: 1,
          confidence: 0.8
        };

        const state = await adaptiveTestingService.processResponse('user1', 'assessment1', response, config);
        
        expect(state.confidenceLevel).toBeGreaterThanOrEqual(previousConfidence);
        previousConfidence = state.confidenceLevel;
      }
    });
  });

  describe('cleanup', () => {
    it('should remove expired states', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 5,
        maxQuestions: 20,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.8
      };

      // Create a completed state
      await adaptiveTestingService.initializeAdaptiveTest('user1', 'assessment1', config);
      
      const response: Response = {
        questionId: 'q1',
        answer: 'correct',
        timeSpent: 30000,
        attempts: 1,
        confidence: 0.9
      };

      // Complete the test by setting high confidence threshold
      config.confidenceThreshold = 0.1;
      await adaptiveTestingService.processResponse('user1', 'assessment1', response, config);

      // Verify state exists
      let state = adaptiveTestingService.getAdaptiveTestingState('user1', 'assessment1');
      expect(state).not.toBeNull();

      // Cleanup expired states
      adaptiveTestingService.cleanupExpiredStates(0); // 0 hours = immediate cleanup

      // Verify completed state is removed
      state = adaptiveTestingService.getAdaptiveTestingState('user1', 'assessment1');
      expect(state).toBeNull();
    });
  });
});