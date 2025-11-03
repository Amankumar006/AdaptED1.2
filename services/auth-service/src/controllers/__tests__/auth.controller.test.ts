import request from 'supertest';
import App from '../../app';
import { redisService } from '../../services/redis.service';

// Mock Redis service for testing
jest.mock('../../services/redis.service', () => ({
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

describe('AuthController', () => {
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

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens).toHaveProperty('expiresIn');
      expect(response.body.tokens.tokenType).toBe('Bearer');
    });

    it('should reject login with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject login with missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login when account is locked', async () => {
      (redisService.isAccountLocked as jest.Mock).mockResolvedValue(true);

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(423);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('POST /auth/refresh', () => {
    let validTokens: any;

    beforeEach(async () => {
      // First login to get valid tokens
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      validTokens = loginResponse.body.tokens;
    });

    it('should refresh tokens successfully with valid refresh token', async () => {
      (redisService.getRefreshTokenUserId as jest.Mock).mockResolvedValue('1');

      const response = await request(server)
        .post('/auth/refresh')
        .send({
          refreshToken: validTokens.refreshToken
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Token refreshed successfully');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
    });

    it('should reject refresh with missing refresh token', async () => {
      const response = await request(server)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await request(server)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /auth/logout', () => {
    let validTokens: any;

    beforeEach(async () => {
      // First login to get valid tokens
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      validTokens = loginResponse.body.tokens;
    });

    it('should logout successfully with valid tokens', async () => {
      const response = await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${validTokens.accessToken}`)
        .send({
          refreshToken: validTokens.refreshToken
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should reject logout without authentication', async () => {
      const response = await request(server)
        .post('/auth/logout')
        .send({
          refreshToken: validTokens.refreshToken
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /auth/validate', () => {
    let validTokens: any;

    beforeEach(async () => {
      // First login to get valid tokens
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      validTokens = loginResponse.body.tokens;
    });

    it('should validate valid access token', async () => {
      const response = await request(server)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${validTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('payload');
    });

    it('should reject validation without token', async () => {
      const response = await request(server)
        .get('/auth/validate')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject validation with invalid token', async () => {
      const response = await request(server)
        .get('/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/profile', () => {
    let validTokens: any;

    beforeEach(async () => {
      // First login to get valid tokens
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      validTokens = loginResponse.body.tokens;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${validTokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('profile');
      expect(response.body.user).toHaveProperty('roles');
    });

    it('should reject profile request without authentication', async () => {
      const response = await request(server)
        .get('/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /auth/health', () => {
    it('should return health status', async () => {
      const response = await request(server)
        .get('/auth/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'auth-service');
    });
  });
});