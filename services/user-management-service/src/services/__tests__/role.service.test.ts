import { roleService } from '../role.service';
import { roleRepository } from '../../repositories/role.repository';
import { redisService } from '../redis.service';
import { CreateRoleRequest, UpdateRoleRequest, Role, BulkRoleAssignmentRequest } from '../../types/user.types';

// Mock dependencies
jest.mock('../../repositories/role.repository');
jest.mock('../redis.service');

const mockRoleRepository = roleRepository as jest.Mocked<typeof roleRepository>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

describe('RoleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    const mockCreateRoleRequest: CreateRoleRequest = {
      name: 'test-role',
      displayName: 'Test Role',
      description: 'A test role',
      permissions: ['perm-123'],
      hierarchy: 50
    };

    const mockRole: Role = {
      id: 'role-123',
      name: 'test-role',
      displayName: 'Test Role',
      description: 'A test role',
      permissions: [],
      hierarchy: 50,
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create a role successfully', async () => {
      mockRoleRepository.findByName.mockResolvedValue(null);
      mockRoleRepository.create.mockResolvedValue(mockRole);
      mockRedisService.cacheSet.mockResolvedValue(undefined);
      mockRedisService.invalidatePattern.mockResolvedValue(undefined);

      const result = await roleService.createRole(mockCreateRoleRequest);

      expect(mockRoleRepository.findByName).toHaveBeenCalledWith('test-role', undefined);
      expect(mockRoleRepository.create).toHaveBeenCalledWith(mockCreateRoleRequest);
      expect(mockRedisService.cacheSet).toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should throw error if role already exists', async () => {
      mockRoleRepository.findByName.mockResolvedValue(mockRole);

      await expect(roleService.createRole(mockCreateRoleRequest))
        .rejects.toThrow('Role with this name already exists in the organization');

      expect(mockRoleRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getRoleById', () => {
    const mockRole: Role = {
      id: 'role-123',
      name: 'test-role',
      displayName: 'Test Role',
      description: 'A test role',
      permissions: [],
      hierarchy: 50,
      isSystemRole: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return cached role if available', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockRole);

      const result = await roleService.getRoleById('role-123');

      expect(mockRedisService.cacheGet).toHaveBeenCalledWith('role:role-123');
      expect(mockRoleRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should fetch role from database if not cached', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      mockRedisService.cacheSet.mockResolvedValue(undefined);

      const result = await roleService.getRoleById('role-123');

      expect(mockRedisService.cacheGet).toHaveBeenCalledWith('role:role-123');
      expect(mockRoleRepository.findById).toHaveBeenCalledWith('role-123');
      expect(mockRedisService.cacheSet).toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should return null if role not found', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockRoleRepository.findById.mockResolvedValue(null);

      const result = await roleService.getRoleById('role-123');

      expect(result).toBeNull();
    });
  });

  describe('bulkAssignRoles', () => {
    const mockBulkRequest: BulkRoleAssignmentRequest = {
      userIds: ['user-1', 'user-2'],
      roleIds: ['role-1', 'role-2'],
      action: 'add'
    };

    it('should perform bulk role assignment successfully', async () => {
      const mockRole: Role = {
        id: 'role-1',
        name: 'test-role',
        displayName: 'Test Role',
        description: 'A test role',
        permissions: [],
        hierarchy: 50,
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRedisService.cacheGet.mockResolvedValue(mockRole);
      mockRoleRepository.bulkAssignRoles.mockResolvedValue(undefined);
      mockRedisService.invalidatePattern.mockResolvedValue(undefined);

      await roleService.bulkAssignRoles(mockBulkRequest);

      expect(mockRoleRepository.bulkAssignRoles).toHaveBeenCalledWith(mockBulkRequest);
      expect(mockRedisService.invalidatePattern).toHaveBeenCalledWith('user:user-1:roles*');
      expect(mockRedisService.invalidatePattern).toHaveBeenCalledWith('user:user-2:roles*');
    });

    it('should throw error if role not found', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockRoleRepository.findById.mockResolvedValue(null);

      await expect(roleService.bulkAssignRoles(mockBulkRequest))
        .rejects.toThrow('Role not found: role-1');
    });
  });

  describe('hasPermission', () => {
    const mockRoles: Role[] = [
      {
        id: 'role-123',
        name: 'teacher',
        displayName: 'Teacher',
        description: 'Teacher role',
        permissions: [
          {
            id: 'perm-123',
            name: 'content_create',
            displayName: 'Create Content',
            description: 'Create educational content',
            resource: 'content',
            action: 'create',
            scope: 'organization'
          }
        ],
        hierarchy: 40,
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should return true if user has permission', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockRoles);

      const result = await roleService.hasPermission('user-123', 'content', 'create');

      expect(result).toBe(true);
    });

    it('should return false if user does not have permission', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockRoles);

      const result = await roleService.hasPermission('user-123', 'content', 'delete');

      expect(result).toBe(false);
    });

    it('should return false if no roles found', async () => {
      mockRedisService.cacheGet.mockResolvedValue([]);

      const result = await roleService.hasPermission('user-123', 'content', 'create');

      expect(result).toBe(false);
    });
  });
});