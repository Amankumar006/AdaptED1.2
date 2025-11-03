import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'educational_platform',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10)
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'user:',
    cluster: process.env.REDIS_CLUSTER === 'true',
    clusterNodes: process.env.REDIS_CLUSTER_NODES?.split(',') || []
  },

  // JWT Configuration (for token validation)
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret',
    issuer: process.env.JWT_ISSUER || 'educational-platform',
    audience: process.env.JWT_AUDIENCE || 'educational-platform-users'
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    uploadPath: process.env.UPLOAD_PATH || '/tmp/uploads',
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  },

  // Pagination Configuration
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },

  // Cache Configuration
  cache: {
    userTTL: 3600, // 1 hour
    roleTTL: 7200, // 2 hours
    organizationTTL: 7200, // 2 hours
    permissionTTL: 14400 // 4 hours
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
};