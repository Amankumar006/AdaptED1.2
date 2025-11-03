import { LifecycleService } from '../services/lifecycle.service';
import { Content } from '../models/content.model';
import { ContentAnalyticsModel } from '../models/content-analytics.model';
import { ContentStatus } from '../types/content.types';

// Mock dependencies
jest.mock('../models/content.model');
jest.mock('../models/content-analytics.model');

describe('LifecycleService', () => {
  let lifecycleService: LifecycleService;

  beforeEach(() => {
    lifecycleService = new LifecycleService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('archiveOldContent', () => {
    it('should archive content older than specified days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days old

      const mockOldContent = [
        {
          _id: 'content-1',
          status: ContentStatus.PUBLISHED,
          updatedAt: oldDate,
          save: jest.fn().mockResolvedValue(true),
        },
        {
          _id: 'content-2',
          status: ContentStatus.DRAFT,
          updatedAt: oldDate,
          save: jest.fn().mockResolvedValue(true),
        },
      ];

      (Content.find as jest.Mock).mockResolvedValue(mockOldContent);
      (ContentAnalyticsModel.findOne as jest.Mock).mockResolvedValue(null);

      const result = await lifecycleService.archiveOldContent(365);

      expect(result).toBe(2);
      expect(mockOldContent[0].status).toBe(ContentStatus.ARCHIVED);
      expect(mockOldContent[1].status).toBe(ContentStatus.ARCHIVED);
      expect(mockOldContent[0].save).toHaveBeenCalled();
      expect(mockOldContent[1].save).toHaveBeenCalled();
    });

    it('should skip recently accessed content', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400);

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30);

      const mockOldContent = [{
        _id: 'content-1',
        status: ContentStatus.PUBLISHED,
        updatedAt: oldDate,
        save: jest.fn(),
      }];

      const mockAnalytics = {
        contentId: 'content-1',
        lastAccessed: recentDate,
      };

      (Content.find as jest.Mock).mockResolvedValue(mockOldContent);
      (ContentAnalyticsModel.findOne as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await lifecycleService.archiveOldContent(365);

      expect(result).toBe(0);
      expect(mockOldContent[0].save).not.toHaveBeenCalled();
    });
  });

  describe('deleteExpiredContent', () => {
    it('should delete archived content older than specified days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 1200); // Over 3 years

      const mockExpiredContent = [
        {
          _id: 'content-1',
          status: ContentStatus.ARCHIVED,
          archivedAt: oldDate,
          mediaFiles: [],
        },
      ];

      (Content.find as jest.Mock).mockResolvedValue(mockExpiredContent);
      (ContentAnalyticsModel.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
      (Content.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const result = await lifecycleService.deleteExpiredContent(1095);

      expect(result).toBe(1);
      expect(ContentAnalyticsModel.deleteOne).toHaveBeenCalledWith({ contentId: 'content-1' });
      expect(Content.deleteOne).toHaveBeenCalledWith({ _id: 'content-1' });
    });
  });

  describe('generateLifecycleReport', () => {
    it('should generate comprehensive lifecycle report', async () => {
      // Mock content counts
      (Content.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // published
        .mockResolvedValueOnce(20)  // draft
        .mockResolvedValueOnce(15)  // archived
        .mockResolvedValueOnce(5)   // deleted
        .mockResolvedValueOnce(30)  // recent
        .mockResolvedValueOnce(25)  // medium age
        .mockResolvedValueOnce(35)  // old
        .mockResolvedValueOnce(10); // very old

      // Mock storage stats
      (Content.aggregate as jest.Mock).mockResolvedValue([{
        totalSize: 1024 * 1024 * 1024, // 1GB
        totalFiles: 500,
        avgFileSize: 2 * 1024 * 1024, // 2MB
      }]);

      const report = await lifecycleService.generateLifecycleReport();

      expect(report).toMatchObject({
        summary: {
          totalContent: 100,
          publishedContent: 60,
          draftContent: 20,
          archivedContent: 15,
          deletedContent: 5,
        },
        storage: {
          totalSizeBytes: 1024 * 1024 * 1024,
          totalSizeMB: 1024,
          totalFiles: 500,
          avgFileSizeBytes: 2 * 1024 * 1024,
        },
        ageDistribution: {
          recent: 30,
          medium: 25,
          old: 35,
          veryOld: 10,
        },
        recommendations: expect.any(Array),
        generatedAt: expect.any(Date),
      });
    });
  });

  describe('compressLargeContent', () => {
    it('should identify large content for compression', async () => {
      const mockLargeContent = [{
        _id: 'content-1',
        mediaFiles: [{
          id: 'file-1',
          size: 150 * 1024 * 1024, // 150MB
          mimeType: 'image/jpeg',
        }],
      }];

      (Content.find as jest.Mock).mockResolvedValue(mockLargeContent);

      const result = await lifecycleService.compressLargeContent(100);

      expect(result).toBe(1);
      expect(Content.find).toHaveBeenCalledWith({
        'mediaFiles.size': { $gt: 100 * 1024 * 1024 },
        status: { $ne: ContentStatus.DELETED },
      });
    });
  });

  describe('cleanupUnusedMedia', () => {
    it('should identify cleanup opportunities', async () => {
      const mockContent = [{
        _id: 'content-1',
        mediaFiles: [{ id: 'file-1' }, { id: 'file-2' }],
      }];

      (Content.find as jest.Mock).mockResolvedValue(mockContent);

      const result = await lifecycleService.cleanupUnusedMedia();

      expect(Content.find).toHaveBeenCalledWith({
        status: { $ne: ContentStatus.DELETED },
      });
      expect(result).toBe(0); // Placeholder implementation
    });
  });
});