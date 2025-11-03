import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3007', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'learning_analytics',
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

  // Kafka configuration
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'learning-analytics-service',
    groupId: process.env.KAFKA_GROUP_ID || 'learning-analytics-group',
    topics: (process.env.KAFKA_TOPICS || 'learning-events,user-events,content-events,assessment-events').split(','),
  },

  // Queue configuration
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
      password: process.env.QUEUE_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
    },
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
  },

  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  },

  // Analytics configuration
  analytics: {
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '1000', 10),
    processingInterval: parseInt(process.env.ANALYTICS_PROCESSING_INTERVAL || '5000', 10), // 5 seconds
    realTimeLagThreshold: parseInt(process.env.REAL_TIME_LAG_THRESHOLD || '5000', 10), // 5 seconds
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365', 10),
    archivalThresholdDays: parseInt(process.env.ARCHIVAL_THRESHOLD_DAYS || '90', 10),
  },

  // ML configuration
  ml: {
    modelUpdateInterval: parseInt(process.env.ML_MODEL_UPDATE_INTERVAL || '86400000', 10), // 24 hours
    predictionConfidenceThreshold: parseFloat(process.env.PREDICTION_CONFIDENCE_THRESHOLD || '0.7'),
    recommendationLimit: parseInt(process.env.RECOMMENDATION_LIMIT || '10', 10),
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
    assessmentService: process.env.ASSESSMENT_SERVICE_URL || 'http://localhost:3003',
  },

  // Export configuration
  export: {
    maxRecords: parseInt(process.env.EXPORT_MAX_RECORDS || '100000', 10),
    timeout: parseInt(process.env.EXPORT_TIMEOUT || '300000', 10), // 5 minutes
  },

  // Spark configuration
  spark: {
    masterUrl: process.env.SPARK_MASTER_URL || 'spark://localhost:7077',
    appName: process.env.SPARK_APP_NAME || 'learning-analytics-processor',
  },
};

export default config;