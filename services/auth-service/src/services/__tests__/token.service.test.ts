import { tokenService } from '../token.service';
import { redisService } from '../redis.service';
import { User } from '../../types/auth.types';

// Mock Redis service for testing
jest.mock('../redis.service', () => ({
  redisService: {
    storeRefreshToken: jest.fn(),
    getRefreshTokenUserId: jest.fn(),
    deleteRefreshToken: jest.fn(),
    blacklistToken: jest.fn(),
    isTokenBlacklisted: jest.fn(),
  }
}));

describe('TokenService', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    roles: [
      {
        id: 'role-1',
        name: 'student',
        permissions: [],
        hierarchy: 1
      }
    ],
    organizations: [
      {
        organizationId: 'org-1',
        roles: ['student'],
        joinedAt: new Date()
      }
    ],
    profile: {
      firstName: 'Test',
      lastName: 'User',
      timezone: 'UTC',
      language: 'en',
      preferences: {}
    },
    mfaEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', async () => {
      (redisService.storeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const tokens = await tokenService.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.tokenType).toBe('Bearer');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(typeof tokens.expiresIn).toBe('number');
    });

    it('should store refresh token in Redis', async () => {
      (redisService.storeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      await tokenService.generateTokens(mockUser);

      expect(redisService.storeRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        mockUser.id,
        expect.any(Number)
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should validate a valid access token', async () => {
      (redisService.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);

      const tokens = await tokenService.generateTokens(mockUser);
      const validation = await tokenService.validateAccessToken(tokens.accessToken);

      expect(validation.valid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.sub).toBe(mockUser.id);
      expect(validation.payload?.email).toBe(mockUser.email);
    });

    it('should reject blacklisted tokens', async () => {
      (redisService.isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

      const tokens = await tokenService.generateTokens(mockUser);
      const validation = await tokenService.validateAccessToken(tokens.accessToken);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Token has been revoked');
    });

    it('should reject invalid tokens', async () => {
      const validation = await tokenService.validateAccessToken('invalid-token');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate a valid refresh token', async () => {
      (redisService.storeRefreshToken as jest.Mock).mockResolvedValue(undefined);
      (redisService.getRefreshTokenUserId as jest.Mock).mockResolvedValue(mockUser.id);

      const tokens = await tokenService.generateTokens(mockUser);
      const validation = await tokenService.validateRefreshToken(tokens.refreshToken);

      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(mockUser.id);
      expect(validation.tokenId).toBeDefined();
    });

    it('should reject tokens not found in Redis', async () => {
      (redisService.getRefreshTokenUserId as jest.Mock).mockResolvedValue(null);

      const tokens = await tokenService.generateTokens(mockUser);
      const validation = await tokenService.validateRefreshToken(tokens.refreshToken);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Refresh token not found or invalid');
    });

    it('should reject invalid refresh tokens', async () => {
      const validation = await tokenService.validateRefreshToken('invalid-refresh-token');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new tokens when refresh token is valid', async () => {
      (redisService.storeRefreshToken as jest.Mock).mockResolvedValue(undefined);
      (redisService.getRefreshTokenUserId as jest.Mock).mockResolvedValue(mockUser.id);
      (redisService.deleteRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const originalTokens = await tokenService.generateTokens(mockUser);
      const newTokens = await tokenService.refreshAccessToken(originalTokens.refreshToken, mockUser);

      expect(newTokens).toBeDefined();
      expect(newTokens?.accessToken).toBeDefined();
      expect(newTokens?.refreshToken).toBeDefined();
      expect(newTokens?.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens?.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('should return null for invalid refresh token', async () => {
      (redisService.getRefreshTokenUserId as jest.Mock).mockResolvedValue(null);

      const newTokens = await tokenService.refreshAccessToken('invalid-token', mockUser);

      expect(newTokens).toBeNull();
    });
  });

  describe('revokeAccessToken', () => {
    it('should blacklist a valid access token', async () => {
      (redisService.blacklistToken as jest.Mock).mockResolvedValue(undefined);

      const tokens = await tokenService.generateTokens(mockUser);
      await tokenService.revokeAccessToken(tokens.accessToken);

      expect(redisService.blacklistToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should throw error for invalid token format', async () => {
      await expect(tokenService.revokeAccessToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'test-token';
      const header = `Bearer ${token}`;
      
      const extracted = tokenService.extractTokenFromHeader(header);
      
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(tokenService.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(tokenService.extractTokenFromHeader('Bearer')).toBeNull();
      expect(tokenService.extractTokenFromHeader('')).toBeNull();
      expect(tokenService.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', async () => {
      const tokens = await tokenService.generateTokens(mockUser);
      const isExpired = tokenService.isTokenExpired(tokens.accessToken);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const isExpired = tokenService.isTokenExpired('invalid-token');
      
      expect(isExpired).toBe(true);
    });
  });
});