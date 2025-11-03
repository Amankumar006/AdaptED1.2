import { Types } from 'mongoose';
import { Content } from '../models/content.model';
import { ContentAnalyticsModel } from '../models/content-analytics.model';
import {
  IContent,
  ContentSearchQuery,
  ContentSearchResult,
  CreateContentRequest,
  UpdateContentRequest,
  ContentStatus,
  ContentVersion,
} from '../types/content.types';
import { logger } from '../utils/logger';

export class ContentRepository {
  async create(contentData: CreateContentRequest, userId: string): Promise<IContent> {
    try {
      const initialVersion: ContentVersion = {
        version: '1.0.0',
        data: contentData.data,
        changelog: 'Initial version',
        isActive: true,
        createdBy: new Types.ObjectId(userId),
        createdAt: new Date(),
      };

      const content = new Content({
        type: contentData.type,
        metadata: contentData.metadata,
        versions: [initialVersion],
        currentVersion: '1.0.0',
        status: ContentStatus.DRAFT,
        tags: contentData.tags || [],
        mediaFiles: [],
        collaborators: [{
          userId: new Types.ObjectId(userId),
          role: 'owner',
          permissions: ['read', 'write', 'delete', 'publish', 'manage_collaborators'],
          invitedAt: new Date(),
          acceptedAt: new Date(),
        }],
        comments: [],
        suggestions: [],
        xapiStatements: [],
        organizationId: contentData.organizationId ? new Types.ObjectId(contentData.organizationId) : undefined,
        createdBy: new Types.ObjectId(userId),
      });

      const savedContent = await content.save();

      // Initialize analytics
      await ContentAnalyticsModel.create({
        contentId: savedContent._id,
        views: 0,
        downloads: 0,
        completions: 0,
        averageRating: 0,
        totalRatings: 0,
        engagementMetrics: {
          timeSpent: 0,
          interactionCount: 0,
          completionRate: 0,
        },
        lastAccessed: new Date(),
      });

      logger.info(`Content created: ${savedContent._id}`);
      return savedContent;
    } catch (error) {
      logger.error('Error creating content:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<IContent | null> {
    try {
      return await Content.findById(id).exec();
    } catch (error) {
      logger.error('Error finding content by ID:', error);
      throw error;
    }
  }

  async findByIdWithAnalytics(id: string): Promise<{ content: IContent | null; analytics: any }> {
    try {
      const content = await Content.findById(id).exec();
      const analytics = await ContentAnalyticsModel.findOne({ contentId: id }).exec();
      
      return { content, analytics };
    } catch (error) {
      logger.error('Error finding content with analytics:', error);
      throw error;
    }
  }

  async update(id: string, updateData: UpdateContentRequest, userId: string): Promise<IContent | null> {
    try {
      const content = await Content.findById(id);
      if (!content) {
        return null;
      }

      // Update metadata if provided
      if (updateData.metadata) {
        content.metadata = { ...content.metadata, ...updateData.metadata };
      }

      // Update tags if provided
      if (updateData.tags) {
        content.tags = updateData.tags;
      }

      // Create new version if data is provided
      if (updateData.data) {
        const currentVersion = content.versions.find(v => v.version === content.currentVersion);
        if (currentVersion) {
          currentVersion.isActive = false;
        }

        const versionParts = content.currentVersion.split('.').map(Number);
        versionParts[2]++; // Increment patch version
        const newVersion = versionParts.join('.');

        const newVersionData: ContentVersion = {
          version: newVersion,
          data: updateData.data,
          changelog: updateData.changelog || 'Content updated',
          isActive: true,
          createdBy: new Types.ObjectId(userId),
          createdAt: new Date(),
        };

        content.versions.push(newVersionData);
        content.currentVersion = newVersion;
      }

      content.updatedAt = new Date();
      const updatedContent = await content.save();

      logger.info(`Content updated: ${updatedContent._id}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error updating content:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await Content.findByIdAndUpdate(
        id,
        { 
          status: ContentStatus.DELETED,
          archivedAt: new Date(),
        }
      );
      
      if (result) {
        logger.info(`Content deleted: ${id}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting content:', error);
      throw error;
    }
  }

  async search(query: ContentSearchQuery): Promise<ContentSearchResult> {
    try {
      const {
        query: searchQuery,
        type,
        status,
        tags,
        difficulty,
        subject,
        gradeLevel,
        language,
        organizationId,
        createdBy,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const filter: any = {};

      // Text search
      if (searchQuery) {
        filter.$text = { $search: searchQuery };
      }

      // Type filter
      if (type) {
        filter.type = type;
      }

      // Status filter
      if (status) {
        filter.status = status;
      } else {
        // Exclude deleted content by default
        filter.status = { $ne: ContentStatus.DELETED };
      }

      // Tags filter
      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      // Metadata filters
      if (difficulty) {
        filter['metadata.difficulty'] = difficulty;
      }

      if (subject) {
        filter['metadata.subject'] = subject;
      }

      if (gradeLevel) {
        filter['metadata.gradeLevel'] = gradeLevel;
      }

      if (language) {
        filter['metadata.language'] = language;
      }

      // Organization filter
      if (organizationId) {
        filter.organizationId = new Types.ObjectId(organizationId);
      }

      // Creator filter
      if (createdBy) {
        filter.createdBy = new Types.ObjectId(createdBy);
      }

      // Date range filter
      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
          filter.createdAt.$gte = dateFrom;
        }
        if (dateTo) {
          filter.createdAt.$lte = dateTo;
        }
      }

      // Sorting
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Pagination
      const skip = (page - 1) * limit;

      const [contents, total] = await Promise.all([
        Content.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        Content.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        contents,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error searching content:', error);
      throw error;
    }
  }

  async publish(id: string, version?: string): Promise<IContent | null> {
    try {
      const content = await Content.findById(id);
      if (!content) {
        return null;
      }

      const targetVersion = version || content.currentVersion;
      const versionData = content.versions.find(v => v.version === targetVersion);
      
      if (!versionData) {
        throw new Error(`Version ${targetVersion} not found`);
      }

      content.status = ContentStatus.PUBLISHED;
      content.publishedAt = new Date();
      versionData.publishedAt = new Date();

      const publishedContent = await content.save();
      logger.info(`Content published: ${publishedContent._id}, version: ${targetVersion}`);
      
      return publishedContent;
    } catch (error) {
      logger.error('Error publishing content:', error);
      throw error;
    }
  }

  async archive(id: string): Promise<IContent | null> {
    try {
      const content = await Content.findByIdAndUpdate(
        id,
        { 
          status: ContentStatus.ARCHIVED,
          archivedAt: new Date(),
        },
        { new: true }
      );

      if (content) {
        logger.info(`Content archived: ${id}`);
      }

      return content;
    } catch (error) {
      logger.error('Error archiving content:', error);
      throw error;
    }
  }

  async getVersions(id: string): Promise<ContentVersion[]> {
    try {
      const content = await Content.findById(id).select('versions');
      return content?.versions || [];
    } catch (error) {
      logger.error('Error getting content versions:', error);
      throw error;
    }
  }

  async getVersion(id: string, version: string): Promise<ContentVersion | null> {
    try {
      const content = await Content.findById(id).select('versions');
      if (!content) {
        return null;
      }

      return content.versions.find(v => v.version === version) || null;
    } catch (error) {
      logger.error('Error getting content version:', error);
      throw error;
    }
  }

  async findByOrganization(organizationId: string, page = 1, limit = 20): Promise<ContentSearchResult> {
    try {
      const filter = {
        organizationId: new Types.ObjectId(organizationId),
        status: { $ne: ContentStatus.DELETED },
      };

      const skip = (page - 1) * limit;

      const [contents, total] = await Promise.all([
        Content.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Content.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        contents,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding content by organization:', error);
      throw error;
    }
  }

  async findByCreator(creatorId: string, page = 1, limit = 20): Promise<ContentSearchResult> {
    try {
      const filter = {
        createdBy: new Types.ObjectId(creatorId),
        status: { $ne: ContentStatus.DELETED },
      };

      const skip = (page - 1) * limit;

      const [contents, total] = await Promise.all([
        Content.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        Content.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        contents,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Error finding content by creator:', error);
      throw error;
    }
  }

  async updateAnalytics(contentId: string, updates: Partial<any>): Promise<void> {
    try {
      await ContentAnalyticsModel.findOneAndUpdate(
        { contentId: new Types.ObjectId(contentId) },
        { 
          ...updates,
          lastAccessed: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error updating content analytics:', error);
      throw error;
    }
  }

  async incrementViews(contentId: string): Promise<void> {
    try {
      await ContentAnalyticsModel.findOneAndUpdate(
        { contentId: new Types.ObjectId(contentId) },
        { 
          $inc: { views: 1 },
          lastAccessed: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error incrementing content views:', error);
      throw error;
    }
  }

  async incrementDownloads(contentId: string): Promise<void> {
    try {
      await ContentAnalyticsModel.findOneAndUpdate(
        { contentId: new Types.ObjectId(contentId) },
        { 
          $inc: { downloads: 1 },
          lastAccessed: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error incrementing content downloads:', error);
      throw error;
    }
  }
}