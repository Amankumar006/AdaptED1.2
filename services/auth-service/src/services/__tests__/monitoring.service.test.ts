import { monitoringService } from '../monitoring.service';

describe('MonitoringService', () => {
  beforeEach(() => {
    monitoringService.reset();
  });

  describe('Counter Metrics', () => {
    it('should increment counter metrics', () => {
      monitoringService.incrementCounter('test_counter');
      monitoringService.incrementCounter('test_counter', { label: 'value' });
      monitoringService.incrementCounter('test_counter', { label: 'value' }, 5);

      const metrics = monitoringService.getMetrics();
      expect(metrics.loginAttempts).toBeDefined();
    });

    it('should handle counter metrics with labels', () => {
      monitoringService.incrementCounter('auth_attempts_total', { event: 'login' });
      monitoringService.incrementCounter('auth_attempts_total', { event: 'login' });
      monitoringService.incrementCounter('auth_attempts_total', { event: 'logout' });

      const metrics = monitoringService.getMetrics();
      expect(metrics.loginAttempts).toBe(2);
    });
  });

  describe('Gauge Metrics', () => {
    it('should set gauge metrics', () => {
      monitoringService.setGauge('active_users', 10);
      monitoringService.setGauge('active_users', 15);

      const metrics = monitoringService.getMetrics();
      expect(metrics.activeUsers).toBe(15);
    });

    it('should handle gauge metrics with labels', () => {
      monitoringService.setGauge('memory_usage', 100, { type: 'heap' });
      monitoringService.setGauge('memory_usage', 200, { type: 'rss' });

      // Gauges should store the latest value
      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('memory_usage{type="heap"} 100');
      expect(prometheusMetrics).toContain('memory_usage{type="rss"} 200');
    });
  });

  describe('Histogram Metrics', () => {
    it('should record histogram values', () => {
      monitoringService.recordHistogram('response_time', 100);
      monitoringService.recordHistogram('response_time', 200);
      monitoringService.recordHistogram('response_time', 300);

      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('response_time_count 3');
      expect(prometheusMetrics).toContain('response_time_sum 600');
    });

    it('should calculate percentiles correctly', () => {
      // Add values for percentile calculation
      for (let i = 1; i <= 100; i++) {
        monitoringService.recordHistogram('test_histogram', i);
      }

      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('test_histogram_p50 50');
      expect(prometheusMetrics).toContain('test_histogram_p95 95');
      expect(prometheusMetrics).toContain('test_histogram_p99 99');
    });
  });

  describe('Authentication Metrics', () => {
    it('should record successful authentication', () => {
      monitoringService.recordAuthMetric('login', true, 150);

      const metrics = monitoringService.getMetrics();
      expect(metrics.loginAttempts).toBe(1);
      expect(metrics.successfulLogins).toBe(1);
      expect(metrics.failedLogins).toBe(0);
    });

    it('should record failed authentication', () => {
      monitoringService.recordAuthMetric('login', false, 100);

      const metrics = monitoringService.getMetrics();
      expect(metrics.loginAttempts).toBe(1);
      expect(metrics.successfulLogins).toBe(0);
      expect(metrics.failedLogins).toBe(1);
    });

    it('should record authentication duration', () => {
      monitoringService.recordAuthMetric('login', true, 250);
      monitoringService.recordAuthMetric('login', true, 150);

      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('auth_duration_ms_count');
    });
  });

  describe('API Request Metrics', () => {
    it('should record API request metrics', () => {
      monitoringService.recordApiRequest('GET', '/auth/profile', 200, 150);
      monitoringService.recordApiRequest('POST', '/auth/login', 401, 100);

      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('http_requests_total');
      expect(prometheusMetrics).toContain('http_request_duration_ms');
    });

    it('should track error rates', () => {
      monitoringService.recordApiRequest('GET', '/auth/profile', 200, 100);
      monitoringService.recordApiRequest('POST', '/auth/login', 401, 100);
      monitoringService.recordApiRequest('GET', '/auth/health', 200, 50);

      const metrics = monitoringService.getMetrics();
      expect(metrics.errorRate).toBeCloseTo(33.33, 1); // 1 error out of 3 requests
    });
  });

  describe('MFA Metrics', () => {
    it('should record MFA metrics', () => {
      monitoringService.recordMFAMetric('totp', true, 200);
      monitoringService.recordMFAMetric('backup', false, 100);

      const metrics = monitoringService.getMetrics();
      expect(metrics.mfaAttempts).toBe(2);
      expect(metrics.mfaSuccesses).toBe(1);
    });
  });

  describe('OAuth Metrics', () => {
    it('should record OAuth metrics', () => {
      monitoringService.recordOAuthMetric('google', true, 1500);
      monitoringService.recordOAuthMetric('microsoft', false, 800);

      const metrics = monitoringService.getMetrics();
      expect(metrics.oauthAttempts).toBe(2);
      expect(metrics.oauthSuccesses).toBe(1);
    });
  });

  describe('Token Metrics', () => {
    it('should record token operation metrics', () => {
      monitoringService.recordTokenMetric('generate', true, 50);
      monitoringService.recordTokenMetric('validate', true, 25);
      monitoringService.recordTokenMetric('refresh', true, 75);
      monitoringService.recordTokenMetric('revoke', true, 30);

      const metrics = monitoringService.getMetrics();
      expect(metrics.tokenGenerations).toBe(1);
      expect(metrics.tokenValidations).toBe(1);
      expect(metrics.tokenRevocations).toBe(1);
    });
  });

  describe('Security Events', () => {
    it('should record security events', () => {
      monitoringService.recordSecurityEvent('account_lockout', 'high');
      monitoringService.recordSecurityEvent('password_reset', 'medium');

      const metrics = monitoringService.getMetrics();
      expect(metrics.accountLockouts).toBe(1);
      expect(metrics.passwordResets).toBe(1);
    });

    it('should handle critical security events', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      monitoringService.recordSecurityEvent('data_breach', 'critical', {
        affectedUsers: 1000,
        dataType: 'personal'
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('SLO Compliance', () => {
    it('should check SLO compliance - passing', () => {
      // Record requests within SLO
      monitoringService.recordApiRequest('GET', '/auth/profile', 200, 100);
      monitoringService.recordApiRequest('POST', '/auth/login', 200, 150);
      monitoringService.recordApiRequest('GET', '/auth/health', 200, 50);

      const sloCompliance = monitoringService.checkSLOCompliance();
      expect(sloCompliance.compliant).toBe(true);
      expect(sloCompliance.violations).toHaveLength(0);
    });

    it('should check SLO compliance - failing response time', () => {
      // Record slow requests
      monitoringService.recordApiRequest('GET', '/auth/profile', 200, 500);
      monitoringService.recordApiRequest('POST', '/auth/login', 200, 600);

      const sloCompliance = monitoringService.checkSLOCompliance();
      expect(sloCompliance.compliant).toBe(false);
      expect(sloCompliance.violations.some(v => v.includes('response time'))).toBe(true);
    });

    it('should check SLO compliance - failing error rate', () => {
      // Record high error rate
      monitoringService.recordApiRequest('GET', '/auth/profile', 500, 100);
      monitoringService.recordApiRequest('POST', '/auth/login', 401, 100);
      monitoringService.recordApiRequest('GET', '/auth/health', 200, 50);

      const sloCompliance = monitoringService.checkSLOCompliance();
      expect(sloCompliance.compliant).toBe(false);
      expect(sloCompliance.violations.some(v => v.includes('Error rate'))).toBe(true);
    });
  });

  describe('Health Status', () => {
    it('should return healthy status', () => {
      monitoringService.recordApiRequest('GET', '/auth/profile', 200, 100);
      monitoringService.recordApiRequest('POST', '/auth/login', 200, 150);

      const health = monitoringService.getHealthStatus();
      expect(health.status).toBe('healthy');
    });

    it('should return degraded status', () => {
      monitoringService.recordApiRequest('GET', '/auth/profile', 200, 350); // Above SLO but not critical

      const health = monitoringService.getHealthStatus();
      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status', () => {
      monitoringService.recordApiRequest('GET', '/auth/profile', 500, 1200); // High error rate and response time

      const health = monitoringService.getHealthStatus();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Prometheus Metrics Format', () => {
    it('should generate valid Prometheus metrics', () => {
      monitoringService.incrementCounter('test_counter', { label: 'value' });
      monitoringService.setGauge('test_gauge', 42);
      monitoringService.recordHistogram('test_histogram', 100);

      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      
      expect(prometheusMetrics).toContain('test_counter{label="value"} 1');
      expect(prometheusMetrics).toContain('test_gauge 42');
      expect(prometheusMetrics).toContain('test_histogram_count 1');
      expect(prometheusMetrics).toContain('test_histogram_sum 100');
    });

    it('should handle metrics without labels', () => {
      monitoringService.incrementCounter('simple_counter');
      
      const prometheusMetrics = monitoringService.getPrometheusMetrics();
      expect(prometheusMetrics).toContain('simple_counter 1');
    });
  });

  describe('Metrics Summary', () => {
    it('should provide comprehensive metrics summary', () => {
      // Generate various metrics
      monitoringService.recordAuthMetric('login', true, 150);
      monitoringService.recordMFAMetric('totp', true, 200);
      monitoringService.recordTokenMetric('generate', true, 50);
      monitoringService.recordOAuthMetric('google', true, 1000);
      monitoringService.recordSecurityEvent('account_lockout', 'medium');
      monitoringService.setGauge('active_users', 25);

      const metrics = monitoringService.getMetrics();
      
      expect(metrics).toHaveProperty('loginAttempts');
      expect(metrics).toHaveProperty('successfulLogins');
      expect(metrics).toHaveProperty('mfaAttempts');
      expect(metrics).toHaveProperty('tokenGenerations');
      expect(metrics).toHaveProperty('oauthAttempts');
      expect(metrics).toHaveProperty('accountLockouts');
      expect(metrics).toHaveProperty('activeUsers');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('errorRate');
    });
  });
});