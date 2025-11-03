import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { authenticateToken, requireRole, requireSystemRole } from '../middleware/auth.middleware';
import {
  createRoleValidation,
  updateRoleValidation,
  bulkRoleAssignmentValidation,
  uuidParamValidation,
  userIdParamValidation,
  permissionCheckQueryValidation
} from '../middleware/validation.middleware';

const router = Router();

// Create role (admin only)
router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'role_manager']),
  createRoleValidation,
  roleController.createRole
);

// Get all roles (authenticated users)
router.get(
  '/',
  authenticateToken,
  roleController.getAllRoles
);

// Get role hierarchy (authenticated users)
router.get(
  '/hierarchy',
  authenticateToken,
  roleController.getRoleHierarchy
);

// Bulk assign roles (admin only)
router.post(
  '/bulk-assign',
  authenticateToken,
  requireRole(['admin', 'role_manager']),
  bulkRoleAssignmentValidation,
  roleController.bulkAssignRoles
);

// Get role by ID (authenticated users)
router.get(
  '/:id',
  authenticateToken,
  uuidParamValidation,
  roleController.getRoleById
);

// Get role by name (authenticated users)
router.get(
  '/name/:name',
  authenticateToken,
  roleController.getRoleByName
);

// Update role (admin only)
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'role_manager']),
  uuidParamValidation,
  updateRoleValidation,
  roleController.updateRole
);

// Delete role (system admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireSystemRole,
  uuidParamValidation,
  roleController.deleteRole
);

// Get user roles
router.get(
  '/users/:userId',
  authenticateToken,
  userIdParamValidation,
  roleController.getUserRoles
);

// Check user permission
router.get(
  '/users/:userId/permissions/check',
  authenticateToken,
  userIdParamValidation,
  permissionCheckQueryValidation,
  roleController.checkPermission
);

// Get user permissions
router.get(
  '/users/:userId/permissions',
  authenticateToken,
  userIdParamValidation,
  roleController.getUserPermissions
);

export { router as roleRoutes };