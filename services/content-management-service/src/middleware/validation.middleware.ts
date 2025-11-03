import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ContentType, DifficultyLevel } from '../types/content.types';
import { logger } from '../utils/logger';

const contentMetadataSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).max(2000).required(),
  keywords: Joi.array().items(Joi.string().max(50)).max(20),
  language: Joi.string().length(2).default('en'),
  subject: Joi.string().min(1).max(100).required(),
  gradeLevel: Joi.string().min(1).max(50).required(),
  duration: Joi.number().min(0).max(86400), // Max 24 hours in seconds
  difficulty: Joi.string().valid(...Object.values(DifficultyLevel)).required(),
  learningObjectives: Joi.array().items(Joi.string().max(500)).max(10),
  prerequisites: Joi.array().items(Joi.string().max(200)).max(10),
  standards: Joi.array().items(Joi.string().max(100)).max(20),
});

export const validateCreateContent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    type: Joi.string().valid(...Object.values(ContentType)).required(),
    metadata: contentMetadataSchema.required(),
    data: Joi.object().required(),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    organizationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Content creation validation failed:', error.details);
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateUpdateContent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    metadata: contentMetadataSchema,
    data: Joi.object(),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    changelog: Joi.string().max(500),
  }).min(1);

  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Content update validation failed:', error.details);
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateSearchContent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    query: Joi.string().max(200),
    type: Joi.string().valid(...Object.values(ContentType)),
    status: Joi.string().valid('draft', 'review', 'published', 'archived'),
    tags: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string().max(50))
    ),
    difficulty: Joi.string().valid(...Object.values(DifficultyLevel)),
    subject: Joi.string().max(100),
    gradeLevel: Joi.string().max(50),
    language: Joi.string().length(2),
    organizationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    createdBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'views').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    logger.warn('Content search validation failed:', error.details);
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  // Convert tags string to array if needed
  if (value.tags && typeof value.tags === 'string') {
    value.tags = value.tags.split(',').map((tag: string) => tag.trim());
  }

  req.query = value;
  next();
};

export const validatePublishContent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    version: Joi.string().pattern(/^\d+\.\d+\.\d+$/),
    publishAt: Joi.date().iso().min('now'),
    notifyCollaborators: Joi.boolean().default(true),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    logger.warn('Content publish validation failed:', error.details);
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  req.body = value;
  next();
};

export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: `${paramName} must be a valid MongoDB ObjectId`,
      });
    }
    next();
  };
};

export const validateVersion = (req: Request, res: Response, next: NextFunction) => {
  const version = req.params.version;
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    return res.status(400).json({
      error: 'Invalid version format',
      message: 'Version must be in semantic versioning format (e.g., 1.0.0)',
    });
  }
  next();
};