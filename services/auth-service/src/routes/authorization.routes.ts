import { Router } from 'express';
import { body, param } from 'express-validator';
import { AuthorizationController } from '../controllers/authorization.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';

const router = Router();
const authorizationController = new AuthorizationController();

/**
 * @route GET /authorization/permissions/:userId?
 * @desc Get user permissions
 * @access Private
 */
router.get('/permissions/:userId?', 
  authenticateToken,
  authorizationController.getUserPermissions.bind(authorizationController)
);

/**
 * @route GET /authorization/roles/:userId?
 * @desc Get user roles
 * @access Private
 */
router.get('/roles/:userId?',
  authenticateToken,
  authorizationController.getUserRoles.bind(authorizationController)
);

/**
 * @route POST /authorization/check
 * @desc Check if user has specific permission
 * @access Private
 */
router.post('/check',
  authenticateToken,
  [
    body('resource')
      .notEmpty()
      .withMessage('Resource is required'),
    body('action')
      .notEmpty()
      .withMessage('Action is required'),
    body('resourceId')
      .optional()
      .isString()
      .withMessage('Resource ID must be a string'),
    body('organizationId')
      .optional()
      .isString()
      .withMessage('Organization ID must be a string')
  ],
  authorizationController.checkPermission.bind(authorizationController)
);

/**
 * @route GET /authorization/policies
 * @desc Get authorization policies
 * @access Private (Admin only)
 */
router.get('/policies',
  authenticateToken,
  requireRoles(['admin', 'super_admin']),
  authorizationController.getPolicies.bind(authorizationController)
);

/**
 * @route POST /authorization/policies
 * @desc Add authorization policy
 * @access Private (Super Admin only)
 */
router.post('/policies',
  authenticateToken,
  requireRoles(['super_admin']),
  [
    body('name')
      .notEmpty()
      .withMessage('Policy name is required'),
    body('resource')
      .notEmpty()
      .withMessage('Resource is required'),
    body('action')
      .notEmpty()
      .withMessage('Action is required'),
    body('effect')
      .isIn(['allow', 'deny'])
      .withMessage('Effect must be either allow or deny'),
    body('conditions')
      .optional()
      .isArray()
      .withMessage('Conditions must be an array'),
    body('priority')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Priority must be a non-negative integer')
  ],
  authorizationController.addPolicy.bind(authorizationController)
);

/**
 * @route DELETE /authorization/policies/:policyId
 * @desc Remove authorization policy
 * @access Private (Super Admin only)
 */
router.delete('/policies/:policyId',
  authenticateToken,
  requireRoles(['super_admin']),
  [
    param('policyId')
      .notEmpty()
      .withMessage('Policy ID is required')
  ],
  authorizationController.removePolicy.bind(authorizationController)
);

export { router as authorizationRoutes };