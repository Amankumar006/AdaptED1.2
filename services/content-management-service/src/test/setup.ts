import { config } from '../config/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/content_management_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock AWS SDK for tests
jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
      }),
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
    getSignedUrl: jest.fn().mockReturnValue('https://signed-url.com'),
  })),
  config: {
    update: jest.fn(),
  },
}));

// Mock sharp for image processing
jest.mock('sharp', () => {
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
  }));
});

// Mock fluent-ffmpeg for video processing
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg = jest.fn(() => ({
    output: jest.fn().mockReturnThis(),
    videoCodec: jest.fn().mockReturnThis(),
    audioCodec: jest.fn().mockReturnThis(),
    videoBitrate: jest.fn().mockReturnThis(),
    size: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    run: jest.fn(),
    screenshots: jest.fn().mockReturnThis(),
  }));

  mockFfmpeg.ffprobe = jest.fn((filePath, callback) => {
    callback(null, {
      format: {
        duration: 120,
        bit_rate: 1000000,
      },
      streams: [{
        codec_type: 'video',
        width: 1920,
        height: 1080,
      }],
    });
  });

  return mockFfmpeg;
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});