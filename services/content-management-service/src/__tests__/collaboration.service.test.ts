import { CollaborationService } from '../services/collaboration.service';
import { Content } from '../models/content.model';
import { redisService } from '../services/redis.service';

// Mock dependencies
jest.mock('../models/content.model');
jest.mock('../services/redis.service');

describe('CollaborationService', () => {
  let collaborationService: CollaborationService;

  beforeEach(() => {
    collaborationService = new CollaborationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('inviteCollaborator', () => {
    it('should invite collaborator successfully', async () => {
      const mockContent = {
        _id: 'content-id',
        collaborators: [{
          userId: 'inviter-id',
          role: 'owner',
          permissions: ['read', 'write', 'manage_collaborators'],
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
        save: jest.fn().mockResolvedValue(true),
      };

      (Content.findById as jest.Mock).mockResolvedValue(mockContent);

      const result = await collaborationService.inviteCollaborator(
        'content-id',
        'inviter-id',
        'invitee@example.com',
        'editor',
        ['read', 'write']
      );

      expect(Content.findById).toHaveBeenCalledWith('content-id');
      expect(mockContent.save).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should reject invitation from non-owner', async () => {
      const mockContent = {
        _id: 'content-id',
        collaborators: [{
          userId: 'inviter-id',
          role: 'viewer',
          permissions: ['read'],
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
      };

      (Content.findById as jest.Mock).mockResolvedValue(mockContent);

      await expect(
        collaborationService.inviteCollaborator(
          'content-id',
          'inviter-id',
          'invitee@example.com',
          'editor'
        )
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('startCollaborationSession', () => {
    it('should start collaboration session', async () => {
      (redisService.set as jest.Mock).mockResolvedValue(undefined);
      (redisService.setHash as jest.Mock).mockResolvedValue(undefined);
      (redisService.expire as jest.Mock).mockResolvedValue(undefined);

      const session = await collaborationService.startCollaborationSession(
        'content-id',
        'user-id'
      );

      expect(session).toMatchObject({
        contentId: 'content-id',
        userId: 'user-id',
        sessionId: expect.any(String),
        lastActivity: expect.any(Date),
      });

      expect(redisService.set).toHaveBeenCalled();
      expect(redisService.setHash).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should add comment to content', async () => {
      const mockContent = {
        _id: 'content-id',
        comments: [],
        save: jest.fn().mockResolvedValue(true),
      };

      (Content.findById as jest.Mock).mockResolvedValue(mockContent);

      const result = await collaborationService.addComment(
        'content-id',
        'user-id',
        'This is a comment',
        { section: 'intro', offset: 10 }
      );

      expect(mockContent.comments).toHaveLength(1);
      expect(mockContent.comments[0]).toMatchObject({
        userId: expect.any(Object),
        content: 'This is a comment',
        position: { section: 'intro', offset: 10 },
      });
      expect(mockContent.save).toHaveBeenCalled();
    });
  });

  describe('addSuggestion', () => {
    it('should add suggestion to content', async () => {
      const mockContent = {
        _id: 'content-id',
        suggestions: [],
        save: jest.fn().mockResolvedValue(true),
      };

      (Content.findById as jest.Mock).mockResolvedValue(mockContent);

      const result = await collaborationService.addSuggestion(
        'content-id',
        'user-id',
        'modification',
        'Updated text',
        'Original text',
        { section: 'body', offset: 50 }
      );

      expect(mockContent.suggestions).toHaveLength(1);
      expect(mockContent.suggestions[0]).toMatchObject({
        userId: expect.any(Object),
        type: 'modification',
        content: 'Updated text',
        originalContent: 'Original text',
        status: 'pending',
      });
      expect(mockContent.save).toHaveBeenCalled();
    });
  });

  describe('applyOperation', () => {
    it('should apply operational transform', async () => {
      const operation = {
        id: 'op-id',
        type: 'insert' as const,
        position: 10,
        content: 'Hello',
        userId: 'user-id',
        timestamp: new Date(),
        version: 1,
      };

      (redisService.get as jest.Mock).mockResolvedValue('[]');
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      // Mock lock acquisition
      jest.spyOn(collaborationService as any, 'acquireLock').mockResolvedValue(true);
      jest.spyOn(collaborationService as any, 'releaseLock').mockResolvedValue(undefined);
      jest.spyOn(collaborationService as any, 'applyOperationToContent').mockResolvedValue(undefined);

      const result = await collaborationService.applyOperation('content-id', operation);

      expect(result.success).toBe(true);
      expect(result.transformedOperation).toBeDefined();
    });
  });
});