import { DistributedGradingService, GradingJob, DistributedGradingResult } from '../../services/grading.service';
import { QuestionType, DifficultyLevel, MultipleChoiceQuestion, EssayQuestion, Response } from '../../types/assessment.types';

// Mock Bull queue
jest.mock('bull', () => {
  const mockJob = {
    id: '123',
    data: {},
    progress: jest.fn(),
    attemptsMade: 0
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue(mockJob),
    addBulk: jest.fn().mockResolvedValue([mockJob]),
    process: jest.fn(),
    on: jest.fn(),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    clean: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  };

  return {
    Queue: jest.fn().mockImplementation(() => mockQueue)
  };
});

// Mock AI services
jest.mock('../../services/ai-essay-grading.service', () => ({
  AIEssayGradingService: jest.fn().mockImplementation(() => ({
    gradeEssay: jest.fn().mockResolvedValue({
      score: 85,
      confidence: 0.9,
      analysis: 'Well-structured essay with clear arguments',
      suggestions: ['Consider adding more examples']
    })
  }))
}));

jest.mock('../../services/plagiarism-detection.service', () => ({
  PlagiarismDetectionService: jest.fn().mockImplementation(() => ({
    checkPlagiarism: jest.fn().mockResolvedValue({
      similarityScore: 0.1,
      matches: []
    })
  }))
}));

