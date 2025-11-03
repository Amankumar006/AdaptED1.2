import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import config from './config/config';
import { databaseService } from './services/database.service';
import { AssessmentMonitoringService } from './services/assessment-monitoring.service';
import { MonitoringMiddleware, prometheusMetrics } from './middleware/monitoring.middleware';

// Import routes (will be created in next steps)
// import assessmentRoutes from './routes/assessment.routes';
// import questionBankRoutes from './routes/question-bank.routes';

export class App {
  public app: express.Application;
  private monitoringService: AssessmentMonitoringService;
  private monitoringMiddleware: MonitoringMiddleware;

  constructor() {
    this.app = express();
    this.monitoringService = new AssessmentMonitoringService();
    this.monitoringMiddleware = new MonitoringMiddleware(this.monitoringService);
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

    // Monitoring middleware
    this.app.use(this.monitoringMiddleware.trackPerformance());

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
    // Health check endpoint with monitoring
    this.app.get('/health', this.monitoringMiddleware.healthCheck());

    // Monitoring endpoints
    this.app.get('/metrics', prometheusMetrics(this.monitoringService));
    this.app.get('/metrics/json', this.monitoringMiddleware.metrics());
    this.app.get('/dashboard', this.monitoringMiddleware.dashboard());
    this.app.get('/alerts', this.monitoringMiddleware.alerts());

    // Alert management endpoints
    const alertRoutes = this.monitoringMiddleware.alertRules();
    this.app.get('/alert-rules', alertRoutes.list);
    this.app.post('/alert-rules', alertRoutes.create);
    this.app.delete('/alert-rules/:ruleId', alertRoutes.delete);
    this.app.post('/alerts/:alertId/resolve', alertRoutes.resolve);

    // API routes
    this.app.get('/api/v1', (req, res) => {
      res.json({
        message: 'Assessment Engine Service API v1',
        endpoints: {
          health: '/health',
          assessments: '/api/v1/assessments',
          questionBanks: '/api/v1/question-banks',
          submissions: '/api/v1/submissions',
        },
      });
    });

    // Basic API endpoints for pilot validation
    this.setupPilotAPIEndpoints();

    // Mount route handlers (will be uncommented when routes are created)
    // this.app.use('/api/v1/assessments', assessmentRoutes);
    // this.app.use('/api/v1/question-banks', questionBankRoutes);
  }

  private initializeErrorHandling(): void {
    // Error tracking middleware
    this.app.use(this.monitoringMiddleware.trackErrors());

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

  public getMonitoringService(): AssessmentMonitoringService {
    return this.monitoringService;
  }

  public shutdown(): void {
    this.monitoringService.shutdown();
  }

  private setupPilotAPIEndpoints(): void {
    // Question Banks API
    this.app.post('/api/v1/question-banks', (req, res) => {
      const questionBank = {
        id: `qb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.monitoringService.recordBusinessMetric('question_bank_created', 1);
      
      res.status(201).json(questionBank);
    });

    this.app.get('/api/v1/question-banks', (req, res) => {
      res.json({
        questionBanks: [],
        total: 0,
        page: 1,
        limit: 10
      });
    });

    this.app.post('/api/v1/question-banks/:bankId/questions', (req, res) => {
      const question = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        bankId: req.params.bankId,
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.monitoringService.recordBusinessMetric('question_created', 1);
      
      res.status(201).json(question);
    });

    // Assessments API
    this.app.post('/api/v1/assessments', (req, res) => {
      const assessment = {
        id: `a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...req.body,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.monitoringService.recordBusinessMetric('assessment_created', 1);
      
      res.status(201).json(assessment);
    });

    this.app.get('/api/v1/assessments', (req, res) => {
      res.json({
        assessments: [],
        total: 0,
        page: 1,
        limit: 10
      });
    });

    // Submissions API
    this.app.post('/api/v1/assessments/:assessmentId/submissions', (req, res) => {
      const submission = {
        id: `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assessmentId: req.params.assessmentId,
        ...req.body,
        status: 'submitted',
        submittedAt: new Date().toISOString()
      };
      
      this.monitoringService.recordBusinessMetric('submission_completed', 1);
      
      res.status(201).json(submission);
    });

    // Pilot-specific endpoints
    this.app.get('/api/v1/pilot/status', (req, res) => {
      res.json({
        pilotMode: process.env.PILOT_MODE === 'true',
        version: '1.0.0-pilot',
        features: {
          questionBanks: true,
          assessments: true,
          submissions: true,
          monitoring: true,
          analytics: true
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  public async initialize(): Promise<void> {
    try {
      // Skip database initialization in pilot mode
      if (process.env.PILOT_MODE === 'true') {
        logger.info('Running in pilot mode - skipping database initialization');
      } else {
        // Initialize database schema
        await databaseService.initializeSchema();
      }
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', error);
      throw error;
    }
  }
}

export default App;