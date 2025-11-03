import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateObjectId } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();
const collaborationController = new CollaborationController();

// Validation middleware for collaboration requests
const validateInviteCollaborator = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('editor', 'reviewer', 'viewer').required(),
    permissions: Joi.array().items(Joi.string()).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details,
    });
  }
  next();
};

const validateOperation = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    type: Joi.string().valid('insert', 'delete', 'retain').required(),
    position: Joi.number().integer().min(0).required(),
    content: Joi.string().when('type', { is: 'insert', then: Joi.required() }),
    length: Joi.number().integer().min(1).when('type', { is: 'delete', then: Joi.required() }),
    version: Joi.number().integer().min(0).required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details,
    });
  }
  next();
};

const validateComment = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    position: Joi.object({
      section: Joi.string().required(),
      offset: Joi.number().integer().min(0).required(),
    }).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details,
    });
  }
  next();
};

const validateSuggestion = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    type: Joi.string().valid('addition', 'deletion', 'modification').required(),
    content: Joi.string().min(1).max(2000).required(),
    originalContent: Joi.string().max(2000).optional(),
    position: Joi.object({
      section: Joi.string().required(),
      offset: Joi.number().integer().min(0).required(),
    }).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details,
    });
  }
  next();
};

const validateResolveSuggestion = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    status: Joi.string().valid('accepted', 'rejected').required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details,
    });
  }
  next();
};

// Collaborator management routes
router.post('/:contentId/collaborators',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  validateInviteCollaborator,
  collaborationController.inviteCollaborator
);

router.post('/:contentId/accept-invitation',
  authenticateToken,
  validateObjectId('contentId'),
  collaborationController.acceptInvitation
);

router.delete('/:contentId/collaborators/:collaboratorId',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  validateObjectId('collaboratorId'),
  collaborationController.removeCollaborator
);

// Collaboration session routes
router.post('/:contentId/sessions/start',
  authenticateToken,
  validateObjectId('contentId'),
  collaborationController.startSession
);

router.post('/:contentId/sessions/end',
  authenticateToken,
  validateObjectId('contentId'),
  collaborationController.endSession
);

router.get('/:contentId/sessions',
  authenticateToken,
  validateObjectId('contentId'),
  collaborationController.getActiveSessions
);

// Real-time editing routes
router.post('/:contentId/operations',
  authenticateToken,
  validateObjectId('contentId'),
  validateOperation,
  collaborationController.applyOperation
);

// Comment routes
router.post('/:contentId/comments',
  authenticateToken,
  validateObjectId('contentId'),
  validateComment,
  collaborationController.addComment
);

router.post('/:contentId/comments/:commentId/replies',
  authenticateToken,
  validateObjectId('contentId'),
  validateComment,
  collaborationController.replyToComment
);

// Suggestion routes
router.post('/:contentId/suggestions',
  authenticateToken,
  validateObjectId('contentId'),
  validateSuggestion,
  collaborationController.addSuggestion
);

router.put('/:contentId/suggestions/:suggestionId',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  validateResolveSuggestion,
  collaborationController.resolveSuggestion
);

export { router as collaborationRoutes };