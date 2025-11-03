import { ContentRepository } from '../repositories/content.repository';
import { redisService } from './redis.service';
import {
  IContent,
  ContentSearchQuery,
  ContentSearchResult,
  CreateContentRequest,
  UpdateContentRequest,
  PublishContentRequest,
  ContentVersion,
} from '../types/content.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export class ContentService {
  private contentRepository: ContentRepository;
  private cachePrefix = 'content:';

  constructor() {
    this.contentRepository = new ContentRepository();
  }

  async createContent(contentData: CreateContentRequest, userId: string): Promise<IContent> {
    try {
      const content = await this.contentRepository.create(contentData, userId);
      
      // Cache the new content
      await this.cacheContent(content);
      
      logger.info(`Content created by user ${userId}: ${content._id}`);
      return content;
    } catch (error) {
      logger.error('Error in createContent service:', error);
      throw error;
    }
  }

  async getContent(id: string, includeAnalytics = false): Promise<IContent | null> {
    try {
      // Try to get from cache first
      const cacheKey = `${this.cachePrefix}${id}`;
      const cachedContent = await redisService.get(cacheKey);
      
      if (cachedContent) {
        const content = JSON.parse(cachedContent);
        
        // Increment view count asynchronously
        this.contentRepository.incrementViews(id).catch(error => {
          logger.error('Error incrementing views:', error);
        });
        
        return content;
      }

      // Get from database
      let result;
      if (includeAnalytics) {
        result = await this.contentRepository.findByIdWithAnalytics(id);
        if (result.content) {
          (result.content as any).analytics = result.analytics;
        }
      } else {
        result = { content: await this.contentRepository.findById(id) };
      }

      if (result.content) {
        // Cache the content
        await this.cacheContent(result.content);
        
        // Increment view count asynchronously
        this.contentRepository.incrementViews(id).catch(error => {
          logger.error('Error incrementing views:', error);
        });
      }

      return result.content;
    } catch (error) {
      logger.error('Error in getContent service:', error);
      throw error;
    }
  }

  async updateContent(id: string, updateData: UpdateContentRequest, userId: string): Promise<IContent | null> {
    try {
      const updatedContent = await this.contentRepository.update(id, updateData, userId);
      
      if (updatedContent) {
        // Update cache
        await this.cacheContent(updatedContent);
        
        // Invalidate related caches
        await this.invalidateRelatedCaches(id);
        
        logger.info(`Content updated by user ${userId}: ${id}`);
      }

      return updatedContent;
    } catch (error) {
      logger.error('Error in updateContent service:', error);
      throw error;
    }
  }

  async deleteContent(id: string, userId: string): Promise<boolean> {
    try {
      const result = await this.contentRepository.delete(id);
      
      if (result) {
        // Remove from cache
        await this.removeCacheContent(id);
        
        // Invalidate related caches
        await this.invalidateRelatedCaches(id);
        
        logger.info(`Content deleted by user ${userId}: ${id}`);
      }

      return result;
    } catch (error) {
      logger.error('Error in deleteContent service:', error);
      throw error;
    }
  }

  async searchContent(query: ContentSearchQuery): Promise<ContentSearchResult> {
    try {
      // Create cache key based on query parameters
      const cacheKey = `${this.cachePrefix}search:${this.createSearchCacheKey(query)}`;
      const cachedResult = await redisService.get(cacheKey);
      
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      const result = await this.contentRepository.search(query);
      
      // Cache search results for a shorter time
      await redisService.set(cacheKey, JSON.stringify(result), 300); // 5 minutes
      
      return result;
    } catch (error) {
      logger.error('Error in searchContent service:', error);
      throw error;
    }
  }

  async publishContent(id: string, publishData: PublishContentRequest, userId: string): Promise<IContent | null> {
    try {
      const publishedContent = await this.contentRepository.publish(id, publishData.version);
      
      if (publishedContent) {
        // Update cache
        await this.cacheContent(publishedContent);
        
        // Invalidate related caches
        await this.invalidateRelatedCaches(id);
        
        logger.info(`Content published by user ${userId}: ${id}`);
      }

      return publishedContent;
    } catch (error) {
      logger.error('Error in publishContent service:', error);
      throw error;
    }
  }

  async archiveContent(id: string, userId: string): Promise<IContent | null> {
    try {
      const archivedContent = await this.contentRepository.archive(id);
      
      if (archivedContent) {
        // Update cache
        await this.cacheContent(archivedContent);
        
        // Invalidate related caches
        await this.invalidateRelatedCaches(id);
        
        logger.info(`Content archived by user ${userId}: ${id}`);
      }

      return archivedContent;
    } catch (error) {
      logger.error('Error in archiveContent service:', error);
      throw error;
    }
  }

  async getContentVersions(id: string): Promise<ContentVersion[]> {
    try {
      const cacheKey = `${this.cachePrefix}versions:${id}`;
      const cachedVersions = await redisService.get(cacheKey);
      
      if (cachedVersions) {
        return JSON.parse(cachedVersions);
      }

      const versions = await this.contentRepository.getVersions(id);
      
      // Cache versions
      await redisService.set(cacheKey, JSON.stringify(versions), config.content.cacheTTL);
      
      return versions;
    } catch (error) {
      logger.error('Error in getContentVersions service:', error);
      throw error;
    }
  }

  async getContentVersion(id: string, version: string): Promise<ContentVersion | null> {
    try {
      const cacheKey = `${this.cachePrefix}version:${id}:${version}`;
      const cachedVersion = await redisService.get(cacheKey);
      
      if (cachedVersion) {
        return JSON.parse(cachedVersion);
      }

      const versionData = await this.contentRepository.getVersion(id, version);
      
      if (versionData) {
        // Cache version
        await redisService.set(cacheKey, JSON.stringify(versionData), config.content.cacheTTL);
      }

      return versionData;
    } catch (error) {
      logger.error('Error in getContentVersion service:', error);
      throw error;
    }
  }

  async getContentByOrganization(organizationId: string, page = 1, limit = 20): Promise<ContentSearchResult> {
    try {
      const cacheKey = `${this.cachePrefix}org:${organizationId}:${page}:${limit}`;
      const cachedResult = await redisService.get(cacheKey);
      
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      const result = await this.contentRepository.findByOrganization(organizationId, page, limit);
      
      // Cache results
      await redisService.set(cacheKey, JSON.stringify(result), 600); // 10 minutes
      
      return result;
    } catch (error) {
      logger.error('Error in getContentByOrganization service:', error);
      throw error;
    }
  }

  async getContentByCreator(creatorId: string, page = 1, limit = 20): Promise<ContentSearchResult> {
    try {
      const cacheKey = `${this.cachePrefix}creator:${creatorId}:${page}:${limit}`;
      const cachedResult = await redisService.get(cacheKey);
      
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }

      const result = await this.contentRepository.findByCreator(creatorId, page, limit);
      
      // Cache results
      await redisService.set(cacheKey, JSON.stringify(result), 600); // 10 minutes
      
      return result;
    } catch (error) {
      logger.error('Error in getContentByCreator service:', error);
      throw error;
    }
  }

  async recordDownload(contentId: string): Promise<void> {
    try {
      await this.contentRepository.incrementDownloads(contentId);
    } catch (error) {
      logger.error('Error recording download:', error);
      throw error;
    }
  }

  private async cacheContent(content: IContent): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}${content._id}`;
      await redisService.set(cacheKey, JSON.stringify(content), config.content.cacheTTL);
    } catch (error) {
      logger.error('Error caching content:', error);
    }
  }

  private async removeCacheContent(id: string): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}${id}`;
      await redisService.del(cacheKey);
    } catch (error) {
      logger.error('Error removing cached content:', error);
    }
  }

  private async invalidateRelatedCaches(contentId: string): Promise<void> {
    try {
      // This is a simplified cache invalidation
      // In a production system, you might want to use cache tags or patterns
      const patterns = [
        `${this.cachePrefix}versions:${contentId}`,
        `${this.cachePrefix}version:${contentId}:*`,
        `${this.cachePrefix}search:*`,
        `${this.cachePrefix}org:*`,
        `${this.cachePrefix}creator:*`,
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // In a real implementation, you'd use Redis SCAN with pattern matching
          // For now, we'll skip wildcard deletions
          continue;
        }
        await redisService.del(pattern);
      }
    } catch (error) {
      logger.error('Error invalidating related caches:', error);
    }
  }

  private createSearchCacheKey(query: ContentSearchQuery): string {
    // Create a deterministic cache key from search parameters
    const keyParts = [
      query.query || '',
      query.type || '',
      query.status || '',
      (query.tags || []).sort().join(','),
      query.difficulty || '',
      query.subject || '',
      query.gradeLevel || '',
      query.language || '',
      query.organizationId || '',
      query.createdBy || '',
      query.dateFrom?.toISOString() || '',
      query.dateTo?.toISOString() || '',
      query.page || 1,
      query.limit || 20,
      query.sortBy || 'createdAt',
      query.sortOrder || 'desc',
    ];

    return Buffer.from(keyParts.join('|')).toString('base64');
  }
}