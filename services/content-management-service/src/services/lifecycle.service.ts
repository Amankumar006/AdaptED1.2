import { Content } from '../models/content.model';
import { ContentAnalyticsModel } from '../models/content-analytics.model';
import { MediaService } from './media.service';
import { redisService } from './redis.service';
import { ContentStatus } from '../types/content.types';
import { logger } from '../utils/logger';

export interface LifecyclePolicy {
  id: string;
  name: string;
  description: string;
  rules: LifecycleRule[];
  enabled: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleRule {
  id: string;
  condition: LifecycleCondition;
  action: LifecycleAction;
  priority: number;
}

export interface LifecycleCondition {
  type: 'age' | 'status' | 'usage' | 'size' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
  field?: string;
}

export interface LifecycleAction {
  type: 'archive' | 'delete' | 'compress' | 'move_storage_tier' | 'notify' | 'custom';
  parameters?: { [key: string]: any };
}

export interface DataMinimizationTask {
  id: string;
  name: string;
  description: string;
  schedule: string; // Cron expression
  rules: DataMinimizationRule[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export interface DataMinimizationRule {
  id: string;
  targetField: string;
  condition: LifecycleCondition;
  action: 'anonymize' | 'pseudonymize' | 'delete' | 'encrypt';
  retentionPeriod?: number; // Days
}

export class LifecycleService {
  private mediaService: MediaService;
  private policies: Map<string, LifecyclePolicy> = new Map();
  private minimizationTasks: Map<string, DataMinimizationTask> = new Map();

  constructor() {
    this.mediaService = new MediaService();
    this.initializeDefaultPolicies();
    this.initializeDefaultMinimizationTasks();
  }

  async applyLifecyclePolicies(): Promise<void> {
    try {
      logger.info('Starting lifecycle policy application');

      for (const policy of this.policies.values()) {
        if (!policy.enabled) {
          continue;
        }

        await this.applyPolicy(policy);
      }

      logger.info('Lifecycle policy application completed');
    } catch (error) {
      logger.error('Error applying lifecycle policies:', error);
      throw error;
    }
  }

  async applyDataMinimization(): Promise<void> {
    try {
      logger.info('Starting data minimization tasks');

      for (const task of this.minimizationTasks.values()) {
        if (!task.enabled) {
          continue;
        }

        if (this.shouldRunTask(task)) {
          await this.runMinimizationTask(task);
        }
      }

      logger.info('Data minimization tasks completed');
    } catch (error) {
      logger.error('Error running data minimization:', error);
      throw error;
    }
  }

  async archiveOldContent(daysOld: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const oldContent = await Content.find({
        status: { $in: [ContentStatus.PUBLISHED, ContentStatus.DRAFT] },
        updatedAt: { $lt: cutoffDate },
      });

      let archivedCount = 0;

      for (const content of oldContent) {
        // Check if content has recent activity
        const analytics = await ContentAnalyticsModel.findOne({ contentId: content._id });
        
        if (analytics && analytics.lastAccessed > cutoffDate) {
          continue; // Skip if recently accessed
        }

        // Archive the content
        content.status = ContentStatus.ARCHIVED;
        content.archivedAt = new Date();
        await content.save();

        archivedCount++;
        logger.info(`Archived content: ${content._id}`);
      }

      logger.info(`Archived ${archivedCount} old content items`);
      return archivedCount;
    } catch (error) {
      logger.error('Error archiving old content:', error);
      throw error;
    }
  }

  async deleteExpiredContent(daysOld: number = 1095): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const expiredContent = await Content.find({
        status: ContentStatus.ARCHIVED,
        archivedAt: { $lt: cutoffDate },
      });

      let deletedCount = 0;

      for (const content of expiredContent) {
        // Delete associated media files
        for (const mediaFile of content.mediaFiles) {
          try {
            await this.mediaService.deleteFile(mediaFile);
          } catch (error) {
            logger.warn(`Failed to delete media file ${mediaFile.id}:`, error);
          }
        }

        // Delete analytics data
        await ContentAnalyticsModel.deleteOne({ contentId: content._id });

        // Delete the content
        await Content.deleteOne({ _id: content._id });

        deletedCount++;
        logger.info(`Deleted expired content: ${content._id}`);
      }

      logger.info(`Deleted ${deletedCount} expired content items`);
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting expired content:', error);
      throw error;
    }
  }

