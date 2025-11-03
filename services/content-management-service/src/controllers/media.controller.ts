import { Response, NextFunction } from 'express';
import { MediaService } from '../services/media.service';
import { ContentService } from '../services/content.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export class MediaController {
  private mediaService: MediaService;
  private contentService: ContentService;

  constructor() {
    this.mediaService = new MediaService();
    this.contentService = new ContentService();
  }

  uploadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      // Verify content exists and user has permission
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      // Check if user has permission to upload to this content
      const hasPermission = this.checkUploadPermission(content, req.user!.id);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload files to this content',
        });
      }

      // Upload and process the file
      const mediaFile = await this.mediaService.uploadFile(file, contentId);

      // Update content with new media file
      const updatedContent = await this.contentService.updateContent(
        contentId,
        {
          data: {
            ...content.currentVersion as any,
            mediaFiles: [...(content.mediaFiles || []), mediaFile],
          },
          changelog: `Added media file: ${mediaFile.originalName}`,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: {
          mediaFile,
          content: updatedContent,
        },
        message: 'File uploaded and processed successfully',
      });
    } catch (error) {
      logger.error('Error in uploadFile controller:', error);
      next(error);
    }
  };

  uploadMultipleFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided',
        });
      }

      // Verify content exists and user has permission
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      // Check if user has permission to upload to this content
      const hasPermission = this.checkUploadPermission(content, req.user!.id);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload files to this content',
        });
      }

      // Upload and process all files
      const uploadPromises = files.map(file => 
        this.mediaService.uploadFile(file, contentId)
      );
      
      const mediaFiles = await Promise.all(uploadPromises);

      // Update content with new media files
      const updatedContent = await this.contentService.updateContent(
        contentId,
        {
          data: {
            ...content.currentVersion as any,
            mediaFiles: [...(content.mediaFiles || []), ...mediaFiles],
          },
          changelog: `Added ${mediaFiles.length} media files`,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: {
          mediaFiles,
          content: updatedContent,
        },
        message: `${mediaFiles.length} files uploaded and processed successfully`,
      });
    } catch (error) {
      logger.error('Error in uploadMultipleFiles controller:', error);
      next(error);
    }
  };

  deleteFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, fileId } = req.params;

      // Verify content exists and user has permission
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      // Check if user has permission to delete files from this content
      const hasPermission = this.checkUploadPermission(content, req.user!.id);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete files from this content',
        });
      }

      // Find the media file
      const mediaFile = content.mediaFiles.find(file => file.id === fileId);
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found',
        });
      }

      // Delete file from storage
      await this.mediaService.deleteFile(mediaFile);

      // Update content to remove the media file
      const updatedMediaFiles = content.mediaFiles.filter(file => file.id !== fileId);
      const updatedContent = await this.contentService.updateContent(
        contentId,
        {
          data: {
            ...content.currentVersion as any,
            mediaFiles: updatedMediaFiles,
          },
          changelog: `Deleted media file: ${mediaFile.originalName}`,
        },
        req.user!.id
      );

      res.json({
        success: true,
        data: updatedContent,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteFile controller:', error);
      next(error);
    }
  };

  getFileUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, fileId } = req.params;
      const { quality, format } = req.query;

      // Verify content exists
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      // Find the media file
      const mediaFile = content.mediaFiles.find(file => file.id === fileId);
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found',
        });
      }

      let fileUrl = mediaFile.url;
      let fileName = mediaFile.filename;

      // Check if specific quality/format is requested
      if (quality && mediaFile.processedVersions && mediaFile.processedVersions[quality as string]) {
        fileUrl = mediaFile.processedVersions[quality as string];
        fileName = fileName.replace(/\.[^/.]+$/, `_${quality}.${format || 'mp4'}`);
      } else if (format && mediaFile.processedVersions && mediaFile.processedVersions[format as string]) {
        fileUrl = mediaFile.processedVersions[format as string];
        fileName = fileName.replace(/\.[^/.]+$/, `.${format}`);
      }

      // Generate signed URL for secure access
      const signedUrl = await this.mediaService.getSignedUrl(
        this.extractKeyFromUrl(fileUrl),
        3600 // 1 hour expiration
      );

      res.json({
        success: true,
        data: {
          url: signedUrl,
          filename: fileName,
          mediaFile,
        },
      });
    } catch (error) {
      logger.error('Error in getFileUrl controller:', error);
      next(error);
    }
  };

  getFileThumbnail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, fileId } = req.params;

      // Verify content exists
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      // Find the media file
      const mediaFile = content.mediaFiles.find(file => file.id === fileId);
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found',
        });
      }

      if (!mediaFile.thumbnailUrl) {
        return res.status(404).json({
          success: false,
          message: 'Thumbnail not available for this file',
        });
      }

      // Generate signed URL for thumbnail
      const signedUrl = await this.mediaService.getSignedUrl(
        this.extractKeyFromUrl(mediaFile.thumbnailUrl),
        3600 // 1 hour expiration
      );

      res.json({
        success: true,
        data: {
          thumbnailUrl: signedUrl,
        },
      });
    } catch (error) {
      logger.error('Error in getFileThumbnail controller:', error);
      next(error);
    }
  };

  getFileInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, fileId } = req.params;

      // Verify content exists
      const content = await this.contentService.getContent(contentId);
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      // Find the media file
      const mediaFile = content.mediaFiles.find(file => file.id === fileId);
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Media file not found',
        });
      }

      res.json({
        success: true,
        data: mediaFile,
      });
    } catch (error) {
      logger.error('Error in getFileInfo controller:', error);
      next(error);
    }
  };

  private checkUploadPermission(content: any, userId: string): boolean {
    // Check if user is the content creator
    if (content.createdBy.toString() === userId) {
      return true;
    }

    // Check if user is a collaborator with edit permissions
    const collaborator = content.collaborators.find(
      (collab: any) => collab.userId.toString() === userId && collab.acceptedAt
    );

    if (collaborator) {
      return ['owner', 'editor'].includes(collaborator.role) ||
             collaborator.permissions.includes('write');
    }

    return false;
  }

  private extractKeyFromUrl(url: string): string {
    // Extract S3 key from URL
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part.includes('amazonaws.com'));
    return urlParts.slice(bucketIndex + 1).join('/');
  }
}