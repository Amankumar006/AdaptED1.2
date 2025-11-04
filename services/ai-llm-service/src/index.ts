import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-llm-service',
    version: '1.0.0'
  });
});

// Basic chat endpoint (placeholder)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    // Placeholder response - actual LLM integration would go here
    res.json({
      response: 'AI-LLM service is running but LLM providers are not configured. Please add API keys to use AI features.',
      conversationId: conversationId || 'new-conversation',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Chat error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`AI-LLM Service started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
