import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/config';
import { logger } from './utils/logger';
import { databaseService } from './services/database.service';
import { redisService } from './services/redis.service';
import { userRoutes } from './routes/user.routes';
import { roleRoutes } from './routes/role.routes';
import { organizationRoutes } from './routes/organization.routes';

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
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
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
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const dbHealth = databaseService.isHealthy();
      const redisHealth = redisService.isHealthy();
      
      const isHealthy = dbHealth && redisHealth;
      
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'user-management-service',
        version: process.env.npm_package_version || '1.0.0',
        dependencies: {
          database: dbHealth ? 'healthy' : 'unhealthy',
          redis: redisHealth ? 'healthy' : 'unhealthy'
        }
      });
    });

    // Readiness check endpoint
    this.app.get('/ready', async (req, res) => {
      try {
        const dbCheck = await databaseService.healthCheck();
        const redisCheck = await redisService.healthCheck();
        
        const isReady = dbCheck.healthy && redisCheck.healthy;
        
        if (isReady) {
          res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            service: 'user-management-service',
            dependencies: {
              database: dbCheck,
              redis: redisCheck
            }
          });
        } else {
          res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            service: 'user-management-service',
            dependencies: {
              database: dbCheck,
              redis: redisCheck
            }
          });
        }
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          service: 'user-management-service',
          error: (error as Error).message
        });
      }
    });

    // API routes
    this.app.use('/users', userRoutes);
    this.app.use('/roles', roleRoutes);
    this.app.use('/organizations', organizationRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        service: 'Educational Platform - User Management Service',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          ready: '/ready',
          users: '/users',
          roles: '/roles',
          organizations: '/organizations'
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
      
      // Close database connection
      await databaseService.disconnect();
      
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
      // Initialize database connection
      await databaseService.connect();
      
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