import { config } from '../config/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock database for tests
jest.mock('../services/database.service', () => ({
  databaseService: {
    getInstance: jest.fn(() => ({
      query: jest.fn(),
      getClient: jest.fn(),
      transaction: jest.fn(),
      initializeSchema: jest.fn(),
      healthCheck: jest.fn(() => Promise.resolve(true)),
      close: jest.fn(),
    })),
  },
}));

// Global test timeout
jest.setTimeout(30000);