import { redisService } from '../services/redis.service';

// Setup test environment
beforeAll(async () => {
  // Connect to Redis for testing
  try {
    await redisService.connect();
  } catch (error) {
    console.warn('Redis not available for testing, some tests may fail');
  }
});

// Cleanup after tests
afterAll(async () => {
  try {
    await redisService.disconnect();
  } catch (error) {
    console.warn('Error disconnecting from Redis during test cleanup');
  }
});

// Clear Redis data before each test
beforeEach(async () => {
  try {
    // Clear test data from Redis
    // Note: In a real implementation, you'd want to use a separate test database
  } catch (error) {
    console.warn('Error clearing test data');
  }
});