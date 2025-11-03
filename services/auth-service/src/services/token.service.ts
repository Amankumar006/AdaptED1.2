import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import { 
  AuthToken, 
  TokenPayload, 
  RefreshTokenPayload, 
  TokenValidation,
  User 
} from '../types/auth.types';

class TokenService {
  private readonly ACCESS_TOKEN_TYPE = 'access';
  private readonly REFRESH_TOKEN_TYPE = 'refresh';

  /**
   * Generate access and refresh tokens for a user
   */
  async generateTokens(user: User): Promise<AuthToken> {
    const tokenId = uuidv4();
    const refreshTokenId = uuidv4();

    // Create access token payload
    const accessTokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(role => role.name),
      organizations: user.organizations.map(org => org.organizationId),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(config.jwt.accessTokenExpiry),
      jti: tokenId
    };

    // Create refresh token payload
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshTokenId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiry(config.jwt.refreshTokenExpiry)
    };

    // Sign tokens
    const accessToken = jwt.sign(accessTokenPayload, config.jwt.accessTokenSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(refreshTokenPayload, config.jwt.refreshTokenSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithm: 'HS256'
    });

    // Store refresh token in Redis
    const refreshTokenExpiry = this.parseExpiry(config.jwt.refreshTokenExpiry);
    await redisService.storeRefreshToken(refreshTokenId, user.id, refreshTokenExpiry);

    logger.info(`Generated tokens for user ${user.id}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(config.jwt.accessTokenExpiry),
      tokenType: 'Bearer'
    };
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenValidation> {
    try {
      const payload = jwt.verify(token, config.jwt.accessTokenSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256']
      }) as TokenPayload;

      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        return {
          valid: false,
          error: 'Token has been revoked'
        };
      }

      return {
        valid: true,
        payload
      };
    } catch (error) {
      logger.warn('Access token validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      };
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(token: string): Promise<{ valid: boolean; userId?: string; tokenId?: string; error?: string }> {
    try {
      const payload = jwt.verify(token, config.jwt.refreshTokenSecret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256']
      }) as RefreshTokenPayload;

      // Check if refresh token exists in Redis
      const storedUserId = await redisService.getRefreshTokenUserId(payload.jti);
      if (!storedUserId || storedUserId !== payload.sub) {
        return {
          valid: false,
          error: 'Refresh token not found or invalid'
        };
      }

      return {
        valid: true,
        userId: payload.sub,
        tokenId: payload.jti
      };
    } catch (error) {
      logger.warn('Refresh token validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid refresh token'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, user: User): Promise<AuthToken | null> {
    const validation = await this.validateRefreshToken(refreshToken);
    
    if (!validation.valid || validation.userId !== user.id) {
      logger.warn(`Refresh token validation failed for user ${user.id}`);
      return null;
    }

    // Generate new tokens
    const newTokens = await this.generateTokens(user);

    // Invalidate old refresh token
    if (validation.tokenId) {
      await redisService.deleteRefreshToken(validation.tokenId);
    }

    logger.info(`Refreshed tokens for user ${user.id}`);
    return newTokens;
  }

  /**
   * Revoke access token (add to blacklist)
   */
  async revokeAccessToken(token: string): Promise<void> {
    try {
      const payload = jwt.decode(token) as TokenPayload;
      if (!payload || !payload.jti || !payload.exp) {
        throw new Error('Invalid token format');
      }

      // Calculate remaining TTL
      const now = Math.floor(Date.now() / 1000);
      const ttl = payload.exp - now;

      if (ttl > 0) {
        await redisService.blacklistToken(payload.jti, ttl);
        logger.info(`Revoked access token ${payload.jti}`);
      }
    } catch (error) {
      logger.error('Failed to revoke access token:', error);
      throw error;
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const payload = jwt.decode(token) as RefreshTokenPayload;
      if (!payload || !payload.jti) {
        throw new Error('Invalid refresh token format');
      }

      await redisService.deleteRefreshToken(payload.jti);
      logger.info(`Revoked refresh token ${payload.jti}`);
    } catch (error) {
      logger.error('Failed to revoke refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // This would require maintaining a user-to-tokens mapping in Redis
      // For now, we'll implement a simpler approach by invalidating user session
      await redisService.deleteUserSession(userId);
      logger.info(`Revoked all tokens for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to revoke all tokens for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return parseInt(expiry, 10);
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token: string): Date | null {
    try {
      const payload = jwt.decode(token) as any;
      if (payload && payload.exp) {
        return new Date(payload.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }
}

export const tokenService = new TokenService();