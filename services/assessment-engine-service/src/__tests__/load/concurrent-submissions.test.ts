import { AssessmentService } from '../../services/assessment.service';
import { QuestionBankService } from '../../services/question-bank.service';
import { DistributedGradingService } from '../../services/grading.service';
import {
  Assessment,
  AssessmentSubmission,
  Question,
  Response,
  QuestionType,
  DifficultyLevel,
  AssessmentStatus,
  MultipleChoiceQuestion,
  EssayQuestion
} from '../../types/assessment.types';

// Mock Redis for load testing
const mockRedisConfig = { host: 'localhost', port: 6379 };

describe('Concurrent Assessment Submissions Load Tests', () => {
  let assessmentService: AssessmentService;
  let questionBankService: QuestionBankService;
  let gradingService: DistributedGradingService;
  let testAssessment: Assessment;

  beforeAll(async () => {
    questionBankService = new QuestionBankService();
    assessmentService = new AssessmentService(questionBankService);
    gradingService = new DistributedGradingService(mockRedisConfig);
    
    // Create test assessment
    testAssessment = await createLoadTestAssessment();
  });

  afterAll(async () => {
    await gradingService.shutdown();
  });

  describe('Concurrent User Submissions', () => {
    it('should handle 50 concurrent users starting assessments', async () => {
      const concurrentUsers = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentUsers }, (_, i) => 
        assessmentService.startAssessment(testAssessment.id, `load-user-${i}`)
      );

      const submissions = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all submissions were created successfully
      expect(submissions).toHaveLength(concurrentUsers);
      submissions.forEach((submission, index) => {
        expect(submission.userId).toBe(`load-user-${index}`);
        expect(submission.assessmentId).toBe(testAssessment.id);
      });

      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`Created ${concurrentUsers} concurrent submissions in ${duration}ms`);
    });

    it('should handle 100 concurrent response submissions', async () => {
      const concurrentResponses = 100;
      const startTime = Date.now();

      // Create submissions first
      const submissions = await Promise.all(
        Array.from({ length: concurrentResponses }, (_, i) => 
          assessmentService.startAssessment(testAssessment.id, `response-user-${i}`)
        )
      );

      // Submit responses concurrently
      const responsePromises = submissions.map((submission, index) => {
        const response: Response = {
          questionId: testAssessment.questions[0].id,
          answer: index % 2 === 0 ? 'correct' : 'incorrect',
          timeSpent: 20000 + Math.random() * 10000,
          attempts: 1,
          confidence: 0.5 + Math.random() * 0.5
        };
        
        return assessmentService.submitResponse(submission.id, response);
      });

      const results = await Promise.all(responsePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all responses were processed
      expect(results).toHaveLength(concurrentResponses);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });

      // Performance assertion
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log(`Processed ${concurrentResponses} concurrent responses in ${duration}ms`);
    });

    it('should handle mixed concurrent operations', async () => {
      const operationCount = 75;
      const startTime = Date.now();

      const operations = [];

      // Mix of different operations
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 3;
        
        switch (operationType) {
          case 0: // Start assessment
            operations.push(
              assessmentService.startAssessment(testAssessment.id, `mixed-user-${i}`)
            );
            break;
            
          case 1: // Submit response (need to create submission first)
            operations.push(
              assessmentService.startAssessment(testAssessment.id, `mixed-user-${i}`)
                .then(submission => {
                  const response: Response = {
                    questionId: testAssessment.questions[0].id,
                    answer: 'test-answer',
                    timeSpent: 25000,
                    attempts: 1
                  };
                  return assessmentService.submitResponse(submission.id, response);
                })
            );
            break;
            
          case 2: // Get assessment
            operations.push(
              assessmentService.getAssessment(testAssessment.id)
            );
            break;
        }
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all operations completed
      expect(results).toHaveLength(operationCount);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Performance assertion
      expect(duration).toBeLessThan(15000); // 15 seconds
      
      console.log(`Completed ${operationCount} mixed concurrent operations in ${duration}ms`);
    });
  });

  describe('Distributed Grading Load Tests', () => {
    it('should handle 200 concurrent grading jobs', async () => {
      const jobCount = 200;
      const startTime = Date.now();

      const gradingPromises = Array.from({ length: jobCount }, (_, i) => {
        const question = testAssessment.questions[i % testAssessment.questions.length];
        const response: Response = {
          questionId: question.id,
          answer: i % 2 === 0 ? 'correct' : 'incorrect',
          timeSpent: 20000 + Math.random() * 30000,
          attempts: 1,
          confidence: Math.random()
        };

        return gradingService.submitGradingJob(
          `submission-${i}`,
          testAssessment.id,
          `user-${i}`,
          question,
          response,
          i % 10 === 0 ? 'high' : 'normal' // 10% high priority
        );
      });

      const jobIds = await Promise.all(gradingPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all jobs were submitted
      expect(jobIds).toHaveLength(jobCount);
      jobIds.forEach(jobId => {
        expect(jobId).toBeDefined();
        expect(typeof jobId).toBe('string');
      });

      // Performance assertion
      expect(duration).toBeLessThan(8000); // 8 seconds
      
      console.log(`Submitted ${jobCount} concurrent grading jobs in ${duration}ms`);
    });

    it('should handle batch grading submissions efficiently', async () => {
      const batchCount = 20;
      const questionsPerBatch = 10;
      const startTime = Date.now();

      const batchPromises = Array.from({ length: batchCount }, (_, batchIndex) => {
        const questionsAndResponses = Array.from({ length: questionsPerBatch }, (_, qIndex) => {
          const questionIndex = qIndex % testAssessment.questions.length;
          const question = testAssessment.questions[questionIndex];
          const response: Response = {
            questionId: question.id,
            answer: `batch-${batchIndex}-answer-${qIndex}`,
            timeSpent: 15000 + Math.random() * 20000,
            attempts: 1,
            confidence: 0.6 + Math.random() * 0.4
          };

          return { question, response };
        });

        return gradingService.submitBatchGradingJobs(
          `batch-submission-${batchIndex}`,
          testAssessment.id,
          `batch-user-${batchIndex}`,
          questionsAndResponses,
          'normal'
        );
      });

      const batchResults = await Promise.all(batchPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all batches were processed
      expect(batchResults).toHaveLength(batchCount);
      batchResults.forEach(jobIds => {
        expect(jobIds).toHaveLength(questionsPerBatch);
      });

      const totalJobs = batchCount * questionsPerBatch;
      
      // Performance assertion
      expect(duration).toBeLessThan(12000); // 12 seconds
      
      console.log(`Processed ${batchCount} batches (${totalJobs} total jobs) in ${duration}ms`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should maintain stable memory usage under load', async () => {
      const iterations = 5;
      const usersPerIteration = 30;
      const memoryUsages: number[] = [];

      for (let iteration = 0; iteration < iterations; iteration++) {
        const startMemory = process.memoryUsage().heapUsed;

        // Create and complete submissions
        const submissions = await Promise.all(
          Array.from({ length: usersPerIteration }, (_, i) => 
            assessmentService.startAssessment(testAssessment.id, `memory-user-${iteration}-${i}`)
          )
        );

        // Submit responses and complete assessments
        await Promise.all(
          submissions.map(async (submission, index) => {
            const response: Response = {
              questionId: testAssessment.questions[0].id,
              answer: `memory-test-${index}`,
              timeSpent: 25000,
              attempts: 1
            };

            await assessmentService.submitResponse(submission.id, response);
            return assessmentService.submitAssessment(submission.id);
          })
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const endMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = endMemory - startMemory;
        memoryUsages.push(memoryIncrease);

        console.log(`Iteration ${iteration + 1}: Memory increase ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      }

      // Memory usage should not grow excessively
      const averageIncrease = memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
      const maxIncrease = Math.max(...memoryUsages);

      expect(averageIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB average
      expect(maxIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max
    });

    it('should handle cleanup of completed submissions', async () => {
      const submissionCount = 50;
      
      // Create and complete many submissions
      const submissions = await Promise.all(
        Array.from({ length: submissionCount }, (_, i) => 
          assessmentService.startAssessment(testAssessment.id, `cleanup-user-${i}`)
        )
      );

      // Complete all submissions
      const completedSubmissions = await Promise.all(
        submissions.map(async (submission, index) => {
          const response: Response = {
            questionId: testAssessment.questions[0].id,
            answer: `cleanup-answer-${index}`,
            timeSpent: 20000,
            attempts: 1
          };

          await assessmentService.submitResponse(submission.id, response);
          return assessmentService.submitAssessment(submission.id);
        })
      );

      // Verify all submissions were completed
      expect(completedSubmissions).toHaveLength(submissionCount);
      completedSubmissions.forEach(submission => {
        expect(submission.submittedAt).toBeDefined();
      });

      // Test cleanup operations
      await gradingService.cleanupJobs();
      
      const queueStats = await gradingService.getQueueStatistics();
      expect(queueStats).toBeDefined();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet p95 response time SLO for assessment operations', async () => {
      const operationCount = 100;
      const responseTimes: number[] = [];

      for (let i = 0; i < operationCount; i++) {
        const startTime = Date.now();
        
        const submission = await assessmentService.startAssessment(testAssessment.id, `benchmark-user-${i}`);
        
        const response: Response = {
          questionId: testAssessment.questions[0].id,
          answer: 'benchmark-answer',
          timeSpent: 25000,
          attempts: 1
        };

        await assessmentService.submitResponse(submission.id, response);
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Calculate p95 response time
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(operationCount * 0.95);
      const p95ResponseTime = responseTimes[p95Index];

      console.log(`P95 response time: ${p95ResponseTime}ms`);
      console.log(`Average response time: ${responseTimes.reduce((sum, time) => sum + time, 0) / operationCount}ms`);

      // SLO: p95 ≤ 500ms for assessment operations
      expect(p95ResponseTime).toBeLessThanOrEqual(500);
    });

    it('should maintain throughput under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const operations: Promise<any>[] = [];

      // Generate continuous load for specified duration
      while (Date.now() - startTime < duration) {
        const operation = assessmentService.startAssessment(testAssessment.id, `throughput-user-${operationCount}`)
          .then(submission => {
            const response: Response = {
              questionId: testAssessment.questions[0].id,
              answer: `throughput-answer-${operationCount}`,
              timeSpent: 20000,
              attempts: 1
            };
            return assessmentService.submitResponse(submission.id, response);
          });

        operations.push(operation);
        operationCount++;

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for all operations to complete
      await Promise.all(operations);
      
      const actualDuration = Date.now() - startTime;
      const throughput = operationCount / (actualDuration / 1000); // operations per second

      console.log(`Sustained throughput: ${throughput.toFixed(2)} operations/second over ${actualDuration}ms`);
      console.log(`Total operations: ${operationCount}`);

      // Minimum throughput expectation
      expect(throughput).toBeGreaterThan(5); // At least 5 operations per second
    });
  });

  // Helper functions

  async function createLoadTestAssessment(): Promise<Assessment> {
    const questions: Question[] = [
      {
        id: 'load-q1',
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'Load test question 1' },
        options: [
          { id: 'a', text: 'Option A', isCorrect: false },
          { id: 'b', text: 'Option B', isCorrect: true },
          { id: 'c', text: 'Option C', isCorrect: false }
        ],
        allowMultiple: false,
        points: 10,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: ['load-test'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'load-tester'
      } as MultipleChoiceQuestion,
      {
        id: 'load-q2',
        type: QuestionType.MULTIPLE_CHOICE,
        content: { text: 'Load test question 2' },
        options: [
          { id: 'a', text: 'Option A', isCorrect: true },
          { id: 'b', text: 'Option B', isCorrect: false }
        ],
        allowMultiple: false,
        points: 15,
        difficulty: DifficultyLevel.BEGINNER,
        tags: ['load-test'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'load-tester'
      } as MultipleChoiceQuestion,
      {
        id: 'load-q3',
        type: QuestionType.ESSAY,
        content: { text: 'Write a short essay for load testing' },
        wordLimit: 100,
        points: 20,
        difficulty: DifficultyLevel.INTERMEDIATE,
        tags: ['load-test', 'essay'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'load-tester'
      } as EssayQuestion
    ];

    return assessmentService.createAssessment({
      title: 'Load Test Assessment',
      description: 'Assessment for load testing concurrent submissions',
      instructions: 'Complete all questions for load testing',
      questions,
      settings: {
        timeLimit: 30,
        allowRetakes: true,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResults: true,
        showCorrectAnswers: true,
        isAdaptive: false
      },
      status: AssessmentStatus.PUBLISHED,
      tags: ['load-test'],
      createdBy: 'load-tester'
    });
  }
});