describe('DistributedGradingService', () => {
  let gradingService: DistributedGradingService;
  const mockRedisConfig = { host: 'localhost', port: 6379 };

  beforeEach(() => {
    gradingService = new DistributedGradingService(mockRedisConfig);
  });

  afterEach(async () => {
    await gradingService.shutdown();
    jest.clearAllMocks();
  });

  describe('submitGradingJob', () => {
    it('should submit a grading job successfully', async () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'What is 2 + 2?' },
        options: [
          { id: 'a', text: '3', isCorrect: false },
          { id: 'b', text: '4', isCorrect: true }
        ],
        allowMultiple: false,
        points: 10,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['math'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const response: Response = {
        questionId: 'q1',
        answer: 'b',
        timeSpent: 30000,
        attempts: 1
      };

      const jobId = await gradingService.submitGradingJob(
        'sub1',
        'assess1',
        'user1',
        question,
        response,
        'normal'
      );

      expect(jobId).toBe('123');
    });

    it('should handle high priority jobs correctly', async () => {
      const question: MultipleChoiceQuestion = {
        id: 'q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'Test question' },
        options: [{ id: 'a', text: 'Answer', isCorrect: true }],
        allowMultiple: false,
        points: 5,
        difficulty: DifficultyLevel.BEGINNER,
        tags: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'teacher1'
      };

      const response: Response = {
        questionId: 'q1',
        answer: 'a',
        timeSpent: 15000,
        attempts: 1
      };

      const jobId = await gradingService.submitGradingJob(
        'sub1',
        'assess1',
        'user1',
        question,
        response,
        'high'
      );

      expect(jobId).toBeDefined();
    });
  });

  describe('submitBatchGradingJobs', () => {
    it('should submit multiple grading jobs as a batch', async () => {
      const questionsAndResponses = [
        {
          question: {
            id: 'q1',
            type: QuestionType.MULTIPLE_CHOICE,
            content: { text: 'Question 1' },
            options: [{ id: 'a', text: 'Answer', isCorrect: true }],
            allowMultiple: false,
            points: 5,
            difficulty: DifficultyLevel.BEGINNER,
            tags: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'teacher1'
          } as MultipleChoiceQuestion,
          response: {
            questionId: 'q1',
            answer: 'a',
            timeSpent: 20000,
            attempts: 1
          }
        },
        {
          question: {
            id: 'q2',
            type: QuestionType.MULTIPLE_CHOICE,
            content: { text: 'Question 2' },
            options: [{ id: 'b', text: 'Answer', isCorrect: true }],
            allowMultiple: false,
            points: 5,
            difficulty: DifficultyLevel.BEGINNER,
            tags: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'teacher1'
          } as MultipleChoiceQuestion,
          response: {
            questionId: 'q2',
            answer: 'b',
            timeSpent: 25000,
            attempts: 1
          }
        }
      ];

      const jobIds = await gradingService.submitBatchGradingJobs(
        'sub1',
        'assess1',
        'user1',
        questionsAndResponses,
        'normal'
      );

      expect(jobIds).toHaveLength(2);
      expect(jobIds[0]).toBe('123');
      expect(jobIds[1]).toBe('123');
    });
  });

  describe('getQueueStatistics', () => {
    it('should return queue statistics', async () => {
      const stats = await gradingService.getQueueStatistics();

      expect(stats).toBeDefined();
      expect(stats.normal).toBeDefined();
      expect(stats.priority).toBeDefined();
      expect(stats.processingStats).toBeDefined();
      
      expect(stats.normal.waiting).toBe(0);
      expect(stats.normal.active).toBe(0);
      expect(stats.normal.completed).toBe(0);
      expect(stats.normal.failed).toBe(0);
    });
  });

  describe('isSubmissionFullyGraded', () => {
    it('should return false when not all questions are graded', async () => {
      const questionIds = ['q1', 'q2', 'q3'];
      const isFullyGraded = await gradingService.isSubmissionFullyGraded('sub1', questionIds);
      
      expect(isFullyGraded).toBe(false);
    });

    it('should return true when all questions are graded', async () => {
      // Mock grading results
      const mockResult: DistributedGradingResult = {
        score: 10,
        maxScore: 10,
        isCorrect: true,
        submissionId: 'sub1',
        questionId: 'q1',
        gradedAt: new Date(),
        gradingDuration: 1000,
        requiresManualReview: false,
        confidence: 1.0,
        metadata: {
          gradingMethod: 'automatic',
          processingNode: 'node1'
        }
      };

      // Simulate stored results
      gradingService['gradingResults'].set('sub1_q1', mockResult);
      gradingService['gradingResults'].set('sub1_q2', { ...mockResult, questionId: 'q2' });

      const questionIds = ['q1', 'q2'];
      const isFullyGraded = await gradingService.isSubmissionFullyGraded('sub1', questionIds);
      
      expect(isFullyGraded).toBe(true);
    });
  });

  describe('queue management', () => {
    it('should pause and resume grading queues', async () => {
      await gradingService.pauseGrading();
      await gradingService.resumeGrading();
      
      // Verify no errors thrown
      expect(true).toBe(true);
    });

    it('should clean up completed and failed jobs', async () => {
      await gradingService.cleanupJobs();
      
      // Verify no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('code analysis', () => {
    it('should analyze code complexity correctly', () => {
      const simpleCode = 'function add(a, b) { return a + b; }';
      const complexCode = `
        function complexFunction(data) {
          if (data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              if (data[i].active && data[i].valid) {
                switch (data[i].type) {
                  case 'A':
                    return processA(data[i]);
                  case 'B':
                    return processB(data[i]);
                  default:
                    return null;
                }
              }
            }
          }
          return [];
        }
      `;

      const simpleComplexity = gradingService['analyzeCodeComplexity'](simpleCode);
      const complexComplexity = gradingService['analyzeCodeComplexity'](complexCode);

      expect(simpleComplexity).toBeLessThan(complexComplexity);
      expect(simpleComplexity).toBeGreaterThan(0);
      expect(complexComplexity).toBeGreaterThan(5);
    });

    it('should analyze code style correctly', () => {
      const goodStyleCode = `
        /**
         * Adds two numbers together
         */
        function add(a, b) {
          return a + b;
        }
      `;

      const poorStyleCode = `
        function add(a,b){return a+b}
      `;

      const goodStyleResult = gradingService['analyzeCodeStyle'](goodStyleCode, 'javascript');
      const poorStyleResult = gradingService['analyzeCodeStyle'](poorStyleCode, 'javascript');

      expect(goodStyleResult.score).toBeGreaterThan(poorStyleResult.score);
      expect(goodStyleResult.issues.length).toBeLessThan(poorStyleResult.issues.length);
    });

    it('should detect security vulnerabilities', () => {
      const secureCode = 'const result = sanitize(userInput);';
      const vulnerableCode = `
        eval(userInput);
        document.innerHTML = userInput;
        const password = "hardcoded123";
      `;

      const secureResult = gradingService['analyzeCodeSecurity'](secureCode);
      const vulnerableResult = gradingService['analyzeCodeSecurity'](vulnerableCode);

      expect(secureResult.vulnerabilities.length).toBe(0);
      expect(secureResult.riskLevel).toBe('low');
      
      expect(vulnerableResult.vulnerabilities.length).toBeGreaterThan(0);
      expect(vulnerableResult.riskLevel).toBe('high');
      expect(vulnerableResult.vulnerabilities).toContain('Use of eval() function');
      expect(vulnerableResult.vulnerabilities).toContain('Hardcoded password detected');
    });
  });

  describe('processing statistics', () => {
    it('should track processing statistics correctly', () => {
      // Simulate processing statistics updates
      gradingService['updateProcessingStats']('multiple_choice', true, 1000);
      gradingService['updateProcessingStats']('multiple_choice', true, 1500);
      gradingService['updateProcessingStats']('multiple_choice', false, 0);
      gradingService['updateProcessingStats']('essay', true, 5000);

      const stats = gradingService['processingStats'];
      
      expect(stats.get('multiple_choice')).toEqual({
        processed: 2,
        failed: 1,
        avgDuration: 1250
      });
      
      expect(stats.get('essay')).toEqual({
        processed: 1,
        failed: 0,
        avgDuration: 5000
      });
    });
  });

  describe('priority handling', () => {
    it('should convert priority strings to numeric values correctly', () => {
      expect(gradingService['getPriorityValue']('high')).toBe(10);
      expect(gradingService['getPriorityValue']('normal')).toBe(5);
      expect(gradingService['getPriorityValue']('low')).toBe(1);
    });
  });
});