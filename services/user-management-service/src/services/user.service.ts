import { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest,
  UserSearchQuery,
  UserSearchResult
} from '../types/user.types';
import { userRepository } from '../repositories/user.repository';
import { roleRepository } from '../repositories/role.repository';
import { organizationRepository } from '../repositories/organization.repository';
import { redisService } from './redis.service';
import { config } from '../config/config';
import { logger, structuredLogger } from '../utils/logger';

export class UserService {
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Validate email uniqueness
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate organization if provided
      if (userData.organizationId) {
        const organization = await organizationRepository.findById(userData.organizationId);
        if (!organization) {
          throw new Error('Organization not found');
        }
      }

      // Validate roles if provided
      if (userData.roles && userData.roles.length > 0) {
        for (const roleId of userData.roles) {
          const role = await roleRepository.findById(roleId);
          if (!role) {
            throw new Error(`Role not found: ${roleId}`);
          }
        }
      }

      const user = await userRepository.create(userData);

      // Cache the user
      await this.cacheUser(user);

      structuredLogger.audit('user_created', user.id, 'user', {
        email: userData.email,
        organizationId: userData.organizationId
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user:', error as Error, { email: userData.email });
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      // Try cache first
      const cachedUser = await redisService.cacheGet<User>(`user:${id}`);
      if (cachedUser) {
        return cachedUser;
      }

      const user = await userRepository.findById(id);
      if (user) {
        // Populate roles
        user.roles = await this.getUserRoles(id);
        
        // Cache the user
        await this.cacheUser(user);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by ID:', error as Error, { userId: id });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await userRepository.findByEmail(email);
      if (user) {
        // Populate roles
        user.roles = await this.getUserRoles(user.id);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get user by email:', error as Error, { email });
      throw error;
    }
  }

  async updateUser(id: string, updateData: UpdateUserRequest): Promise<User | null> {
    try {
      const user = await userRepository.update(id, updateData);
      
      if (user) {
        // Populate roles
        user.roles = await this.getUserRoles(id);
        
        // Update cache
        await this.cacheUser(user);
        
        // Invalidate related caches
        await this.invalidateUserCaches(id);

        structuredLogger.audit('user_updated', id, 'user', updateData);
      }

      return user;
    } catch (error) {
      logger.error('Failed to update user:', error as Error, { userId: id });
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await userRepository.delete(id);
      
      if (result) {
        // Remove from cache
        await redisService.del(`user:${id}`);
        await this.invalidateUserCaches(id);

        structuredLogger.audit('user_deleted', id, 'user');
      }

      return result;
    } catch (error) {
      logger.error('Failed to delete user:', error as Error, { userId: id });
      throw error;
    }
  }

  async searchUsers(query: UserSearchQuery): Promise<UserSearchResult> {
    try {
      const result = await userRepository.search(query);
      
      // Populate roles for each user
      for (const user of result.users) {
        user.roles = await this.getUserRoles(user.id);
      }

      return result;
    } catch (error) {
      logger.error('Failed to search users:', error as Error, { query });
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await userRepository.updateLastLogin(id);
      
      // Invalidate user cache to ensure fresh data
      await redisService.del(`user:${id}`);
    } catch (error) {
      logger.error('Failed to update last login:', error as Error, { userId: id });
      throw error;
    }
  }

  async getUserRoles(userId: string, organizationId?: string): Promise<any[]> {
    try {
      const cacheKey = `user:${userId}:roles${organizationId ? `:${organizationId}` : ''}`;
      
      // Try cache first
      const cachedRoles = await redisService.cacheGet<any[]>(cacheKey);
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

  async assignRoles(userId: string, roleIds: string[], organizationId?: string): Promise<void> {
    try {
      // Validate user exists
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate roles exist
      for (const roleId of roleIds) {
        const role = await roleRepository.findById(roleId);
        if (!role) {
          throw new Error(`Role not found: ${roleId}`);
        }
      }

      // Validate organization if provided
      if (organizationId) {
        const organization = await organizationRepository.findById(organizationId);
        if (!organization) {
          throw new Error('Organization not found');
        }
      }

      await roleRepository.assignRolesToUser(userId, roleIds, organizationId);

      // Invalidate caches
      await this.invalidateUserCaches(userId);

      structuredLogger.audit('roles_assigned', userId, 'user_roles', {
        roleIds,
        organizationId
      });
    } catch (error) {
      logger.error('Failed to assign roles:', error as Error, { userId, roleIds, organizationId });
      throw error;
    }
  }

  async removeRoles(userId: string, roleIds: string[], organizationId?: string): Promise<void> {
    try {
      await roleRepository.removeRolesFromUser(userId, roleIds, organizationId);

      // Invalidate caches
      await this.invalidateUserCaches(userId);

      structuredLogger.audit('roles_removed', userId, 'user_roles', {
        roleIds,
        organizationId
      });
    } catch (error) {
      logger.error('Failed to remove roles:', error as Error, { userId, roleIds, organizationId });
      throw error;
    }
  }

  async getUsersByOrganization(organizationId: string): Promise<any[]> {
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
      logger.error('Failed to get users by organization:', error as Error, { organizationId });
      throw error;
    }
  }

  async addUserToOrganization(userId: string, organizationId: string, roles: string[] = []): Promise<void> {
    try {
      // Validate user exists
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate organization exists
      const organization = await organizationRepository.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Validate roles if provided
      for (const roleId of roles) {
        const role = await roleRepository.findById(roleId);
        if (!role) {
          throw new Error(`Role not found: ${roleId}`);
        }
      }

      await organizationRepository.addMember(organizationId, userId, roles);

      // Invalidate caches
      await this.invalidateUserCaches(userId);
      await redisService.del(`organization:${organizationId}:members`);

      structuredLogger.audit('user_added_to_organization', userId, 'organization_membership', {
        organizationId,
        roles
      });
    } catch (error) {
      logger.error('Failed to add user to organization:', error as Error, { userId, organizationId });
      throw error;
    }
  }

  async removeUserFromOrganization(userId: string, organizationId: string): Promise<void> {
    try {
      await organizationRepository.removeMember(organizationId, userId);

      // Invalidate caches
      await this.invalidateUserCaches(userId);
      await redisService.del(`organization:${organizationId}:members`);

      structuredLogger.audit('user_removed_from_organization', userId, 'organization_membership', {
        organizationId
      });
    } catch (error) {
      logger.error('Failed to remove user from organization:', error as Error, { userId, organizationId });
      throw error;
    }
  }

  async updateUserOrganizationRoles(userId: string, organizationId: string, roles: string[]): Promise<void> {
    try {
      // Validate roles exist
      for (const roleId of roles) {
        const role = await roleRepository.findById(roleId);
        if (!role) {
          throw new Error(`Role not found: ${roleId}`);
        }
      }

      await organizationRepository.updateMemberRoles(organizationId, userId, roles);

      // Invalidate caches
      await this.invalidateUserCaches(userId);
      await redisService.del(`organization:${organizationId}:members`);

      structuredLogger.audit('user_organization_roles_updated', userId, 'organization_membership', {
        organizationId,
        roles
      });
    } catch (error) {
      logger.error('Failed to update user organization roles:', error as Error, { userId, organizationId });
      throw error;
    }
  }

  private async cacheUser(user: User): Promise<void> {
    try {
      await redisService.cacheSet(`user:${user.id}`, user, config.cache.userTTL);
    } catch (error) {
      logger.warn('Failed to cache user:', { userId: user.id, error: (error as Error).message });
    }
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    try {
      await redisService.del(`user:${userId}`);
      await redisService.invalidatePattern(`user:${userId}:roles*`);
    } catch (error) {
      logger.warn('Failed to invalidate user caches:', { userId, error: (error as Error).message });
    }
  }
}

export const userService = new UserService();