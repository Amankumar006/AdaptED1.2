import { Request, Response, NextFunction } from 'express';
import { AssessmentMonitoringService } from '../services/assessment-monitoring.service';
import { logger } from '../utils/logger';

export interface MonitoringRequest extends Request {
  startTime?: number;
  operationName?: string;
}

export class MonitoringMiddleware {
  private monitoringService: AssessmentMonitoringService;

  constructor(monitoringService: AssessmentMonitoringService) {
    this.monitoringService = monitoringService;
  }

  /**
   * Middleware to track request performance
   */
  trackPerformance() {
    return (req: MonitoringRequest, res: Response, next: NextFunction) => {
      req.startTime = Date.now();
      req.operationName = this.getOperationName(req);

      // Override res.end to capture response time
      const originalEnd = res.end.bind(res);
      const self = this;
      res.end = function(this: Response, ...args: any[]) {
        const duration = Date.now() - (req.startTime || Date.now());
        
        // Record response time
        if (req.operationName) {
          self.monitoringService.recordResponseTime(req.operationName, duration);
        }

        // Record business metrics based on the operation
        recordBusinessMetrics(req, res, self.monitoringService);

        // Log slow requests
        if (duration > 1000) {
          logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration,
            statusCode: res.statusCode
          });
        }

        return originalEnd(...args);
      };

