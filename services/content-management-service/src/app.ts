import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { contentRoutes } from './routes/content.routes';
import { mediaRoutes } from './routes/media.routes';
import { collaborationRoutes } from './routes/collaboration.routes';
import { scormRoutes } from './routes/scorm.routes';
import { lifecycleRoutes } from './routes/lifecycle.routes';
import { config } from './config/config';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.api.windowMs,
  max: config.api.rateLimit,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'content-management-service',
    version: '1.0.0',
  });
});

// API routes
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/standards', scormRoutes);
app.use('/api/lifecycle', lifecycleRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
      })),
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // Duplicate key error
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack }),
  });
});

export { app };