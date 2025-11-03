import { 
  Organization, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  OrganizationHierarchy
} from '../types/user.types';
import { organizationRepository } from '../repositories/organization.repository';
import { redisService } from './redis.service';
import { config } from '../config/config';
import { logger, structuredLogger } from '../utils/logger';

export class OrganizationService {
  async createOrganization(orgData: CreateOrganizationRequest): Promise<Organization> {
    try {
      // Validate organization name uniqueness
      const existingOrg = await organizationRepository.findByName(orgData.name);
      if (existingOrg) {
        throw new Error('Organization with this name already exists');
      }

      // Validate parent organization if provided
      if (orgData.parentOrganizationId) {
        const parentOrg = await organizationRepository.findById(orgData.parentOrganizationId);
        if (!parentOrg) {
          throw new Error('Parent organization not found');
        }
      }

      const organization = await organizationRepository.create(orgData);

      // Cache the organization
      await this.cacheOrganization(organization);

      // Invalidate hierarchy cache
      await this.invalidateHierarchyCache();

      structuredLogger.audit('organization_created', organization.id, 'organization', {
        name: orgData.name,
        type: orgData.type,
        parentOrganizationId: orgData.parentOrganizationId
      });

      return organization;
    } catch (error) {
      logger.error('Failed to create organization:', error as Error, { name: orgData.name });
      throw error;
    }
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      // Try cache first
      const cachedOrg = await redisService.cacheGet<Organization>(`organization:${id}`);
      if (cachedOrg) {
        return cachedOrg;
      }

      const organization = await organizationRepository.findById(id);
      if (organization) {
        await this.cacheOrganization(organization);
      }

      return organization;
    } catch (error) {
      logger.error('Failed to get organization by ID:', error as Error, { organizationId: id });
      throw error;
    }
  }

  async getOrganizationByName(name: string): Promise<Organization | null> {
    try {
      const cacheKey = `organization:name:${name}`;
      
      // Try cache first
      const cachedOrg = await redisService.cacheGet<Organization>(cacheKey);
      if (cachedOrg) {
        return cachedOrg;
      }

      const organization = await organizationRepository.findByName(name);
      if (organization) {
        await redisService.cacheSet(cacheKey, organization, config.cache.organizationTTL);
      }

      return organization;
    } catch (error) {
      logger.error('Failed to get organization by name:', error as Error, { name });
      throw error;
    }
  }

  async getAllOrganizations(parentId?: string): Promise<Organization[]> {
    try {
      const cacheKey = `organizations:all${parentId ? `:${parentId}` : ''}`;
      
      // Try cache first
      const cachedOrgs = await redisService.cacheGet<Organization[]>(cacheKey);
      if (cachedOrgs) {
        return cachedOrgs;
      }

      const organizations = await organizationRepository.findAll(parentId);
      
      // Cache organizations
      await redisService.cacheSet(cacheKey, organizations, config.cache.organizationTTL);

      return organizations;
    } catch (error) {
      logger.error('Failed to get all organizations:', error as Error, { parentId });
      throw error;
    }
  }

  async getChildOrganizations(parentId: string): Promise<Organization[]> {
    try {
      const cacheKey = `organization:${parentId}:children`;
      
      // Try cache first
      const cachedChildren = await redisService.cacheGet<Organization[]>(cacheKey);
      if (cachedChildren) {
        return cachedChildren;
      }

      const children = await organizationRepository.findChildren(parentId);
      
      // Cache children
      await redisService.cacheSet(cacheKey, children, config.cache.organizationTTL);

      return children;
    } catch (error) {
      logger.error('Failed to get child organizations:', error as Error, { parentId });
      throw error;
    }
  }

  async updateOrganization(id: string, updateData: UpdateOrganizationRequest): Promise<Organization | null> {
    try {
      const organization = await organizationRepository.update(id, updateData);
      
      if (organization) {
        // Update cache
        await this.cacheOrganization(organization);
        
        // Invalidate related caches
        await this.invalidateOrganizationCaches(id);

        structuredLogger.audit('organization_updated', id, 'organization', updateData);
      }

      return organization;
    } catch (error) {
      logger.error('Failed to update organization:', error as Error, { organizationId: id });
      throw error;
    }
  }

  async deleteOrganization(id: string): Promise<boolean> {
    try {
      const result = await organizationRepository.delete(id);
      
      if (result) {
        // Remove from cache
        await redisService.del(`organization:${id}`);
        await this.invalidateOrganizationCaches(id);

        structuredLogger.audit('organization_deleted', id, 'organization');
      }

      return result;
    } catch (error) {
      logger.error('Failed to delete organization:', error as Error, { organizationId: id });
      throw error;
    }
  }

  async getOrganizationHierarchy(rootId?: string): Promise<OrganizationHierarchy[]> {
    try {
      const cacheKey = `organizations:hierarchy${rootId ? `:${rootId}` : ''}`;
      
      // Try cache first
      const cachedHierarchy = await redisService.cacheGet<OrganizationHierarchy[]>(cacheKey);
      if (cachedHierarchy) {
        return cachedHierarchy;
      }

      const hierarchy = await organizationRepository.getHierarchy(rootId);
      
      // Cache hierarchy
      await redisService.cacheSet(cacheKey, hierarchy, config.cache.organizationTTL);

      return hierarchy;
    } catch (error) {
      logger.error('Failed to get organization hierarchy:', error as Error, { rootId });
      throw error;
    }
  }

  async addMemberToOrganization(organizationId: string, userId: string, roles: string[] = []): Promise<void> {
    try {
      // Validate organization exists
      const organization = await this.getOrganizationById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      await organizationRepository.addMember(organizationId, userId, roles);

      // Invalidate member cache
      await redisService.del(`organization:${organizationId}:members`);

      structuredLogger.audit('member_added_to_organization', userId, 'organization_membership', {
        organizationId,
        roles
      });
    } catch (error) {
      logger.error('Failed to add member to organization:', error as Error, { organizationId, userId });
      throw error;
    }
  }

  async removeMemberFromOrganization(organizationId: string, userId: string): Promise<void> {
    try {
      await organizationRepository.removeMember(organizationId, userId);

      // Invalidate member cache
      await redisService.del(`organization:${organizationId}:members`);

      structuredLogger.audit('member_removed_from_organization', userId, 'organization_membership', {
        organizationId
      });
    } catch (error) {
      logger.error('Failed to remove member from organization:', error as Error, { organizationId, userId });
      throw error;
    }
  }

  async updateMemberRoles(organizationId: string, userId: string, roles: string[]): Promise<void> {
    try {
      await organizationRepository.updateMemberRoles(organizationId, userId, roles);

      // Invalidate caches
      await redisService.del(`organization:${organizationId}:members`);
      await redisService.invalidatePattern(`user:${userId}:roles*`);

      structuredLogger.audit('member_roles_updated', userId, 'organization_membership', {
        organizationId,
        roles
      });
    } catch (error) {
      logger.error('Failed to update member roles:', error as Error, { organizationId, userId, roles });
      throw error;
    }
  }

  async getOrganizationMembers(organizationId: string): Promise<any[]> {
    try {
      const cacheKey = `organization:${organizationId}:members`;
      
      // Try cache first
      const cachedMembers = await redisService.cacheGet<any[]>(cacheKey);
      if (cachedMembers) {
        return cachedMembers;
      }

      const members = await organizationRepository.getMembers(organizationId);
      
      // Cache members
      await redisService.cacheSet(cacheKey, members, config.cache.organizationTTL);

      return members;
    } catch (error) {
      logger.error('Failed to get organization members:', error as Error, { organizationId });
      throw error;
    }
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const cacheKey = `user:${userId}:organizations`;
      
      // Try cache first
      const cachedOrgs = await redisService.cacheGet<Organization[]>(cacheKey);
      if (cachedOrgs) {
        return cachedOrgs;
      }

      const organizations = await organizationRepository.getUserOrganizations(userId);
      
      // Cache organizations
      await redisService.cacheSet(cacheKey, organizations, config.cache.organizationTTL);

      return organizations;
    } catch (error) {
      logger.error('Failed to get user organizations:', error as Error, { userId });
      throw error;
    }
  }

  async validateOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    try {
      const userOrganizations = await this.getUserOrganizations(userId);
      return userOrganizations.some(org => org.id === organizationId);
    } catch (error) {
      logger.error('Failed to validate organization access:', error as Error, { userId, organizationId });
      return false;
    }
  }

  async getOrganizationSettings(organizationId: string): Promise<any> {
    try {
      const organization = await this.getOrganizationById(organizationId);
      return organization?.settings || {};
    } catch (error) {
      logger.error('Failed to get organization settings:', error as Error, { organizationId });
      throw error;
    }
  }

  async updateOrganizationSettings(organizationId: string, settings: any): Promise<Organization | null> {
    try {
      return await this.updateOrganization(organizationId, { settings });
    } catch (error) {
      logger.error('Failed to update organization settings:', error as Error, { organizationId });
      throw error;
    }
  }

  private async cacheOrganization(organization: Organization): Promise<void> {
    try {
      await redisService.cacheSet(`organization:${organization.id}`, organization, config.cache.organizationTTL);
      
      // Also cache by name for quick lookups
      await redisService.cacheSet(`organization:name:${organization.name}`, organization, config.cache.organizationTTL);
    } catch (error) {
      logger.warn('Failed to cache organization:', { organizationId: organization.id, error: (error as Error).message });
    }
  }

  private async invalidateOrganizationCaches(organizationId: string): Promise<void> {
    try {
      await redisService.del(`organization:${organizationId}`);
      await redisService.invalidatePattern(`organization:name:*`);
      await redisService.invalidatePattern(`organizations:all*`);
      await redisService.invalidatePattern(`organization:*:children`);
      await redisService.del(`organization:${organizationId}:members`);
      await this.invalidateHierarchyCache();
      
      // Invalidate user organization caches
      await redisService.invalidatePattern(`user:*:organizations`);
    } catch (error) {
      logger.warn('Failed to invalidate organization caches:', { organizationId, error: (error as Error).message });
    }
  }

  private async invalidateHierarchyCache(): Promise<void> {
    try {
      await redisService.invalidatePattern(`organizations:hierarchy*`);
    } catch (error) {
      logger.warn('Failed to invalidate hierarchy cache:', { error: (error as Error).message });
    }
  }
}

export const organizationService = new OrganizationService();