import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateToken, requireRole, requireSelfOrRole, requireSystemRole } from '../middleware/auth.middleware';
import {
  createUserValidation,
  updateUserValidation,
  assignRolesValidation,
  addToOrganizationValidation,
  updateOrganizationRolesValidation,
  uuidParamValidation,
  organizationIdParamValidation,
  searchUsersQueryValidation
} from '../middleware/validation.middleware';

const router = Router();

// Create user (system admin only)
router.post(
  '/',
  authenticateToken,
  requireSystemRole,
  createUserValidation,
  userController.createUser
);

// Search users (authenticated users)
router.get(
  '/search',
  authenticateToken,
  searchUsersQueryValidation,
  userController.searchUsers
);

// Get user by ID (self or admin)
router.get(
  '/:id',
  authenticateToken,
  requireSelfOrRole(['admin', 'user_manager']),
  uuidParamValidation,
  userController.getUserById
);

// Get user by email (admin only)
router.get(
  '/email/:email',
  authenticateToken,
  requireRole(['admin', 'user_manager']),
  userController.getUserByEmail
);

// Update user (self or admin)
router.put(
  '/:id',
  authenticateToken,
  requireSelfOrRole(['admin', 'user_manager']),
  uuidParamValidation,
  updateUserValidation,
  userController.updateUser
);

// Delete user (system admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireSystemRole,
  uuidParamValidation,
  userController.deleteUser
);

// Get user roles
router.get(
  '/:id/roles',
  authenticateToken,
  requireSelfOrRole(['admin', 'user_manager']),
  uuidParamValidation,
  userController.getUserRoles
);

// Assign roles to user (admin only)
router.post(
  '/:id/roles',
  authenticateToken,
  requireRole(['admin', 'user_manager']),
  uuidParamValidation,
  assignRolesValidation,
  userController.assignRoles
);

// Remove roles from user (admin only)
router.delete(
  '/:id/roles',
  authenticateToken,
  requireRole(['admin', 'user_manager']),
  uuidParamValidation,
  assignRolesValidation,
  userController.removeRoles
);

// Add user to organization (admin only)
router.post(
  '/:id/organizations',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  addToOrganizationValidation,
  userController.addToOrganization
);

// Remove user from organization (admin only)
router.delete(
  '/:id/organizations/:organizationId',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  organizationIdParamValidation,
  userController.removeFromOrganization
);

// Update user organization roles (admin only)
router.put(
  '/:id/organizations/:organizationId/roles',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  organizationIdParamValidation,
  updateOrganizationRolesValidation,
  userController.updateOrganizationRoles
);

export { router as userRoutes };