import { databaseService } from '../services/database.service';
import { redisService } from '../services/redis.service';
import { logger } from '../utils/logger';

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  database: process.env.TEST_DB_NAME || 'learning_analytics_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
};

// Test Redis configuration
const TEST_REDIS_CONFIG = {
  host: process.env.TEST_REDIS_HOST || 'localhost',
  port: parseInt(process.env.TEST_REDIS_PORT || '6379', 10),
  db: parseInt(process.env.TEST_REDIS_DB || '1', 10), // Use different DB for tests
};

export async function setupTestDatabase(): Promise<void> {
  try {
    // Initialize test database schema
    await databaseService.initializeSchema();
    logger.info('Test database setup completed');
  } catch (error) {
    logger.error('Test database setup failed', error);
    throw error;
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Clean up test data
    const tables = [
      'processing_jobs',
      'analytics_alerts',
      'data_exports',
      'analytics_reports',
      'recommendations',
      'predictions',
      'predictive_models',
      'analytics_aggregations',
      'learning_metrics',
      'learning_events',
    ];

    for (const table of tables) {
      await databaseService.query(`TRUNCATE TABLE ${table} CASCADE`);
    }

    logger.info('Test database cleanup completed');
  } catch (error) {
    logger.error('Test database cleanup failed', error);
    throw error;
  }
}

export async function setupTestRedis(): Promise<void> {
  try {
    await redisService.connect();
    logger.info('Test Redis setup completed');
  } catch (error) {
    logger.error('Test Redis setup failed', error);
    throw error;
  }
}

export async function cleanupTestRedis(): Promise<void> {
  try {
    await redisService.flushDb();
    logger.info('Test Redis cleanup completed');
  } catch (error) {
    logger.error('Test Redis cleanup failed', error);
    throw error;
  }
}

// Global test setup
beforeAll(async () => {
  await setupTestDatabase();
  await setupTestRedis();
});

// Global test cleanup
afterAll(async () => {
  await cleanupTestDatabase();
  await cleanupTestRedis();
  await databaseService.close();
  await redisService.disconnect();
});

// Clean up between tests
afterEach(async () => {
  await cleanupTestDatabase();
  await cleanupTestRedis();
});

// Test utilities
export function createMockLearningEvent(overrides: any = {}) {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user-1',
    sessionId: 'test-session-1',
    eventType: 'content_view',
    eventData: {
      contentId: 'test-content-1',
      duration: 300,
      score: 0.8,
    },
    context: {
      courseId: 'test-course-1',
      organizationId: 'test-org-1',
      deviceType: 'desktop',
      platform: 'web',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1',
      userRole: 'student',
    },
    timestamp: new Date(),
    metadata: {},
    ...overrides,
  };
}

export function createMockLearningMetrics(overrides: any = {}) {
  return {
    userId: 'test-user-1',
    timeSpent: 3600,
    completionRate: 0.75,
    engagementScore: 0.8,
    masteryLevel: 0.7,
    strugglingIndicators: [],
    learningVelocity: 0.5,
    retentionScore: 0.85,
    collaborationScore: 0.6,
    aiInteractionScore: 0.7,
    lastUpdated: new Date(),
    ...overrides,
  };
}

export function createMockReportFilters(overrides: any = {}) {
  return {
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    },
    userIds: ['test-user-1', 'test-user-2'],
    courseIds: ['test-course-1'],
    organizationIds: ['test-org-1'],
    ...overrides,
  };
}

export async function waitFor(condition: () => Promise<boolean>, timeout = 5000): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

export function expectWithinRange(actual: number, expected: number, tolerance = 0.1): void {
  const diff = Math.abs(actual - expected);
  const maxDiff = expected * tolerance;
  
  if (diff > maxDiff) {
    throw new Error(`Expected ${actual} to be within ${tolerance * 100}% of ${expected}`);
  }
}