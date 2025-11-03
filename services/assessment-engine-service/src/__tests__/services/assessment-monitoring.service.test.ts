import { AssessmentMonitoringService, AlertRule } from '../../services/assessment-monitoring.service';

describe('AssessmentMonitoringService', () => {
  let monitoringService: AssessmentMonitoringService;

  beforeEach(() => {
    monitoringService = new AssessmentMonitoringService();
  });

  afterEach(() => {
    monitoringService.shutdown();
  });

  describe('Response Time Monitoring', () => {
    it('should record and calculate response time metrics', () => {
      // Record various response times
      const responseTimes = [100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
      
      responseTimes.forEach(time => {
        monitoringService.recordResponseTime('test_operation', time);
      });

      const metrics = monitoringService.getCurrentMetrics();

      expect(metrics.responseTime.average).toBeGreaterThan(0);
      expect(metrics.responseTime.p50).toBe(300); // Median of the array
      expect(metrics.responseTime.p95).toBe(1000); // 95th percentile
      expect(metrics.responseTime.p99).toBe(1000); // 99th percentile
    });

    it('should maintain response time history within limits', () => {
      // Record more than the limit (1000) response times
      for (let i = 0; i < 1200; i++) {
        monitoringService.recordResponseTime('bulk_operation', 100 + i);
      }

      const metrics = monitoringService.getCurrentMetrics();
      
      // Should still calculate metrics correctly
      expect(metrics.responseTime.average).toBeGreaterThan(0);
      expect(metrics.responseTime.p95).toBeGreaterThan(0);
    });

    it('should emit SLO breach events for slow responses', (done) => {
      monitoringService.on('slo_breach', (event) => {
        expect(event.operation).toBe('slow_operation');
        expect(event.duration).toBe(600);
        expect(event.slo).toBe(500);
        done();
      });

      monitoringService.recordResponseTime('slow_operation', 600);
    });
  });

  describe('Error Monitoring', () => {
    it('should record and track error rates', () => {
      // Record some successful operations
      for (let i = 0; i < 95; i++) {
        monitoringService.recordResponseTime('mixed_operation', 200);
      }

      // Record some errors
      for (let i = 0; i < 5; i++) {
        monitoringService.recordError('mixed_operation', new Error('Test error'));
      }

      const metrics = monitoringService.getCurrentMetrics();
      expect(metrics.systemHealth.errorRate).toBe(5); // 5% error rate
    });

    it('should emit error events', (done) => {
      const testError = new Error('Test error message');

      monitoringService.on('error', (event) => {
        expect(event.operation).toBe('error_operation');
        expect(event.error).toBe(testError);
        done();
      });

      monitoringService.recordError('error_operation', testError);
    });
  });

  describe('Business Metrics', () => {
    it('should record business metrics correctly', () => {
      monitoringService.recordBusinessMetric('assessment_created', 1);
      monitoringService.recordBusinessMetric('assessment_created', 1);
      monitoringService.recordBusinessMetric('submission_completed', 1);
      monitoringService.recordBusinessMetric('average_score', 85.5);
      monitoringService.recordBusinessMetric('completion_rate', 92.3);

      const metrics = monitoringService.getCurrentMetrics();

      expect(metrics.assessmentStats.totalAssessments).toBe(2);
      expect(metrics.assessmentStats.completedSubmissions).toBe(1);
      expect(metrics.assessmentStats.averageScore).toBe(85.5);
      expect(metrics.assessmentStats.completionRate).toBe(92.3);
    });

    it('should emit business metric events', (done) => {
      monitoringService.on('business_metric', (event) => {
        expect(event.metric).toBe('assessment_created');
        expect(event.value).toBe(1);
        done();
      });

      monitoringService.recordBusinessMetric('assessment_created', 1);
    });
  });

  describe('Alert Management', () => {
    it('should add and retrieve alert rules', () => {
      const rule = {
        name: 'Test Alert Rule',
        metric: 'response_time_p95',
        threshold: 300,
        operator: 'gt' as const,
        severity: 'medium' as const,
        enabled: true,
        cooldownPeriod: 60000
      };

      const ruleId = monitoringService.addAlertRule(rule);
      expect(ruleId).toBeDefined();

      const rules = monitoringService.getAlertRules();
      const addedRule = rules.find(r => r.id === ruleId);
      
      expect(addedRule).toBeDefined();
      expect(addedRule!.name).toBe(rule.name);
      expect(addedRule!.threshold).toBe(rule.threshold);
    });

    it('should remove alert rules', () => {
      const rule = {
        name: 'Removable Rule',
        metric: 'error_rate',
        threshold: 10,
        operator: 'gt' as const,
        severity: 'low' as const,
        enabled: true,
        cooldownPeriod: 30000
      };

      const ruleId = monitoringService.addAlertRule(rule);
      expect(monitoringService.removeAlertRule(ruleId)).toBe(true);
      expect(monitoringService.removeAlertRule(ruleId)).toBe(false); // Already removed
    });

    it('should trigger alerts when thresholds are exceeded', (done) => {
      const rule = {
        name: 'High Response Time',
        metric: 'response_time_p95',
        threshold: 200,
        operator: 'gt' as const,
        severity: 'high' as const,
        enabled: true,
        cooldownPeriod: 1000
      };

      monitoringService.addAlertRule(rule);

      monitoringService.on('alert', (alert) => {
        expect(alert.message).toContain('High Response Time');
        expect(alert.severity).toBe('high');
        expect(alert.value).toBeGreaterThan(200);
        done();
      });

      // Generate high response times to trigger alert
      for (let i = 0; i < 10; i++) {
        monitoringService.recordResponseTime('slow_op', 300);
      }

      // Trigger metrics update
      monitoringService['updateCalculatedMetrics']();
      monitoringService['checkAlertRules']();
    });

    it('should respect cooldown periods', (done) => {
      const rule = {
        name: 'Cooldown Test',
        metric: 'response_time_p95',
        threshold: 100,
        operator: 'gt' as const,
        severity: 'low' as const,
        enabled: true,
        cooldownPeriod: 5000 // 5 seconds
      };

      monitoringService.addAlertRule(rule);

      let alertCount = 0;
      monitoringService.on('alert', () => {
        alertCount++;
      });

      // Trigger alert
      for (let i = 0; i < 5; i++) {
        monitoringService.recordResponseTime('cooldown_test', 200);
      }
      monitoringService['updateCalculatedMetrics']();
      monitoringService['checkAlertRules']();

      // Try to trigger again immediately (should be blocked by cooldown)
      for (let i = 0; i < 5; i++) {
        monitoringService.recordResponseTime('cooldown_test', 250);
      }
      monitoringService['updateCalculatedMetrics']();
      monitoringService['checkAlertRules']();

      setTimeout(() => {
        expect(alertCount).toBe(1); // Only one alert should have been triggered
        done();
      }, 100);
    });

    it('should resolve alerts', () => {
      const rule = {
        name: 'Resolvable Alert',
        metric: 'error_rate',
        threshold: 1,
        operator: 'gt' as const,
        severity: 'medium' as const,
        enabled: true,
        cooldownPeriod: 1000
      };

      monitoringService.addAlertRule(rule);

      // Trigger alert
      monitoringService.recordError('test_op', new Error('Test'));
      monitoringService.recordResponseTime('test_op', 100); // To have some requests
      monitoringService['updateCalculatedMetrics']();
      monitoringService['checkAlertRules']();

      const activeAlerts = monitoringService.getActiveAlerts();
      expect(activeAlerts.length).toBe(1);

      const alertId = activeAlerts[0].id;
      const resolved = monitoringService.resolveAlert(alertId);
      expect(resolved).toBe(true);

      const activeAlertsAfterResolve = monitoringService.getActiveAlerts();
      expect(activeAlertsAfterResolve.length).toBe(0);
    });
  });

  describe('Health Status', () => {
    it('should return healthy status when all metrics are normal', () => {
      // Record normal response times
      for (let i = 0; i < 10; i++) {
        monitoringService.recordResponseTime('normal_op', 100);
      }

      const healthStatus = monitoringService.getHealthStatus();
      
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.checks.length).toBeGreaterThan(0);
      
      const responseTimeCheck = healthStatus.checks.find(c => c.name === 'response_time_p95');
      expect(responseTimeCheck?.status).toBe('pass');
    });

    it('should return degraded status when metrics are concerning', () => {
      // Record response times that are concerning but not critical
      for (let i = 0; i < 10; i++) {
        monitoringService.recordResponseTime('concerning_op', 350);
      }

      const healthStatus = monitoringService.getHealthStatus();
      
      expect(healthStatus.status).toBe('degraded');
      
      const responseTimeCheck = healthStatus.checks.find(c => c.name === 'response_time_p95');
      expect(responseTimeCheck?.status).toBe('warn');
    });

    it('should return unhealthy status when metrics are critical', () => {
      // Record critical response times
      for (let i = 0; i < 10; i++) {
        monitoringService.recordResponseTime('critical_op', 600);
      }

      const healthStatus = monitoringService.getHealthStatus();
      
      expect(healthStatus.status).toBe('unhealthy');
      
      const responseTimeCheck = healthStatus.checks.find(c => c.name === 'response_time_p95');
      expect(responseTimeCheck?.status).toBe('fail');
    });
  });

  describe('Dashboard Data', () => {
    it('should provide comprehensive dashboard data', () => {
      // Generate some test data
      for (let i = 0; i < 20; i++) {
        monitoringService.recordResponseTime('dashboard_test', 100 + i * 10);
      }

      monitoringService.recordBusinessMetric('assessment_created', 1);
      monitoringService.updateGradingQueueMetrics({
        waiting: 10,
        active: 5,
        completed: 100,
        failed: 2,
        avgProcessingTime: 2000
      });

      const dashboardData = monitoringService.getDashboardData();

      expect(dashboardData.metrics).toBeDefined();
      expect(dashboardData.trends).toBeDefined();
      expect(dashboardData.trends.responseTime).toBeDefined();
      expect(dashboardData.trends.throughput).toBeDefined();
      expect(dashboardData.trends.errorRate).toBeDefined();
      expect(dashboardData.alerts).toBeDefined();
      expect(dashboardData.healthStatus).toBeDefined();
    });
  });

  describe('Grading Queue Metrics', () => {
    it('should update grading queue metrics', () => {
      const queueStats = {
        waiting: 25,
        active: 10,
        completed: 500,
        failed: 5,
        avgProcessingTime: 3000
      };

      monitoringService.updateGradingQueueMetrics(queueStats);
      
      const metrics = monitoringService.getCurrentMetrics();
      expect(metrics.gradingQueue).toEqual(queueStats);
    });
  });

  describe('Metrics History', () => {
    it('should maintain metrics history', () => {
      // Simulate metrics collection over time
      for (let i = 0; i < 5; i++) {
        monitoringService.recordResponseTime('history_test', 100 + i * 50);
        monitoringService['updateCalculatedMetrics']();
        monitoringService['archiveMetrics']();
      }

      const history = monitoringService.getMetricsHistory();
      expect(history.length).toBe(5);
      
      const limitedHistory = monitoringService.getMetricsHistory(3);
      expect(limitedHistory.length).toBe(3);
    });

    it('should limit history size', () => {
      // Simulate many metrics collections
      for (let i = 0; i < 1200; i++) {
        monitoringService['archiveMetrics']();
      }

      const history = monitoringService.getMetricsHistory();
      expect(history.length).toBeLessThanOrEqual(1000); // Should be limited to maxHistorySize
    });
  });

  describe('Percentile Calculations', () => {
    it('should calculate percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      expect(monitoringService['calculatePercentile'](values, 50)).toBe(5);
      expect(monitoringService['calculatePercentile'](values, 90)).toBe(9);
      expect(monitoringService['calculatePercentile'](values, 100)).toBe(10);
    });

    it('should handle empty arrays', () => {
      expect(monitoringService['calculatePercentile']([], 50)).toBe(0);
    });

    it('should handle single value arrays', () => {
      expect(monitoringService['calculatePercentile']([42], 95)).toBe(42);
    });
  });

  describe('Alert Condition Evaluation', () => {
    it('should evaluate alert conditions correctly', () => {
      expect(monitoringService['evaluateAlertCondition'](10, 5, 'gt')).toBe(true);
      expect(monitoringService['evaluateAlertCondition'](3, 5, 'gt')).toBe(false);
      expect(monitoringService['evaluateAlertCondition'](3, 5, 'lt')).toBe(true);
      expect(monitoringService['evaluateAlertCondition'](5, 5, 'eq')).toBe(true);
      expect(monitoringService['evaluateAlertCondition'](5, 5, 'gte')).toBe(true);
      expect(monitoringService['evaluateAlertCondition'](5, 5, 'lte')).toBe(true);
    });
  });
});