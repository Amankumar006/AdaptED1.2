import request from 'supertest';
import { app } from '../../app';
import { databaseService } from '../../services/database.service';
import { redisService } from '../../services/redis.service';
import { Content } from '../../models/content.model';
import { ContentType, DifficultyLevel } from '../../types/content.types';
import jwt from 'jsonwebtoken';
import { config } from '../../config/config';

describe('Content API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Connect to test database
    await databaseService.connect();
    await redisService.connect();

    // Create test auth token
    authToken = jwt.sign(
      {
        id: 'test-user-id',
        email: 'test@example.com',
        roles: ['teacher'],
      },
      config.jwt.secret
    );
  });

  afterAll(async () => {
    // Clean up test data
    await Content.deleteMany({});
    await databaseService.disconnect();
    await redisService.disconnect();
  });

  beforeEach(async () => {
    // Clear content collection before each test
    await Content.deleteMany({});
  });

  describe('POST /api/content', () => {
    it('should create content successfully', async () => {
      const contentData = {
        type: ContentType.LESSON,
        metadata: {
          title: 'Test Lesson',
          description: 'A test lesson for integration testing',
          keywords: ['test', 'lesson'],
          language: 'en',
          subject: 'Mathematics',
          gradeLevel: '5th Grade',
          difficulty: DifficultyLevel.BEGINNER,
          learningObjectives: ['Understand basic concepts'],
          prerequisites: [],
        },
        data: {
          content: 'This is the lesson content',
          sections: ['Introduction', 'Main Content', 'Conclusion'],
        },
        tags: ['math', 'elementary'],
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        type: ContentType.LESSON,
        metadata: expect.objectContaining({
          title: 'Test Lesson',
          subject: 'Mathematics',
        }),
        status: 'draft',
      });

      // Verify content was saved to database
      const savedContent = await Content.findById(response.body.data._id);
      expect(savedContent).toBeTruthy();
      expect(savedContent!.metadata.title).toBe('Test Lesson');
    });

    it('should reject invalid content data', async () => {
      const invalidData = {
        type: 'invalid-type',
        metadata: {
          title: '', // Empty title should fail validation
        },
      };

      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      const contentData = {
        type: ContentType.LESSON,
        metadata: {
          title: 'Test Lesson',
          description: 'Test',
          language: 'en',
          subject: 'Math',
          gradeLevel: '5th',
          difficulty: DifficultyLevel.BEGINNER,
          learningObjectives: [],
          prerequisites: [],
        },
        data: { content: 'test' },
      };

      await request(app)
        .post('/api/content')
        .send(contentData)
        .expect(401);
    });
  });

  describe('GET /api/content/:id', () => {
    it('should retrieve content by ID', async () => {
      // Create test content
      const content = new Content({
        type: ContentType.LESSON,
        metadata: {
          title: 'Test Lesson',
          description: 'Test Description',
          keywords: ['test'],
          language: 'en',
          subject: 'Math',
          gradeLevel: '5th',
          difficulty: DifficultyLevel.BEGINNER,
          learningObjectives: [],
          prerequisites: [],
        },
        versions: [{
          version: '1.0.0',
          data: { content: 'Test content' },
          changelog: 'Initial version',
          isActive: true,
          createdBy: 'test-user-id',
          createdAt: new Date(),
        }],
        currentVersion: '1.0.0',
        collaborators: [{
          userId: 'test-user-id',
          role: 'owner',
          permissions: ['read', 'write'],
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
        comments: [],
        suggestions: [],
        xapiStatements: [],
        createdBy: 'test-user-id',
      });

      await content.save();

      const response = await request(app)
        .get(`/api/content/${content._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        _id: content._id.toString(),
        metadata: expect.objectContaining({
          title: 'Test Lesson',
        }),
      });
    });

    it('should return 404 for non-existent content', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/content/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content not found');
    });
  });

  describe('GET /api/content/search', () => {
    beforeEach(async () => {
      // Create test content for search
      const testContent = [
        {
          type: ContentType.LESSON,
          metadata: {
            title: 'Math Lesson 1',
            description: 'Basic arithmetic',
            keywords: ['math', 'arithmetic'],
            language: 'en',
            subject: 'Mathematics',
            gradeLevel: '3rd Grade',
            difficulty: DifficultyLevel.BEGINNER,
            learningObjectives: [],
            prerequisites: [],
          },
          versions: [{
            version: '1.0.0',
            data: { content: 'Addition and subtraction' },
            changelog: 'Initial version',
            isActive: true,
            createdBy: 'test-user-id',
            createdAt: new Date(),
          }],
          currentVersion: '1.0.0',
          tags: ['math', 'elementary'],
          collaborators: [],
          comments: [],
          suggestions: [],
          xapiStatements: [],
          createdBy: 'test-user-id',
        },
        {
          type: ContentType.EXERCISE,
          metadata: {
            title: 'Science Experiment',
            description: 'Simple chemistry experiment',
            keywords: ['science', 'chemistry'],
            language: 'en',
            subject: 'Science',
            gradeLevel: '5th Grade',
            difficulty: DifficultyLevel.INTERMEDIATE,
            learningObjectives: [],
            prerequisites: [],
          },
          versions: [{
            version: '1.0.0',
            data: { content: 'Volcano experiment' },
            changelog: 'Initial version',
            isActive: true,
            createdBy: 'test-user-id',
            createdAt: new Date(),
          }],
          currentVersion: '1.0.0',
          tags: ['science', 'experiment'],
          collaborators: [],
          comments: [],
          suggestions: [],
          xapiStatements: [],
          createdBy: 'test-user-id',
        },
      ];

      await Content.insertMany(testContent);
    });

    it('should search content by query', async () => {
      const response = await request(app)
        .get('/api/content/search')
        .query({ query: 'math' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contents).toHaveLength(1);
      expect(response.body.data.contents[0].metadata.title).toBe('Math Lesson 1');
    });

    it('should filter content by type', async () => {
      const response = await request(app)
        .get('/api/content/search')
        .query({ type: ContentType.EXERCISE })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contents).toHaveLength(1);
      expect(response.body.data.contents[0].type).toBe(ContentType.EXERCISE);
    });

    it('should filter content by subject', async () => {
      const response = await request(app)
        .get('/api/content/search')
        .query({ subject: 'Science' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contents).toHaveLength(1);
      expect(response.body.data.contents[0].metadata.subject).toBe('Science');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/content/search')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contents).toHaveLength(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(1);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });
  });
});