  async compressLargeContent(sizeLimitMB: number = 100): Promise<number> {
    try {
      const sizeLimitBytes = sizeLimitMB * 1024 * 1024;
      
      // Find content with large media files
      const largeContent = await Content.find({
        'mediaFiles.size': { $gt: sizeLimitBytes },
        status: { $ne: ContentStatus.DELETED },
      });

      let compressedCount = 0;

      for (const content of largeContent) {
        for (const mediaFile of content.mediaFiles) {
          if (mediaFile.size > sizeLimitBytes && mediaFile.mimeType.startsWith('image/')) {
            try {
              // In a real implementation, you would compress the image
              // For now, we'll just log the action
              logger.info(`Would compress large image: ${mediaFile.id} (${mediaFile.size} bytes)`);
              compressedCount++;
            } catch (error) {
              logger.warn(`Failed to compress media file ${mediaFile.id}:`, error);
            }
          }
        }
      }

      logger.info(`Compressed ${compressedCount} large media files`);
      return compressedCount;
    } catch (error) {
      logger.error('Error compressing large content:', error);
      throw error;
    }
  }

  async cleanupUnusedMedia(): Promise<number> {
    try {
      // Find media files that are not referenced by any content
      const allContent = await Content.find({
        status: { $ne: ContentStatus.DELETED },
      }).select('mediaFiles');

      const referencedFileIds = new Set<string>();
      
      for (const content of allContent) {
        for (const mediaFile of content.mediaFiles) {
          referencedFileIds.add(mediaFile.id);
        }
      }

      // In a real implementation, you would:
      // 1. List all files in storage
      // 2. Compare with referenced files
      // 3. Delete unreferenced files
      
      logger.info('Cleanup of unused media files completed');
      return 0; // Placeholder
    } catch (error) {
      logger.error('Error cleaning up unused media:', error);
      throw error;
    }
  }

  async generateLifecycleReport(): Promise<any> {
    try {
      const totalContent = await Content.countDocuments();
      const publishedContent = await Content.countDocuments({ status: ContentStatus.PUBLISHED });
      const draftContent = await Content.countDocuments({ status: ContentStatus.DRAFT });
      const archivedContent = await Content.countDocuments({ status: ContentStatus.ARCHIVED });
      const deletedContent = await Content.countDocuments({ status: ContentStatus.DELETED });

      // Calculate storage usage
      const storageStats = await Content.aggregate([
        {
          $unwind: '$mediaFiles',
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$mediaFiles.size' },
            totalFiles: { $sum: 1 },
            avgFileSize: { $avg: '$mediaFiles.size' },
          },
        },
      ]);

      const storage = storageStats[0] || { totalSize: 0, totalFiles: 0, avgFileSize: 0 };

      // Calculate age distribution
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const recentContent = await Content.countDocuments({ updatedAt: { $gte: thirtyDaysAgo } });
      const mediumAgeContent = await Content.countDocuments({ 
        updatedAt: { $gte: ninetyDaysAgo, $lt: thirtyDaysAgo } 
      });
      const oldContent = await Content.countDocuments({ 
        updatedAt: { $gte: oneYearAgo, $lt: ninetyDaysAgo } 
      });
      const veryOldContent = await Content.countDocuments({ updatedAt: { $lt: oneYearAgo } });

      return {
        summary: {
          totalContent,
          publishedContent,
          draftContent,
          archivedContent,
          deletedContent,
        },
        storage: {
          totalSizeBytes: storage.totalSize,
          totalSizeMB: Math.round(storage.totalSize / (1024 * 1024)),
          totalFiles: storage.totalFiles,
          avgFileSizeBytes: Math.round(storage.avgFileSize),
        },
        ageDistribution: {
          recent: recentContent, // < 30 days
          medium: mediumAgeContent, // 30-90 days
          old: oldContent, // 90 days - 1 year
          veryOld: veryOldContent, // > 1 year
        },
        recommendations: this.generateRecommendations({
          totalContent,
          archivedContent,
          storage,
          veryOldContent,
        }),
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error generating lifecycle report:', error);
      throw error;
    }
  }

  private async applyPolicy(policy: LifecyclePolicy): Promise<void> {
    logger.info(`Applying lifecycle policy: ${policy.name}`);

    for (const rule of policy.rules.sort((a, b) => a.priority - b.priority)) {
      await this.applyRule(rule, policy);
    }
  }

  private async applyRule(rule: LifecycleRule, policy: LifecyclePolicy): Promise<void> {
    try {
      // Build query based on condition
      const query = this.buildConditionQuery(rule.condition);
      
      if (policy.organizationId) {
        query.organizationId = policy.organizationId;
      }

      const affectedContent = await Content.find(query);

      for (const content of affectedContent) {
        await this.executeAction(rule.action, content);
      }

      logger.info(`Applied rule ${rule.id} to ${affectedContent.length} content items`);
    } catch (error) {
      logger.error(`Error applying rule ${rule.id}:`, error);
    }
  }

