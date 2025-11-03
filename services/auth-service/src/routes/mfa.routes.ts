import { Router } from 'express';
import { body, param } from 'express-validator';
import { MFAController } from '../controllers/mfa.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const mfaController = new MFAController();

/**
 * @route GET /mfa/status
 * @desc Get user's MFA status and available methods
 * @access Private
 */
router.get('/status', 
  authenticateToken,
  mfaController.getMFAStatus.bind(mfaController)
);

/**
 * TOTP Routes
 */

/**
 * @route POST /mfa/totp/setup
 * @desc Setup TOTP MFA
 * @access Private
 */
router.post('/totp/setup',
  authenticateToken,
  mfaController.setupTOTP.bind(mfaController)
);

/**
 * @route POST /mfa/totp/verify-setup
 * @desc Verify TOTP setup with code
 * @access Private
 */
router.post('/totp/verify-setup',
  authenticateToken,
  [
    body('code')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('TOTP code must be 6 digits')
  ],
  mfaController.verifyTOTPSetup.bind(mfaController)
);

/**
 * @route POST /mfa/verify
 * @desc Verify MFA code during authentication
 * @access Public
 */
router.post('/verify',
  [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required'),
    body('code')
      .notEmpty()
      .withMessage('MFA code is required'),
    body('method')
      .isIn(['totp', 'backup', 'recovery'])
      .withMessage('Method must be one of: totp, backup, recovery')
  ],
  mfaController.verifyMFA.bind(mfaController)
);

/**
 * Biometric Routes
 */

/**
 * @route POST /mfa/biometric/challenge
 * @desc Generate biometric authentication challenge
 * @access Private
 */
router.post('/biometric/challenge',
  authenticateToken,
  mfaController.generateBiometricChallenge.bind(mfaController)
);

/**
 * @route POST /mfa/biometric/verify
 * @desc Verify biometric authentication response
 * @access Private
 */
router.post('/biometric/verify',
  authenticateToken,
  [
    body('response')
      .notEmpty()
      .withMessage('Biometric response is required')
  ],
  mfaController.verifyBiometric.bind(mfaController)
);

/**
 * @route POST /mfa/biometric/register
 * @desc Register biometric credential
 * @access Private
 */
router.post('/biometric/register',
  authenticateToken,
  [
    body('credentialData')
      .notEmpty()
      .withMessage('Credential data is required'),
    body('deviceName')
      .optional()
      .isString()
      .withMessage('Device name must be a string')
  ],
  mfaController.registerBiometric.bind(mfaController)
);

/**
 * @route DELETE /mfa/biometric/:credentialId
 * @desc Remove biometric credential
 * @access Private
 */
router.delete('/biometric/:credentialId',
  authenticateToken,
  [
    param('credentialId')
      .notEmpty()
      .withMessage('Credential ID is required')
  ],
  mfaController.removeBiometric.bind(mfaController)
);

/**
 * Backup and Recovery Routes
 */

/**
 * @route POST /mfa/backup-codes/regenerate
 * @desc Regenerate backup codes
 * @access Private
 */
router.post('/backup-codes/regenerate',
  authenticateToken,
  mfaController.regenerateBackupCodes.bind(mfaController)
);

/**
 * @route POST /mfa/recovery-codes/generate
 * @desc Generate recovery codes
 * @access Private
 */
router.post('/recovery-codes/generate',
  authenticateToken,
  mfaController.generateRecoveryCodes.bind(mfaController)
);

/**
 * @route POST /mfa/disable
 * @desc Disable MFA for user
 * @access Private
 */
router.post('/disable',
  authenticateToken,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required to disable MFA'),
    body('mfaCode')
      .notEmpty()
      .withMessage('MFA code is required to disable MFA')
  ],
  mfaController.disableMFA.bind(mfaController)
);

export { router as mfaRoutes };