import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Content } from '../models/content.model';
import { redisService } from './redis.service';
import {
  IContent,
  ContentCollaboration,
  ContentComment,
  ContentSuggestion,
} from '../types/content.types';
import { logger } from '../utils/logger';

export interface OperationalTransform {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: Date;
  version: number;
}

export interface CollaborationSession {
  contentId: string;
  userId: string;
  sessionId: string;
  lastActivity: Date;
  cursor?: {
    position: number;
    selection?: {
      start: number;
      end: number;
    };
  };
}

export class CollaborationService {
  private sessionPrefix = 'collab:session:';
  private operationPrefix = 'collab:ops:';
  private lockPrefix = 'collab:lock:';

  async inviteCollaborator(
    contentId: string,
    inviterId: string,
    inviteeEmail: string,
    role: 'editor' | 'reviewer' | 'viewer',
    permissions: string[] = []
  ): Promise<IContent | null> {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        return null;
      }

      // Check if inviter has permission to invite
      const inviterCollaboration = content.collaborators.find(
        collab => collab.userId.toString() === inviterId
      );

      if (!inviterCollaboration || !['owner', 'editor'].includes(inviterCollaboration.role)) {
        throw new Error('Insufficient permissions to invite collaborators');
      }

      // Check if user is already a collaborator
      const existingCollaboration = content.collaborators.find(
        collab => collab.userId.toString() === inviteeEmail // In real app, you'd resolve email to userId
      );

      if (existingCollaboration) {
        throw new Error('User is already a collaborator');
      }

      // Add new collaborator
      const newCollaboration: ContentCollaboration = {
        userId: new Types.ObjectId(), // In real app, resolve email to userId
        role,
        permissions: permissions.length > 0 ? permissions : this.getDefaultPermissions(role),
        invitedAt: new Date(),
      };

      content.collaborators.push(newCollaboration);
      const updatedContent = await content.save();

      // TODO: Send invitation email to invitee

