import { Response, NextFunction } from 'express';
import { ContentService } from '../services/content.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export class ContentController {
  private contentService: ContentService;

  constructor() {
    this.contentService = new ContentService();
  }

  createContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const content = await this.contentService.createContent(req.body, req.user!.id);
      
      res.status(201).json({
        success: true,
        data: content,
        message: 'Content created successfully',
      });
    } catch (error) {
      logger.error('Error in createContent controller:', error);
      next(error);
    }
  };

  getContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const includeAnalytics = req.query.includeAnalytics === 'true';
      
      const content = await this.contentService.getContent(id, includeAnalytics);
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: content,
      });
    } catch (error) {
      logger.error('Error in getContent controller:', error);
      next(error);
    }
  };

  updateContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const content = await this.contentService.updateContent(id, req.body, req.user!.id);
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: content,
        message: 'Content updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateContent controller:', error);
      next(error);
    }
  };

  deleteContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const result = await this.contentService.deleteContent(id, req.user!.id);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        message: 'Content deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteContent controller:', error);
      next(error);
    }
  };

  searchContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const searchQuery = req.query as any;
      
      const result = await this.contentService.searchContent(searchQuery);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in searchContent controller:', error);
      next(error);
    }
  };

  publishContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const content = await this.contentService.publishContent(id, req.body, req.user!.id);
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: content,
        message: 'Content published successfully',
      });
    } catch (error) {
      logger.error('Error in publishContent controller:', error);
      next(error);
    }
  };

  archiveContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const content = await this.contentService.archiveContent(id, req.user!.id);
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: content,
        message: 'Content archived successfully',
      });
    } catch (error) {
      logger.error('Error in archiveContent controller:', error);
      next(error);
    }
  };

  getContentVersions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const versions = await this.contentService.getContentVersions(id);
      
      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      logger.error('Error in getContentVersions controller:', error);
      next(error);
    }
  };

  getContentVersion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id, version } = req.params;
      
      const versionData = await this.contentService.getContentVersion(id, version);
      
      if (!versionData) {
        return res.status(404).json({
          success: false,
          message: 'Content version not found',
        });
      }

      res.json({
        success: true,
        data: versionData,
      });
    } catch (error) {
      logger.error('Error in getContentVersion controller:', error);
      next(error);
    }
  };

  getContentByOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await this.contentService.getContentByOrganization(organizationId, page, limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getContentByOrganization controller:', error);
      next(error);
    }
  };

  getMyContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await this.contentService.getContentByCreator(req.user!.id, page, limit);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in getMyContent controller:', error);
      next(error);
    }
  };

  downloadContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Record the download
      await this.contentService.recordDownload(id);
      
      // In a real implementation, you would:
      // 1. Get the content and its files
      // 2. Create a zip archive or redirect to file URL
      // 3. Stream the file to the client
      
      // For now, we'll just return a success message
      res.json({
        success: true,
        message: 'Download recorded successfully',
        // downloadUrl: 'https://example.com/download/content.zip'
      });
    } catch (error) {
      logger.error('Error in downloadContent controller:', error);
      next(error);
    }
  };
}