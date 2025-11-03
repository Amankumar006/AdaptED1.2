import { body, ValidationChain } from 'express-validator';

/**
 * Validation rules for login
 */
export const validateLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  
  body('mfaCode')
    .optional()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('MFA code must be 6 digits')
];

/**
 * Validation rules for token refresh
 */
export const validateRefreshToken: ValidationChain[] = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

/**
 * Validation rules for logout
 */
export const validateLogout: ValidationChain[] = [
  body('refreshToken')
    .optional()
    .notEmpty()
    .withMessage('Refresh token must not be empty if provided')
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

/**
 * Validation rules for user registration
 */
export const validateRegistration: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  
  body('organizationId')
    .optional()
    .isUUID()
    .withMessage('Organization ID must be a valid UUID')
];

/**
 * Validation rules for MFA setup
 */
export const validateMFASetup: ValidationChain[] = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('MFA code must be 6 digits')
];

/**
 * Validation rules for MFA verification
 */
export const validateMFAVerification: ValidationChain[] = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('MFA code must be 6 digits')
];

/**
 * Validation rules for password reset request
 */
export const validatePasswordResetRequest: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

/**
 * Validation rules for OAuth callback
 */
export const validateOAuthCallback: ValidationChain[] = [
  body('code')
    .optional()
    .notEmpty()
    .withMessage('Authorization code must not be empty if provided'),
  
  body('state')
    .optional()
    .notEmpty()
    .withMessage('State parameter must not be empty if provided')
];

/**
 * Validation rules for SAML response
 */
export const validateSAMLResponse: ValidationChain[] = [
  body('SAMLResponse')
    .notEmpty()
    .withMessage('SAML response is required'),
  
  body('RelayState')
    .optional()
    .notEmpty()
    .withMessage('Relay state must not be empty if provided')
];