      logger.info(`Collaborator invited to content ${contentId}: ${inviteeEmail}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error inviting collaborator:', error);
      throw error;
    }
  }

  async acceptInvitation(contentId: string, userId: string): Promise<IContent | null> {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        return null;
      }

      const collaboration = content.collaborators.find(
        collab => collab.userId.toString() === userId && !collab.acceptedAt
      );

      if (!collaboration) {
        throw new Error('Invitation not found or already accepted');
      }

      collaboration.acceptedAt = new Date();
      const updatedContent = await content.save();

      logger.info(`Collaboration invitation accepted: ${contentId} by ${userId}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error accepting invitation:', error);
      throw error;
    }
  }

  async removeCollaborator(
    contentId: string,
    removerId: string,
    collaboratorId: string
  ): Promise<IContent | null> {
    try {
      const content = await Content.findById(contentId);
      if (!content) {
        return null;
      }

      // Check if remover has permission
      const removerCollaboration = content.collaborators.find(
        collab => collab.userId.toString() === removerId
      );

      if (!removerCollaboration || removerCollaboration.role !== 'owner') {
        throw new Error('Only content owners can remove collaborators');
      }

      // Remove collaborator
      content.collaborators = content.collaborators.filter(
        collab => collab.userId.toString() !== collaboratorId
      );

      const updatedContent = await content.save();

      logger.info(`Collaborator removed from content ${contentId}: ${collaboratorId}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error removing collaborator:', error);
      throw error;
    }
  }

  async startCollaborationSession(
    contentId: string,
    userId: string
  ): Promise<CollaborationSession> {
    try {
      const sessionId = uuidv4();
      const session: CollaborationSession = {
        contentId,
        userId,
        sessionId,
        lastActivity: new Date(),
      };

      const sessionKey = `${this.sessionPrefix}${contentId}:${userId}`;
      await redisService.set(sessionKey, JSON.stringify(session), 3600); // 1 hour TTL

      // Add to active sessions list
      const activeSessionsKey = `${this.sessionPrefix}active:${contentId}`;
      await redisService.setHash(activeSessionsKey, userId, sessionId);
      await redisService.expire(activeSessionsKey, 3600);

      logger.info(`Collaboration session started: ${sessionId} for content ${contentId}`);
      return session;
    } catch (error) {
      logger.error('Error starting collaboration session:', error);
      throw error;
    }
  }

  async endCollaborationSession(contentId: string, userId: string): Promise<void> {
    try {
      const sessionKey = `${this.sessionPrefix}${contentId}:${userId}`;
      await redisService.del(sessionKey);

      // Remove from active sessions list
      const activeSessionsKey = `${this.sessionPrefix}active:${contentId}`;
      const client = redisService.getClient();
      await client.hDel(activeSessionsKey, userId);

      logger.info(`Collaboration session ended for content ${contentId} by user ${userId}`);
    } catch (error) {
      logger.error('Error ending collaboration session:', error);
      throw error;
    }
  }

  async getActiveSessions(contentId: string): Promise<CollaborationSession[]> {
    try {
      const activeSessionsKey = `${this.sessionPrefix}active:${contentId}`;
      const activeSessions = await redisService.getAllHash(activeSessionsKey);
      
      const sessions: CollaborationSession[] = [];
      
      for (const [userId, sessionId] of Object.entries(activeSessions)) {
        const sessionKey = `${this.sessionPrefix}${contentId}:${userId}`;
        const sessionData = await redisService.get(sessionKey);
        
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  async applyOperation(
    contentId: string,
    operation: OperationalTransform
  ): Promise<{ success: boolean; transformedOperation?: OperationalTransform }> {
    try {
      // Acquire lock for content
      const lockKey = `${this.lockPrefix}${contentId}`;
      const lockAcquired = await this.acquireLock(lockKey, 5000); // 5 second timeout

      if (!lockAcquired) {
        throw new Error('Could not acquire lock for content editing');
      }

      try {
        // Get current operations queue
        const operationsKey = `${this.operationPrefix}${contentId}`;
        const existingOpsData = await redisService.get(operationsKey);
        const existingOps: OperationalTransform[] = existingOpsData 
          ? JSON.parse(existingOpsData) 
          : [];

        // Transform operation against existing operations
        const transformedOperation = this.transformOperation(operation, existingOps);

        // Add operation to queue
        existingOps.push(transformedOperation);
        await redisService.set(operationsKey, JSON.stringify(existingOps), 300); // 5 minutes TTL

        // Apply operation to content (simplified - in real implementation, you'd apply to actual content)
        await this.applyOperationToContent(contentId, transformedOperation);

        return { success: true, transformedOperation };
      } finally {
        // Release lock
        await this.releaseLock(lockKey);
      }
    } catch (error) {
      logger.error('Error applying operation:', error);
      throw error;
    }
  }

  async addComment(
    contentId: string,
    userId: string,
    content: string,
    position?: { section: string; offset: number }
  ): Promise<IContent | null> {
    try {
      const contentDoc = await Content.findById(contentId);
      if (!contentDoc) {
        return null;
      }

      const comment: ContentComment = {
        id: uuidv4(),
        userId: new Types.ObjectId(userId),
        content,
        position,
        replies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      contentDoc.comments.push(comment);
      const updatedContent = await contentDoc.save();

      logger.info(`Comment added to content ${contentId} by user ${userId}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error adding comment:', error);
      throw error;
    }
  }

  async replyToComment(
    contentId: string,
    commentId: string,
    userId: string,
    content: string
  ): Promise<IContent | null> {
    try {
      const contentDoc = await Content.findById(contentId);
      if (!contentDoc) {
        return null;
      }

      const comment = contentDoc.comments.find(c => c.id === commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      const reply: ContentComment = {
        id: uuidv4(),
        userId: new Types.ObjectId(userId),
        content,
        replies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comment.replies.push(reply);
      const updatedContent = await contentDoc.save();

      logger.info(`Reply added to comment ${commentId} in content ${contentId}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error replying to comment:', error);
      throw error;
    }
  }

  async addSuggestion(
    contentId: string,
    userId: string,
    type: 'addition' | 'deletion' | 'modification',
    content: string,
    originalContent?: string,
    position?: { section: string; offset: number }
  ): Promise<IContent | null> {
    try {
      const contentDoc = await Content.findById(contentId);
      if (!contentDoc) {
        return null;
      }

      const suggestion: ContentSuggestion = {
        id: uuidv4(),
        userId: new Types.ObjectId(userId),
        type,
        content,
        originalContent,
        position,
        status: 'pending',
        createdAt: new Date(),
      };

      contentDoc.suggestions.push(suggestion);
      const updatedContent = await contentDoc.save();

      logger.info(`Suggestion added to content ${contentId} by user ${userId}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error adding suggestion:', error);
      throw error;
    }
  }

  async resolveSuggestion(
    contentId: string,
    suggestionId: string,
    resolverId: string,
    status: 'accepted' | 'rejected'
  ): Promise<IContent | null> {
    try {
      const contentDoc = await Content.findById(contentId);
      if (!contentDoc) {
        return null;
      }

      const suggestion = contentDoc.suggestions.find(s => s.id === suggestionId);
      if (!suggestion) {
        throw new Error('Suggestion not found');
      }

      suggestion.status = status;
      suggestion.resolvedAt = new Date();
      suggestion.resolvedBy = new Types.ObjectId(resolverId);

      // If accepted, apply the suggestion to content
      if (status === 'accepted') {
        await this.applySuggestionToContent(contentDoc, suggestion);
      }

      const updatedContent = await contentDoc.save();

      logger.info(`Suggestion ${suggestionId} ${status} in content ${contentId}`);
      return updatedContent;
    } catch (error) {
      logger.error('Error resolving suggestion:', error);
      throw error;
    }
  }

  private getDefaultPermissions(role: string): string[] {
    switch (role) {
      case 'editor':
        return ['read', 'write', 'comment', 'suggest'];
      case 'reviewer':
        return ['read', 'comment', 'suggest'];
      case 'viewer':
        return ['read'];
      default:
        return ['read'];
    }
  }

  private async acquireLock(lockKey: string, timeout: number): Promise<boolean> {
    try {
      const lockValue = uuidv4();
      const result = await redisService.set(lockKey, lockValue, Math.ceil(timeout / 1000));
      return true;
    } catch (error) {
      return false;
    }
  }

  private async releaseLock(lockKey: string): Promise<void> {
    try {
      await redisService.del(lockKey);
    } catch (error) {
      logger.error('Error releasing lock:', error);
    }
  }

  private transformOperation(
    operation: OperationalTransform,
    existingOps: OperationalTransform[]
  ): OperationalTransform {
    // Simplified operational transform implementation
    // In a real system, you'd implement proper OT algorithms like those used in Google Docs
    
    let transformedOp = { ...operation };
    
    for (const existingOp of existingOps) {
      if (existingOp.timestamp > operation.timestamp) {
        continue; // Skip operations that happened after this one
      }

      // Transform based on operation types
      if (existingOp.type === 'insert' && transformedOp.position >= existingOp.position) {
        transformedOp.position += existingOp.content?.length || 0;
      } else if (existingOp.type === 'delete' && transformedOp.position > existingOp.position) {
        transformedOp.position -= existingOp.length || 0;
      }
    }

    transformedOp.id = uuidv4(); // Assign new ID to transformed operation
    return transformedOp;
  }

  private async applyOperationToContent(
    contentId: string,
    operation: OperationalTransform
  ): Promise<void> {
    // In a real implementation, you would apply the operation to the actual content
    // This might involve updating specific fields in the content document
    // For now, we'll just log the operation
    logger.info(`Applied operation ${operation.id} to content ${contentId}`);
  }

  private async applySuggestionToContent(
    content: IContent,
    suggestion: ContentSuggestion
  ): Promise<void> {
    // In a real implementation, you would apply the suggestion to the content
    // This might involve modifying the content data based on the suggestion type
    logger.info(`Applied suggestion ${suggestion.id} to content ${content._id}`);
  }
}