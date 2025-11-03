import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import config from './config/config';
import { databaseService } from './services/database.service';
import { redisService } from './services/redis.service';
import { kafkaService } from './services/kafka.service';
import { realTimeAnalyticsService } from './services/real-time-analytics.service';
import { predictiveAnalyticsService } from './services/predictive-analytics.service';
import { dashboardService } from './services/dashboard.service';
import { reportingService } from './services/reporting.service';

export class App {
  public app: express.Application;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMaxRequests,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: await databaseService.healthCheck(),
            redis: await redisService.healthCheck(),
            kafka: await kafkaService.healthCheck(),
          },
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        };

        const allHealthy = Object.values(health.services).every(status => status === true);
        
        res.status(allHealthy ? 200 : 503).json(health);
      } catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const stats = await realTimeAnalyticsService.getProcessingStats();
        res.json({
          processingStats: stats,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to get metrics', error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // API routes
    this.app.get('/api/v1', (req, res) => {
      res.json({
        message: 'Learning Analytics Service API v1',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          dashboards: '/api/v1/dashboards',
          reports: '/api/v1/reports',
          exports: '/api/v1/exports',
          predictions: '/api/v1/predictions',
        },
      });
    });

    // Dashboard endpoints
    this.app.get('/api/v1/dashboards/micro/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { start, end, granularity = 'day' } = req.query;

        const timeframe = {
          start: new Date(start as string),
          end: new Date(end as string),
          granularity: granularity as any,
        };

        const dashboard = await dashboardService.getMicroLevelDashboard(userId, timeframe);
        res.json(dashboard);
      } catch (error) {
        logger.error('Failed to get micro dashboard', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
      }
    });

    this.app.get('/api/v1/dashboards/meso/:entityId', async (req, res) => {
      try {
        const { entityId } = req.params;
        const { start, end, granularity = 'day' } = req.query;

        const timeframe = {
          start: new Date(start as string),
          end: new Date(end as string),
          granularity: granularity as any,
        };

        const dashboard = await dashboardService.getMesoLevelDashboard(entityId, timeframe);
        res.json(dashboard);
      } catch (error) {
        logger.error('Failed to get meso dashboard', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
      }
    });

    this.app.get('/api/v1/dashboards/macro/:organizationId', async (req, res) => {
      try {
        const { organizationId } = req.params;
        const { start, end, granularity = 'day' } = req.query;

        const timeframe = {
          start: new Date(start as string),
          end: new Date(end as string),
          granularity: granularity as any,
        };

        const dashboard = await dashboardService.getMacroLevelDashboard(organizationId, timeframe);
        res.json(dashboard);
      } catch (error) {
        logger.error('Failed to get macro dashboard', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
      }
    });

    // Prediction endpoints
    this.app.get('/api/v1/predictions/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { modelType } = req.query;

        // Get all active models or specific model type
        const models = await this.getActiveModels(modelType as string);
        const predictions = [];

        for (const model of models) {
          const prediction = await predictiveAnalyticsService.generatePrediction(model.id, userId);
          if (prediction) {
            predictions.push(prediction);
          }
        }

        res.json({ predictions });
      } catch (error) {
        logger.error('Failed to get predictions', error);
        res.status(500).json({ error: 'Failed to get predictions' });
      }
    });

    this.app.get('/api/v1/recommendations/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const { limit = 10 } = req.query;

        const recommendations = await predictiveAnalyticsService.generateRecommendations(
          userId, 
          parseInt(limit as string)
        );

        res.json({ recommendations });
      } catch (error) {
        logger.error('Failed to get recommendations', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
      }
    });

    // Report endpoints
    this.app.get('/api/v1/reports', async (req, res) => {
      try {
        const { createdBy, limit = 50 } = req.query;
        const reports = await reportingService.listReports(
          createdBy as string, 
          parseInt(limit as string)
        );
        res.json({ reports });
      } catch (error) {
        logger.error('Failed to list reports', error);
        res.status(500).json({ error: 'Failed to list reports' });
      }
    });

    this.app.post('/api/v1/reports', async (req, res) => {
      try {
        const {
          name,
          description,
          type,
          level,
          filters,
          visualizations,
          schedule,
          recipients,
          createdBy,
        } = req.body;

        const report = await reportingService.createReport(
          name,
          description,
          type,
          level,
          filters,
          visualizations,
          createdBy,
          schedule,
          recipients
        );

        res.status(201).json(report);
      } catch (error) {
        logger.error('Failed to create report', error);
        res.status(500).json({ error: 'Failed to create report' });
      }
    });

    this.app.post('/api/v1/reports/:reportId/generate', async (req, res) => {
      try {
        const { reportId } = req.params;
        const reportData = await reportingService.generateReport(reportId);
        res.json(reportData);
      } catch (error) {
        logger.error('Failed to generate report', error);
        res.status(500).json({ error: 'Failed to generate report' });
      }
    });

    // Export endpoints
    this.app.post('/api/v1/exports', async (req, res) => {
      try {
        const { name, format, filters, createdBy } = req.body;
        const dataExport = await reportingService.exportData(name, format, filters, createdBy);
        res.status(201).json(dataExport);
      } catch (error) {
        logger.error('Failed to create export', error);
        res.status(500).json({ error: 'Failed to create export' });
      }
    });

    this.app.get('/api/v1/exports/:exportId', async (req, res) => {
      try {
        const { exportId } = req.params;
        const exportStatus = await reportingService.getExportStatus(exportId);
        
        if (!exportStatus) {
          return res.status(404).json({ error: 'Export not found' });
        }

        res.json(exportStatus);
      } catch (error) {
        logger.error('Failed to get export status', error);
        res.status(500).json({ error: 'Failed to get export status' });
      }
    });

    // Model management endpoints
    this.app.get('/api/v1/models', async (req, res) => {
      try {
        const models = await this.getActiveModels();
        const modelsWithPerformance = await Promise.all(
          models.map(async (model) => {
            const performance = await predictiveAnalyticsService.getModelPerformance(model.id);
            return { ...model, performance };
          })
        );
        res.json({ models: modelsWithPerformance });
      } catch (error) {
        logger.error('Failed to get models', error);
        res.status(500).json({ error: 'Failed to get models' });
      }
    });

    this.app.post('/api/v1/models/:modelId/train', async (req, res) => {
      try {
        const { modelId } = req.params;
        await predictiveAnalyticsService.trainModel(modelId);
        res.json({ message: 'Model training initiated' });
      } catch (error) {
        logger.error('Failed to train model', error);
        res.status(500).json({ error: 'Failed to train model' });
      }
    });
  }

  private async getActiveModels(modelType?: string): Promise<any[]> {
    let query = 'SELECT * FROM predictive_models WHERE is_active = true';
    const params: any[] = [];

    if (modelType) {
      query += ' AND type = $1';
      params.push(modelType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await databaseService.query(query, params);
    return result.rows;
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
      });

      const status = (error as any).status || 500;
      const message = config.nodeEnv === 'production' 
        ? 'Internal Server Error' 
        : error.message;

      res.status(status).json({
        error: 'Internal Server Error',
        message,
        timestamp: new Date().toISOString(),
        ...(config.nodeEnv !== 'production' && { stack: error.stack }),
      });
    });
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize database schema
      await databaseService.initializeSchema();

      // Connect to Redis
      await redisService.connect();

      // Initialize services
      await realTimeAnalyticsService.initialize();
      await predictiveAnalyticsService.initialize();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info('Learning Analytics Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        // Stop accepting new requests
        const server = this.app.listen();
        server?.close();

        // Shutdown services
        await realTimeAnalyticsService.shutdown();
        await predictiveAnalyticsService.shutdown();
        await reportingService.shutdown();
        await kafkaService.disconnect();
        await redisService.disconnect();
        await databaseService.close();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

export default App;