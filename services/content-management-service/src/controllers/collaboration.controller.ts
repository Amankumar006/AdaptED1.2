import { Response, NextFunction } from 'express';
import { CollaborationService, OperationalTransform } from '../services/collaboration.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export class CollaborationController {
  private collaborationService: CollaborationService;

  constructor() {
    this.collaborationService = new CollaborationService();
  }

  inviteCollaborator = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { email, role, permissions } = req.body;

      const updatedContent = await this.collaborationService.inviteCollaborator(
        contentId,
        req.user!.id,
        email,
        role,
        permissions
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: updatedContent,
        message: 'Collaborator invited successfully',
      });
    } catch (error) {
      logger.error('Error in inviteCollaborator controller:', error);
      next(error);
    }
  };

  acceptInvitation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;

      const updatedContent = await this.collaborationService.acceptInvitation(
        contentId,
        req.user!.id
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content or invitation not found',
        });
      }

      res.json({
        success: true,
        data: updatedContent,
        message: 'Invitation accepted successfully',
      });
    } catch (error) {
      logger.error('Error in acceptInvitation controller:', error);
      next(error);
    }
  };

  removeCollaborator = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, collaboratorId } = req.params;

      const updatedContent = await this.collaborationService.removeCollaborator(
        contentId,
        req.user!.id,
        collaboratorId
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: updatedContent,
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      logger.error('Error in removeCollaborator controller:', error);
      next(error);
    }
  };

  startSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;

      const session = await this.collaborationService.startCollaborationSession(
        contentId,
        req.user!.id
      );

      res.json({
        success: true,
        data: session,
        message: 'Collaboration session started',
      });
    } catch (error) {
      logger.error('Error in startSession controller:', error);
      next(error);
    }
  };

  endSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;

      await this.collaborationService.endCollaborationSession(
        contentId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Collaboration session ended',
      });
    } catch (error) {
      logger.error('Error in endSession controller:', error);
      next(error);
    }
  };

  getActiveSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;

      const sessions = await this.collaborationService.getActiveSessions(contentId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      logger.error('Error in getActiveSessions controller:', error);
      next(error);
    }
  };

  applyOperation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const operation: OperationalTransform = {
        ...req.body,
        userId: req.user!.id,
        timestamp: new Date(),
      };

      const result = await this.collaborationService.applyOperation(contentId, operation);

      res.json({
        success: true,
        data: result,
        message: 'Operation applied successfully',
      });
    } catch (error) {
      logger.error('Error in applyOperation controller:', error);
      next(error);
    }
  };

  addComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { content, position } = req.body;

      const updatedContent = await this.collaborationService.addComment(
        contentId,
        req.user!.id,
        content,
        position
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.status(201).json({
        success: true,
        data: updatedContent,
        message: 'Comment added successfully',
      });
    } catch (error) {
      logger.error('Error in addComment controller:', error);
      next(error);
    }
  };

  replyToComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, commentId } = req.params;
      const { content } = req.body;

      const updatedContent = await this.collaborationService.replyToComment(
        contentId,
        commentId,
        req.user!.id,
        content
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.status(201).json({
        success: true,
        data: updatedContent,
        message: 'Reply added successfully',
      });
    } catch (error) {
      logger.error('Error in replyToComment controller:', error);
      next(error);
    }
  };

  addSuggestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId } = req.params;
      const { type, content, originalContent, position } = req.body;

      const updatedContent = await this.collaborationService.addSuggestion(
        contentId,
        req.user!.id,
        type,
        content,
        originalContent,
        position
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.status(201).json({
        success: true,
        data: updatedContent,
        message: 'Suggestion added successfully',
      });
    } catch (error) {
      logger.error('Error in addSuggestion controller:', error);
      next(error);
    }
  };

  resolveSuggestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { contentId, suggestionId } = req.params;
      const { status } = req.body;

      const updatedContent = await this.collaborationService.resolveSuggestion(
        contentId,
        suggestionId,
        req.user!.id,
        status
      );

      if (!updatedContent) {
        return res.status(404).json({
          success: false,
          message: 'Content not found',
        });
      }

      res.json({
        success: true,
        data: updatedContent,
        message: `Suggestion ${status} successfully`,
      });
    } catch (error) {
      logger.error('Error in resolveSuggestion controller:', error);
      next(error);
    }
  };
}