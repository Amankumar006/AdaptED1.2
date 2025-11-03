import { Router } from 'express';
import { organizationController } from '../controllers/organization.controller';
import { authenticateToken, requireRole, requireOrganization, requireSystemRole } from '../middleware/auth.middleware';
import {
  createOrganizationValidation,
  updateOrganizationValidation,
  addMemberValidation,
  updateMemberRolesValidation,
  updateSettingsValidation,
  uuidParamValidation,
  userIdParamValidation
} from '../middleware/validation.middleware';

const router = Router();

// Create organization (system admin only)
router.post(
  '/',
  authenticateToken,
  requireSystemRole,
  createOrganizationValidation,
  organizationController.createOrganization
);

// Get all organizations (admin only)
router.get(
  '/',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  organizationController.getAllOrganizations
);

// Get organization hierarchy (admin only)
router.get(
  '/hierarchy',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  organizationController.getOrganizationHierarchy
);

// Get organization by ID (organization member or admin)
router.get(
  '/:id',
  authenticateToken,
  uuidParamValidation,
  organizationController.getOrganizationById
);

// Get organization by name (admin only)
router.get(
  '/name/:name',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  organizationController.getOrganizationByName
);

// Update organization (admin only)
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  updateOrganizationValidation,
  organizationController.updateOrganization
);

// Delete organization (system admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireSystemRole,
  uuidParamValidation,
  organizationController.deleteOrganization
);

// Get child organizations
router.get(
  '/:id/children',
  authenticateToken,
  uuidParamValidation,
  organizationController.getChildOrganizations
);

// Get organization members (organization member or admin)
router.get(
  '/:id/members',
  authenticateToken,
  uuidParamValidation,
  organizationController.getMembers
);

// Add member to organization (admin only)
router.post(
  '/:id/members',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  addMemberValidation,
  organizationController.addMember
);

// Remove member from organization (admin only)
router.delete(
  '/:id/members/:userId',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  userIdParamValidation,
  organizationController.removeMember
);

// Update member roles (admin only)
router.put(
  '/:id/members/:userId/roles',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  userIdParamValidation,
  updateMemberRolesValidation,
  organizationController.updateMemberRoles
);

// Get organization settings (organization member or admin)
router.get(
  '/:id/settings',
  authenticateToken,
  uuidParamValidation,
  organizationController.getSettings
);

// Update organization settings (admin only)
router.put(
  '/:id/settings',
  authenticateToken,
  requireRole(['admin', 'organization_manager']),
  uuidParamValidation,
  updateSettingsValidation,
  organizationController.updateSettings
);

// Get user organizations
router.get(
  '/users/:userId',
  authenticateToken,
  userIdParamValidation,
  organizationController.getUserOrganizations
);

export { router as organizationRoutes };