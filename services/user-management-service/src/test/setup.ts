import { config } from '../config/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock Redis and Database services for testing
jest.mock('../services/redis.service', () => ({
  redisService: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    cacheGet: jest.fn().mockResolvedValue(null),
    cacheSet: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockReturnValue(true),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true })
  }
}));

jest.mock('../services/database.service', () => ({
  databaseService: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    transaction: jest.fn().mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn()
      };
      return await callback(mockClient);
    }),
    isHealthy: jest.fn().mockReturnValue(true),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true })
  }
}));

// Increase timeout for tests
jest.setTimeout(10000);

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
});

afterAll(async () => {
  // Any global cleanup can go here
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Any cleanup after each test
});