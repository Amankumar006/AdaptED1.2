import { 
  Role, 
  CreateRoleRequest, 
  UpdateRoleRequest,
  RoleHierarchy,
  BulkRoleAssignmentRequest
} from '../types/user.types';
import { roleRepository } from '../repositories/role.repository';
import { redisService } from './redis.service';
import { config } from '../config/config';
import { logger, structuredLogger } from '../utils/logger';

export class RoleService {
  async createRole(roleData: CreateRoleRequest): Promise<Role> {
    try {
      // Validate role name uniqueness within organization
      const existingRole = await roleRepository.findByName(roleData.name, roleData.organizationId);
      if (existingRole) {
        throw new Error('Role with this name already exists in the organization');
      }

      // Validate parent role if provided
      if (roleData.parentRoleId) {
        const parentRole = await roleRepository.findById(roleData.parentRoleId);
        if (!parentRole) {
          throw new Error('Parent role not found');
        }
        
        // Ensure parent role is in the same organization or is a global role
        if (parentRole.organizationId && parentRole.organizationId !== roleData.organizationId) {
          throw new Error('Parent role must be in the same organization or be a global role');
        }
      }

      const role = await roleRepository.create(roleData);

      // Cache the role
      await this.cacheRole(role);

      // Invalidate role hierarchy cache
      await this.invalidateHierarchyCache(roleData.organizationId);

      structuredLogger.audit('role_created', role.id, 'role', {
        name: roleData.name,
        organizationId: roleData.organizationId
      });

      return role;
    } catch (error) {
      logger.error('Failed to create role:', error as Error, { name: roleData.name });
      throw error;
    }
  }

  async getRoleById(id: string): Promise<Role | null> {
    try {
      // Try cache first
      const cachedRole = await redisService.cacheGet<Role>(`role:${id}`);
      if (cachedRole) {
        return cachedRole;
      }

      const role = await roleRepository.findById(id);
      if (role) {
        await this.cacheRole(role);
      }

      return role;
    } catch (error) {
      logger.error('Failed to get role by ID:', error as Error, { roleId: id });
      throw error;
    }
  }

  async getRoleByName(name: string, organizationId?: string): Promise<Role | null> {
    try {
      const cacheKey = `role:name:${name}${organizationId ? `:${organizationId}` : ''}`;
      
      // Try cache first
      const cachedRole = await redisService.cacheGet<Role>(cacheKey);
      if (cachedRole) {
        return cachedRole;
      }

      const role = await roleRepository.findByName(name, organizationId);
      if (role) {
        await redisService.cacheSet(cacheKey, role, config.cache.roleTTL);
      }

      return role;
    } catch (error) {
      logger.error('Failed to get role by name:', error as Error, { name, organizationId });
      throw error;
    }
  }

  async getAllRoles(organizationId?: string): Promise<Role[]> {
    try {
      const cacheKey = `roles:all${organizationId ? `:${organizationId}` : ''}`;
      
      // Try cache first
      const cachedRoles = await redisService.cacheGet<Role[]>(cacheKey);
      if (cachedRoles) {
        return cachedRoles;
      }

      const roles = await roleRepository.findAll(organizationId);
      
      // Cache roles
      await redisService.cacheSet(cacheKey, roles, config.cache.roleTTL);

      return roles;
    } catch (error) {
      logger.error('Failed to get all roles:', error as Error, { organizationId });
      throw error;
    }
  }

  async updateRole(id: string, updateData: UpdateRoleRequest): Promise<Role | null> {
    try {
      // Validate parent role if being updated
      if (updateData.parentRoleId) {
        const parentRole = await roleRepository.findById(updateData.parentRoleId);
        if (!parentRole) {
          throw new Error('Parent role not found');
        }

        // Prevent circular references
        if (parentRole.id === id) {
          throw new Error('Role cannot be its own parent');
        }

        // Get current role to check organization
        const currentRole = await this.getRoleById(id);
        if (currentRole && parentRole.organizationId && 
            parentRole.organizationId !== currentRole.organizationId) {
          throw new Error('Parent role must be in the same organization or be a global role');
        }
      }

      const role = await roleRepository.update(id, updateData);
      
      if (role) {
        // Update cache
        await this.cacheRole(role);
        
        // Invalidate related caches
        await this.invalidateRoleCaches(id, role.organizationId);

        structuredLogger.audit('role_updated', id, 'role', updateData);
      }

      return role;
    } catch (error) {
      logger.error('Failed to update role:', error as Error, { roleId: id });
      throw error;
    }
  }

  async deleteRole(id: string): Promise<boolean> {
    try {
      // Get role info before deletion for cache invalidation
      const role = await this.getRoleById(id);
      
      const result = await roleRepository.delete(id);
      
      if (result && role) {
        // Remove from cache
        await redisService.del(`role:${id}`);
        await this.invalidateRoleCaches(id, role.organizationId);

        structuredLogger.audit('role_deleted', id, 'role');
      }

      return result;
    } catch (error) {
      logger.error('Failed to delete role:', error as Error, { roleId: id });
      throw error;
    }
  }

