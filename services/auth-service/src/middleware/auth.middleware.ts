import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token.service';
import { authorizationService } from '../services/authorization.service';
import { logger } from '../utils/logger';
import { TokenPayload, AuthContext, User } from '../types/auth.types';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      authContext?: AuthContext;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = tokenService.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Access token is required',
          code: 'MISSING_TOKEN'
        }
      });
      return;
    }

    const validation = await tokenService.validateAccessToken(token);

    if (!validation.valid) {
      res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: validation.error || 'Invalid token',
          code: 'INVALID_TOKEN'
        }
      });
      return;
    }

    // Attach user payload to request
    req.user = validation.payload;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR'
      }
    });
  }
};

/**
 * Middleware to check if user has required roles
 */
export const requireRoles = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user belongs to specific organization
 */
export const requireOrganization = (organizationId?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    const targetOrgId = organizationId || req.params.organizationId || req.body.organizationId;
    
    if (!targetOrgId) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Organization ID is required',
          code: 'MISSING_ORGANIZATION_ID'
        }
      });
      return;
    }

    const userOrganizations = req.user.organizations || [];
    const hasAccess = userOrganizations.includes(targetOrgId);

    if (!hasAccess) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Access denied for this organization',
          code: 'ORGANIZATION_ACCESS_DENIED'
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = tokenService.extractTokenFromHeader(authHeader);

    if (token) {
      const validation = await tokenService.validateAccessToken(token);
      if (validation.valid) {
        req.user = validation.payload;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to check if user can access their own resources
 */
export const requireSelfOrRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    const targetUserId = req.params.userId || req.body.userId;
    const currentUserId = req.user.sub;
    const userRoles = req.user.roles || [];

    // Allow if accessing own resources
    if (targetUserId === currentUserId) {
      next();
      return;
    }

    // Allow if user has required role
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    if (hasRequiredRole) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        type: 'AUTHORIZATION_ERROR',
        message: 'Access denied. Can only access own resources or need elevated permissions',
        code: 'RESOURCE_ACCESS_DENIED'
      }
    });
  };
};

/**
 * Middleware to check resource-level permissions
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    try {
      // Get full user object
      const user = await getUserFromToken(req.user);
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

      // Extract context information
      const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId as string;
      const resourceId = req.params.id || req.params.userId || req.body.id;

      // Check permission
      const hasAccess = await authorizationService.hasPermission({
        user,
        resource,
        action,
        resourceId,
        organizationId,
        attributes: {
          currentHour: new Date().getHours(),
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          ...req.body,
          ...req.query
        }
      });

      if (!hasAccess) {
        res.status(403).json({
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: `Access denied. Required permission: ${action} on ${resource}`,
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
        return;
      }

      // Create and attach auth context
      req.authContext = authorizationService.createAuthContext(user, organizationId);
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Authorization service error',
          code: 'AUTHORIZATION_SERVICE_ERROR'
        }
      });
    }
  };
};

/**
 * Middleware for hierarchical role checking
 */
export const requireMinimumRole = (minimumHierarchy: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    try {
      const user = await getUserFromToken(req.user);
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

      const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId as string;
      const userRoles = await authorizationService.getUserRoles(user.id, organizationId);
      
      const hasMinimumRole = userRoles.some(role => role.hierarchy >= minimumHierarchy);

      if (!hasMinimumRole) {
        res.status(403).json({
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: `Access denied. Minimum role hierarchy required: ${minimumHierarchy}`,
            code: 'INSUFFICIENT_ROLE_HIERARCHY'
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role hierarchy check error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Authorization service error',
          code: 'AUTHORIZATION_SERVICE_ERROR'
        }
      });
    }
  };
};

/**
 * Middleware for context-aware access control
 */
export const requireContextualAccess = (
  resource: string,
  action: string,
  contextExtractor?: (req: Request) => Record<string, any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    try {
      const user = await getUserFromToken(req.user);
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

      // Extract context
      const baseContext = {
        currentTime: new Date(),
        currentHour: new Date().getHours(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        method: req.method,
        path: req.path
      };

      const additionalContext = contextExtractor ? contextExtractor(req) : {};
      const fullContext = { ...baseContext, ...additionalContext };

      // Check contextual permission
      const hasAccess = await authorizationService.hasPermission({
        user,
        resource,
        action,
        resourceId: req.params.id,
        organizationId: req.params.organizationId || req.body.organizationId,
        attributes: fullContext
      });

      if (!hasAccess) {
        res.status(403).json({
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: `Access denied based on current context`,
            code: 'CONTEXTUAL_ACCESS_DENIED'
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Contextual access check error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Authorization service error',
          code: 'AUTHORIZATION_SERVICE_ERROR'
        }
      });
    }
  };
};

/**
 * Helper function to get full user object from token payload
 */
async function getUserFromToken(tokenPayload: TokenPayload): Promise<User | null> {
  // TODO: Implement actual database lookup
  // For now, return mock user data
  if (tokenPayload.sub === '1') {
    return {
      id: '1',
      email: 'test@example.com',
      roles: [
        {
          id: '1',
          name: 'student',
          permissions: [
            {
              id: '1',
              name: 'read_own_profile',
              resource: 'users',
              action: 'read'
            },
            {
              id: '2',
              name: 'view_content',
              resource: 'content',
              action: 'view'
            }
          ],
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
 * Middleware to validate API key for service-to-service communication
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    res.status(401).json({
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Valid API key is required',
        code: 'INVALID_API_KEY'
      }
    });
    return;
  }

  next();
};