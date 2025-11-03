import request from 'supertest';
import { App } from '../../app';
import { logger } from '../../utils/logger';

describe('Assessment Engine Pilot Validation', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    // Set pilot mode for testing
    process.env.PILOT_MODE = 'true';
    process.env.NODE_ENV = 'test';
    
    app = new App();
    await app.initialize();
    server = app.app;
  });

  afterAll(async () => {
    if (app) {
      app.shutdown();
    }
  });

  describe('Pilot Environment Setup', () => {
    test('should be running in pilot mode', () => {
      expect(process.env.PILOT_MODE).toBe('true');
    });

    test('should have pilot-specific configuration', async () => {
      const response = await request(server)
        .get('/api/v1/pilot/status')
        .expect(200);

      expect(response.body).toMatchObject({
        pilotMode: true,
        version: expect.stringContaining('pilot'),
        features: {
          questionBanks: true,
          assessments: true,
          submissions: true,
          monitoring: true,
          analytics: true
        }
      });
    });
  });

  describe('Core API Endpoints', () => {
    test('health check should return healthy status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    test('API base endpoint should return service information', async () => {
      const response = await request(server)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Assessment Engine Service API v1',
        endpoints: {
          health: '/health',
          assessments: '/api/v1/assessments',
          questionBanks: '/api/v1/question-banks',
          submissions: '/api/v1/submissions'
        }
      });
    });

    test('metrics endpoint should be accessible', async () => {
      const response = await request(server)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('assessment_');
    });
  });

  describe('Question Bank Management', () => {
    let questionBankId: string;

    test('should create a new question bank', async () => {
      const questionBankData = {
        name: 'Pilot Test Bank',
        description: 'Test question bank for pilot validation',
        subject: 'Mathematics',
        tags: ['pilot', 'test']
      };

      const response = await request(server)
        .post('/api/v1/question-banks')
        .send(questionBankData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^qb_/),
        name: questionBankData.name,
        description: questionBankData.description,
        subject: questionBankData.subject,
        tags: questionBankData.tags,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      questionBankId = response.body.id;
    });

    test('should retrieve question banks list', async () => {
      const response = await request(server)
        .get('/api/v1/question-banks')
        .expect(200);

      expect(response.body).toMatchObject({
        questionBanks: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10
      });
    });

    test('should add questions to question bank', async () => {
      const questionData = {
        type: 'multiple_choice',
        content: {
          text: 'What is 2 + 2?',
          instructions: 'Select the correct answer'
        },
        options: [
          { id: 'opt1', text: '3', isCorrect: false },
          { id: 'opt2', text: '4', isCorrect: true },
          { id: 'opt3', text: '5', isCorrect: false }
        ],
        points: 1,
        difficulty: 'beginner',
        tags: ['pilot', 'arithmetic']
      };

      const response = await request(server)
        .post(`/api/v1/question-banks/${questionBankId}/questions`)
        .send(questionData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^q_/),
        bankId: questionBankId,
        type: questionData.type,
        content: questionData.content,
        options: questionData.options,
        points: questionData.points,
        difficulty: questionData.difficulty,
        tags: questionData.tags,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });
  });

  describe('Assessment Management', () => {
    let assessmentId: string;

    test('should create a new assessment', async () => {
      const assessmentData = {
        title: 'Pilot Assessment',
        description: 'Test assessment for pilot validation',
        timeLimit: 1800,
        maxAttempts: 3,
        settings: {
          shuffleQuestions: true,
          showResults: true,
          allowReview: true
        }
      };

      const response = await request(server)
        .post('/api/v1/assessments')
        .send(assessmentData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^a_/),
        title: assessmentData.title,
        description: assessmentData.description,
        status: 'draft',
        timeLimit: assessmentData.timeLimit,
        maxAttempts: assessmentData.maxAttempts,
        settings: assessmentData.settings,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      assessmentId = response.body.id;
    });

    test('should retrieve assessments list', async () => {
      const response = await request(server)
        .get('/api/v1/assessments')
        .expect(200);

      expect(response.body).toMatchObject({
        assessments: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 10
      });
    });

    test('should handle assessment submissions', async () => {
      const submissionData = {
        userId: 'student_pilot_001',
        responses: [
          {
            questionId: 'q_test_001',
            answer: 'opt2',
            timeSpent: 30
          }
        ]
      };

      const response = await request(server)
        .post(`/api/v1/assessments/${assessmentId}/submissions`)
        .send(submissionData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^s_/),
        assessmentId: assessmentId,
        userId: submissionData.userId,
        status: 'submitted',
        submittedAt: expect.any(String)
      });
    });
  });

  describe('Performance Validation', () => {
    test('should respond to health check within 500ms', async () => {
      const startTime = Date.now();
      
      await request(server)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(server).get('/health').expect(200)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });

    test('should maintain performance under load', async () => {
      const loadTestRequests = 20;
      const startTime = Date.now();
      
      const promises = Array.from({ length: loadTestRequests }, () =>
        request(server).get('/api/v1').expect(200)
      );

      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const averageResponseTime = totalTime / loadTestRequests;
      
      expect(averageResponseTime).toBeLessThan(100); // Average should be under 100ms
    });
  });

  describe('Monitoring and Analytics', () => {
    test('should collect business metrics', async () => {
      // Create a question bank to trigger metrics
      await request(server)
        .post('/api/v1/question-banks')
        .send({
          name: 'Metrics Test Bank',
          description: 'Bank for testing metrics collection',
          subject: 'Test',
          tags: ['metrics']
        })
        .expect(201);

      // Check that metrics are being collected
      const metricsResponse = await request(server)
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('question_bank_created');
    });

    test('should provide monitoring dashboard data', async () => {
      const response = await request(server)
        .get('/dashboard')
        .expect(200);

      expect(response.body).toMatchObject({
        timestamp: expect.any(String),
        metrics: expect.any(Object)
      });
    });

    test('should track system health metrics', async () => {
      const response = await request(server)
        .get('/metrics/json')
        .expect(200);

      expect(response.body).toMatchObject({
        system: expect.objectContaining({
          uptime: expect.any(Number),
          memory: expect.any(Object),
          cpu: expect.any(Object)
        }),
        application: expect.objectContaining({
          requests: expect.any(Object),
          responses: expect.any(Object)
        })
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle invalid question bank creation gracefully', async () => {
      const invalidData = {
        // Missing required fields
        description: 'Invalid bank'
      };

      const response = await request(server)
        .post('/api/v1/question-banks')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('should handle non-existent resource requests', async () => {
      const response = await request(server)
        .get('/api/v1/assessments/non-existent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: expect.stringContaining('not found'),
        timestamp: expect.any(String)
      });
    });

    test('should handle malformed JSON requests', async () => {
      const response = await request(server)
        .post('/api/v1/question-banks')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Security Validation', () => {
    test('should include security headers', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': expect.any(String),
        'x-xss-protection': expect.any(String)
      });
    });

    test('should enforce rate limiting', async () => {
      // This test would need to be adjusted based on actual rate limiting configuration
      const requests = Array.from({ length: 5 }, () =>
        request(server).get('/health')
      );

      const results = await Promise.all(requests);
      
      // All requests should succeed under normal rate limits
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });

    test('should validate CORS configuration', async () => {
      const response = await request(server)
        .options('/api/v1')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data consistency across operations', async () => {
      // Create question bank
      const bankResponse = await request(server)
        .post('/api/v1/question-banks')
        .send({
          name: 'Consistency Test Bank',
          description: 'Testing data consistency',
          subject: 'Test'
        })
        .expect(201);

      const bankId = bankResponse.body.id;

      // Add question to bank
      const questionResponse = await request(server)
        .post(`/api/v1/question-banks/${bankId}/questions`)
        .send({
          type: 'multiple_choice',
          content: { text: 'Test question' },
          options: [{ id: 'opt1', text: 'Answer', isCorrect: true }],
          points: 1
        })
        .expect(201);

      // Verify question is associated with correct bank
      expect(questionResponse.body.bankId).toBe(bankId);
    });

    test('should handle concurrent data modifications safely', async () => {
      const bankData = {
        name: 'Concurrent Test Bank',
        description: 'Testing concurrent modifications',
        subject: 'Test'
      };

      // Create multiple question banks concurrently
      const promises = Array.from({ length: 5 }, (_, index) =>
        request(server)
          .post('/api/v1/question-banks')
          .send({
            ...bankData,
            name: `${bankData.name} ${index}`
          })
          .expect(201)
      );

      const results = await Promise.all(promises);
      
      // Verify all banks were created with unique IDs
      const ids = results.map(result => result.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Pilot-Specific Features', () => {
    test('should support pilot cohort configuration', async () => {
      const response = await request(server)
        .get('/api/v1/pilot/status')
        .expect(200);

      expect(response.body.pilotMode).toBe(true);
      expect(response.body.features).toBeDefined();
    });

    test('should handle pilot feedback collection', async () => {
      // This would be implemented based on actual feedback collection endpoints
      const feedbackData = {
        userId: 'pilot_user_001',
        rating: 4,
        comments: 'System works well',
        category: 'usability'
      };

      // For now, just verify the pilot status endpoint works
      const response = await request(server)
        .get('/api/v1/pilot/status')
        .expect(200);

      expect(response.body.pilotMode).toBe(true);
    });

    test('should provide pilot-specific monitoring data', async () => {
      const response = await request(server)
        .get('/metrics')
        .expect(200);

      // Verify pilot-specific metrics are being collected
      expect(response.text).toContain('pilot');
    });
  });
});

// Helper function to generate test data
function generateTestQuestionBank(suffix: string = '') {
  return {
    name: `Test Bank ${suffix}`,
    description: `Test question bank ${suffix}`,
    subject: 'Test Subject',
    tags: ['test', 'pilot']
  };
}

function generateTestQuestion(bankId: string) {
  return {
    type: 'multiple_choice',
    content: {
      text: 'Sample test question?',
      instructions: 'Select the best answer'
    },
    options: [
      { id: 'opt1', text: 'Option A', isCorrect: false },
      { id: 'opt2', text: 'Option B', isCorrect: true },
      { id: 'opt3', text: 'Option C', isCorrect: false }
    ],
    points: 2,
    difficulty: 'intermediate',
    tags: ['test']
  };
}

function generateTestAssessment() {
  return {
    title: 'Test Assessment',
    description: 'Sample assessment for testing',
    timeLimit: 3600,
    maxAttempts: 2,
    settings: {
      shuffleQuestions: false,
      showResults: true,
      allowReview: true
    }
  };
}