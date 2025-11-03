import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

interface TokenPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  organizations: string[];
  iat: number;
  exp: number;
  jti: string; // token id
  iss?: string; // issuer
  aud?: string; // audience
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    organizations: string[];
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

    jwt.verify(token, config.jwt.accessTokenSecret, (err, decoded) => {
      if (err) {
        logger.warn('Token verification failed:', { error: err.message });
        
        if (err.name === 'TokenExpiredError') {
          res.status(401).json({
            error: {
              type: 'AUTHENTICATION_ERROR',
              message: 'Access token has expired',
              code: 'TOKEN_EXPIRED'
            }
          });
        } else if (err.name === 'JsonWebTokenError') {
          res.status(401).json({
            error: {
              type: 'AUTHENTICATION_ERROR',
              message: 'Invalid access token',
              code: 'INVALID_TOKEN'
            }
          });
        } else {
          res.status(401).json({
            error: {
              type: 'AUTHENTICATION_ERROR',
              message: 'Token verification failed',
              code: 'TOKEN_VERIFICATION_FAILED'
            }
          });
        }
        return;
      }

      const payload = decoded as TokenPayload;
      
      // Validate token payload
      if (!payload.sub || !payload.email) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid token payload',
            code: 'INVALID_TOKEN_PAYLOAD'
          }
        });
        return;
      }

      // Validate issuer and audience if configured
      if (config.jwt.issuer && payload.iss !== config.jwt.issuer) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid token issuer',
            code: 'INVALID_TOKEN_ISSUER'
          }
        });
        return;
      }

      if (config.jwt.audience && payload.aud !== config.jwt.audience) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid token audience',
            code: 'INVALID_TOKEN_AUDIENCE'
          }
        });
        return;
      }

      // Attach user info to request
      req.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        organizations: payload.organizations || []
      };

      next();
    });
  } catch (error) {
    logger.error('Authentication middleware error:', error as Error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication processing failed',
        code: 'AUTH_PROCESSING_FAILED'
      }
    });
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    jwt.verify(token, config.jwt.accessTokenSecret, (err, decoded) => {
      if (err) {
        // Invalid token, but continue without authentication
        logger.warn('Optional auth token verification failed:', { error: err.message });
        next();
        return;
      }

      const payload = decoded as TokenPayload;
      
      if (payload.sub && payload.email) {
        req.user = {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles || [],
          organizations: payload.organizations || []
        };
      }

      next();
    });
  } catch (error) {
    logger.error('Optional authentication middleware error:', error as Error);
    // Continue without authentication on error
    next();
  }
};

export const requireRole = (requiredRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          }
        });
        return;
      }

      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const userRoles = req.user.roles || [];

      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        res.status(403).json({
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role authorization middleware error:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Authorization processing failed',
          code: 'AUTH_PROCESSING_FAILED'
        }
      });
    }
  };
};

export const requireOrganization = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
      return;
    }

    const organizationId = req.params.organizationId || req.body.organizationId || req.query.organizationId;

    if (!organizationId) {
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

    if (!userOrganizations.includes(organizationId as string)) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Access denied to this organization',
          code: 'ORGANIZATION_ACCESS_DENIED'
        }
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Organization authorization middleware error:', error as Error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Authorization processing failed',
        code: 'AUTH_PROCESSING_FAILED'
      }
    });
  }
};

export const requireSelfOrRole = (requiredRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'AUTHENTICATION_REQUIRED'
          }
        });
        return;
      }

      const targetUserId = req.params.id || req.params.userId;
      const currentUserId = req.user.id;

      // Allow if user is accessing their own data
      if (targetUserId === currentUserId) {
        next();
        return;
      }

      // Otherwise, check for required roles
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const userRoles = req.user.roles || [];

      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        res.status(403).json({
          error: {
            type: 'AUTHORIZATION_ERROR',
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Self or role authorization middleware error:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Authorization processing failed',
          code: 'AUTH_PROCESSING_FAILED'
        }
      });
    }
  };
};

export const requireSystemRole = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
      return;
    }

    const systemRoles = ['super_admin', 'system_admin'];
    const userRoles = req.user.roles || [];

    const hasSystemRole = systemRoles.some(role => userRoles.includes(role));

    if (!hasSystemRole) {
      res.status(403).json({
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'System administrator access required',
          code: 'SYSTEM_ACCESS_REQUIRED'
        }
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('System role authorization middleware error:', error as Error);
    res.status(500).json({
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Authorization processing failed',
        code: 'AUTH_PROCESSING_FAILED'
      }
    });
  }
};

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        organizations: string[];
      };
    }
  }
}