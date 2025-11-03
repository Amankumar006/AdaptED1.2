import { organizationService } from '../organization.service';
import { organizationRepository } from '../../repositories/organization.repository';
import { redisService } from '../redis.service';
import { CreateOrganizationRequest, UpdateOrganizationRequest, Organization, OrganizationType, OrganizationSettings } from '../../types/user.types';

// Mock dependencies
jest.mock('../../repositories/organization.repository');
jest.mock('../redis.service');

const mockOrganizationRepository = organizationRepository as jest.Mocked<typeof organizationRepository>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

const mockOrganizationSettings: OrganizationSettings = {
  branding: {
    primaryColor: '#007bff',
    secondaryColor: '#6c757d'
  },
  features: {
    enableGamification: true,
    enableAI: true,
    enableCollaboration: true,
    enableAnalytics: true
  },
  policies: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      maxAge: 90,
      preventReuse: 5
    },
    dataRetention: {
      userDataRetention: 2555,
      logRetention: 365,
      backupRetention: 1095,
      automaticDeletion: false
    },
    privacySettings: {
      allowDataSharing: false,
      requireConsentForAnalytics: true,
      enableRightToErasure: true,
      dataProcessingBasis: 'consent'
    }
  },
  integrations: {
    ssoEnabled: false,
    lmsIntegrations: [],
    thirdPartyTools: []
  }
};

describe('OrganizationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    const mockCreateOrgRequest: CreateOrganizationRequest = {
      name: 'test-org',
      displayName: 'Test Organization',
      description: 'A test organization',
      type: OrganizationType.SCHOOL
    };

    const mockOrganization: Organization = {
      id: 'org-123',
      name: 'test-org',
      displayName: 'Test Organization',
      description: 'A test organization',
      type: OrganizationType.SCHOOL,
      settings: mockOrganizationSettings,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create an organization successfully', async () => {
      mockOrganizationRepository.findByName.mockResolvedValue(null);
      mockOrganizationRepository.create.mockResolvedValue(mockOrganization);
      mockRedisService.cacheSet.mockResolvedValue(undefined);
      mockRedisService.invalidatePattern.mockResolvedValue(undefined);

      const result = await organizationService.createOrganization(mockCreateOrgRequest);

      expect(mockOrganizationRepository.findByName).toHaveBeenCalledWith('test-org');
      expect(mockOrganizationRepository.create).toHaveBeenCalledWith(mockCreateOrgRequest);
      expect(mockRedisService.cacheSet).toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });

    it('should throw error if organization already exists', async () => {
      mockOrganizationRepository.findByName.mockResolvedValue(mockOrganization);

      await expect(organizationService.createOrganization(mockCreateOrgRequest))
        .rejects.toThrow('Organization with this name already exists');

      expect(mockOrganizationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getOrganizationById', () => {
    const mockOrganization: Organization = {
      id: 'org-123',
      name: 'test-org',
      displayName: 'Test Organization',
      description: 'A test organization',
      type: OrganizationType.SCHOOL,
      settings: mockOrganizationSettings,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return cached organization if available', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockOrganization);

      const result = await organizationService.getOrganizationById('org-123');

      expect(mockRedisService.cacheGet).toHaveBeenCalledWith('organization:org-123');
      expect(mockOrganizationRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });

    it('should fetch organization from database if not cached', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockRedisService.cacheSet.mockResolvedValue(undefined);

      const result = await organizationService.getOrganizationById('org-123');

      expect(mockRedisService.cacheGet).toHaveBeenCalledWith('organization:org-123');
      expect(mockOrganizationRepository.findById).toHaveBeenCalledWith('org-123');
      expect(mockRedisService.cacheSet).toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });

    it('should return null if organization not found', async () => {
      mockRedisService.cacheGet.mockResolvedValue(null);
      mockOrganizationRepository.findById.mockResolvedValue(null);

      const result = await organizationService.getOrganizationById('org-123');

      expect(result).toBeNull();
    });
  });

  describe('validateOrganizationAccess', () => {
    const mockOrganizations: Organization[] = [
      {
        id: 'org-123',
        name: 'test-org',
        displayName: 'Test Organization',
        description: 'A test organization',
        type: OrganizationType.SCHOOL,
        settings: mockOrganizationSettings,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should return true if user has access to organization', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockOrganizations);

      const result = await organizationService.validateOrganizationAccess('user-123', 'org-123');

      expect(result).toBe(true);
    });

    it('should return false if user does not have access to organization', async () => {
      mockRedisService.cacheGet.mockResolvedValue(mockOrganizations);

      const result = await organizationService.validateOrganizationAccess('user-123', 'org-456');

      expect(result).toBe(false);
    });
  });
});