import { Router } from 'express';
import { LifecycleController } from '../controllers/lifecycle.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();
const lifecycleController = new LifecycleController();

// Lifecycle management routes (admin only)
router.post('/policies/apply',
  authenticateToken,
  requireRole(['institution_admin', 'super_admin']),
  lifecycleController.applyLifecyclePolicies
);

router.post('/data-minimization/apply',
  authenticateToken,
  requireRole(['institution_admin', 'super_admin']),
  lifecycleController.applyDataMinimization
);

router.post('/archive',
  authenticateToken,
  requireRole(['institution_admin', 'super_admin']),
  lifecycleController.archiveOldContent
);

router.post('/delete-expired',
  authenticateToken,
  requireRole(['institution_admin', 'super_admin']),
  lifecycleController.deleteExpiredContent
);

router.post('/compress',
  authenticateToken,
  requireRole(['institution_admin', 'super_admin']),
  lifecycleController.compressLargeContent
);

router.post('/cleanup-media',
  authenticateToken,
  requireRole(['institution_admin', 'super_admin']),
  lifecycleController.cleanupUnusedMedia
);

// Reporting routes
router.get('/report',
  authenticateToken,
  requireRole(['content_manager', 'institution_admin', 'super_admin']),
  lifecycleController.generateLifecycleReport
);

export { router as lifecycleRoutes };