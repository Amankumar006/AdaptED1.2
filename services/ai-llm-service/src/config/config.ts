import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3006', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  llmProviders: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-sonnet-20240229',
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY || '',
      defaultModel: process.env.GOOGLE_DEFAULT_MODEL || 'gemini-pro',
    },
  },
  defaultProvider: process.env.DEFAULT_MODEL_PROVIDER || 'openai',
  modelConfig: {
    maxTokens: parseInt(process.env.MAX_TOKENS || '2048', 10),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  },
  caching: {
    responseCacheTTL: parseInt(process.env.RESPONSE_CACHE_TTL || '3600', 10),
    conversationCacheTTL: parseInt(process.env.CONVERSATION_CACHE_TTL || '86400', 10),
  },
  safety: {
    contentFilterEnabled: process.env.CONTENT_FILTER_ENABLED === 'true',
    profanityFilterEnabled: process.env.PROFANITY_FILTER_ENABLED === 'true',
    ageVerificationRequired: process.env.AGE_VERIFICATION_REQUIRED === 'true',
    escalationThreshold: parseFloat(process.env.ESCALATION_THRESHOLD || '0.8'),
    humanTeacherEscalationEnabled: process.env.HUMAN_TEACHER_ESCALATION_ENABLED === 'true',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/ai-service.log',
  },
};