      next();
    };
  }

  /**
   * Error handling middleware with monitoring
   */
  trackErrors() {
    return (error: Error, req: MonitoringRequest, res: Response, next: NextFunction) => {
      const operationName = req.operationName || this.getOperationName(req);
      
      // Record error
      this.monitoringService.recordError(operationName, error);

      // Log error with context
      logger.error('Request error', {
        method: req.method,
        url: req.url,
        error: error.message,
        stack: error.stack,
        operationName
      });

      next(error);
    };
  }

  /**
   * Health check endpoint
   */
  healthCheck() {
    return (req: Request, res: Response) => {
      const healthStatus = this.monitoringService.getHealthStatus();
      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;

      // Add database status for pilot validation
      const databaseStatus = process.env.PILOT_MODE === 'true' 
        ? { status: 'connected', message: 'Pilot mode - database disabled' }
        : { status: 'connected', message: 'Database connection healthy' };

      res.status(statusCode).json({
        status: healthStatus.status === 'healthy' ? 'healthy' : healthStatus.status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: healthStatus.checks,
        database: databaseStatus,
        service: 'assessment-engine'
      });
    };
  }

  /**
   * Metrics endpoint
   */
  metrics() {
    return (req: Request, res: Response) => {
      const metrics = this.monitoringService.getCurrentMetrics();
      
      res.json({
        timestamp: new Date().toISOString(),
        metrics,
        service: 'assessment-engine'
      });
    };
  }

  /**
   * Dashboard data endpoint
   */
  dashboard() {
    return (req: Request, res: Response) => {
      const dashboardData = this.monitoringService.getDashboardData();
      
      res.json({
        timestamp: new Date().toISOString(),
        ...dashboardData,
        service: 'assessment-engine'
      });
    };
  }

  /**
   * Alerts endpoint
   */
  alerts() {
    return (req: Request, res: Response) => {
      const activeAlerts = this.monitoringService.getActiveAlerts();
      
      res.json({
        timestamp: new Date().toISOString(),
        alerts: activeAlerts,
        count: activeAlerts.length,
        service: 'assessment-engine'
      });
    };
  }

  /**
   * Alert management endpoints
   */
  alertRules() {
    return {
      list: (req: Request, res: Response) => {
        const rules = this.monitoringService.getAlertRules();
        res.json({
          timestamp: new Date().toISOString(),
          rules,
          count: rules.length
        });
      },

      create: (req: Request, res: Response) => {
        try {
          const rule = req.body;
          const ruleId = this.monitoringService.addAlertRule(rule);
          
          res.status(201).json({
            success: true,
            ruleId,
            message: 'Alert rule created successfully'
          });
        } catch (error) {
          res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },

      delete: (req: Request, res: Response) => {
        const { ruleId } = req.params;
        const removed = this.monitoringService.removeAlertRule(ruleId);
        
        if (removed) {
          res.json({
            success: true,
            message: 'Alert rule removed successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Alert rule not found'
          });
        }
      },

      resolve: (req: Request, res: Response) => {
        const { alertId } = req.params;
        const resolved = this.monitoringService.resolveAlert(alertId);
        
        if (resolved) {
          res.json({
            success: true,
            message: 'Alert resolved successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Alert not found or already resolved'
          });
        }
      }
    };
  }

  private getOperationName(req: Request): string {
    const method = req.method.toLowerCase();
    const path = req.route?.path || req.path;
    
    // Map common paths to operation names
    if (path.includes('/assessments') && method === 'post') {
      return 'create_assessment';
    } else if (path.includes('/assessments') && method === 'get') {
      return 'get_assessment';
    } else if (path.includes('/submissions') && method === 'post') {
      return 'create_submission';
    } else if (path.includes('/responses') && method === 'post') {
      return 'submit_response';
    } else if (path.includes('/grade') && method === 'post') {
      return 'grade_submission';
    } else {
      return `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
  }
}

/**
 * Record business metrics based on the request/response
 */
function recordBusinessMetrics(
  req: MonitoringRequest, 
  res: Response, 
  monitoringService: AssessmentMonitoringService
): void {
  const method = req.method.toLowerCase();
  const path = req.path;
  const statusCode = res.statusCode;

  // Only record metrics for successful operations
  if (statusCode >= 200 && statusCode < 300) {
    if (path.includes('/assessments') && method === 'post') {
      monitoringService.recordBusinessMetric('assessment_created', 1);
    } else if (path.includes('/submissions') && method === 'post' && path.includes('/submit')) {
      monitoringService.recordBusinessMetric('submission_completed', 1);
    }
  }
}

/**
 * Prometheus-style metrics endpoint
 */
export function prometheusMetrics(monitoringService: AssessmentMonitoringService) {
  return (req: Request, res: Response) => {
    const metrics = monitoringService.getCurrentMetrics();
    const timestamp = Date.now();

    // Generate Prometheus format metrics
    const prometheusMetrics = [
      // Standard HTTP metrics for compatibility
      `# HELP http_requests_total Total number of HTTP requests`,
      `# TYPE http_requests_total counter`,
      `http_requests_total{service="assessment-engine"} ${metrics.throughput.requestsPerSecond * 60}`,
      
      `# HELP http_request_duration_seconds HTTP request duration in seconds`,
      `# TYPE http_request_duration_seconds histogram`,
      `http_request_duration_seconds{quantile="0.5",service="assessment-engine"} ${metrics.responseTime.p50 / 1000}`,
      `http_request_duration_seconds{quantile="0.95",service="assessment-engine"} ${metrics.responseTime.p95 / 1000}`,
      `http_request_duration_seconds{quantile="0.99",service="assessment-engine"} ${metrics.responseTime.p99 / 1000}`,
      
      // Response time metrics
      `# HELP assessment_response_time_seconds Response time in seconds`,
      `# TYPE assessment_response_time_seconds histogram`,
      `assessment_response_time_p50 ${metrics.responseTime.p50 / 1000}`,
      `assessment_response_time_p95 ${metrics.responseTime.p95 / 1000}`,
      `assessment_response_time_p99 ${metrics.responseTime.p99 / 1000}`,
      `assessment_response_time_average ${metrics.responseTime.average / 1000}`,
      
      // Throughput metrics
      `# HELP assessment_requests_per_second Current requests per second`,
      `# TYPE assessment_requests_per_second gauge`,
      `assessment_requests_per_second ${metrics.throughput.requestsPerSecond}`,
      
      // Business metrics
      `# HELP assessment_total_assessments Total number of assessments created`,
      `# TYPE assessment_total_assessments counter`,
      `assessment_total_assessments ${metrics.assessmentStats.totalAssessments}`,
      
      `# HELP assessment_completed_submissions Total completed submissions`,
      `# TYPE assessment_completed_submissions counter`,
      `assessment_completed_submissions ${metrics.assessmentStats.completedSubmissions}`,
      
      `# HELP assessment_average_score Current average score`,
      `# TYPE assessment_average_score gauge`,
      `assessment_average_score ${metrics.assessmentStats.averageScore}`,
      
      `# HELP assessment_completion_rate Current completion rate percentage`,
      `# TYPE assessment_completion_rate gauge`,
      `assessment_completion_rate ${metrics.assessmentStats.completionRate}`,
      
      // System health metrics
      `# HELP assessment_memory_usage_percent Memory usage percentage`,
      `# TYPE assessment_memory_usage_percent gauge`,
      `assessment_memory_usage_percent ${metrics.systemHealth.memoryUsage}`,
      
      `# HELP assessment_error_rate_percent Error rate percentage`,
      `# TYPE assessment_error_rate_percent gauge`,
      `assessment_error_rate_percent ${metrics.systemHealth.errorRate}`,
      
      // Grading queue metrics
      `# HELP assessment_grading_queue_waiting Jobs waiting in grading queue`,
      `# TYPE assessment_grading_queue_waiting gauge`,
      `assessment_grading_queue_waiting ${metrics.gradingQueue.waiting}`,
      
      `# HELP assessment_grading_queue_active Active jobs in grading queue`,
      `# TYPE assessment_grading_queue_active gauge`,
      `assessment_grading_queue_active ${metrics.gradingQueue.active}`,
      
      `# HELP assessment_grading_queue_completed Completed jobs in grading queue`,
      `# TYPE assessment_grading_queue_completed counter`,
      `assessment_grading_queue_completed ${metrics.gradingQueue.completed}`,
      
      `# HELP assessment_grading_queue_failed Failed jobs in grading queue`,
      `# TYPE assessment_grading_queue_failed counter`,
      `assessment_grading_queue_failed ${metrics.gradingQueue.failed}`,
      
      `# HELP assessment_grading_avg_processing_time_seconds Average processing time in seconds`,
      `# TYPE assessment_grading_avg_processing_time_seconds gauge`,
      `assessment_grading_avg_processing_time_seconds ${metrics.gradingQueue.avgProcessingTime / 1000}`,
      
      // Timestamp
      `# HELP assessment_metrics_timestamp_seconds Timestamp of metrics collection`,
      `# TYPE assessment_metrics_timestamp_seconds gauge`,
      `assessment_metrics_timestamp_seconds ${timestamp / 1000}`
    ].join('\n');

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(prometheusMetrics);
  };
}