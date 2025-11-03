import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { roleRepository } from '../../repositories/role.repository';
import { organizationRepository } from '../../repositories/organization.repository';
import { redisService } from '../redis.service';
import { CreateUserRequest, UpdateUserRequest, User, UserPreferences } from '../../types/user.types';

// Mock dependencies
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/role.repository');
jest.mock('../../repositories/organization.repository');
jest.mock('../redis.service');

const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockRoleRepository = roleRepository as jest.Mocked<typeof roleRepository>;
const mockOrganizationRepository = organizationRepository as jest.Mocked<typeof organizationRepository>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

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

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const mockCreateUserRequest: CreateUserRequest = {
      email: 'test@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        timezone: 'UTC',
        language: 'en'
      }
    };

    const mockUser: User = {
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

    it('should create a user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockRedisService.cacheSet.mockResolvedValue(undefined);

      const result = await userService.createUser(mockCreateUserRequest);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.create).toHaveBeenCalledWith(mockCreateUserRequest);
      expect(mockRedisService.cacheSet).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(userService.createUser(mockCreateUserRequest))
        .rejects.toThrow('User with this email already exists');

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    const mockUser: User = {
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

    it('should return cached user if available', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-123');

      expect(mockRedisService.cacheGet).toHaveBeenCalledWith('user:user-123');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should fetch user from database if not cached', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockRoleRepository.getUserRoles.mockResolvedValue([]);
      mockRedisService.cacheSet.mockResolvedValue(undefined);

      const result = await userService.getUserById('user-123');

      expect(mockRedisService.cacheGet).toHaveBeenCalledWith('user:user-123');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(mockRoleRepository.getUserRoles).toHaveBeenCalledWith('user-123');
      expect(mockRedisService.cacheSet).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById('user-123');

      expect(result).toBeNull();
    });
  });

  describe('assignRoles', () => {
    it('should assign roles successfully', async () => {
      const mockUser: User = {
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

      const mockRole = {
        id: 'role-123',
        name: 'teacher',
        displayName: 'Teacher',
        description: 'Teacher role',
        permissions: [],
        hierarchy: 40,
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRedisService.cacheGet.mockResolvedValue(mockUser);
      mockRoleRepository.findById.mockResolvedValue(mockRole);
      mockRoleRepository.assignRolesToUser.mockResolvedValue(undefined);
      mockRedisService.del.mockResolvedValue(1);
      mockRedisService.invalidatePattern.mockResolvedValue(undefined);

      await userService.assignRoles('user-123', ['role-123']);

      expect(mockRoleRepository.findById).toHaveBeenCalledWith('role-123');
      expect(mockRoleRepository.assignRolesToUser).toHaveBeenCalledWith('user-123', ['role-123'], undefined);
    });

    it('should throw error if user not found', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.assignRoles('user-123', ['role-123']))
        .rejects.toThrow('User not found');
    });
  });
});