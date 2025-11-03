import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { organizationService } from '../services/organization.service';
import { 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest
} from '../types/user.types';
import { logger } from '../utils/logger';

export class OrganizationController {
  async createOrganization(req: Request, res: Response): Promise<void> {
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

      const orgData: CreateOrganizationRequest = req.body;
      const organization = await organizationService.createOrganization(orgData);

      res.status(201).json({
        success: true,
        data: organization,
        message: 'Organization created successfully'
      });
    } catch (error) {
      logger.error('Error creating organization:', error as Error);
      
      if ((error as Error).message.includes('already exists')) {
        res.status(409).json({
          error: {
            type: 'RESOURCE_CONFLICT',
            message: (error as Error).message,
            code: 'ORGANIZATION_ALREADY_EXISTS'
          }
        });
      } else if ((error as Error).message.includes('not found')) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: (error as Error).message,
            code: 'PARENT_ORGANIZATION_NOT_FOUND'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create organization',
            code: 'ORGANIZATION_CREATION_FAILED'
          }
        });
      }
    }
  }

  async getOrganizationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Organization ID is required',
            code: 'MISSING_ORGANIZATION_ID'
          }
        });
        return;
      }
      
      const organization = await organizationService.getOrganizationById(id);

      if (!organization) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Organization not found',
            code: 'ORGANIZATION_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      logger.error('Error getting organization by ID:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organization',
          code: 'ORGANIZATION_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getOrganizationByName(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const organization = await organizationService.getOrganizationByName(name);

      if (!organization) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Organization not found',
            code: 'ORGANIZATION_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      logger.error('Error getting organization by name:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organization',
          code: 'ORGANIZATION_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getAllOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const { parentId } = req.query;
      const organizations = await organizationService.getAllOrganizations(parentId as string);

      res.status(200).json({
        success: true,
        data: organizations
      });
    } catch (error) {
      logger.error('Error getting all organizations:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organizations',
          code: 'ORGANIZATIONS_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getChildOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const children = await organizationService.getChildOrganizations(id);

      res.status(200).json({
        success: true,
        data: children
      });
    } catch (error) {
      logger.error('Error getting child organizations:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve child organizations',
          code: 'CHILD_ORGANIZATIONS_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async updateOrganization(req: Request, res: Response): Promise<void> {
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
      const updateData: UpdateOrganizationRequest = req.body;
      
      const organization = await organizationService.updateOrganization(id, updateData);

      if (!organization) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Organization not found',
            code: 'ORGANIZATION_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: organization,
        message: 'Organization updated successfully'
      });
    } catch (error) {
      logger.error('Error updating organization:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update organization',
          code: 'ORGANIZATION_UPDATE_FAILED'
        }
      });
    }
  }

  async deleteOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await organizationService.deleteOrganization(id);

      if (!result) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Organization not found',
            code: 'ORGANIZATION_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Organization deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting organization:', error as Error);
      
      if ((error as Error).message.includes('Cannot delete')) {
        res.status(409).json({
          error: {
            type: 'RESOURCE_CONFLICT',
            message: (error as Error).message,
            code: 'ORGANIZATION_DELETION_CONFLICT'
          }
        });
      } else {
        res.status(500).json({
          error: {
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete organization',
            code: 'ORGANIZATION_DELETION_FAILED'
          }
        });
      }
    }
  }

  async getOrganizationHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const { rootId } = req.query;
      const hierarchy = await organizationService.getOrganizationHierarchy(rootId as string);

      res.status(200).json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      logger.error('Error getting organization hierarchy:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organization hierarchy',
          code: 'ORGANIZATION_HIERARCHY_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async addMember(req: Request, res: Response): Promise<void> {
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
      const { userId, roles } = req.body;

      await organizationService.addMemberToOrganization(id, userId, roles || []);

      res.status(200).json({
        success: true,
        message: 'Member added to organization successfully'
      });
    } catch (error) {
      logger.error('Error adding member to organization:', error as Error);
      
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
            message: 'Failed to add member to organization',
            code: 'MEMBER_ADDITION_FAILED'
          }
        });
      }
    }
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;

      await organizationService.removeMemberFromOrganization(id, userId);

      res.status(200).json({
        success: true,
        message: 'Member removed from organization successfully'
      });
    } catch (error) {
      logger.error('Error removing member from organization:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove member from organization',
          code: 'MEMBER_REMOVAL_FAILED'
        }
      });
    }
  }

  async updateMemberRoles(req: Request, res: Response): Promise<void> {
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

      const { id, userId } = req.params;
      const { roles } = req.body;

      await organizationService.updateMemberRoles(id, userId, roles);

      res.status(200).json({
        success: true,
        message: 'Member roles updated successfully'
      });
    } catch (error) {
      logger.error('Error updating member roles:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update member roles',
          code: 'MEMBER_ROLES_UPDATE_FAILED'
        }
      });
    }
  }

  async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const members = await organizationService.getOrganizationMembers(id);

      res.status(200).json({
        success: true,
        data: members
      });
    } catch (error) {
      logger.error('Error getting organization members:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organization members',
          code: 'MEMBERS_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getUserOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const organizations = await organizationService.getUserOrganizations(userId);

      res.status(200).json({
        success: true,
        data: organizations
      });
    } catch (error) {
      logger.error('Error getting user organizations:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user organizations',
          code: 'USER_ORGANIZATIONS_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const settings = await organizationService.getOrganizationSettings(id);

      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error getting organization settings:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve organization settings',
          code: 'SETTINGS_RETRIEVAL_FAILED'
        }
      });
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
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
      const { settings } = req.body;

      const organization = await organizationService.updateOrganizationSettings(id, settings);

      if (!organization) {
        res.status(404).json({
          error: {
            type: 'RESOURCE_NOT_FOUND',
            message: 'Organization not found',
            code: 'ORGANIZATION_NOT_FOUND'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: organization,
        message: 'Organization settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating organization settings:', error as Error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update organization settings',
          code: 'SETTINGS_UPDATE_FAILED'
        }
      });
    }
  }
}

export const organizationController = new OrganizationController();