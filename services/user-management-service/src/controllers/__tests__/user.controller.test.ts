import request from 'supertest';
import express from 'express';
import { userController } from '../user.controller';
import { userService } from '../../services/user.service';
import { UserPreferences } from '../../types/user.types';

// Mock the user service
jest.mock('../../services/user.service');

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

// Create test app
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    roles: ['admin'],
    organizations: ['org-123']
  };
  next();
});

// Add routes
app.post('/users', userController.createUser);
app.get('/users/:id', userController.getUserById);

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users', () => {
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

    it('should create user successfully', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/users')
        .send({
          email: 'test@example.com',
          profile: {
            firstName: 'John',
            lastName: 'Doe'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });
  });

  describe('GET /users/:id', () => {
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

    it('should get user successfully', async () => {
      mockUserService.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/users/user-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/users/user-123');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});