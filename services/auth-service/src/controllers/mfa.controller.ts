import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { mfaService } from '../services/mfa.service';
import { logger } from '../utils/logger';

export class MFAController {
  /**
   * Setup TOTP MFA
   */
  async setupTOTP(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const userId = req.user.sub;
      const userEmail = req.user.email;

      // Check if MFA is already enabled
      const mfaEnabled = await mfaService.isMFAEnabled(userId);
      if (mfaEnabled) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'MFA is already enabled for this user',
            code: 'MFA_ALREADY_ENABLED'
          }
        });
        return;
      }

      const mfaSetup = await mfaService.setupTOTP(userId, userEmail);

      res.status(200).json({
        message: 'TOTP setup initiated',
        qrCode: mfaSetup.qrCode,
        backupCodes: mfaSetup.backupCodes,
        instructions: 'Scan the QR code with your authenticator app and verify with a code to complete setup'
      });
    } catch (error) {
      logger.error('TOTP setup error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'MFA setup service error',
          code: 'MFA_SETUP_ERROR'
        }
      });
    }
  }

  /**
   * Verify TOTP setup
   */
  async verifyTOTPSetup(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { code } = req.body;
      const userId = req.user.sub;

      const setupResult = await mfaService.verifyTOTPSetup(userId, code);

      // TODO: Update user in database to enable MFA and store secret and backup codes
      logger.info(`MFA enabled for user ${userId}`);

      res.status(200).json({
        message: 'TOTP MFA enabled successfully',
        backupCodes: setupResult.backupCodes
      });
    } catch (error) {
      logger.error('TOTP verification error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'MFA setup not found or expired') {
          res.status(400).json({
            error: {
              type: 'VALIDATION_ERROR',
              message: 'MFA setup expired. Please start setup again',
              code: 'MFA_SETUP_EXPIRED'
            }
          });
          return;
        }
        
        if (error.message === 'Invalid TOTP code') {
          res.status(400).json({
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Invalid verification code',
              code: 'INVALID_MFA_CODE'
            }
          });
          return;
        }
      }

      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'MFA verification service error',
          code: 'MFA_VERIFICATION_ERROR'
        }
      });
    }
  }

  /**
   * Verify MFA code during authentication
   */
  async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      const { userId, code, method } = req.body;

      // TODO: Get user's MFA secret from database
      let isValid = false;

      switch (method) {
        case 'totp':
          // TODO: Get user's TOTP secret from database
          const totpSecret = 'mock-secret'; // Replace with actual secret
          isValid = await mfaService.verifyTOTP(totpSecret, code);
          break;

        case 'backup':
          // TODO: Get user's backup codes from database
          const backupCodes = ['mock-backup-codes']; // Replace with actual codes
          isValid = await mfaService.verifyBackupCode(userId, code, backupCodes);
          break;

        case 'recovery':
          isValid = await mfaService.verifyRecoveryCode(userId, code);
          break;

        default:
          res.status(400).json({
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Invalid MFA method',
              code: 'INVALID_MFA_METHOD'
            }
          });
          return;
      }

      res.status(200).json({
        valid: isValid,
        method
      });
    } catch (error) {
      logger.error('MFA verification error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'MFA verification service error',
          code: 'MFA_VERIFICATION_ERROR'
        }
      });
    }
  }

  /**
   * Generate biometric challenge
   */
  async generateBiometricChallenge(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const userId = req.user.sub;
      const challenge = await mfaService.generateBiometricChallenge(userId);

      res.status(200).json({
        challenge: challenge.challenge,
        allowCredentials: challenge.allowCredentials,
        timeout: challenge.timeout,
        userVerification: challenge.userVerification
      });
    } catch (error) {
      logger.error('Biometric challenge generation error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Biometric challenge service error',
          code: 'BIOMETRIC_CHALLENGE_ERROR'
        }
      });
    }
  }

  /**
   * Verify biometric authentication
   */
  async verifyBiometric(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { response } = req.body;
      const userId = req.user.sub;

      const isValid = await mfaService.verifyBiometricResponse(userId, response);

      res.status(200).json({
        valid: isValid,
        method: 'biometric'
      });
    } catch (error) {
      logger.error('Biometric verification error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Biometric verification service error',
          code: 'BIOMETRIC_VERIFICATION_ERROR'
        }
      });
    }
  }

  /**
   * Register biometric credential
   */
  async registerBiometric(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { credentialData, deviceName } = req.body;
      const userId = req.user.sub;

      const registration = await mfaService.registerBiometricCredential(
        userId,
        credentialData,
        deviceName
      );

      res.status(201).json({
        message: 'Biometric credential registered successfully',
        credentialId: registration.credentialId,
        deviceName: registration.deviceName,
        createdAt: registration.createdAt
      });
    } catch (error) {
      logger.error('Biometric registration error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Biometric registration service error',
          code: 'BIOMETRIC_REGISTRATION_ERROR'
        }
      });
    }
  }

  /**
   * Get user's MFA status and methods
   */
  async getMFAStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const userId = req.user.sub;
      
      const mfaEnabled = await mfaService.isMFAEnabled(userId);
      const availableMethods = await mfaService.getAvailableMFAMethods(userId);
      const biometricCredentials = await mfaService.getBiometricCredentials(userId);

      res.status(200).json({
        mfaEnabled,
        availableMethods,
        biometricCredentials: biometricCredentials.map(cred => ({
          credentialId: cred.credentialId,
          deviceName: cred.deviceName,
          createdAt: cred.createdAt
        }))
      });
    } catch (error) {
      logger.error('Get MFA status error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'MFA status service error',
          code: 'MFA_STATUS_ERROR'
        }
      });
    }
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const userId = req.user.sub;

      // Check if MFA is enabled
      const mfaEnabled = await mfaService.isMFAEnabled(userId);
      if (!mfaEnabled) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'MFA is not enabled for this user',
            code: 'MFA_NOT_ENABLED'
          }
        });
        return;
      }

      const backupCodes = await mfaService.regenerateBackupCodes(userId);

      res.status(200).json({
        message: 'Backup codes regenerated successfully',
        backupCodes
      });
    } catch (error) {
      logger.error('Regenerate backup codes error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Backup code service error',
          code: 'BACKUP_CODE_ERROR'
        }
      });
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          }
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { password, mfaCode } = req.body;
      const userId = req.user.sub;

      // TODO: Verify password and MFA code before disabling
      // This is a security-critical operation

      await mfaService.disableMFA(userId);

      res.status(200).json({
        message: 'MFA disabled successfully'
      });
    } catch (error) {
      logger.error('Disable MFA error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'MFA disable service error',
          code: 'MFA_DISABLE_ERROR'
        }
      });
    }
  }

  /**
   * Remove biometric credential
   */
  async removeBiometric(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const { credentialId } = req.params;
      const userId = req.user.sub;

      await mfaService.removeBiometricCredential(userId, credentialId);

      res.status(200).json({
        message: 'Biometric credential removed successfully'
      });
    } catch (error) {
      logger.error('Remove biometric credential error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Biometric removal service error',
          code: 'BIOMETRIC_REMOVAL_ERROR'
        }
      });
    }
  }

  /**
   * Generate recovery codes
   */
  async generateRecoveryCodes(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          }
        });
        return;
      }

      const userId = req.user.sub;
      const recoveryCodes = await mfaService.generateRecoveryCodes(userId);

      res.status(200).json({
        message: 'Recovery codes generated successfully',
        recoveryCodes,
        warning: 'Store these codes securely. They can be used to recover your account if you lose access to your MFA device.'
      });
    } catch (error) {
      logger.error('Generate recovery codes error:', error);
      res.status(500).json({
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Recovery code service error',
          code: 'RECOVERY_CODE_ERROR'
        }
      });
    }
  }
}