import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring.service';
import { logger } from '../utils/logger';

/**
 * Middleware to track API request metrics
 */
export const requestMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Track request start
  monitoringService.incrementCounter('http_requests_started_total', {
    method: req.method,
    path: sanitizePath(req.path)
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end.bind(res);
  // Use varargs to satisfy overloads and return Response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    
    // Record API request metrics
    monitoringService.recordApiRequest(
      req.method,
      req.path,
      res.statusCode,
      duration
    );

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }

    // Call original end method
    return originalEnd(...args as [any]);
  };

  next();
};

/**
 * Middleware to track authentication metrics
 */
export const authMetricsMiddleware = (event: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Override res.json to capture auth metrics
    const originalJson = res.json;
    res.json = function(body?: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Record authentication metrics
      monitoringService.recordAuthMetric(event, success, duration, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent') || 'unknown',
        ip: req.ip || 'unknown'
      });

      // Record security events for failed auth attempts
      if (!success && res.statusCode === 401) {
        monitoringService.recordSecurityEvent('auth_failure', 'medium', {
          event,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
      }

      // Call original json method
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to track MFA metrics
 */
export const mfaMetricsMiddleware = (method: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Override res.json to capture MFA metrics
    const originalJson = res.json;
    res.json = function(body?: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Record MFA metrics
      monitoringService.recordMFAMetric(method, success, duration);

      // Record security events for MFA failures
      if (!success) {
        monitoringService.recordSecurityEvent('mfa_failure', 'medium', {
          method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.sub
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to track OAuth metrics
 */
export const oauthMetricsMiddleware = (provider: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Override res.redirect and res.json to capture OAuth metrics
  const originalRedirect = res.redirect.bind(res);
    const originalJson = res.json;
    
    const recordMetrics = () => {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      monitoringService.recordOAuthMetric(provider, success, duration);

      if (!success) {
        monitoringService.recordSecurityEvent('oauth_failure', 'low', {
          provider,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    };

    // Support all overloads of res.redirect
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).redirect = function(...args: any[]) {
      recordMetrics();
      return originalRedirect(...args as [any]);
    };

    res.json = function(body?: any) {
      recordMetrics();
      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to track token operation metrics
 */
export const tokenMetricsMiddleware = (operation: 'generate' | 'validate' | 'refresh' | 'revoke') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Override res.json to capture token metrics
    const originalJson = res.json;
    res.json = function(body?: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      // Record token metrics
      monitoringService.recordTokenMetric(operation, success, duration);

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to detect and record suspicious activity
 */
export const securityMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || '';
  
  // Detect potential bot activity
  if (isSuspiciousUserAgent(userAgent)) {
    monitoringService.recordSecurityEvent('suspicious_user_agent', 'low', {
      userAgent,
      ip,
      path: req.path
    });
  }

  // Detect potential scanning activity
  if (isScanningPattern(req.path)) {
    monitoringService.recordSecurityEvent('potential_scanning', 'medium', {
      path: req.path,
      ip,
      userAgent
    });
  }

  // Detect unusual request patterns
  if (hasUnusualHeaders(req)) {
    monitoringService.recordSecurityEvent('unusual_headers', 'low', {
      headers: Object.keys(req.headers),
      ip,
      path: req.path
    });
  }

  next();
};

/**
 * Middleware to update active user count
 */
export const activeUserTrackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user) {
    // In a real implementation, you would track active users more sophisticated way
    // For now, we'll just increment a gauge when authenticated requests are made
    monitoringService.setGauge('active_users', 1); // Simplified implementation
  }

  next();
};

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (error: any, req: Request, res: Response, next: NextFunction): void => {
  // Record error metrics
  monitoringService.incrementCounter('application_errors_total', {
    error_type: error.constructor.name,
    path: req.path,
    method: req.method
  });

  // Record security events for certain error types
  if (error.name === 'ValidationError' || error.name === 'UnauthorizedError') {
    monitoringService.recordSecurityEvent('application_error', 'low', {
      error: error.message,
      path: req.path,
      ip: req.ip
    });
  }

  next(error);
};

// Helper functions

function sanitizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
}

function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http-client/i,
    /^$/
  ];

  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

function isScanningPattern(path: string): boolean {
  const scanningPatterns = [
    /\.php$/,
    /\.asp$/,
    /\.jsp$/,
    /admin/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /\.env$/,
    /\.git/,
    /\.svn/,
    /backup/i,
    /config/i,
    /test/i
  ];

  return scanningPatterns.some(pattern => pattern.test(path));
}

function hasUnusualHeaders(req: Request): boolean {
  const headers = Object.keys(req.headers);
  const unusualHeaders = [
    'x-forwarded-host',
    'x-real-ip',
    'x-cluster-client-ip',
    'cf-connecting-ip'
  ];

  // Check for multiple forwarding headers (potential proxy abuse)
  const forwardingHeaders = headers.filter(h => 
    h.startsWith('x-forwarded-') || h.startsWith('x-real-')
  );

  return forwardingHeaders.length > 2;
}