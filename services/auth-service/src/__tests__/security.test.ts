import request from 'supertest';
import App from '../app';
import { redisService } from '../services/redis.service';
import { tokenService } from '../services/token.service';

// Mock Redis service
jest.mock('../services/redis.service', () => ({
  redisService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isHealthy: jest.fn().mockReturnValue(true),
    isAccountLocked: jest.fn().mockResolvedValue(false),
    resetLoginAttempts: jest.fn(),
    storeUserSession: jest.fn(),
    incrementLoginAttempts: jest.fn(),
    lockAccount: jest.fn(),
    storeRefreshToken: jest.fn(),
    getRefreshTokenUserId: jest.fn(),
    deleteRefreshToken: jest.fn(),
    blacklistToken: jest.fn(),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    deleteUserSession: jest.fn(),
  }
}));

describe('Security Tests', () => {
  let app: App;
  let server: any;

  beforeAll(async () => {
    app = new App();
    await app.initialize();
    server = app.app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Bypass Attempts', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(server)
        .get('/auth/profile')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject requests with malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'Bearer',
        'Bearer ',
        'Bearer invalid.token.format',
        'NotBearer validtoken',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      ];

      for (const token of malformedTokens) {
        const response = await request(server)
          .get('/auth/profile')
          .set('Authorization', token)
          .expect(401);

        expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      }
    });

    it('should reject expired tokens', async () => {
      // Create a token with very short expiry
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        roles: [{ id: '1', name: 'student', permissions: [], hierarchy: 1 }],
        organizations: [{ organizationId: 'org1', roles: ['student'], joinedAt: new Date() }],
        profile: { firstName: 'Test', lastName: 'User', timezone: 'UTC', language: 'en', preferences: {} },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock short expiry
      const originalParseExpiry = tokenService['parseExpiry'];
      tokenService['parseExpiry'] = jest.fn().mockReturnValue(1); // 1 second

      const tokens = await tokenService.generateTokens(mockUser);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');

      // Restore original method
      tokenService['parseExpiry'] = originalParseExpiry;
    });

    it('should reject blacklisted tokens', async () => {
      (redisService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        roles: [{ id: '1', name: 'student', permissions: [], hierarchy: 1 }],
        organizations: [{ organizationId: 'org1', roles: ['student'], joinedAt: new Date() }],
        profile: { firstName: 'Test', lastName: 'User', timezone: 'UTC', language: 'en', preferences: {} },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const tokens = await tokenService.generateTokens(mockUser);

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Authorization Bypass Attempts', () => {
    let validTokens: any;

    beforeEach(async () => {
      // Get valid tokens for testing
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      validTokens = loginResponse.body.tokens;
    });

    it('should reject access to admin endpoints for non-admin users', async () => {
      const response = await request(server)
        .get('/authorization/policies')
        .set('Authorization', `Bearer ${validTokens.accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should reject role escalation attempts', async () => {
      const response = await request(server)
        .post('/authorization/policies')
        .set('Authorization', `Bearer ${validTokens.accessToken}`)
        .send({
          name: 'Malicious Policy',
          resource: 'admin',
          action: '*',
          effect: 'allow',
          priority: 1000
        })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should prevent accessing other users data without proper permissions', async () => {
      const response = await request(server)
        .get('/authorization/permissions/other-user-id')
        .set('Authorization', `Bearer ${validTokens.accessToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Input Validation Security', () => {
    it('should reject SQL injection attempts in login', async () => {
      const sqlInjectionAttempts = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'/**/OR/**/1=1--",
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const response = await request(server)
          .post('/auth/login')
          .send({
            email: maliciousInput,
            password: 'password'
          })
          .expect(400);

        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject XSS attempts in input fields', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
      ];

      for (const maliciousInput of xssAttempts) {
        const response = await request(server)
          .post('/auth/login')
          .send({
            email: maliciousInput,
            password: 'password'
          })
          .expect(400);

        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject oversized payloads', async () => {
      const largePayload = 'a'.repeat(11 * 1024 * 1024); // 11MB payload

      const response = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: largePayload
        })
        .expect(413);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on login attempts', async () => {
      // Make multiple rapid requests
      const requests = Array(101).fill(null).map(() => 
        request(server)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Account Lockout Security', () => {
    it('should lock account after multiple failed attempts', async () => {
      (redisService.incrementLoginAttempts as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5);

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(server)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
          .expect(401);
      }

      expect(redisService.lockAccount).toHaveBeenCalledWith('test@example.com');
    });

    it('should reject login when account is locked', async () => {
      (redisService.isAccountLocked as jest.Mock).mockResolvedValue(true);

      const response = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(423);

      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('Token Security', () => {
    it('should not accept tokens with modified payload', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        roles: [{ id: '1', name: 'student', permissions: [], hierarchy: 1 }],
        organizations: [{ organizationId: 'org1', roles: ['student'], joinedAt: new Date() }],
        profile: { firstName: 'Test', lastName: 'User', timezone: 'UTC', language: 'en', preferences: {} },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const tokens = await tokenService.generateTokens(mockUser);
      
      // Attempt to modify the token payload (this will break the signature)
      const tokenParts = tokens.accessToken.split('.');
      const modifiedPayload = Buffer.from(JSON.stringify({
        sub: '1',
        email: 'admin@example.com',
        roles: ['admin'],
        organizations: ['org1'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'modified'
      })).toString('base64url');
      
      const modifiedToken = `${tokenParts[0]}.${modifiedPayload}.${tokenParts[2]}`;

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${modifiedToken}`)
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should not accept tokens with wrong signature', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        roles: [{ id: '1', name: 'student', permissions: [], hierarchy: 1 }],
        organizations: [{ organizationId: 'org1', roles: ['student'], joinedAt: new Date() }],
        profile: { firstName: 'Test', lastName: 'User', timezone: 'UTC', language: 'en', preferences: {} },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const tokens = await tokenService.generateTokens(mockUser);
      
      // Replace signature with wrong signature
      const tokenParts = tokens.accessToken.split('.');
      const wrongSignature = 'wrong-signature';
      const modifiedToken = `${tokenParts[0]}.${tokenParts[1]}.${wrongSignature}`;

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${modifiedToken}`)
        .expect(401);

      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('CORS Security', () => {
    it('should reject requests from unauthorized origins', async () => {
      const response = await request(server)
        .get('/auth/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(200); // Health endpoint should still work

      // But CORS headers should not allow the malicious origin
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });
  });

  describe('Header Security', () => {
    it('should include security headers', async () => {
      const response = await request(server)
        .get('/auth/health')
        .expect(200);

      // Check for security headers set by helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should include HSTS header', async () => {
      const response = await request(server)
        .get('/auth/health')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Session Security', () => {
    it('should invalidate session on logout', async () => {
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const tokens = loginResponse.body.tokens;

      // Logout
      await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      // Verify session is deleted
      expect(redisService.deleteUserSession).toHaveBeenCalledWith('1');
    });

    it('should prevent session fixation attacks', async () => {
      // Login twice and verify different session data
      const login1 = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const login2 = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Tokens should be different
      expect(login1.body.tokens.accessToken).not.toBe(login2.body.tokens.accessToken);
      expect(login1.body.tokens.refreshToken).not.toBe(login2.body.tokens.refreshToken);
    });
  });
});