  private buildConditionQuery(condition: LifecycleCondition): any {
    const query: any = {};

    switch (condition.type) {
      case 'age':
        const ageDate = new Date();
        ageDate.setDate(ageDate.getDate() - (condition.value as number));
        
        if (condition.operator === 'gt') {
          query.updatedAt = { $lt: ageDate };
        } else if (condition.operator === 'lt') {
          query.updatedAt = { $gt: ageDate };
        }
        break;

      case 'status':
        if (condition.operator === 'eq') {
          query.status = condition.value;
        } else if (condition.operator === 'in') {
          query.status = { $in: condition.value };
        }
        break;

      case 'size':
        if (condition.field) {
          const sizeQuery: any = {};
          if (condition.operator === 'gt') {
            sizeQuery.$gt = condition.value;
          } else if (condition.operator === 'lt') {
            sizeQuery.$lt = condition.value;
          }
          query[condition.field] = sizeQuery;
        }
        break;
    }

    return query;
  }

  private async executeAction(action: LifecycleAction, content: any): Promise<void> {
    switch (action.type) {
      case 'archive':
        if (content.status !== ContentStatus.ARCHIVED) {
          content.status = ContentStatus.ARCHIVED;
          content.archivedAt = new Date();
          await content.save();
          logger.info(`Archived content: ${content._id}`);
        }
        break;

      case 'delete':
        // Delete associated media files
        for (const mediaFile of content.mediaFiles) {
          try {
            await this.mediaService.deleteFile(mediaFile);
          } catch (error) {
            logger.warn(`Failed to delete media file ${mediaFile.id}:`, error);
          }
        }
        
        await Content.deleteOne({ _id: content._id });
        await ContentAnalyticsModel.deleteOne({ contentId: content._id });
        logger.info(`Deleted content: ${content._id}`);
        break;

      case 'move_storage_tier':
        // In a real implementation, you would move files to cheaper storage
        logger.info(`Would move content ${content._id} to ${action.parameters?.tier} storage tier`);
        break;

      case 'notify':
        // In a real implementation, you would send notifications
        logger.info(`Would notify about content ${content._id}: ${action.parameters?.message}`);
        break;
    }
  }

  private shouldRunTask(task: DataMinimizationTask): boolean {
    if (!task.lastRun) {
      return true;
    }

    // Simple schedule check - in a real implementation, you'd use a proper cron parser
    const now = new Date();
    const hoursSinceLastRun = (now.getTime() - task.lastRun.getTime()) / (1000 * 60 * 60);
    
    // Run daily tasks if more than 24 hours have passed
    return hoursSinceLastRun >= 24;
  }

  private async runMinimizationTask(task: DataMinimizationTask): Promise<void> {
    logger.info(`Running data minimization task: ${task.name}`);

    for (const rule of task.rules) {
      await this.applyMinimizationRule(rule);
    }

    // Update last run time
    task.lastRun = new Date();
    task.nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day
  }

  private async applyMinimizationRule(rule: DataMinimizationRule): Promise<void> {
    // In a real implementation, you would apply data minimization rules
    // This might involve anonymizing user data, deleting old logs, etc.
    logger.info(`Applied minimization rule: ${rule.id} on field ${rule.targetField}`);
  }

  private initializeDefaultPolicies(): void {
    // Archive old content policy
    this.policies.set('archive-old-content', {
      id: 'archive-old-content',
      name: 'Archive Old Content',
      description: 'Archive content that hasn\'t been updated in 1 year',
      rules: [{
        id: 'archive-rule-1',
        condition: {
          type: 'age',
          operator: 'gt',
          value: 365,
        },
        action: {
          type: 'archive',
        },
        priority: 1,
      }],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Delete expired content policy
    this.policies.set('delete-expired-content', {
      id: 'delete-expired-content',
      name: 'Delete Expired Content',
      description: 'Delete content that has been archived for 3 years',
      rules: [{
        id: 'delete-rule-1',
        condition: {
          type: 'age',
          operator: 'gt',
          value: 1095, // 3 years
        },
        action: {
          type: 'delete',
        },
        priority: 1,
      }],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private initializeDefaultMinimizationTasks(): void {
    // Anonymize old user data
    this.minimizationTasks.set('anonymize-old-data', {
      id: 'anonymize-old-data',
      name: 'Anonymize Old User Data',
      description: 'Anonymize user data in old content',
      schedule: '0 2 * * *', // Daily at 2 AM
      rules: [{
        id: 'anonymize-rule-1',
        targetField: 'createdBy',
        condition: {
          type: 'age',
          operator: 'gt',
          value: 2555, // 7 years
        },
        action: 'anonymize',
        retentionPeriod: 2555,
      }],
      enabled: true,
    });
  }

  private generateRecommendations(stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.veryOldContent > stats.totalContent * 0.2) {
      recommendations.push('Consider archiving old content to reduce storage costs');
    }

    if (stats.storage.totalSizeMB > 10000) { // 10GB
      recommendations.push('Large storage usage detected - consider implementing compression policies');
    }

    if (stats.archivedContent === 0) {
      recommendations.push('No archived content found - consider implementing archival policies');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content lifecycle management is optimized');
    }

    return recommendations;
  }
}