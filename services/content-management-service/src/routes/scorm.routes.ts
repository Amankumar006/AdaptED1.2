import { Router } from 'express';
import { SCORMController } from '../controllers/scorm.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';
import { validateObjectId } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();
const scormController = new SCORMController();

// Validation middleware for xAPI statements
const validateXAPIStatement = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    actor: Joi.object({
      name: Joi.string().required(),
      mbox: Joi.string().email().required(),
    }).required(),
    verb: Joi.object({
      id: Joi.string().uri().required(),
      display: Joi.object().pattern(Joi.string(), Joi.string()).required(),
    }).required(),
    object: Joi.object({
      id: Joi.string().required(),
      definition: Joi.object({
        name: Joi.object().pattern(Joi.string(), Joi.string()),
        description: Joi.object().pattern(Joi.string(), Joi.string()),
        type: Joi.string(),
      }),
    }).required(),
    result: Joi.object({
      score: Joi.object({
        scaled: Joi.number().min(0).max(1),
        raw: Joi.number(),
        min: Joi.number(),
        max: Joi.number(),
      }),
      completion: Joi.boolean(),
      success: Joi.boolean(),
      duration: Joi.string(),
    }),
    context: Joi.object({
      instructor: Joi.object({
        name: Joi.string(),
        mbox: Joi.string().email(),
      }),
      team: Joi.object({
        name: Joi.string(),
        mbox: Joi.string().email(),
      }),
      contextActivities: Joi.object({
        parent: Joi.array(),
        grouping: Joi.array(),
        category: Joi.array(),
        other: Joi.array(),
      }),
    }),
    timestamp: Joi.date().iso(),
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

const validateExportRequest = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    contentIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).required(),
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

// SCORM package routes
router.post('/scorm/import',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  uploadSingle('package'),
  scormController.importSCORMPackage
);

router.get('/scorm/export/:contentId',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  scormController.exportSCORMPackage
);

router.post('/scorm/validate',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  uploadSingle('package'),
  scormController.validateSCORMPackage
);

// IMS Common Cartridge routes
router.post('/ims/import',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  uploadSingle('cartridge'),
  scormController.importIMSCommonCartridge
);

router.post('/ims/export',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateExportRequest,
  scormController.exportIMSCommonCartridge
);

// xAPI (Tin Can API) routes
router.post('/xapi/:contentId/statements',
  authenticateToken,
  validateObjectId('contentId'),
  validateXAPIStatement,
  scormController.trackXAPIStatement
);

router.get('/xapi/:contentId/statements',
  authenticateToken,
  validateObjectId('contentId'),
  scormController.getXAPIStatements
);

export { router as scormRoutes };