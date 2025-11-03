import { EventEmitter } from 'events';
import { databaseService } from './database.service';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import config from '../config/config';

interface SLOMetric {
  name: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  threshold: 'lower' | 'upper'; // lower = value should be below target, upper = value should be above target
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

interface Alert {
  id: string;
  type: 'slo_breach' | 'performance' | 'error' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  createdAt: Date;
  resolvedAt?: Date;
  isResolved: boolean;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    database: boolean;
    redis: boolean;
    kafka: boolean;
  };
  slos: SLOMetric[];
  alerts: Alert[];
  uptime: number;
  lastChecked: Date;
}

class MonitoringService extends EventEmitter {
  private sloMetrics = new Map<string, SLOMetric>();
  private performanceMetrics: PerformanceMetric[] = [];
  private activeAlerts = new Map<string, Alert>();
  private metricsBuffer: PerformanceMetric[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();

  constructor() {
    super();
    this.initializeSLOMetrics();
    this.startMonitoring();
  }

  private initializeSLOMetrics(): void {
    // Real-time processing SLO
    this.sloMetrics.set('real_time_lag', {
      name: 'Real-time Processing Lag',
      description: 'Maximum acceptable lag for real-time event processing',
      target: config.analytics.realTimeLagThreshold, // 5 seconds
      current: 0,
      unit: 'ms',
      threshold: 'lower',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // API response time SLO
    this.sloMetrics.set('api_response_time', {
      name: 'API Response Time P95',
      description: '95th percentile API response time',
      target: 2000, // 2 seconds
      current: 0,
      unit: 'ms',
      threshold: 'lower',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // Dashboard generation SLO
    this.sloMetrics.set('dashboard_generation_time', {
      name: 'Dashboard Generation Time',
      description: 'Maximum time to generate analytics dashboards',
      target: 30000, // 30 seconds
      current: 0,
      unit: 'ms',
      threshold: 'lower',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // Report generation SLO
    this.sloMetrics.set('report_generation_time', {
      name: 'Report Generation Time',
      description: 'Maximum time to generate reports',
      target: 60000, // 60 seconds
      current: 0,
      unit: 'ms',
      threshold: 'lower',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // Data quality SLO
    this.sloMetrics.set('data_quality_score', {
      name: 'Data Quality Score',
      description: 'Minimum acceptable data quality score',
      target: 0.95, // 95%
      current: 1.0,
      unit: 'ratio',
      threshold: 'upper',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // System availability SLO
    this.sloMetrics.set('system_availability', {
      name: 'System Availability',
      description: 'Minimum system uptime percentage',
      target: 0.999, // 99.9%
      current: 1.0,
      unit: 'ratio',
      threshold: 'upper',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // Error rate SLO
    this.sloMetrics.set('error_rate', {
      name: 'Error Rate',
      description: 'Maximum acceptable error rate',
      target: 0.01, // 1%
      current: 0,
      unit: 'ratio',
      threshold: 'lower',
      status: 'healthy',
      lastUpdated: new Date(),
    });

    // Prediction accuracy SLO
    this.sloMetrics.set('prediction_accuracy', {
      name: 'ML Model Prediction Accuracy',
      description: 'Minimum acceptable prediction accuracy',
      target: 0.7, // 70%
      current: 0,
      unit: 'ratio',
      threshold: 'upper',
      status: 'healthy',
      lastUpdated: new Date(),
    });
  }

  private startMonitoring(): void {
    // Monitor SLOs every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateSLOMetrics();
        await this.checkSLOBreaches();
        await this.flushMetricsBuffer();
      } catch (error) {
        logger.error('Monitoring cycle failed', error);
      }
    }, 30000);

    logger.info('Monitoring service started');
  }

  async recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): Promise<void> {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    this.metricsBuffer.push(metric);

    // Update SLO metrics if applicable
    if (this.sloMetrics.has(name)) {
      const sloMetric = this.sloMetrics.get(name)!;
      sloMetric.current = value;
      sloMetric.lastUpdated = new Date();
      this.updateSLOStatus(sloMetric);
    }

    // Emit metric event
    this.emit('metric_recorded', metric);
  }

  async recordEventProcessingTime(processingTime: number): Promise<void> {
    await this.recordMetric('event_processing_time', processingTime, 'ms');
    
    // Update real-time lag SLO
    const lagSLO = this.sloMetrics.get('real_time_lag');
    if (lagSLO) {
      lagSLO.current = Math.max(lagSLO.current, processingTime);
      lagSLO.lastUpdated = new Date();
      this.updateSLOStatus(lagSLO);
    }
  }

  async recordAPIResponseTime(endpoint: string, responseTime: number): Promise<void> {
    await this.recordMetric('api_response_time', responseTime, 'ms', { endpoint });
    
    // Update API response time SLO (using P95)
    const apiSLO = this.sloMetrics.get('api_response_time');
    if (apiSLO) {
      // Simplified P95 calculation - in production, use proper percentile calculation
      apiSLO.current = Math.max(apiSLO.current * 0.95 + responseTime * 0.05, responseTime);
      apiSLO.lastUpdated = new Date();
      this.updateSLOStatus(apiSLO);
    }
  }

  async recordDashboardGenerationTime(dashboardType: string, generationTime: number): Promise<void> {
    await this.recordMetric('dashboard_generation_time', generationTime, 'ms', { type: dashboardType });
    
    const dashboardSLO = this.sloMetrics.get('dashboard_generation_time');
    if (dashboardSLO) {
      dashboardSLO.current = Math.max(dashboardSLO.current, generationTime);
      dashboardSLO.lastUpdated = new Date();
      this.updateSLOStatus(dashboardSLO);
    }
  }

  async recordReportGenerationTime(reportType: string, generationTime: number): Promise<void> {
    await this.recordMetric('report_generation_time', generationTime, 'ms', { type: reportType });
    
    const reportSLO = this.sloMetrics.get('report_generation_time');
    if (reportSLO) {
      reportSLO.current = Math.max(reportSLO.current, generationTime);
      reportSLO.lastUpdated = new Date();
      this.updateSLOStatus(reportSLO);
    }
  }

  async recordDataQualityScore(tableName: string, qualityScore: number): Promise<void> {
    await this.recordMetric('data_quality_score', qualityScore, 'ratio', { table: tableName });
    
    const qualitySLO = this.sloMetrics.get('data_quality_score');
    if (qualitySLO) {
      // Use minimum quality score across all tables
      qualitySLO.current = Math.min(qualitySLO.current, qualityScore);
      qualitySLO.lastUpdated = new Date();
      this.updateSLOStatus(qualitySLO);
    }
  }

  async recordError(errorType: string, errorMessage: string): Promise<void> {
    await this.recordMetric('error_count', 1, 'count', { type: errorType });
    
    // Update error rate SLO
    const errorSLO = this.sloMetrics.get('error_rate');
    if (errorSLO) {
      // Simplified error rate calculation
      const totalRequests = await this.getTotalRequestCount();
      const totalErrors = await this.getTotalErrorCount();
      errorSLO.current = totalErrors / Math.max(totalRequests, 1);
      errorSLO.lastUpdated = new Date();
      this.updateSLOStatus(errorSLO);
    }

    // Create error alert if critical
    if (errorType === 'critical' || errorMessage.includes('critical')) {
      await this.createAlert('error', 'high', 'Critical Error Detected', errorMessage);
    }
  }

  async recordPredictionAccuracy(modelId: string, accuracy: number): Promise<void> {
    await this.recordMetric('prediction_accuracy', accuracy, 'ratio', { model: modelId });
    
    const accuracySLO = this.sloMetrics.get('prediction_accuracy');
    if (accuracySLO) {
      // Use average accuracy across all models
      accuracySLO.current = (accuracySLO.current + accuracy) / 2;
      accuracySLO.lastUpdated = new Date();
      this.updateSLOStatus(accuracySLO);
    }
  }

  private updateSLOStatus(sloMetric: SLOMetric): void {
    const isBreached = sloMetric.threshold === 'lower' 
      ? sloMetric.current > sloMetric.target
      : sloMetric.current < sloMetric.target;

    const previousStatus = sloMetric.status;

    if (isBreached) {
      const breachSeverity = this.calculateBreachSeverity(sloMetric);
      sloMetric.status = breachSeverity;
    } else {
      sloMetric.status = 'healthy';
    }

    // Emit status change event
    if (previousStatus !== sloMetric.status) {
      this.emit('slo_status_changed', sloMetric, previousStatus);
      
      if (sloMetric.status !== 'healthy') {
        this.createSLOAlert(sloMetric);
      }
    }
  }

  private calculateBreachSeverity(sloMetric: SLOMetric): 'warning' | 'critical' {
    const deviation = sloMetric.threshold === 'lower'
      ? (sloMetric.current - sloMetric.target) / sloMetric.target
      : (sloMetric.target - sloMetric.current) / sloMetric.target;

    return deviation > 0.5 ? 'critical' : 'warning';
  }

  private async createSLOAlert(sloMetric: SLOMetric): Promise<void> {
    const alertId = `slo_${sloMetric.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      type: 'slo_breach',
      severity: sloMetric.status === 'critical' ? 'critical' : 'medium',
      title: `SLO Breach: ${sloMetric.name}`,
      description: `${sloMetric.description}. Current: ${sloMetric.current}${sloMetric.unit}, Target: ${sloMetric.target}${sloMetric.unit}`,
      metric: sloMetric.name,
      threshold: sloMetric.target,
      currentValue: sloMetric.current,
      createdAt: new Date(),
      isResolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    this.emit('alert_created', alert);

    logger.warn('SLO breach detected', {
      metric: sloMetric.name,
      current: sloMetric.current,
      target: sloMetric.target,
      status: sloMetric.status,
    });
  }

  private async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    description: string,
    metric?: string
  ): Promise<void> {
    const alertId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      type,
      severity,
      title,
      description,
      metric,
      createdAt: new Date(),
      isResolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    this.emit('alert_created', alert);

    logger.warn('Alert created', {
      type,
      severity,
      title,
      description,
    });
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert_resolved', alert);
      
      logger.info('Alert resolved', { alertId, title: alert.title });
    }
  }

  private async updateSLOMetrics(): Promise<void> {
    try {
      // Update system availability
      const uptime = (Date.now() - this.startTime) / 1000;
      const availabilitySLO = this.sloMetrics.get('system_availability');
      if (availabilitySLO) {
        // Simplified availability calculation
        availabilitySLO.current = Math.min(1.0, uptime / (uptime + 1)); // Assume minimal downtime
        availabilitySLO.lastUpdated = new Date();
        this.updateSLOStatus(availabilitySLO);
      }

      // Update other metrics from database/cache
      await this.updateMetricsFromDatabase();
      
    } catch (error) {
      logger.error('Failed to update SLO metrics', error);
    }
  }

  private async updateMetricsFromDatabase(): Promise<void> {
    try {
      // Get recent data quality scores
      const qualityResult = await databaseService.query(`
        SELECT AVG(data_quality_score) as avg_quality
        FROM data_quality_metrics
        WHERE last_checked >= NOW() - INTERVAL '1 hour'
      `);

      if (qualityResult.rows.length > 0 && qualityResult.rows[0].avg_quality) {
        const avgQuality = parseFloat(qualityResult.rows[0].avg_quality);
        await this.recordDataQualityScore('overall', avgQuality);
      }

      // Get recent prediction accuracies
      const accuracyResult = await databaseService.query(`
        SELECT AVG(accuracy) as avg_accuracy
        FROM predictive_models
        WHERE last_trained >= NOW() - INTERVAL '24 hours'
        AND is_active = true
      `);

      if (accuracyResult.rows.length > 0 && accuracyResult.rows[0].avg_accuracy) {
        const avgAccuracy = parseFloat(accuracyResult.rows[0].avg_accuracy);
        await this.recordPredictionAccuracy('overall', avgAccuracy);
      }

    } catch (error) {
      logger.error('Failed to update metrics from database', error);
    }
  }

  private async checkSLOBreaches(): Promise<void> {
    for (const [name, sloMetric] of this.sloMetrics) {
      if (sloMetric.status !== 'healthy') {
        // Check if we need to create or update alerts
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.metric === sloMetric.name && !alert.isResolved);

        if (!existingAlert) {
          await this.createSLOAlert(sloMetric);
        }
      } else {
        // Resolve any existing alerts for this metric
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.metric === sloMetric.name && !alert.isResolved);

        if (existingAlert) {
          await this.resolveAlert(existingAlert.id);
        }
      }
    }
  }

  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      // Store metrics in time series format (simplified - in production use proper TSDB)
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      // Cache recent metrics in Redis
      for (const metric of metrics) {
        const key = `metric:${metric.name}:${metric.timestamp.getTime()}`;
        await redisService.set(key, metric, 3600); // 1 hour TTL
      }

      // Keep recent metrics in memory
      this.performanceMetrics.push(...metrics);
      
      // Keep only last 1000 metrics in memory
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }

    } catch (error) {
      logger.error('Failed to flush metrics buffer', error);
    }
  }

  private async getTotalRequestCount(): Promise<number> {
    // Simplified - in production, get from actual request counter
    return this.performanceMetrics
      .filter(m => m.name === 'api_response_time')
      .length;
  }

  private async getTotalErrorCount(): Promise<number> {
    // Simplified - in production, get from actual error counter
    return this.performanceMetrics
      .filter(m => m.name === 'error_count')
      .reduce((sum, m) => sum + m.value, 0);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    // Check service health
    const services = {
      database: await databaseService.healthCheck(),
      redis: await redisService.healthCheck(),
      kafka: true, // Simplified - would check actual Kafka health
    };

    // Determine overall health
    const allServicesHealthy = Object.values(services).every(healthy => healthy);
    const criticalSLOs = Array.from(this.sloMetrics.values()).filter(slo => slo.status === 'critical');
    const warningSLOs = Array.from(this.sloMetrics.values()).filter(slo => slo.status === 'warning');

    let overall: SystemHealth['overall'] = 'healthy';
    if (!allServicesHealthy || criticalSLOs.length > 0) {
      overall = 'critical';
    } else if (warningSLOs.length > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      services,
      slos: Array.from(this.sloMetrics.values()),
      alerts: Array.from(this.activeAlerts.values()).filter(alert => !alert.isResolved),
      uptime: (Date.now() - this.startTime) / 1000,
      lastChecked: new Date(),
    };
  }

  async getSLOMetrics(): Promise<SLOMetric[]> {
    return Array.from(this.sloMetrics.values());
  }

  async getPerformanceMetrics(metricName?: string, since?: Date): Promise<PerformanceMetric[]> {
    let metrics = this.performanceMetrics;

    if (metricName) {
      metrics = metrics.filter(m => m.name === metricName);
    }

    if (since) {
      metrics = metrics.filter(m => m.timestamp >= since);
    }

    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.isResolved);
  }

  async getAlertHistory(limit = 100): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Dashboard endpoints for monitoring
  async getMonitoringDashboard(): Promise<any> {
    const health = await this.getSystemHealth();
    const recentMetrics = await this.getPerformanceMetrics(undefined, new Date(Date.now() - 3600000)); // Last hour

    return {
      health,
      sloCompliance: {
        total: this.sloMetrics.size,
        healthy: Array.from(this.sloMetrics.values()).filter(slo => slo.status === 'healthy').length,
        warning: Array.from(this.sloMetrics.values()).filter(slo => slo.status === 'warning').length,
        critical: Array.from(this.sloMetrics.values()).filter(slo => slo.status === 'critical').length,
      },
      recentMetrics: recentMetrics.slice(0, 50), // Last 50 metrics
      activeAlerts: await this.getActiveAlerts(),
    };
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Flush remaining metrics
    await this.flushMetricsBuffer();

    logger.info('Monitoring service shut down');
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;