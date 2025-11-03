import { Router } from 'express';
import { MediaController } from '../controllers/media.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { uploadSingle, uploadMultiple } from '../middleware/upload.middleware';
import { validateObjectId } from '../middleware/validation.middleware';

const router = Router();
const mediaController = new MediaController();

// File upload routes
router.post('/:contentId/upload',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  uploadSingle('file'),
  mediaController.uploadFile
);

router.post('/:contentId/upload-multiple',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  uploadMultiple('files', 10),
  mediaController.uploadMultipleFiles
);

// File access routes
router.get('/:contentId/files/:fileId',
  authenticateToken,
  validateObjectId('contentId'),
  mediaController.getFileInfo
);

router.get('/:contentId/files/:fileId/url',
  authenticateToken,
  validateObjectId('contentId'),
  mediaController.getFileUrl
);

router.get('/:contentId/files/:fileId/thumbnail',
  authenticateToken,
  validateObjectId('contentId'),
  mediaController.getFileThumbnail
);

// File management routes
router.delete('/:contentId/files/:fileId',
  authenticateToken,
  requireRole(['teacher', 'content_manager', 'institution_admin', 'super_admin']),
  validateObjectId('contentId'),
  mediaController.deleteFile
);

export { router as mediaRoutes };