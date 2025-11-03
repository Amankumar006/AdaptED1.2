import { body, param, query } from 'express-validator';
import { OrganizationType } from '../types/user.types';

// User validation rules
export const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('profile.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('profile.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('profile.displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name must not exceed 100 characters'),
  
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  
  body('profile.phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  
  body('profile.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),
  
  body('profile.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
  
  body('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isUUID()
    .withMessage('Each role ID must be a valid UUID')
];

export const updateUserValidation = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('profile.displayName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Display name must not exceed 100 characters'),
  
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  
  body('profile.phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  
  body('profile.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a valid string'),
  
  body('profile.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

export const assignRolesValidation = [
  body('roleIds')
    .isArray({ min: 1 })
    .withMessage('Role IDs array is required and must not be empty'),
  
  body('roleIds.*')
    .isUUID()
    .withMessage('Each role ID must be a valid UUID'),
  
  body('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID')
];

export const addToOrganizationValidation = [
  body('organizationId')
    .isUUID()
    .withMessage('Organization ID is required and must be a valid UUID'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isUUID()
    .withMessage('Each role ID must be a valid UUID')
];

export const updateOrganizationRolesValidation = [
  body('roles')
    .isArray()
    .withMessage('Roles array is required'),
  
  body('roles.*')
    .isUUID()
    .withMessage('Each role ID must be a valid UUID')
];

// Role validation rules
export const createRoleValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Role name must be 1-50 characters and contain only letters, numbers, underscores, and hyphens'),
  
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  
  body('permissions')
    .isArray()
    .withMessage('Permissions array is required'),
  
  body('permissions.*')
    .isUUID()
    .withMessage('Each permission ID must be a valid UUID'),
  
  body('hierarchy')
    .isInt({ min: 0, max: 100 })
    .withMessage('Hierarchy must be an integer between 0 and 100'),
  
  body('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID'),
  
  body('parentRoleId')
    .optional()
    .isUUID()
    .withMessage('Parent role ID must be a valid UUID')
];

export const updateRoleValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  
  body('permissions.*')
    .optional()
    .isUUID()
    .withMessage('Each permission ID must be a valid UUID'),
  
  body('hierarchy')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Hierarchy must be an integer between 0 and 100'),
  
  body('parentRoleId')
    .optional()
    .isUUID()
    .withMessage('Parent role ID must be a valid UUID')
];

export const bulkRoleAssignmentValidation = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs array is required and must not be empty'),
  
  body('userIds.*')
    .isUUID()
    .withMessage('Each user ID must be a valid UUID'),
  
  body('roleIds')
    .isArray({ min: 1 })
    .withMessage('Role IDs array is required and must not be empty'),
  
  body('roleIds.*')
    .isUUID()
    .withMessage('Each role ID must be a valid UUID'),
  
  body('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID'),
  
  body('action')
    .isIn(['add', 'remove', 'replace'])
    .withMessage('Action must be one of: add, remove, replace')
];

// Organization validation rules
export const createOrganizationValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Organization name must be 1-50 characters and contain only letters, numbers, underscores, and hyphens'),
  
  body('displayName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('type')
    .isIn(Object.values(OrganizationType))
    .withMessage(`Type must be one of: ${Object.values(OrganizationType).join(', ')}`),
  
  body('parentOrganizationId')
    .optional()
    .isUUID()
    .withMessage('Parent organization ID must be a valid UUID')
];

export const updateOrganizationValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

export const addMemberValidation = [
  body('userId')
    .isUUID()
    .withMessage('User ID is required and must be a valid UUID'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array'),
  
  body('roles.*')
    .optional()
    .isUUID()
    .withMessage('Each role ID must be a valid UUID')
];

export const updateMemberRolesValidation = [
  body('roles')
    .isArray()
    .withMessage('Roles array is required'),
  
  body('roles.*')
    .isUUID()
    .withMessage('Each role ID must be a valid UUID')
];

export const updateSettingsValidation = [
  body('settings')
    .isObject()
    .withMessage('Settings must be an object'),
  
  body('settings.branding.primaryColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Primary color must be a valid hex color'),
  
  body('settings.branding.secondaryColor')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Secondary color must be a valid hex color'),
  
  body('settings.features.enableGamification')
    .optional()
    .isBoolean()
    .withMessage('enableGamification must be a boolean'),
  
  body('settings.features.enableAI')
    .optional()
    .isBoolean()
    .withMessage('enableAI must be a boolean'),
  
  body('settings.features.enableCollaboration')
    .optional()
    .isBoolean()
    .withMessage('enableCollaboration must be a boolean'),
  
  body('settings.features.enableAnalytics')
    .optional()
    .isBoolean()
    .withMessage('enableAnalytics must be a boolean')
];

// Parameter validation rules
export const uuidParamValidation = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID')
];

export const userIdParamValidation = [
  param('userId')
    .isUUID()
    .withMessage('User ID must be a valid UUID')
];

export const organizationIdParamValidation = [
  param('organizationId')
    .isUUID()
    .withMessage('Organization ID must be a valid UUID')
];

// Query validation rules
export const searchUsersQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'lastLoginAt', 'email', 'firstName', 'lastName'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  query('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('emailVerified must be a boolean'),
  
  query('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID')
];

export const permissionCheckQueryValidation = [
  query('resource')
    .notEmpty()
    .withMessage('Resource is required'),
  
  query('action')
    .notEmpty()
    .withMessage('Action is required'),
  
  query('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID')
];