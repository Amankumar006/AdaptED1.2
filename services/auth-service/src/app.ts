import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { logger } from './utils/logger';
import { redisService } from './services/redis.service';
import { monitoringService } from './services/monitoring.service';
import { authRoutes } from './routes/auth.routes';
import { oauthRoutes } from './routes/oauth.routes';
import { authorizationRoutes } from './routes/authorization.routes';
import { mfaRoutes } from './routes/mfa.routes';
import { 
  requestMetricsMiddleware, 
  securityMonitoringMiddleware,
  activeUserTrackingMiddleware,
  errorTrackingMiddleware
} from './middleware/monitoring.middleware';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID', 'X-Correlation-ID'],
      exposedHeaders: ['X-Request-ID', 'X-Correlation-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax,
      message: {
        error: {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      });
      
      next();
    });

    // Request ID middleware
    this.app.use((req, res, next) => {
      const requestId = req.headers['x-request-id'] || 
                       req.headers['x-correlation-id'] || 
                       Math.random().toString(36).substring(2, 15);
      
      req.headers['x-request-id'] = requestId as string;
      res.setHeader('X-Request-ID', requestId);
      
      next();
    });

    // Monitoring middleware
    this.app.use(requestMetricsMiddleware);
    this.app.use(securityMonitoringMiddleware);
    this.app.use(activeUserTrackingMiddleware);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: process.env.npm_package_version || '1.0.0',
        redis: redisService.isHealthy()
      });
    });

    // Readiness check endpoint
    this.app.get('/ready', (req, res) => {
      const isReady = redisService.isHealthy();
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
          service: 'auth-service'
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          service: 'auth-service',
          issues: ['Redis connection not available']
        });
      }
    });

    // Metrics endpoint for Prometheus
    this.app.get('/metrics', (req, res) => {
      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.status(200).send(prometheusMetrics);
    });

    // Metrics summary endpoint
    this.app.get('/metrics/summary', (req, res) => {
      const metrics = monitoringService.getMetrics();
      const healthStatus = monitoringService.getHealthStatus();
      const sloCompliance = monitoringService.checkSLOCompliance();

      res.status(200).json({
        metrics,
        health: healthStatus,
        slo: sloCompliance,
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    this.app.use('/auth', authRoutes);
    this.app.use('/oauth', oauthRoutes);
    this.app.use('/authorization', authorizationRoutes);
    this.app.use('/mfa', mfaRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        service: 'Educational Platform - Authentication Service',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          ready: '/ready',
          metrics: '/metrics',
          auth: '/auth'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: {
          type: 'RESOURCE_NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          code: 'ROUTE_NOT_FOUND'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // Error tracking middleware
    this.app.use(errorTrackingMiddleware);

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        requestId: req.headers['x-request-id']
      });

      // Don't leak error details in production
      const isDevelopment = config.nodeEnv === 'development';
      
      res.status(error.status || 500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: isDevelopment ? error.message : 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          ...(isDevelopment && { stack: error.stack })
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Starting graceful shutdown...');
      
      // Close Redis connection
      await redisService.disconnect();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize Redis connection
      await redisService.connect();
      
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }
}

export default App;