  async getRoleHierarchy(organizationId?: string): Promise<RoleHierarchy[]> {
    try {
      const cacheKey = `roles:hierarchy${organizationId ? `:${organizationId}` : ''}`;
      
      // Try cache first
      const cachedHierarchy = await redisService.cacheGet<RoleHierarchy[]>(cacheKey);
      if (cachedHierarchy) {
        return cachedHierarchy;
      }

      const hierarchy = await roleRepository.getHierarchy(organizationId);
      
      // Cache hierarchy
      await redisService.cacheSet(cacheKey, hierarchy, config.cache.roleTTL);

      return hierarchy;
    } catch (error) {
      logger.error('Failed to get role hierarchy:', error as Error, { organizationId });
      throw error;
    }
  }

  async bulkAssignRoles(request: BulkRoleAssignmentRequest): Promise<void> {
    try {
      // Validate users exist
      for (const userId of request.userIds) {
        // This would typically call user service, but to avoid circular dependency,
        // we'll let the repository handle the validation
      }

      // Validate roles exist
      for (const roleId of request.roleIds) {
        const role = await this.getRoleById(roleId);
        if (!role) {
          throw new Error(`Role not found: ${roleId}`);
        }
      }

      await roleRepository.bulkAssignRoles(request);

      // Invalidate user role caches for all affected users
      for (const userId of request.userIds) {
        await redisService.invalidatePattern(`user:${userId}:roles*`);
      }

      structuredLogger.audit('bulk_role_assignment', 'system', 'user_roles', {
        userCount: request.userIds.length,
        roleCount: request.roleIds.length,
        action: request.action,
        organizationId: request.organizationId
      });
    } catch (error) {
      logger.error('Failed to bulk assign roles:', error as Error, { request });
      throw error;
    }
  }

  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    try {
      const cacheKey = `user:${userId}:roles${organizationId ? `:${organizationId}` : ''}`;
      
      // Try cache first
      const cachedRoles = await redisService.cacheGet<Role[]>(cacheKey);
      if (cachedRoles) {
        return cachedRoles;
      }

      const roles = await roleRepository.getUserRoles(userId, organizationId);
      
      // Cache roles
      await redisService.cacheSet(cacheKey, roles, config.cache.roleTTL);

      return roles;
    } catch (error) {
      logger.error('Failed to get user roles:', error as Error, { userId, organizationId });
      throw error;
    }
  }

  async hasPermission(userId: string, resource: string, action: string, organizationId?: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId, organizationId);
      
      for (const role of roles) {
        for (const permission of role.permissions) {
          if (permission.resource === resource && permission.action === action) {
            // TODO: Implement condition checking if needed
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to check permission:', error as Error, { userId, resource, action, organizationId });
      return false;
    }
  }

  async getUserPermissions(userId: string, organizationId?: string): Promise<any[]> {
    try {
      const cacheKey = `user:${userId}:permissions${organizationId ? `:${organizationId}` : ''}`;
      
      // Try cache first
      const cachedPermissions = await redisService.cacheGet<any[]>(cacheKey);
      if (cachedPermissions) {
        return cachedPermissions;
      }

      const roles = await this.getUserRoles(userId, organizationId);
      const permissions = new Map();

      // Collect unique permissions from all roles
      roles.forEach(role => {
        role.permissions.forEach(permission => {
          const key = `${permission.resource}:${permission.action}`;
          if (!permissions.has(key)) {
            permissions.set(key, permission);
          }
        });
      });

      const userPermissions = Array.from(permissions.values());
      
      // Cache permissions
      await redisService.cacheSet(cacheKey, userPermissions, config.cache.permissionTTL);

      return userPermissions;
    } catch (error) {
      logger.error('Failed to get user permissions:', error as Error, { userId, organizationId });
      throw error;
    }
  }

  private async cacheRole(role: Role): Promise<void> {
    try {
      await redisService.cacheSet(`role:${role.id}`, role, config.cache.roleTTL);
      
      // Also cache by name for quick lookups
      const nameKey = `role:name:${role.name}${role.organizationId ? `:${role.organizationId}` : ''}`;
      await redisService.cacheSet(nameKey, role, config.cache.roleTTL);
    } catch (error) {
      logger.warn('Failed to cache role:', { roleId: role.id, error: (error as Error).message });
    }
  }

  private async invalidateRoleCaches(roleId: string, organizationId?: string): Promise<void> {
    try {
      await redisService.del(`role:${roleId}`);
      await redisService.invalidatePattern(`role:name:*`);
      await redisService.invalidatePattern(`roles:all*`);
      await this.invalidateHierarchyCache(organizationId);
      
      // Invalidate user role caches (this might be expensive, consider optimization)
      await redisService.invalidatePattern(`user:*:roles*`);
      await redisService.invalidatePattern(`user:*:permissions*`);
    } catch (error) {
      logger.warn('Failed to invalidate role caches:', { roleId, error: (error as Error).message });
    }
  }

  private async invalidateHierarchyCache(organizationId?: string): Promise<void> {
    try {
      await redisService.invalidatePattern(`roles:hierarchy*`);
    } catch (error) {
      logger.warn('Failed to invalidate hierarchy cache:', { organizationId, error: (error as Error).message });
    }
  }
}

export const roleService = new RoleService();