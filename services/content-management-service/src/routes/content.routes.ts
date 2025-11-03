import { Router } from 'express';
import { ContentController } from '../controllers/content.controller';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth.middleware';
import {
  validateCreateContent,
  validateUpdateContent,
  validateSearchContent,
  validatePublishContent,
  validateObjectId,
  validateVersion,
} from '../middleware/validation.middleware';

const router = Router();
const contentController = new ContentController();

// Public routes (with authentication)
router.get('/search', authenticateToken, validateSearchContent, contentController.searchContent);
router.get('/my', authenticateToken, contentController.getMyContent);
router.get('/:id', authenticateToken, validateObjectId('id'), contentController.getContent);
router.get('/:id/versions', authenticateToken, validateObjectId('id'), contentController.getContentVersions);
router.get('/:id/versions/:version', authenticateToken, validateObjectId('id'), validateVersion, contentController.getContentVersion);
router.post('/:id/download', authenticateToken, validateObjectId('id'), contentController.downloadContent);

// Organization-specific routes
router.get('/organization/:organizationId', 
  authenticateToken, 
  validateObjectId('organizationId'), 
  contentController.getContentByOrganization
);

// Content creation and modification routes
router.post('/', 
  authenticateToken, 
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateCreateContent, 
  contentController.createContent
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('id'),
  validateUpdateContent, 
  contentController.updateContent
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('id'),
  contentController.deleteContent
);

// Publishing and archiving routes
router.post('/:id/publish', 
  authenticateToken, 
  requireRole(['content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('id'),
  validatePublishContent, 
  contentController.publishContent
);

router.post('/:id/archive', 
  authenticateToken, 
  requireRole(['content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('id'),
  contentController.archiveContent
);

export { router as contentRoutes };