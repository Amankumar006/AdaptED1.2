import { authorizationService } from '../authorization.service';
import { User, Permission, Role } from '../../types/auth.types';

describe('AuthorizationService', () => {
  const mockUser: User = {
    id: 'user123',
    email: 'test@example.com',
    roles: [
      {
        id: 'role1',
        name: 'student',
        permissions: [
          {
            id: 'perm1',
            name: 'read_content',
            resource: 'content',
            action: 'read'
          },
          {
            id: 'perm2',
            name: 'read_own_profile',
            resource: 'users',
            action: 'read'
          }
        ],
        hierarchy: 10
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

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin123',
    roles: [
      {
        id: 'role2',
        name: 'admin',
        permissions: [
          {
            id: 'perm3',
            name: 'manage_users',
            resource: 'users',
            action: '*'
          },
          {
            id: 'perm4',
            name: 'manage_content',
            resource: 'content',
            action: '*'
          }
        ],
        hierarchy: 90
      }
    ]
  };

  beforeEach(() => {
    // Clear any existing policies
    const policies = authorizationService.getPolicies();
    policies.forEach(policy => {
      authorizationService.removePolicy(policy.id);
    });
  });

  describe('hasPermission', () => {
    it('should allow access based on role permissions', async () => {
      const hasAccess = await authorizationService.hasPermission({
        user: mockUser,
        resource: 'content',
        action: 'read'
      });

      expect(hasAccess).toBe(true);
    });

    it('should deny access when user lacks permission', async () => {
      const hasAccess = await authorizationService.hasPermission({
        user: mockUser,
        resource: 'content',
        action: 'write'
      });

      expect(hasAccess).toBe(false);
    });

    it('should allow wildcard permissions', async () => {
      const hasAccess = await authorizationService.hasPermission({
        user: mockAdminUser,
        resource: 'users',
        action: 'create'
      });

      expect(hasAccess).toBe(true);
    });

    it('should apply policy-based access control', async () => {
      // Add a policy that denies access to admin resources for non-admin users
      authorizationService.addPolicy({
        id: 'test-policy',
        name: 'Test Policy',
        resource: 'admin',
        action: '*',
        effect: 'deny',
        conditions: [
          {
            attribute: 'user.roles',
            operator: 'not_in',
            value: ['admin', 'super_admin']
          }
        ],
        priority: 100
      });

      const hasAccess = await authorizationService.hasPermission({
        user: mockUser,
        resource: 'admin',
        action: 'read'
      });

      expect(hasAccess).toBe(false);
    });

    it('should allow policy override of role permissions', async () => {
      // Add a policy that allows access based on specific conditions
      authorizationService.addPolicy({
        id: 'override-policy',
        name: 'Override Policy',
        resource: 'special-content',
        action: 'read',
        effect: 'allow',
        conditions: [
          {
            attribute: 'user.id',
            operator: 'equals',
            value: 'user123'
          }
        ],
        priority: 200
      });

      const hasAccess = await authorizationService.hasPermission({
        user: mockUser,
        resource: 'special-content',
        action: 'read'
      });

      expect(hasAccess).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      // Mock the findUserById method
      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(mockUser);

      const permissions = await authorizationService.getUserPermissions('user123');

      expect(permissions).toHaveLength(2);
      expect(permissions[0].resource).toBe('content');
      expect(permissions[1].resource).toBe('users');
    });

    it('should return empty array for non-existent user', async () => {
      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(null);

      const permissions = await authorizationService.getUserPermissions('nonexistent');

      expect(permissions).toHaveLength(0);
    });

    it('should filter permissions by organization', async () => {
      const userWithOrgRoles: User = {
        ...mockUser,
        roles: [
          ...mockUser.roles,
          {
            id: 'org-role',
            name: 'org-admin',
            organizationId: 'org2',
            permissions: [
              {
                id: 'org-perm',
                name: 'manage_org',
                resource: 'organization',
                action: 'manage'
              }
            ],
            hierarchy: 50
          }
        ]
      };

      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(userWithOrgRoles);

      const permissions = await authorizationService.getUserPermissions('user123', 'org2');

      expect(permissions).toHaveLength(3); // 2 global + 1 org-specific
    });
  });

  describe('hasRole', () => {
    it('should return true if user has role', async () => {
      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(mockUser);

      const hasRole = await authorizationService.hasRole('user123', 'student');

      expect(hasRole).toBe(true);
    });

    it('should return false if user does not have role', async () => {
      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(mockUser);

      const hasRole = await authorizationService.hasRole('user123', 'admin');

      expect(hasRole).toBe(false);
    });

    it('should check organization-specific roles', async () => {
      const userWithOrgRoles: User = {
        ...mockUser,
        roles: [
          ...mockUser.roles,
          {
            id: 'org-role',
            name: 'teacher',
            organizationId: 'org2',
            permissions: [],
            hierarchy: 30
          }
        ]
      };

      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(userWithOrgRoles);

      const hasRole = await authorizationService.hasRole('user123', 'teacher', 'org2');

      expect(hasRole).toBe(true);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(mockUser);

      const roles = await authorizationService.getUserRoles('user123');

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('student');
    });

    it('should filter roles by organization', async () => {
      const userWithOrgRoles: User = {
        ...mockUser,
        roles: [
          ...mockUser.roles,
          {
            id: 'org-role',
            name: 'teacher',
            organizationId: 'org2',
            permissions: [],
            hierarchy: 30
          }
        ]
      };

      jest.spyOn(authorizationService as any, 'findUserById').mockResolvedValue(userWithOrgRoles);

      const roles = await authorizationService.getUserRoles('user123', 'org2');

      expect(roles).toHaveLength(2); // 1 global + 1 org-specific
    });
  });

  describe('policy management', () => {
    it('should add policy', () => {
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        resource: 'test',
        action: 'read',
        effect: 'allow' as const,
        conditions: [],
        priority: 100
      };

      authorizationService.addPolicy(policy);

      const policies = authorizationService.getPolicies();
      expect(policies).toContainEqual(policy);
    });

    it('should remove policy', () => {
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        resource: 'test',
        action: 'read',
        effect: 'allow' as const,
        conditions: [],
        priority: 100
      };

      authorizationService.addPolicy(policy);
      authorizationService.removePolicy('test-policy');

      const policies = authorizationService.getPolicies();
      expect(policies).not.toContainEqual(policy);
    });

    it('should get all policies', () => {
      const policy1 = {
        id: 'policy1',
        name: 'Policy 1',
        resource: 'test1',
        action: 'read',
        effect: 'allow' as const,
        conditions: [],
        priority: 100
      };

      const policy2 = {
        id: 'policy2',
        name: 'Policy 2',
        resource: 'test2',
        action: 'write',
        effect: 'deny' as const,
        conditions: [],
        priority: 200
      };

      authorizationService.addPolicy(policy1);
      authorizationService.addPolicy(policy2);

      const policies = authorizationService.getPolicies();
      expect(policies).toHaveLength(2);
      expect(policies).toContainEqual(policy1);
      expect(policies).toContainEqual(policy2);
    });
  });

  describe('createAuthContext', () => {
    it('should create auth context with user permissions', () => {
      const context = authorizationService.createAuthContext(mockUser, 'org1');

      expect(context.user).toBe(mockUser);
      expect(context.organizationId).toBe('org1');
      expect(context.permissions).toHaveLength(2);
      expect(context.permissions[0].resource).toBe('content');
      expect(context.permissions[1].resource).toBe('users');
    });

    it('should deduplicate permissions', () => {
      const userWithDuplicatePerms: User = {
        ...mockUser,
        roles: [
          ...mockUser.roles,
          {
            id: 'role2',
            name: 'duplicate-role',
            permissions: [
              {
                id: 'perm1', // Same ID as existing permission
                name: 'read_content',
                resource: 'content',
                action: 'read'
              }
            ],
            hierarchy: 20
          }
        ]
      };

      const context = authorizationService.createAuthContext(userWithDuplicatePerms);

      expect(context.permissions).toHaveLength(2); // Should not duplicate
    });
  });
});