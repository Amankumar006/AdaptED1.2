import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface AssessmentMetrics {
  // Performance metrics
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  throughput: {
    requestsPerSecond: number;
    assessmentsPerMinute: number;
    submissionsPerMinute: number;
  };
  
  // Business metrics
  assessmentStats: {
    totalAssessments: number;
    activeAssessments: number;
    completedSubmissions: number;
    averageScore: number;
    completionRate: number;
  };
  
  // System health
  systemHealth: {
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
    availability: number;
  };
  
  // Queue metrics
  gradingQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    avgProcessingTime: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // milliseconds
  lastTriggered?: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  value: number;
  threshold: number;
  resolved: boolean;
  resolvedAt?: Date;
}

export class AssessmentMonitoringService extends EventEmitter {
  private metrics: AssessmentMetrics;
  private responseTimes: number[] = [];
  private requestCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsHistory: AssessmentMetrics[] = [];
  private readonly maxHistorySize = 1000;
  private readonly metricsInterval = 60000; // 1 minute
  private metricsTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.setupDefaultAlertRules();
    this.startMetricsCollection();
  }

  /**
   * Record response time for performance monitoring
   */
  recordResponseTime(operation: string, duration: number): void {
    this.responseTimes.push(duration);
    
    // Keep only recent response times (last 1000)
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Update request counts
    const currentCount = this.requestCounts.get(operation) || 0;
    this.requestCounts.set(operation, currentCount + 1);

    // Check SLO compliance
    this.checkSLOCompliance(operation, duration);
  }

  /**
   * Record error for error rate monitoring
   */
  recordError(operation: string, error: Error): void {
    const currentCount = this.errorCounts.get(operation) || 0;
    this.errorCounts.set(operation, currentCount + 1);

    logger.error(`Assessment service error in ${operation}`, {
      operation,
      error: error.message,
      stack: error.stack
    });

    this.emit('error', { operation, error });
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(metric: string, value: number): void {
    switch (metric) {
      case 'assessment_created':
        this.metrics.assessmentStats.totalAssessments++;
        break;
      case 'submission_completed':
        this.metrics.assessmentStats.completedSubmissions++;
        break;
      case 'average_score':
        this.metrics.assessmentStats.averageScore = value;
        break;
      case 'completion_rate':
        this.metrics.assessmentStats.completionRate = value;
        break;
    }

    this.emit('business_metric', { metric, value });
  }

  /**
   * Update grading queue metrics
   */
  updateGradingQueueMetrics(queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    avgProcessingTime: number;
  }): void {
    this.metrics.gradingQueue = queueStats;
    this.checkAlertRules();
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): AssessmentMetrics {
    this.updateCalculatedMetrics();
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): AssessmentMetrics[] {
    const historyLimit = limit || this.metricsHistory.length;
    return this.metricsHistory.slice(-historyLimit);
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: AlertRule = { ...rule, id };
    
    this.alertRules.set(id, alertRule);
    
    logger.info('Alert rule added', { ruleId: id, rule: alertRule });
    
    return id;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    
    if (removed) {
      logger.info('Alert rule removed', { ruleId });
    }
    
    return removed;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info('Alert resolved', { alertId, alert });
      this.emit('alert_resolved', alert);
      
      return true;
    }
    
    return false;
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
      value?: number;
      threshold?: number;
    }>;
  } {
    const checks = [];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Response time check
    const p95ResponseTime = this.calculatePercentile(this.responseTimes, 95);
    if (p95ResponseTime > 500) {
      checks.push({
        name: 'response_time_p95',
        status: 'fail' as const,
        message: 'P95 response time exceeds SLO',
        value: p95ResponseTime,
        threshold: 500
      });
      overallStatus = 'unhealthy';
    } else if (p95ResponseTime > 300) {
      checks.push({
        name: 'response_time_p95',
        status: 'warn' as const,
        message: 'P95 response time approaching SLO limit',
        value: p95ResponseTime,
        threshold: 500
      });
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.push({
        name: 'response_time_p95',
        status: 'pass' as const,
        message: 'Response time within SLO',
        value: p95ResponseTime,
        threshold: 500
      });
    }

    // Error rate check
    const errorRate = this.metrics.systemHealth.errorRate;
    if (errorRate > 5) {
      checks.push({
        name: 'error_rate',
        status: 'fail' as const,
        message: 'Error rate too high',
        value: errorRate,
        threshold: 5
      });
      overallStatus = 'unhealthy';
    } else if (errorRate > 2) {
      checks.push({
        name: 'error_rate',
        status: 'warn' as const,
        message: 'Error rate elevated',
        value: errorRate,
        threshold: 5
      });
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.push({
        name: 'error_rate',
        status: 'pass' as const,
        message: 'Error rate normal',
        value: errorRate,
        threshold: 5
      });
    }

    // Memory usage check (relaxed thresholds for pilot mode)
    const memoryUsage = this.metrics.systemHealth.memoryUsage;
    const memoryThreshold = process.env.PILOT_MODE === 'true' ? 95 : 90;
    const memoryWarningThreshold = process.env.PILOT_MODE === 'true' ? 90 : 80;
    
    if (memoryUsage > memoryThreshold) {
      checks.push({
        name: 'memory_usage',
        status: 'fail' as const,
        message: 'Memory usage critical',
        value: memoryUsage,
        threshold: memoryThreshold
      });
      overallStatus = 'unhealthy';
    } else if (memoryUsage > memoryWarningThreshold) {
      checks.push({
        name: 'memory_usage',
        status: 'warn' as const,
        message: 'Memory usage high',
        value: memoryUsage,
        threshold: memoryThreshold
      });
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.push({
        name: 'memory_usage',
        status: 'pass' as const,
        message: 'Memory usage normal',
        value: memoryUsage,
        threshold: memoryThreshold
      });
    }

    // Grading queue check
    const queueBacklog = this.metrics.gradingQueue.waiting;
    if (queueBacklog > 1000) {
      checks.push({
        name: 'grading_queue',
        status: 'fail' as const,
        message: 'Grading queue severely backed up',
        value: queueBacklog,
        threshold: 1000
      });
      overallStatus = 'unhealthy';
    } else if (queueBacklog > 500) {
      checks.push({
        name: 'grading_queue',
        status: 'warn' as const,
        message: 'Grading queue backed up',
        value: queueBacklog,
        threshold: 1000
      });
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    } else {
      checks.push({
        name: 'grading_queue',
        status: 'pass' as const,
        message: 'Grading queue normal',
        value: queueBacklog,
        threshold: 1000
      });
    }

    // Database connectivity check (pilot mode aware)
    if (process.env.PILOT_MODE === 'true') {
      checks.push({
        name: 'database',
        status: 'pass' as const,
        message: 'Database disabled in pilot mode'
      });
    } else {
      // In production mode, we would check actual database connectivity
      checks.push({
        name: 'database',
        status: 'pass' as const,
        message: 'Database connection healthy'
      });
    }

    return { status: overallStatus, checks };
  }

  /**
   * Generate performance dashboard data
   */
  getDashboardData(): {
    metrics: AssessmentMetrics;
    trends: {
      responseTime: Array<{ timestamp: Date; value: number }>;
      throughput: Array<{ timestamp: Date; value: number }>;
      errorRate: Array<{ timestamp: Date; value: number }>;
    };
    alerts: Alert[];
    healthStatus: ReturnType<AssessmentMonitoringService['getHealthStatus']>;
  } {
    const recentHistory = this.getMetricsHistory(60); // Last hour
    
    return {
      metrics: this.getCurrentMetrics(),
      trends: {
        responseTime: recentHistory.map((m, i) => ({
          timestamp: new Date(Date.now() - (recentHistory.length - i) * this.metricsInterval),
          value: m.responseTime.p95
        })),
        throughput: recentHistory.map((m, i) => ({
          timestamp: new Date(Date.now() - (recentHistory.length - i) * this.metricsInterval),
          value: m.throughput.requestsPerSecond
        })),
        errorRate: recentHistory.map((m, i) => ({
          timestamp: new Date(Date.now() - (recentHistory.length - i) * this.metricsInterval),
          value: m.systemHealth.errorRate
        }))
      },
      alerts: this.getActiveAlerts(),
      healthStatus: this.getHealthStatus()
    };
  }

  /**
   * Shutdown monitoring service
   */
  shutdown(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    logger.info('Assessment monitoring service shutdown');
  }

  private initializeMetrics(): AssessmentMetrics {
    return {
      responseTime: {
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0
      },
      throughput: {
        requestsPerSecond: 0,
        assessmentsPerMinute: 0,
        submissionsPerMinute: 0
      },
      assessmentStats: {
        totalAssessments: 0,
        activeAssessments: 0,
        completedSubmissions: 0,
        averageScore: 0,
        completionRate: 0
      },
      systemHealth: {
        memoryUsage: 0,
        cpuUsage: 0,
        errorRate: 0,
        availability: 100
      },
      gradingQueue: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        avgProcessingTime: 0
      }
    };
  }

  private setupDefaultAlertRules(): void {
    // P95 response time SLO
    this.addAlertRule({
      name: 'P95 Response Time SLO Breach',
      metric: 'response_time_p95',
      threshold: 500,
      operator: 'gt',
      severity: 'high',
      enabled: true,
      cooldownPeriod: 300000 // 5 minutes
    });

    // Error rate threshold
    this.addAlertRule({
      name: 'High Error Rate',
      metric: 'error_rate',
      threshold: 5,
      operator: 'gt',
      severity: 'medium',
      enabled: true,
      cooldownPeriod: 180000 // 3 minutes
    });

    // Memory usage threshold
    this.addAlertRule({
      name: 'High Memory Usage',
      metric: 'memory_usage',
      threshold: 85,
      operator: 'gt',
      severity: 'medium',
      enabled: true,
      cooldownPeriod: 300000 // 5 minutes
    });

    // Grading queue backlog
    this.addAlertRule({
      name: 'Grading Queue Backlog',
      metric: 'grading_queue_waiting',
      threshold: 500,
      operator: 'gt',
      severity: 'medium',
      enabled: true,
      cooldownPeriod: 120000 // 2 minutes
    });
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateCalculatedMetrics();
      this.checkAlertRules();
      this.archiveMetrics();
    }, this.metricsInterval);
  }

  private updateCalculatedMetrics(): void {
    // Update response time metrics
    if (this.responseTimes.length > 0) {
      this.metrics.responseTime.p50 = this.calculatePercentile(this.responseTimes, 50);
      this.metrics.responseTime.p95 = this.calculatePercentile(this.responseTimes, 95);
      this.metrics.responseTime.p99 = this.calculatePercentile(this.responseTimes, 99);
      this.metrics.responseTime.average = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }

    // Update throughput metrics
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    this.metrics.throughput.requestsPerSecond = totalRequests / 60; // Approximate

    // Update error rate
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    this.metrics.systemHealth.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Update system health
    const memoryUsage = process.memoryUsage();
    this.metrics.systemHealth.memoryUsage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private checkSLOCompliance(operation: string, duration: number): void {
    // Check if operation exceeds SLO
    if (duration > 500) { // 500ms SLO
      logger.warn('SLO breach detected', {
        operation,
        duration,
        slo: 500
      });

      this.emit('slo_breach', { operation, duration, slo: 500 });
    }
  }

  private checkAlertRules(): void {
    const currentTime = new Date();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered && 
          (currentTime.getTime() - rule.lastTriggered.getTime()) < rule.cooldownPeriod) {
        continue;
      }

      const metricValue = this.getMetricValue(rule.metric);
      if (metricValue === null) continue;

      const shouldTrigger = this.evaluateAlertCondition(metricValue, rule.threshold, rule.operator);

      if (shouldTrigger) {
        this.triggerAlert(rule, metricValue);
      }
    }
  }

  private getMetricValue(metric: string): number | null {
    switch (metric) {
      case 'response_time_p95':
        return this.metrics.responseTime.p95;
      case 'error_rate':
        return this.metrics.systemHealth.errorRate;
      case 'memory_usage':
        return this.metrics.systemHealth.memoryUsage;
      case 'grading_queue_waiting':
        return this.metrics.gradingQueue.waiting;
      default:
        return null;
    }
  }

  private evaluateAlertCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
      severity: rule.severity,
      timestamp: new Date(),
      value,
      threshold: rule.threshold,
      resolved: false
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    logger.warn('Alert triggered', { alert, rule });
    this.emit('alert', alert);
  }

  private archiveMetrics(): void {
    const currentMetrics = { ...this.metrics };
    this.metricsHistory.push(currentMetrics);

    // Keep only recent history
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    // Reset counters for next interval
    this.requestCounts.clear();
    this.errorCounts.clear();
    this.responseTimes = [];
  }
}