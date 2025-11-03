import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { tokenService } from '../services/token.service';
import { redisService } from '../services/redis.service';
import { mfaService } from '../services/mfa.service';
import { PasswordUtils } from '../utils/password.utils';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { 
  LoginCredentials, 
  User, 
  AuthToken,
  TokenValidation 
} from '../types/auth.types';

export class AuthController {
  /**
   * User login with email and password
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      const { email, password, mfaCode }: LoginCredentials = req.body;
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

      // Check if account is locked
      const isLocked = await redisService.isAccountLocked(email);
      if (isLocked) {
        res.status(423).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Account is temporarily locked due to too many failed attempts',
            code: 'ACCOUNT_LOCKED'
          }
        });
        return;
      }

      // TODO: Implement user lookup from database
      // For now, using mock user data
      const user = await this.findUserByEmail(email);
      
      if (!user) {
        await this.handleFailedLogin(email, clientIp);
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
          }
        });
        return;
      }

      // Verify password
      if (!user.passwordHash || !await PasswordUtils.verifyPassword(password, user.passwordHash)) {
        await this.handleFailedLogin(email, clientIp);
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
          }
        });
        return;
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!mfaCode) {
          res.status(200).json({
            requiresMFA: true,
            message: 'MFA code required'
          });
          return;
        }

        // Verify MFA code
        const mfaValid = await this.verifyMFACode(user, mfaCode);
        if (!mfaValid) {
          await this.handleFailedLogin(email, clientIp);
          res.status(401).json({
            error: {
              type: 'AUTHENTICATION_ERROR',
              message: 'Invalid MFA code',
              code: 'INVALID_MFA_CODE'
            }
          });
          return;
        }
      }

      // Reset login attempts on successful login
      await redisService.resetLoginAttempts(email);

      // Generate tokens
      const tokens = await tokenService.generateTokens(user);

      // Store user session
      await redisService.storeUserSession(user.id, {
        lastLogin: new Date(),
        clientIp,
        userAgent: req.headers['user-agent']
      }, tokenService['parseExpiry'](config.jwt.refreshTokenExpiry));

      logger.info(`User ${user.id} logged in successfully from ${clientIp}`);

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
          roles: user.roles.map(role => role.name),
          organizations: user.organizations.map(org => org.organizationId)
        },
        tokens
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Login service error',
          code: 'LOGIN_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Refresh token is required',
            code: 'MISSING_REFRESH_TOKEN'
          }
        });
        return;
      }

      // Validate refresh token
      const validation = await tokenService.validateRefreshToken(refreshToken);
      
      if (!validation.valid) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: validation.error || 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
          }
        });
        return;
      }

      // TODO: Get user from database
      const user = await this.findUserById(validation.userId!);
      
      if (!user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      // Generate new tokens
      const newTokens = await tokenService.refreshAccessToken(refreshToken, user);
      
      if (!newTokens) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Failed to refresh token',
            code: 'REFRESH_FAILED'
          }
        });
        return;
      }

      logger.info(`Tokens refreshed for user ${user.id}`);

      res.status(200).json({
        message: 'Token refreshed successfully',
        tokens: newTokens
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Token refresh service error',
          code: 'REFRESH_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * User logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = tokenService.extractTokenFromHeader(authHeader);
      const { refreshToken } = req.body;

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const userId = req.user.sub;

      // Revoke access token
      if (accessToken) {
        await tokenService.revokeAccessToken(accessToken);
      }

      // Revoke refresh token
      if (refreshToken) {
        await tokenService.revokeRefreshToken(refreshToken);
      }

      // Clear user session
      await redisService.deleteUserSession(userId);

      logger.info(`User ${userId} logged out successfully`);

      res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Logout service error',
          code: 'LOGOUT_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Validate token endpoint
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = tokenService.extractTokenFromHeader(authHeader);

      if (!token) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Token is required',
            code: 'MISSING_TOKEN'
          }
        });
        return;
      }

      const validation = await tokenService.validateAccessToken(token);

      if (!validation.valid) {
        res.status(401).json({
          valid: false,
          error: validation.error
        });
        return;
      }

      res.status(200).json({
        valid: true,
        payload: validation.payload
      });
    } catch (error) {
      logger.error('Token validation error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Token validation service error',
          code: 'VALIDATION_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      // TODO: Get full user profile from database
      const user = await this.findUserById(req.user.sub);
      
      if (!user) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
          roles: user.roles.map(role => role.name),
          organizations: user.organizations.map(org => org.organizationId),
          mfaEnabled: user.mfaEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Profile service error',
          code: 'PROFILE_SERVICE_ERROR'
        }
      });
    }
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(identifier: string, clientIp: string): Promise<void> {
    const attempts = await redisService.incrementLoginAttempts(identifier);
    
    logger.warn(`Failed login attempt ${attempts} for ${identifier} from ${clientIp}`);
    
    if (attempts >= config.security.maxLoginAttempts) {
      await redisService.lockAccount(identifier);
      logger.warn(`Account locked for ${identifier} after ${attempts} failed attempts`);
    }
  }

  /**
   * Mock user lookup - TODO: Replace with actual database implementation
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    // Mock implementation - replace with actual database query
    if (email === 'test@example.com') {
      return {
        id: '1',
        email: 'test@example.com',
        passwordHash: await PasswordUtils.hashPassword('password123'),
        roles: [
          {
            id: '1',
            name: 'student',
            permissions: [],
            hierarchy: 1
          }
        ],
        organizations: [
          {
            organizationId: 'org1',
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
    }
    return null;
  }

  /**
   * Mock user lookup by ID - TODO: Replace with actual database implementation
   */
  private async findUserById(userId: string): Promise<User | null> {
    // Mock implementation - replace with actual database query
    if (userId === '1') {
      return {
        id: '1',
        email: 'test@example.com',
        roles: [
          {
            id: '1',
            name: 'student',
            permissions: [],
            hierarchy: 1
          }
        ],
        organizations: [
          {
            organizationId: 'org1',
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
    }
    return null;
  }

  /**
   * Verify MFA code
   */
  private async verifyMFACode(user: User, code: string): Promise<boolean> {
    try {
      if (!user.mfaSecret) {
        return false;
      }

      // Try TOTP verification first
      const totpValid = await mfaService.verifyTOTP(user.mfaSecret, code);
      if (totpValid) {
        return true;
      }

      // Try backup code verification
      if (user.backupCodes && user.backupCodes.length > 0) {
        const backupValid = await mfaService.verifyBackupCode(user.id, code, user.backupCodes);
        if (backupValid) {
          return true;
        }
      }

      // Try recovery code verification
      const recoveryValid = await mfaService.verifyRecoveryCode(user.id, code);
      if (recoveryValid) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('MFA verification error:', error);
      return false;
    }
  }
}