import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'assessment_engine',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // Queue configuration
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
      password: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
    },
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  },

  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/*,application/pdf,text/*').split(','),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  // Code execution configuration
  codeExecution: {
    enabled: process.env.CODE_EXECUTION_ENABLED === 'true',
    timeout: parseInt(process.env.CODE_EXECUTION_TIMEOUT || '30000', 10), // 30 seconds
    memoryLimit: parseInt(process.env.CODE_EXECUTION_MEMORY_LIMIT || '128', 10), // 128MB
    sandboxUrl: process.env.SANDBOX_URL || 'http://localhost:8080',
  },

  // AI/LLM configuration
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },

  // Monitoring configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // Service discovery
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    contentService: process.env.CONTENT_SERVICE_URL || 'http://localhost:3004',
  },
};

export default config;