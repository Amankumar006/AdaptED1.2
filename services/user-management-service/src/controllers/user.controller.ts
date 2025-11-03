import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { userService } from '../services/user.service';
import { 
  CreateUserRequest, 
  UpdateUserRequest,
  UserSearchQuery
} from '../types/user.types';
import { logger } from '../utils/logger';

export class UserController {
  async createUser(req: Request, res: Response): Promise<void> {
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

      const userData: CreateUserRequest = req.body;
      const user = await userService.createUser(userData);

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      logger.error('Error creating user:', error as Error);
      
      if ((error as Error).message.includes('already exists')) {
        res.status(409).json({
          error: {
            type: 'RESOURCE_CONFLICT',
            message: (error as Error).message,
            code: 'USER_ALREADY_EXISTS'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user',
            code: 'USER_CREATION_FAILED'
          }
        });
      }
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'User ID is required',
            code: 'MISSING_USER_ID'
          }
        });
        return;
      }
      const user = await userService.getUserById(id);

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
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error getting user by ID:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user',
          code: 'USER_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getUserByEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      const user = await userService.getUserByEmail(email);

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
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error getting user by email:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user',
          code: 'USER_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
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
      const updateData: UpdateUserRequest = req.body;
      
      const user = await userService.updateUser(id, updateData);

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
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
          code: 'USER_UPDATE_FAILED'
        }
      });
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await userService.deleteUser(id);

      if (!result) {
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
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', error as Error);
      
      if ((error as Error).message.includes('Cannot delete')) {
        res.status(409).json({
          error: {
            type: 'RESOURCE_CONFLICT',
            message: (error as Error).message,
            code: 'USER_DELETION_CONFLICT'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete user',
            code: 'USER_DELETION_FAILED'
          }
        });
      }
    }
  }

  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const query: UserSearchQuery = {
        query: req.query.q as string,
        organizationId: req.query.organizationId as string,
        roles: req.query.roles ? (req.query.roles as string).split(',') : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        emailVerified: req.query.emailVerified ? req.query.emailVerified === 'true' : undefined,
        createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
        createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
        lastLoginAfter: req.query.lastLoginAfter ? new Date(req.query.lastLoginAfter as string) : undefined,
        lastLoginBefore: req.query.lastLoginBefore ? new Date(req.query.lastLoginBefore as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await userService.searchUsers(query);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error searching users:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search users',
          code: 'USER_SEARCH_FAILED'
        }
      });
    }
  }

  async assignRoles(req: Request, res: Response): Promise<void> {
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
      const { roleIds, organizationId } = req.body;

      await userService.assignRoles(id, roleIds, organizationId);

      res.status(200).json({
        success: true,
        message: 'Roles assigned successfully'
      });
    } catch (error) {
      logger.error('Error assigning roles:', error as Error);
      
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
            message: 'Failed to assign roles',
            code: 'ROLE_ASSIGNMENT_FAILED'
          }
        });
      }
    }
  }

  async removeRoles(req: Request, res: Response): Promise<void> {
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
      const { roleIds, organizationId } = req.body;

      await userService.removeRoles(id, roleIds, organizationId);

      res.status(200).json({
        success: true,
        message: 'Roles removed successfully'
      });
    } catch (error) {
      logger.error('Error removing roles:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove roles',
          code: 'ROLE_REMOVAL_FAILED'
        }
      });
    }
  }

  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.query;

      const roles = await userService.getUserRoles(id, organizationId as string);

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

  async addToOrganization(req: Request, res: Response): Promise<void> {
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
      const { organizationId, roles } = req.body;

      await userService.addUserToOrganization(id, organizationId, roles || []);

      res.status(200).json({
        success: true,
        message: 'User added to organization successfully'
      });
    } catch (error) {
      logger.error('Error adding user to organization:', error as Error);
      
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
            message: 'Failed to add user to organization',
            code: 'ORGANIZATION_MEMBERSHIP_FAILED'
          }
        });
      }
    }
  }

  async removeFromOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { id, organizationId } = req.params;

      await userService.removeUserFromOrganization(id, organizationId);

      res.status(200).json({
        success: true,
        message: 'User removed from organization successfully'
      });
    } catch (error) {
      logger.error('Error removing user from organization:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove user from organization',
          code: 'ORGANIZATION_REMOVAL_FAILED'
        }
      });
    }
  }

  async updateOrganizationRoles(req: Request, res: Response): Promise<void> {
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

      const { id, organizationId } = req.params;
      const { roles } = req.body;

      await userService.updateUserOrganizationRoles(id, organizationId, roles);

      res.status(200).json({
        success: true,
        message: 'User organization roles updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user organization roles:', error as Error);
      
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
            message: 'Failed to update user organization roles',
            code: 'ORGANIZATION_ROLES_UPDATE_FAILED'
          }
        });
      }
    }
  }
}

export const userController = new UserController();