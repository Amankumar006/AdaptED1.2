import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { roleService } from '../services/role.service';
import { 
  CreateRoleRequest, 
  UpdateRoleRequest,
  BulkRoleAssignmentRequest
} from '../types/user.types';
import { logger } from '../utils/logger';

export class RoleController {
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
        return;
      }

      const roleData: CreateRoleRequest = req.body;
      const role = await roleService.createRole(roleData);

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });
    } catch (error) {
      logger.error('Error creating role:', error as Error);
      
      if ((error as Error).message.includes('already exists')) {
        res.status(409).json({
          error: {
            type: 'RESOURCE_CONFLICT',
            message: (error as Error).message,
            code: 'ROLE_ALREADY_EXISTS'
          }
        });
      } else if ((error as Error).message.includes('not found')) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: (error as Error).message,
            code: 'RESOURCE_NOT_FOUND'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create role',
            code: 'ROLE_CREATION_FAILED'
          }
        });
      }
    }
  }

  async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await roleService.getRoleById(id);

      if (!role) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Role not found',
            code: 'ROLE_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Error getting role by ID:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve role',
          code: 'ROLE_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getRoleByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { organizationId } = req.query;
      
      const role = await roleService.getRoleByName(name, organizationId as string);

      if (!role) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Role not found',
            code: 'ROLE_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      logger.error('Error getting role by name:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve role',
          code: 'ROLE_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getAllRoles(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.query;
      const roles = await roleService.getAllRoles(organizationId as string);

      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('Error getting all roles:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve roles',
          code: 'ROLES_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
        return;
      }

      const { id } = req.params;
      const updateData: UpdateRoleRequest = req.body;
      
      const role = await roleService.updateRole(id, updateData);

      if (!role) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Role not found',
            code: 'ROLE_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: role,
        message: 'Role updated successfully'
      });
    } catch (error) {
      logger.error('Error updating role:', error as Error);
      
      if ((error as Error).message.includes('not found')) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: (error as Error).message,
            code: 'RESOURCE_NOT_FOUND'
          }
        });
      } else if ((error as Error).message.includes('cannot be its own parent')) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: (error as Error).message,
            code: 'INVALID_PARENT_ROLE'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update role',
            code: 'ROLE_UPDATE_FAILED'
          }
        });
      }
    }
  }

  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await roleService.deleteRole(id);

      if (!result) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Role not found',
            code: 'ROLE_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting role:', error as Error);
      
      if ((error as Error).message.includes('Cannot delete')) {
        res.status(409).json({
          error: {
            type: 'RESOURCE_CONFLICT',
            message: (error as Error).message,
            code: 'ROLE_DELETION_CONFLICT'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete role',
            code: 'ROLE_DELETION_FAILED'
          }
        });
      }
    }
  }

  async getRoleHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.query;
      const hierarchy = await roleService.getRoleHierarchy(organizationId as string);

      res.status(200).json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      logger.error('Error getting role hierarchy:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve role hierarchy',
          code: 'ROLE_HIERARCHY_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async bulkAssignRoles(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
        return;
      }

      const request: BulkRoleAssignmentRequest = req.body;
      await roleService.bulkAssignRoles(request);

      res.status(200).json({
        success: true,
        message: 'Bulk role assignment completed successfully'
      });
    } catch (error) {
      logger.error('Error in bulk role assignment:', error as Error);
      
      if ((error as Error).message.includes('not found')) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: (error as Error).message,
            code: 'RESOURCE_NOT_FOUND'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to perform bulk role assignment',
            code: 'BULK_ROLE_ASSIGNMENT_FAILED'
          }
        });
      }
    }
  }

  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { organizationId } = req.query;

      const roles = await roleService.getUserRoles(userId, organizationId as string);

      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('Error getting user roles:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user roles',
          code: 'USER_ROLES_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async checkPermission(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { resource, action, organizationId } = req.query;

      if (!resource || !action) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Resource and action are required',
            code: 'MISSING_PARAMETERS'
          }
        });
        return;
      }

      const hasPermission = await roleService.hasPermission(
        userId, 
        resource as string, 
        action as string, 
        organizationId as string
      );

      res.status(200).json({
        success: true,
        data: {
          hasPermission,
          userId,
          resource,
          action,
          organizationId
        }
      });
    } catch (error) {
      logger.error('Error checking permission:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check permission',
          code: 'PERMISSION_CHECK_FAILED'
        }
      });
    }
  }

  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { organizationId } = req.query;

      const permissions = await roleService.getUserPermissions(userId, organizationId as string);

      res.status(200).json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Error getting user permissions:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user permissions',
          code: 'USER_PERMISSIONS_RETRIEVAL_FAILED'
        }
      });
    }
  }
}

export const roleController = new RoleController();