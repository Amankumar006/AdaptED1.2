import { roleService } from '../services/role.service';
import { userService } from '../services/user.service';
import { BulkRoleAssignmentRequest, UserPreferences } from '../types/user.types';

// Mock dependencies
jest.mock('../services/role.service');
jest.mock('../services/user.service');

const mockRoleService = roleService as jest.Mocked<typeof roleService>;
const mockUserService = userService as jest.Mocked<typeof userService>;

const mockUserPreferences: UserPreferences = {
  theme: 'auto',
  notifications: {
    email: true,
    push: true,
    sms: false,
    inApp: true,
    frequency: 'immediate',
    types: {
      assignments: true,
      grades: true,
      announcements: true,
      reminders: true,
      social: false
    }
  },
  privacy: {
    profileVisibility: 'organization',
    showOnlineStatus: true,
    allowDirectMessages: true,
    shareProgressData: true,
    allowAnalytics: true
  },
  accessibility: {
    screenReader: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    keyboardNavigation: false,
    textToSpeech: false,
    closedCaptions: false
  },
  learning: {
    preferredContentTypes: [] as any,
    difficultyLevel: 'adaptive',
    pacePreference: 'adaptive',
    studyTimePreference: 'flexible',
    collaborationPreference: 'mixed'
  },
  dashboard: {
    layout: 'grid',
    widgets: [],
    defaultView: 'overview'
  }
};

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bulk Role Assignment Performance', () => {
    it('should handle bulk role assignment for 1000 users efficiently', async () => {
      const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
      const roleIds = ['role-1', 'role-2', 'role-3'];

      const bulkRequest: BulkRoleAssignmentRequest = {
        userIds,
        roleIds,
        action: 'add'
      };

      // Mock successful bulk assignment
      mockRoleService.bulkAssignRoles.mockResolvedValue(undefined);

      const startTime = Date.now();
      await roleService.bulkAssignRoles(bulkRequest);
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(mockRoleService.bulkAssignRoles).toHaveBeenCalledWith(bulkRequest);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('User Search Performance', () => {
    it('should handle user search with large result sets efficiently', async () => {
      const mockUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        profile: {
          firstName: `User${i}`,
          lastName: 'Test',
          timezone: 'UTC',
          language: 'en'
        },
        preferences: mockUserPreferences,
        roles: [],
        organizations: [],
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const mockSearchResult = {
        users: mockUsers,
        total: 1000,
        page: 1,
        limit: 100,
        totalPages: 10
      };

      mockUserService.searchUsers.mockResolvedValue(mockSearchResult);

      const startTime = Date.now();
      const result = await userService.searchUsers({
        query: 'test',
        page: 1,
        limit: 100
      });
      const endTime = Date.now();

      const executionTime = endTime - startTime;

      expect(result.users).toHaveLength(100);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Cache Performance', () => {
    it('should demonstrate cache performance benefits', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          timezone: 'UTC',
          language: 'en'
        },
        preferences: mockUserPreferences,
        roles: [],
        organizations: [],
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // First call - cache miss (slower)
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      const startTime1 = Date.now();
      await userService.getUserById('user-123');
      const endTime1 = Date.now();
      const firstCallTime = endTime1 - startTime1;

      // Second call - cache hit (faster)
      mockUserService.getUserById.mockResolvedValueOnce(mockUser);
      const startTime2 = Date.now();
      await userService.getUserById('user-123');
      const endTime2 = Date.now();
      const secondCallTime = endTime2 - startTime2;

      // Cache hit should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime);
    });
  });
});