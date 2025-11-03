import { logger } from '../utils/logger';

interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

interface AuthMetrics {
  loginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  mfaAttempts: number;
  mfaSuccesses: number;
  tokenGenerations: number;
  tokenValidations: number;
  tokenRevocations: number;
  oauthAttempts: number;
  oauthSuccesses: number;
  accountLockouts: number;
  passwordResets: number;
  activeUsers: number;
  averageResponseTime: number;
  errorRate: number;
}

class MonitoringService {
  private metrics: Map<string, MetricData[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: Date = new Date();

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const currentValue = this.counters.get(key) || 0;
    this.counters.set(key, currentValue + value);
    
    this.recordMetric({
      name,
      value: currentValue + value,
      labels,
      timestamp: new Date()
    });

    logger.debug(`Counter incremented: ${name}`, { labels, value: currentValue + value });
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
    
    this.recordMetric({
      name,
      value,
      labels,
      timestamp: new Date()
    });

    logger.debug(`Gauge set: ${name}`, { labels, value });
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    
    this.recordMetric({
      name,
      value,
      labels,
      timestamp: new Date()
    });

    logger.debug(`Histogram recorded: ${name}`, { labels, value });
  }

  /**
   * Record authentication metrics
   */
  recordAuthMetric(event: string, success: boolean, duration?: number, labels?: Record<string, string>): void {
    const baseLabels = { event, success: success.toString(), ...labels };
    
    // Increment counters
    this.incrementCounter('auth_attempts_total', baseLabels);
    
    if (success) {
      this.incrementCounter('auth_successes_total', baseLabels);
    } else {
      this.incrementCounter('auth_failures_total', baseLabels);
    }

    // Record duration if provided
    if (duration !== undefined) {
      this.recordHistogram('auth_duration_ms', duration, baseLabels);
    }

    // Update error rate
    this.updateErrorRate();
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(method: string, path: string, statusCode: number, duration: number): void {
    const labels = {
      method,
      path: this.sanitizePath(path),
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`
    };

    this.incrementCounter('http_requests_total', labels);
    this.recordHistogram('http_request_duration_ms', duration, labels);

    // Record error if status code indicates error
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', labels);
    }

    this.updateErrorRate();
  }

  /**
   * Record MFA metrics
   */
  recordMFAMetric(method: string, success: boolean, duration?: number): void {
    const labels = { method, success: success.toString() };
    
    this.incrementCounter('mfa_attempts_total', labels);
    
    if (success) {
      this.incrementCounter('mfa_successes_total', labels);
    } else {
      this.incrementCounter('mfa_failures_total', labels);
    }

    if (duration !== undefined) {
      this.recordHistogram('mfa_duration_ms', duration, labels);
    }
  }

  /**
   * Record OAuth metrics
   */
  recordOAuthMetric(provider: string, success: boolean, duration?: number): void {
    const labels = { provider, success: success.toString() };
    
    this.incrementCounter('oauth_attempts_total', labels);
    
    if (success) {
      this.incrementCounter('oauth_successes_total', labels);
    } else {
      this.incrementCounter('oauth_failures_total', labels);
    }

    if (duration !== undefined) {
      this.recordHistogram('oauth_duration_ms', duration, labels);
    }
  }

  /**
   * Record token metrics
   */
  recordTokenMetric(operation: 'generate' | 'validate' | 'refresh' | 'revoke', success: boolean, duration?: number): void {
    const labels = { operation, success: success.toString() };
    
    this.incrementCounter('token_operations_total', labels);
    
    if (success) {
      this.incrementCounter('token_successes_total', labels);
    } else {
      this.incrementCounter('token_failures_total', labels);
    }

    if (duration !== undefined) {
      this.recordHistogram('token_duration_ms', duration, labels);
    }
  }

  /**
   * Record security events
   */
  recordSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: Record<string, any>): void {
    const labels = { event, severity };
    
    this.incrementCounter('security_events_total', labels);
    
    logger.warn(`Security event: ${event}`, { severity, ...details });

    // Alert on critical security events
    if (severity === 'critical') {
      this.alertCriticalSecurityEvent(event, details);
    }
  }

  /**
   * Get current metrics summary
   */
  getMetrics(): AuthMetrics {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();

    return {
      loginAttempts: this.getCounterValue('auth_attempts_total', { event: 'login' }),
      successfulLogins: this.getCounterValue('auth_successes_total', { event: 'login' }),
      failedLogins: this.getCounterValue('auth_failures_total', { event: 'login' }),
      mfaAttempts: this.getCounterValue('mfa_attempts_total'),
      mfaSuccesses: this.getCounterValue('mfa_successes_total'),
      tokenGenerations: this.getCounterValue('token_operations_total', { operation: 'generate' }),
      tokenValidations: this.getCounterValue('token_operations_total', { operation: 'validate' }),
      tokenRevocations: this.getCounterValue('token_operations_total', { operation: 'revoke' }),
      oauthAttempts: this.getCounterValue('oauth_attempts_total'),
      oauthSuccesses: this.getCounterValue('oauth_successes_total'),
      accountLockouts: this.getCounterValue('security_events_total', { event: 'account_lockout' }),
      passwordResets: this.getCounterValue('security_events_total', { event: 'password_reset' }),
      activeUsers: this.getGaugeValue('active_users'),
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getGaugeValue('error_rate')
    };
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Add help and type information
    lines.push('# HELP auth_attempts_total Total number of authentication attempts');
    lines.push('# TYPE auth_attempts_total counter');
    
    // Add counter metrics
    for (const [key, value] of this.counters.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      const labelString = this.formatPrometheusLabels(labels);
      lines.push(`${name}${labelString} ${value}`);
    }

    // Add gauge metrics
    for (const [key, value] of this.gauges.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      const labelString = this.formatPrometheusLabels(labels);
      lines.push(`${name}${labelString} ${value}`);
    }

    // Add histogram metrics
    for (const [key, values] of this.histograms.entries()) {
      const { name, labels } = this.parseMetricKey(key);
      const labelString = this.formatPrometheusLabels(labels);
      
      // Calculate percentiles
      const sortedValues = values.sort((a, b) => a - b);
      const p50 = this.calculatePercentile(sortedValues, 0.5);
      const p95 = this.calculatePercentile(sortedValues, 0.95);
      const p99 = this.calculatePercentile(sortedValues, 0.99);
      
      lines.push(`${name}_p50${labelString} ${p50}`);
      lines.push(`${name}_p95${labelString} ${p95}`);
      lines.push(`${name}_p99${labelString} ${p99}`);
      lines.push(`${name}_count${labelString} ${values.length}`);
      lines.push(`${name}_sum${labelString} ${values.reduce((a, b) => a + b, 0)}`);
    }

    return lines.join('\n');
  }

  /**
   * Check SLO compliance
   */
  checkSLOCompliance(): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    const p95ResponseTime = this.getP95ResponseTime();
    const errorRate = this.getGaugeValue('error_rate');

    // Check p95 response time SLO (≤ 300ms)
    if (p95ResponseTime > 300) {
      violations.push(`P95 response time ${p95ResponseTime}ms exceeds SLO of 300ms`);
    }

    // Check error rate SLO (≤ 1%)
    if (errorRate > 1) {
      violations.push(`Error rate ${errorRate}% exceeds SLO of 1%`);
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: Record<string, any> } {
    const sloCompliance = this.checkSLOCompliance();
    const errorRate = this.getGaugeValue('error_rate');
    const p95ResponseTime = this.getP95ResponseTime();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (errorRate > 5 || p95ResponseTime > 1000) {
      status = 'unhealthy';
    } else if (errorRate > 1 || p95ResponseTime > 300) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        errorRate,
        p95ResponseTime,
        sloCompliant: sloCompliance.compliant,
        violations: sloCompliance.violations,
        uptime: new Date().getTime() - this.startTime.getTime(),
        totalRequests: this.getCounterValue('http_requests_total'),
        totalErrors: this.getCounterValue('http_errors_total')
      }
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = new Date();
  }

  // Private helper methods

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }

  private parseMetricKey(key: string): { name: string; labels: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) {
      return { name: key, labels: {} };
    }

    const name = match[1];
    const labelsString = match[2];
    const labels: Record<string, string> = {};

    if (labelsString) {
      const labelPairs = labelsString.split(',');
      for (const pair of labelPairs) {
        const [key, value] = pair.split('=');
        labels[key] = value.replace(/"/g, '');
      }
    }

    return { name, labels };
  }

  private recordMetric(metric: MetricData): void {
    const key = this.getMetricKey(metric.name, metric.labels);
    const metrics = this.metrics.get(key) || [];
    metrics.push(metric);
    
    // Keep only last 1000 data points per metric
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    this.metrics.set(key, metrics);
  }

  private getCounterValue(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels);
    return this.counters.get(key) || 0;
  }

  private getGaugeValue(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  private getAverageResponseTime(): number {
    const durations = this.histograms.get('http_request_duration_ms') || [];
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  private getP95ResponseTime(): number {
    const durations = this.histograms.get('http_request_duration_ms') || [];
    if (durations.length === 0) return 0;
    return this.calculatePercentile(durations.sort((a, b) => a - b), 0.95);
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private updateErrorRate(): void {
    const totalRequests = this.getCounterValue('http_requests_total');
    const totalErrors = this.getCounterValue('http_errors_total');
    
    if (totalRequests > 0) {
      const errorRate = (totalErrors / totalRequests) * 100;
      this.setGauge('error_rate', errorRate);
    }
  }

  private sanitizePath(path: string): string {
    // Replace dynamic path segments with placeholders
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
  }

  private formatPrometheusLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    
    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `{${labelPairs}}`;
  }

  private alertCriticalSecurityEvent(event: string, details?: Record<string, any>): void {
    // In a real implementation, this would send alerts to monitoring systems
    logger.error(`CRITICAL SECURITY EVENT: ${event}`, details);
    
    // Could integrate with:
    // - PagerDuty
    // - Slack
    // - Email alerts
    // - SIEM systems
  }
}

export const monitoringService = new MonitoringService();