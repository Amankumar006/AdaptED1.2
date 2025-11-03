// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock Redis for testing
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(() => []),
    flushall: jest.fn(),
    info: jest.fn(() => 'redis_version:6.0.0'),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  })),
}));

// Mock OpenAI for testing
jest.mock('openai', () => ({
  OpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'This is a test response from OpenAI'
            }
          }],
          usage: {
            total_tokens: 50
          }
        }))
      }
    }
  }))
}));

// Mock Anthropic for testing
jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn(() => ({
    messages: {
      create: jest.fn(() => Promise.resolve({
        content: [{
          text: 'This is a test response from Anthropic'
        }],
        usage: {
          input_tokens: 20,
          output_tokens: 30
        }
      }))
    }
  }))
}));

// Global test timeout
jest.setTimeout(10000);