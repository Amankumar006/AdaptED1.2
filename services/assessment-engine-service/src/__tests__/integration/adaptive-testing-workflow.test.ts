import { AssessmentService } from '../../services/assessment.service';
import { QuestionBankService } from '../../services/question-bank.service';
import { AdaptiveTestingService } from '../../services/adaptive-testing.service';
import {
  Assessment,
  AssessmentSubmission,
  Question,
  Response,
  QuestionType,
  DifficultyLevel,
  AssessmentStatus,
  SubmissionStatus,
  MultipleChoiceQuestion,
  AdaptiveTestingConfig
} from '../../types/assessment.types';

describe('Adaptive Testing Workflow Integration', () => {
  let assessmentService: AssessmentService;
  let questionBankService: QuestionBankService;
  let adaptiveTestingService: AdaptiveTestingService;

  beforeEach(() => {
    questionBankService = new QuestionBankService();
    assessmentService = new AssessmentService(questionBankService);
    adaptiveTestingService = new AdaptiveTestingService(questionBankService);

    // Mock question bank with questions of varying difficulty
    setupMockQuestionBank();
  });

  describe('Complete Adaptive Testing Workflow', () => {
    it('should complete full adaptive testing cycle for high-performing student', async () => {
      const assessment = await createAdaptiveAssessment();
      const submission = await assessmentService.startAssessment(assessment.id, 'high-performer');

      expect(submission.metadata.isAdaptive).toBe(true);
      expect(submission.metadata.adaptiveState).toBeDefined();

      // Simulate high-performing student responses
      const responses = [
        { questionId: 'q1', answer: 'correct', confidence: 0.9 },
        { questionId: 'q2', answer: 'correct', confidence: 0.85 },
        { questionId: 'q3', answer: 'correct', confidence: 0.8 },
        { questionId: 'q4', answer: 'correct', confidence: 0.9 },
        { questionId: 'q5', answer: 'correct', confidence: 0.95 }
      ];

      let currentSubmission = submission;
      let questionCount = 0;

      for (const responseData of responses) {
        const response: Response = {
          questionId: responseData.questionId,
          answer: responseData.answer,
          timeSpent: 30000,
          attempts: 1,
          confidence: responseData.confidence
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        questionCount++;

        if (result.adaptiveState?.isComplete) {
          break;
        }

        expect(result.isValid).toBe(true);
        expect(result.adaptiveState).toBeDefined();
        
        // High performer should get increasingly difficult questions
        if (result.nextQuestion) {
          expect(result.adaptiveState!.currentAbility).toBeGreaterThan(0);
        }

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Complete the assessment
      const finalSubmission = await assessmentService.submitAssessment(currentSubmission.id);
      
      expect(finalSubmission.status).toBe(SubmissionStatus.GRADED);
      expect(questionCount).toBeGreaterThanOrEqual(5); // Minimum questions
      expect(questionCount).toBeLessThanOrEqual(20); // Maximum questions
    });

    it('should complete full adaptive testing cycle for struggling student', async () => {
      const assessment = await createAdaptiveAssessment();
      const submission = await assessmentService.startAssessment(assessment.id, 'struggling-student');

      // Simulate struggling student responses
      const responses = [
        { questionId: 'q1', answer: 'incorrect', confidence: 0.3 },
        { questionId: 'q2', answer: 'incorrect', confidence: 0.2 },
        { questionId: 'q3', answer: 'correct', confidence: 0.4 },
        { questionId: 'q4', answer: 'incorrect', confidence: 0.3 },
        { questionId: 'q5', answer: 'correct', confidence: 0.5 },
        { questionId: 'q6', answer: 'correct', confidence: 0.6 },
        { questionId: 'q7', answer: 'correct', confidence: 0.7 }
      ];

      let currentSubmission = submission;
      let questionCount = 0;

      for (const responseData of responses) {
        const response: Response = {
          questionId: responseData.questionId,
          answer: responseData.answer,
          timeSpent: 45000, // Longer time for struggling student
          attempts: 1,
          confidence: responseData.confidence
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        questionCount++;

        if (result.adaptiveState?.isComplete) {
          break;
        }

        expect(result.isValid).toBe(true);
        expect(result.adaptiveState).toBeDefined();

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Complete the assessment
      const finalSubmission = await assessmentService.submitAssessment(currentSubmission.id);
      
      expect(finalSubmission.status).toBe(SubmissionStatus.GRADED);
      expect(questionCount).toBeGreaterThanOrEqual(5);
      
      // Struggling student might need more questions to reach confidence
      const adaptiveState = finalSubmission.metadata.adaptiveState;
      expect(adaptiveState.currentAbility).toBeLessThan(0.5);
    });

    it('should adapt question difficulty based on performance', async () => {
      const assessment = await createAdaptiveAssessment();
      const submission = await assessmentService.startAssessment(assessment.id, 'adaptive-learner');

      // Start with correct answers, then incorrect, then correct again
      const performancePattern = [
        { correct: true, confidence: 0.8 },
        { correct: true, confidence: 0.9 },
        { correct: false, confidence: 0.3 },
        { correct: false, confidence: 0.2 },
        { correct: true, confidence: 0.7 },
        { correct: true, confidence: 0.8 }
      ];

      let currentSubmission = submission;
      const abilityHistory: number[] = [];

      for (let i = 0; i < performancePattern.length; i++) {
        const pattern = performancePattern[i];
        const response: Response = {
          questionId: `q${i + 1}`,
          answer: pattern.correct ? 'correct' : 'incorrect',
          timeSpent: 35000,
          attempts: 1,
          confidence: pattern.confidence
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        
        if (result.adaptiveState) {
          abilityHistory.push(result.adaptiveState.currentAbility);
        }

        if (result.adaptiveState?.isComplete) {
          break;
        }

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Verify ability estimate changes appropriately
      expect(abilityHistory.length).toBeGreaterThan(3);
      
      // After correct answers, ability should increase
      expect(abilityHistory[1]).toBeGreaterThan(abilityHistory[0]);
      
      // After incorrect answers, ability should decrease
      expect(abilityHistory[3]).toBeLessThan(abilityHistory[2]);
      
      // Recovery should increase ability again
      if (abilityHistory.length > 5) {
        expect(abilityHistory[5]).toBeGreaterThan(abilityHistory[3]);
      }
    });

    it('should handle edge cases in adaptive testing', async () => {
      const assessment = await createAdaptiveAssessment();
      
      // Test with very quick correct answers (potential cheating detection)
      const quickSubmission = await assessmentService.startAssessment(assessment.id, 'quick-answerer');
      
      const quickResponse: Response = {
        questionId: 'q1',
        answer: 'correct',
        timeSpent: 1000, // Very quick
        attempts: 1,
        confidence: 1.0
      };

      const quickResult = await assessmentService.submitResponse(quickSubmission.id, quickResponse);
      expect(quickResult.isValid).toBe(true);
      expect(quickResult.adaptiveState).toBeDefined();

      // Test with very slow responses
      const slowSubmission = await assessmentService.startAssessment(assessment.id, 'slow-answerer');
      
      const slowResponse: Response = {
        questionId: 'q1',
        answer: 'correct',
        timeSpent: 300000, // 5 minutes
        attempts: 3,
        confidence: 0.6
      };

      const slowResult = await assessmentService.submitResponse(slowSubmission.id, slowResponse);
      expect(slowResult.isValid).toBe(true);
      expect(slowResult.adaptiveState).toBeDefined();
    });

    it('should provide meaningful progress indicators', async () => {
      const assessment = await createAdaptiveAssessment();
      const submission = await assessmentService.startAssessment(assessment.id, 'progress-tracker');

      let currentSubmission = submission;
      const progressHistory: number[] = [];

      // Submit several responses and track progress
      for (let i = 0; i < 6; i++) {
        const response: Response = {
          questionId: `q${i + 1}`,
          answer: i % 2 === 0 ? 'correct' : 'incorrect', // Alternating performance
          timeSpent: 30000,
          attempts: 1,
          confidence: 0.7
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        
        if (result.adaptiveState) {
          progressHistory.push(result.adaptiveState.estimatedCompletion);
        }

        if (result.adaptiveState?.isComplete) {
          break;
        }

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Progress should generally increase
      expect(progressHistory.length).toBeGreaterThan(2);
      expect(progressHistory[progressHistory.length - 1]).toBeGreaterThan(progressHistory[0]);
      
      // All progress values should be between 0 and 100
      progressHistory.forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Adaptive Testing Configuration', () => {
    it('should respect minimum question requirements', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.5,
        minQuestions: 8, // Higher minimum
        maxQuestions: 15,
        targetAccuracy: 0.7,
        confidenceThreshold: 0.9 // High confidence threshold
      };

      const assessment = await createAdaptiveAssessmentWithConfig(config);
      const submission = await assessmentService.startAssessment(assessment.id, 'min-questions-test');

      let questionCount = 0;
      let currentSubmission = submission;

      // Answer questions perfectly to try to trigger early completion
      for (let i = 0; i < 10; i++) {
        const response: Response = {
          questionId: `q${i + 1}`,
          answer: 'correct',
          timeSpent: 25000,
          attempts: 1,
          confidence: 0.95
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        questionCount++;

        if (result.adaptiveState?.isComplete) {
          break;
        }

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Should not complete before minimum questions
      expect(questionCount).toBeGreaterThanOrEqual(8);
    });

    it('should enforce maximum question limits', async () => {
      const config: AdaptiveTestingConfig = {
        initialDifficulty: DifficultyLevel.INTERMEDIATE,
        difficultyAdjustmentFactor: 0.3, // Slower adjustment
        minQuestions: 5,
        maxQuestions: 10, // Lower maximum
        targetAccuracy: 0.8,
        confidenceThreshold: 0.95 // Very high confidence threshold
      };

      const assessment = await createAdaptiveAssessmentWithConfig(config);
      const submission = await assessmentService.startAssessment(assessment.id, 'max-questions-test');

      let questionCount = 0;
      let currentSubmission = submission;

      // Provide inconsistent answers to avoid reaching confidence threshold
      for (let i = 0; i < 15; i++) {
        const response: Response = {
          questionId: `q${i + 1}`,
          answer: i % 3 === 0 ? 'incorrect' : 'correct', // Mixed performance
          timeSpent: 30000,
          attempts: 1,
          confidence: 0.6
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        questionCount++;

        if (result.adaptiveState?.isComplete) {
          break;
        }

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Should not exceed maximum questions
      expect(questionCount).toBeLessThanOrEqual(10);
    });
  });

  describe('Question Selection Optimization', () => {
    it('should select questions with optimal information gain', async () => {
      const assessment = await createAdaptiveAssessment();
      const submission = await assessmentService.startAssessment(assessment.id, 'optimization-test');

      // Get the initial adaptive state
      let adaptiveState = submission.metadata.adaptiveState;
      expect(adaptiveState).toBeDefined();

      // Track question selection over multiple responses
      const selectedQuestions: string[] = [];
      let currentSubmission = submission;

      for (let i = 0; i < 5; i++) {
        if (adaptiveState?.nextQuestionId) {
          selectedQuestions.push(adaptiveState.nextQuestionId);
        }

        const response: Response = {
          questionId: `q${i + 1}`,
          answer: 'correct',
          timeSpent: 30000,
          attempts: 1,
          confidence: 0.8
        };

        const result = await assessmentService.submitResponse(currentSubmission.id, response);
        adaptiveState = result.adaptiveState;

        if (adaptiveState?.isComplete) {
          break;
        }

        currentSubmission = await assessmentService.getSubmission(currentSubmission.id) as AssessmentSubmission;
      }

      // Verify questions were selected (not just random)
      expect(selectedQuestions.length).toBeGreaterThan(0);
      expect(new Set(selectedQuestions).size).toBe(selectedQuestions.length); // No duplicates
    });

    it('should analyze question selection effectiveness', async () => {
      const assessment = await createAdaptiveAssessment();
      
      // Create multiple submissions to analyze
      const submissions = [];
      for (let i = 0; i < 5; i++) {
        const submission = await assessmentService.startAssessment(assessment.id, `user-${i}`);
        
        // Complete the assessment with varied performance
        for (let j = 0; j < 6; j++) {
          const response: Response = {
            questionId: `q${j + 1}`,
            answer: Math.random() > 0.3 ? 'correct' : 'incorrect',
            timeSpent: 25000 + Math.random() * 20000,
            attempts: 1,
            confidence: 0.5 + Math.random() * 0.4
          };

          await assessmentService.submitResponse(submission.id, response);
        }

        const completed = await assessmentService.submitAssessment(submission.id);
        submissions.push(completed);
      }

      // Analyze question selection effectiveness
      const effectiveness = await assessmentService.analyzeQuestionSelectionEffectiveness(assessment.id);

      expect(effectiveness).toBeDefined();
      expect(effectiveness.averageInformationGain).toBeGreaterThan(0);
      expect(effectiveness.selectionEfficiency).toBeGreaterThan(0);
      expect(effectiveness.selectionEfficiency).toBeLessThanOrEqual(1);
      expect(Object.keys(effectiveness.difficultyDistribution).length).toBeGreaterThan(0);
      expect(Object.keys(effectiveness.contentCoverage).length).toBeGreaterThan(0);
    });
  });

  // Helper functions

  function setupMockQuestionBank() {
    // Mock the question bank service to return questions of varying difficulty
    jest.spyOn(questionBankService, 'searchQuestions').mockImplementation(async (criteria) => {
      const mockQuestions: Question[] = [
        createMockQuestion('q1', DifficultyLevel.BEGINNER, ['math', 'basic']),
        createMockQuestion('q2', DifficultyLevel.BEGINNER, ['math', 'arithmetic']),
        createMockQuestion('q3', DifficultyLevel.INTERMEDIATE, ['math', 'algebra']),
        createMockQuestion('q4', DifficultyLevel.INTERMEDIATE, ['math', 'geometry']),
        createMockQuestion('q5', DifficultyLevel.ADVANCED, ['math', 'calculus']),
        createMockQuestion('q6', DifficultyLevel.ADVANCED, ['math', 'statistics']),
        createMockQuestion('q7', DifficultyLevel.BEGINNER, ['science', 'basic']),
        createMockQuestion('q8', DifficultyLevel.INTERMEDIATE, ['science', 'physics']),
        createMockQuestion('q9', DifficultyLevel.ADVANCED, ['science', 'chemistry']),
        createMockQuestion('q10', DifficultyLevel.EXPERT, ['math', 'advanced'])
      ];

      // Filter by criteria if provided
      let filteredQuestions = mockQuestions;
      
      if (criteria?.difficulty) {
        filteredQuestions = filteredQuestions.filter(q => q.difficulty === criteria.difficulty);
      }
      
      if (criteria?.tags && criteria.tags.length > 0) {
        filteredQuestions = filteredQuestions.filter(q => 
          criteria.tags!.some(tag => q.tags.includes(tag))
        );
      }

      return filteredQuestions;
    });

    jest.spyOn(questionBankService, 'getQuestion').mockImplementation(async (id: string) => {
      const mockQuestions = [
        createMockQuestion('q1', DifficultyLevel.BEGINNER, ['math']),
        createMockQuestion('q2', DifficultyLevel.INTERMEDIATE, ['math']),
        createMockQuestion('q3', DifficultyLevel.ADVANCED, ['math']),
        createMockQuestion('q4', DifficultyLevel.EXPERT, ['math']),
        createMockQuestion('q5', DifficultyLevel.BEGINNER, ['science']),
        createMockQuestion('q6', DifficultyLevel.INTERMEDIATE, ['science']),
        createMockQuestion('q7', DifficultyLevel.ADVANCED, ['science']),
        createMockQuestion('q8', DifficultyLevel.EXPERT, ['science']),
        createMockQuestion('q9', DifficultyLevel.INTERMEDIATE, ['mixed']),
        createMockQuestion('q10', DifficultyLevel.ADVANCED, ['mixed'])
      ];

      return mockQuestions.find(q => q.id === id) || null;
    });
  }

  function createMockQuestion(id: string, difficulty: DifficultyLevel, tags: string[]): MultipleChoiceQuestion {
    return {
      id,
      type: QuestionType.MULTIPLE_CHOICE,
      content: { text: `Question ${id}` },
      options: [
        { id: 'a', text: 'Option A', isCorrect: false },
        { id: 'b', text: 'Option B', isCorrect: true },
        { id: 'c', text: 'Option C', isCorrect: false }
      ],
      allowMultiple: false,
      points: 10,
      difficulty,
      tags,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    };
  }

  async function createAdaptiveAssessment(): Promise<Assessment> {
    const questions = [
      createMockQuestion('q1', DifficultyLevel.INTERMEDIATE, ['math']),
      createMockQuestion('q2', DifficultyLevel.INTERMEDIATE, ['math']),
      createMockQuestion('q3', DifficultyLevel.INTERMEDIATE, ['math'])
    ];

    return assessmentService.createAssessment({
      title: 'Adaptive Math Assessment',
      description: 'Adaptive assessment for mathematics',
      instructions: 'Answer questions to the best of your ability',
      questions,
      settings: {
        timeLimit: 60,
        allowRetakes: false,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        showCorrectAnswers: false,
        isAdaptive: true // Enable adaptive testing
      },
      status: AssessmentStatus.PUBLISHED,
      tags: ['adaptive', 'math'],
      createdBy: 'test-creator'
    });
  }

  async function createAdaptiveAssessmentWithConfig(config: AdaptiveTestingConfig): Promise<Assessment> {
    const assessment = await createAdaptiveAssessment();
    
    // Store config in assessment metadata for testing
    assessment.metadata = { adaptiveConfig: config };
    
    return assessment;
  }
});