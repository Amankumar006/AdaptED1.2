import { ContentService } from '../services/content.service';
import { ContentRepository } from '../repositories/content.repository';
import { redisService } from '../services/redis.service';
import { ContentType, DifficultyLevel, ContentStatus } from '../types/content.types';

// Mock dependencies
jest.mock('../repositories/content.repository');
jest.mock('../services/redis.service');

describe('ContentService', () => {
  let contentService: ContentService;
  let mockContentRepository: jest.Mocked<ContentRepository>;

  beforeEach(() => {
    mockContentRepository = new ContentRepository() as jest.Mocked<ContentRepository>;
    contentService = new ContentService();
    (contentService as any).contentRepository = mockContentRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContent', () => {
    it('should create content successfully', async () => {
      const contentData = {
        type: ContentType.LESSON,
        metadata: {
          title: 'Test Lesson',
          description: 'Test Description',
          keywords: ['test'],
          language: 'en',
          subject: 'Math',
          gradeLevel: '5th',
          difficulty: DifficultyLevel.BEGINNER,
          learningObjectives: ['Learn basics'],
          prerequisites: [],
        },
        data: { content: 'Test content' },
      };

      const mockContent = {
        _id: 'test-id',
        ...contentData,
        status: ContentStatus.DRAFT,
        createdAt: new Date(),
      };

      mockContentRepository.create.mockResolvedValue(mockContent as any);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await contentService.createContent(contentData, 'user-id');

      expect(mockContentRepository.create).toHaveBeenCalledWith(contentData, 'user-id');
      expect(result).toEqual(mockContent);
    });
  });
});  describe('
getContent', () => {
    it('should return cached content if available', async () => {
      const mockContent = {
        _id: 'test-id',
        metadata: { title: 'Test Content' },
        status: ContentStatus.PUBLISHED,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(mockContent));
      mockContentRepository.incrementViews.mockResolvedValue(undefined);

      const result = await contentService.getContent('test-id');

      expect(redisService.get).toHaveBeenCalledWith('content:test-id');
      expect(result).toEqual(mockContent);
      expect(mockContentRepository.incrementViews).toHaveBeenCalledWith('test-id');
    });

    it('should fetch from database if not cached', async () => {
      const mockContent = {
        _id: 'test-id',
        metadata: { title: 'Test Content' },
        status: ContentStatus.PUBLISHED,
      };

      (redisService.get as jest.Mock).mockResolvedValue(null);
      mockContentRepository.findById.mockResolvedValue(mockContent as any);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);
      mockContentRepository.incrementViews.mockResolvedValue(undefined);

      const result = await contentService.getContent('test-id');

      expect(mockContentRepository.findById).toHaveBeenCalledWith('test-id');
      expect(redisService.set).toHaveBeenCalled();
      expect(result).toEqual(mockContent);
    });

    it('should return null if content not found', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);
      mockContentRepository.findById.mockResolvedValue(null);

      const result = await contentService.getContent('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateContent', () => {
    it('should update content and invalidate cache', async () => {
      const updateData = {
        metadata: { title: 'Updated Title' },
        data: { content: 'Updated content' },
        changelog: 'Updated content',
      };

      const mockUpdatedContent = {
        _id: 'test-id',
        metadata: { title: 'Updated Title' },
        status: ContentStatus.DRAFT,
      };

      mockContentRepository.update.mockResolvedValue(mockUpdatedContent as any);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);
      (redisService.del as jest.Mock).mockResolvedValue(undefined);

      const result = await contentService.updateContent('test-id', updateData, 'user-id');

      expect(mockContentRepository.update).toHaveBeenCalledWith('test-id', updateData, 'user-id');
      expect(result).toEqual(mockUpdatedContent);
    });
  });

  describe('searchContent', () => {
    it('should return cached search results if available', async () => {
      const searchQuery = {
        query: 'test',
        type: ContentType.LESSON,
        page: 1,
        limit: 20,
      };

      const mockResults = {
        contents: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(mockResults));

      const result = await contentService.searchContent(searchQuery);

      expect(result).toEqual(mockResults);
      expect(mockContentRepository.search).not.toHaveBeenCalled();
    });

    it('should search database if not cached', async () => {
      const searchQuery = {
        query: 'test',
        type: ContentType.LESSON,
        page: 1,
        limit: 20,
      };

      const mockResults = {
        contents: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (redisService.get as jest.Mock).mockResolvedValue(null);
      mockContentRepository.search.mockResolvedValue(mockResults);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await contentService.searchContent(searchQuery);

      expect(mockContentRepository.search).toHaveBeenCalledWith(searchQuery);
      expect(redisService.set).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });
  });

  describe('publishContent', () => {
    it('should publish content successfully', async () => {
      const publishData = { version: '1.0.0' };
      const mockPublishedContent = {
        _id: 'test-id',
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      mockContentRepository.publish.mockResolvedValue(mockPublishedContent as any);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);
      (redisService.del as jest.Mock).mockResolvedValue(undefined);

      const result = await contentService.publishContent('test-id', publishData, 'user-id');

      expect(mockContentRepository.publish).toHaveBeenCalledWith('test-id', '1.0.0');
      expect(result).toEqual(mockPublishedContent);
    });
  });
});