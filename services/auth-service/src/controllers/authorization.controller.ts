import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { authorizationService } from "../services/authorization.service";
import { logger } from "../utils/logger";

export class AuthorizationController {
  /**
   * Get user permissions
   */
  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "Authentication required",
            code: "NOT_AUTHENTICATED",
          },
        });
        return;
      }

      const userId = req.params.userId || req.user.sub;
      const organizationId = req.query.organizationId as string;

      // Check if user can access permissions for the requested user
      if (userId !== req.user.sub) {
        const userRoles = req.user.roles || [];
        const hasAdminRole = userRoles.some((role) =>
          ["admin", "super_admin"].includes(role)
        );

        if (!hasAdminRole) {
          res.status(403).json({
            error: {
              type: "AUTHORIZATION_ERROR",
              message: "Can only access own permissions",
              code: "INSUFFICIENT_PERMISSIONS",
            },
          });
          return;
        }
      }

      const permissions = await authorizationService.getUserPermissions(
        userId,
        organizationId
      );

      res.status(200).json({
        userId,
        organizationId,
        permissions: permissions.map((p) => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          conditions: p.conditions,
        })),
      });
    } catch (error) {
      logger.error("Get user permissions error:", error);
      res.status(500).json({
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: "Authorization service error",
          code: "AUTHORIZATION_SERVICE_ERROR",
        },
      });
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "Authentication required",
            code: "NOT_AUTHENTICATED",
          },
        });
        return;
      }

      const userId = req.params.userId || req.user.sub;
      const organizationId = req.query.organizationId as string;

      // Check if user can access roles for the requested user
      if (userId !== req.user.sub) {
        const userRoles = req.user.roles || [];
        const hasAdminRole = userRoles.some((role) =>
          ["admin", "super_admin"].includes(role)
        );

        if (!hasAdminRole) {
          res.status(403).json({
            error: {
              type: "AUTHORIZATION_ERROR",
              message: "Can only access own roles",
              code: "INSUFFICIENT_PERMISSIONS",
            },
          });
          return;
        }
      }

      const roles = await authorizationService.getUserRoles(
        userId,
        organizationId
      );

      res.status(200).json({
        userId,
        organizationId,
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          hierarchy: r.hierarchy,
          organizationId: r.organizationId,
          permissions: r.permissions.map((p) => ({
            id: p.id,
            name: p.name,
            resource: p.resource,
            action: p.action,
          })),
        })),
      });
    } catch (error) {
      logger.error("Get user roles error:", error);
      res.status(500).json({
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: "Authorization service error",
          code: "AUTHORIZATION_SERVICE_ERROR",
        },
      });
    }
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "Authentication required",
            code: "NOT_AUTHENTICATED",
          },
        });
        return;
      }

      const { resource, action, resourceId, organizationId } = req.body;

      // Get full user object (mock implementation)
      const user = await this.getUserFromToken(req.user.sub);
      if (!user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "User not found",
            code: "USER_NOT_FOUND",
          },
        });
        return;
      }

      const hasPermission = await authorizationService.hasPermission({
        user,
        resource,
        action,
        resourceId,
        organizationId,
        attributes: {
          currentHour: new Date().getHours(),
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      });

      res.status(200).json({
        hasPermission,
        resource,
        action,
        resourceId,
        organizationId,
      });
    } catch (error) {
      logger.error("Check permission error:", error);
      res.status(500).json({
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: "Permission check service error",
          code: "PERMISSION_CHECK_ERROR",
        },
      });
    }
  }

  /**
   * Get authorization policies
   */
  async getPolicies(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "Authentication required",
            code: "NOT_AUTHENTICATED",
          },
        });
        return;
      }

      // Only admins can view policies
      const userRoles = req.user.roles || [];
      const hasAdminRole = userRoles.some((role) =>
        ["admin", "super_admin"].includes(role)
      );

      if (!hasAdminRole) {
        res.status(403).json({
          error: {
            type: "AUTHORIZATION_ERROR",
            message: "Admin role required to view policies",
            code: "INSUFFICIENT_PERMISSIONS",
          },
        });
        return;
      }

      const policies = authorizationService.getPolicies();

      res.status(200).json({
        policies: policies.map((p) => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
          effect: p.effect,
          conditions: p.conditions,
          priority: p.priority,
        })),
      });
    } catch (error) {
      logger.error("Get policies error:", error);
      res.status(500).json({
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: "Policy service error",
          code: "POLICY_SERVICE_ERROR",
        },
      });
    }
  }

  /**
   * Add authorization policy
   */
  async addPolicy(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: errors.array(),
          },
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "Authentication required",
            code: "NOT_AUTHENTICATED",
          },
        });
        return;
      }

      // Only super admins can add policies
      const userRoles = req.user.roles || [];
      const hasSuperAdminRole = userRoles.includes("super_admin");

      if (!hasSuperAdminRole) {
        res.status(403).json({
          error: {
            type: "AUTHORIZATION_ERROR",
            message: "Super admin role required to add policies",
            code: "INSUFFICIENT_PERMISSIONS",
          },
        });
        return;
      }

      const { name, resource, action, effect, conditions, priority } = req.body;

      const policy = {
        id: Math.random().toString(36).substring(2, 15),
        name,
        resource,
        action,
        effect,
        conditions: conditions || [],
        priority: priority || 0,
      };

      authorizationService.addPolicy(policy);

      logger.info(`Policy added by user ${req.user.sub}:`, policy);

      res.status(201).json({
        message: "Policy added successfully",
        policy,
      });
    } catch (error) {
      logger.error("Add policy error:", error);
      res.status(500).json({
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: "Policy service error",
          code: "POLICY_SERVICE_ERROR",
        },
      });
    }
  }

  /**
   * Remove authorization policy
   */
  async removePolicy(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: "AUTHENTICATION_ERROR",
            message: "Authentication required",
            code: "NOT_AUTHENTICATED",
          },
        });
        return;
      }

      // Only super admins can remove policies
      const userRoles = req.user.roles || [];
      const hasSuperAdminRole = userRoles.includes("super_admin");

      if (!hasSuperAdminRole) {
        res.status(403).json({
          error: {
            type: "AUTHORIZATION_ERROR",
            message: "Super admin role required to remove policies",
            code: "INSUFFICIENT_PERMISSIONS",
          },
        });
        return;
      }

      const { policyId } = req.params;

      authorizationService.removePolicy(policyId);

      logger.info(`Policy ${policyId} removed by user ${req.user.sub}`);

      res.status(200).json({
        message: "Policy removed successfully",
      });
    } catch (error) {
      logger.error("Remove policy error:", error);
      res.status(500).json({
        error: {
          type: "INTERNAL_SERVER_ERROR",
          message: "Policy service error",
          code: "POLICY_SERVICE_ERROR",
        },
      });
    }
  }

  /**
   * Mock user lookup - TODO: Replace with actual database implementation
   */
  private async getUserFromToken(userId: string): Promise<any> {
    // Mock implementation - replace with actual database query
    if (userId === "1") {
      return {
        id: "1",
        email: "test@example.com",
        roles: [
          {
            id: "1",
            name: "student",
            permissions: [
              {
                id: "1",
                name: "read_own_profile",
                resource: "users",
                action: "read",
              },
              {
                id: "2",
                name: "view_content",
                resource: "content",
                action: "view",
              },
            ],
            hierarchy: 1,
          },
        ],
        organizations: [
          {
            organizationId: "org1",
            roles: ["student"],
            joinedAt: new Date(),
          },
        ],
        profile: {
          firstName: "Test",
          lastName: "User",
          timezone: "UTC",
          language: "en",
          preferences: {},
        },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }
}
