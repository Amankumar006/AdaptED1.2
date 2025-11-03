import { Response, NextFunction } from 'express';
import { LifecycleService } from '../services/lifecycle.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export class LifecycleController {
  private lifecycleService: LifecycleService;

  constructor() {
    this.lifecycleService = new LifecycleService();
  }

  applyLifecyclePolicies = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.lifecycleService.applyLifecyclePolicies();

      res.json({
        success: true,
        message: 'Lifecycle policies applied successfully',
      });
    } catch (error) {
      logger.error('Error in applyLifecyclePolicies controller:', error);
      next(error);
    }
  };

  applyDataMinimization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.lifecycleService.applyDataMinimization();

      res.json({
        success: true,
        message: 'Data minimization tasks completed successfully',
      });
    } catch (error) {
      logger.error('Error in applyDataMinimization controller:', error);
      next(error);
    }
  };

  archiveOldContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { daysOld = 365 } = req.query;
      const archivedCount = await this.lifecycleService.archiveOldContent(Number(daysOld));

      res.json({
        success: true,
        data: { archivedCount },
        message: `Archived ${archivedCount} old content items`,
      });
    } catch (error) {
      logger.error('Error in archiveOldContent controller:', error);
      next(error);
    }
  };

  deleteExpiredContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { daysOld = 1095 } = req.query;
      const deletedCount = await this.lifecycleService.deleteExpiredContent(Number(daysOld));

      res.json({
        success: true,
        data: { deletedCount },
        message: `Deleted ${deletedCount} expired content items`,
      });
    } catch (error) {
      logger.error('Error in deleteExpiredContent controller:', error);
      next(error);
    }
  };

  generateLifecycleReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const report = await this.lifecycleService.generateLifecycleReport();

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error('Error in generateLifecycleReport controller:', error);
      next(error);
    }
  };

  compressLargeContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sizeLimitMB = 100 } = req.query;
      const compressedCount = await this.lifecycleService.compressLargeContent(Number(sizeLimitMB));

      res.json({
        success: true,
        data: { compressedCount },
        message: `Compressed ${compressedCount} large media files`,
      });
    } catch (error) {
      logger.error('Error in compressLargeContent controller:', error);
      next(error);
    }
  };

  cleanupUnusedMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const cleanedCount = await this.lifecycleService.cleanupUnusedMedia();

      res.json({
        success: true,
        data: { cleanedCount },
        message: `Cleaned up ${cleanedCount} unused media files`,
      });
    } catch (error) {
      logger.error('Error in cleanupUnusedMedia controller:', error);
      next(error);
    }
  };
}