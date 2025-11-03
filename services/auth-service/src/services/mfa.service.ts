import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { config } from '../config/config';
import { redisService } from './redis.service';
import { logger } from '../utils/logger';
import { MFASetup } from '../types/auth.types';

interface BiometricChallenge {
  challenge: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

interface BiometricRegistration {
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName?: string;
  createdAt: Date;
}

class MFAService {
  /**
   * Generate TOTP secret and QR code for user
   */
  async setupTOTP(userId: string, userEmail: string): Promise<MFASetup> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: config.mfa.issuer,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.ascii,
        label: userEmail,
        issuer: config.mfa.issuer,
        encoding: 'ascii'
      });

      const qrCode = await QRCode.toDataURL(qrCodeUrl);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(config.mfa.backupCodesCount);

      // Store temporary setup data in Redis (expires in 10 minutes)
      await redisService.set(`mfa_setup:${userId}`, {
        secret: secret.base32,
        backupCodes,
        setupAt: new Date()
      }, 600);

      logger.info(`TOTP setup initiated for user ${userId}`);

      return {
        secret: secret.base32,
        qrCode,
        backupCodes
      };
    } catch (error) {
      logger.error('TOTP setup error:', error);
      throw new Error('Failed to setup TOTP');
    }
  }

  /**
   * Verify TOTP code and complete setup
   */
  async verifyTOTPSetup(userId: string, code: string): Promise<{ secret: string; backupCodes: string[] }> {
    try {
      // Get setup data from Redis
      const setupData = await redisService.get(`mfa_setup:${userId}`);
      
      if (!setupData) {
        throw new Error('MFA setup not found or expired');
      }

      // Verify the code
      const verified = speakeasy.totp.verify({
        secret: setupData.secret,
        encoding: 'base32',
        token: code,
        window: config.mfa.window
      });

      if (!verified) {
        throw new Error('Invalid TOTP code');
      }

      // Clear setup data from Redis
      await redisService.delete(`mfa_setup:${userId}`);

      logger.info(`TOTP setup completed for user ${userId}`);

      return {
        secret: setupData.secret,
        backupCodes: setupData.backupCodes
      };
    } catch (error) {
      logger.error('TOTP verification error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP code for authentication
   */
  async verifyTOTP(secret: string, code: string): Promise<boolean> {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: config.mfa.window
      });
    } catch (error) {
      logger.error('TOTP verification error:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string, userBackupCodes: string[]): Promise<boolean> {
    try {
      // Hash the provided code
      const hashedCode = this.hashBackupCode(code);
      
      // Check if the hashed code exists in user's backup codes
      const codeIndex = userBackupCodes.findIndex(backupCode => backupCode === hashedCode);
      
      if (codeIndex === -1) {
        return false;
      }

      // TODO: Remove used backup code from database
      logger.info(`Backup code used for user ${userId}`);
      
      return true;
    } catch (error) {
      logger.error('Backup code verification error:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes(config.mfa.backupCodesCount);
      
      // TODO: Update backup codes in database
      logger.info(`Backup codes regenerated for user ${userId}`);
      
      return backupCodes;
    } catch (error) {
      logger.error('Backup code regeneration error:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Generate biometric authentication challenge
   */
  async generateBiometricChallenge(userId: string): Promise<BiometricChallenge> {
    try {
      const challenge = crypto.randomBytes(32).toString('base64url');
      
      // TODO: Get user's registered credentials from database
      const allowCredentials: PublicKeyCredentialDescriptor[] = [];

      const challengeData: BiometricChallenge = {
        challenge,
        allowCredentials,
        timeout: 60000, // 1 minute
        userVerification: 'required'
      };

      // Store challenge in Redis (expires in 2 minutes)
      await redisService.set(`biometric_challenge:${userId}`, {
        challenge,
        createdAt: new Date()
      }, 120);

      logger.info(`Biometric challenge generated for user ${userId}`);

      return challengeData;
    } catch (error) {
      logger.error('Biometric challenge generation error:', error);
      throw new Error('Failed to generate biometric challenge');
    }
  }

  /**
   * Verify biometric authentication response
   */
  async verifyBiometricResponse(userId: string, response: any): Promise<boolean> {
    try {
      // Get stored challenge
      const challengeData = await redisService.get(`biometric_challenge:${userId}`);
      
      if (!challengeData) {
        throw new Error('Biometric challenge not found or expired');
      }

      // TODO: Implement WebAuthn verification
      // This would involve verifying the authenticator response against the stored challenge
      // and the user's registered public key
      
      // Clear challenge from Redis
      await redisService.delete(`biometric_challenge:${userId}`);

      logger.info(`Biometric authentication verified for user ${userId}`);

      return true; // Mock implementation
    } catch (error) {
      logger.error('Biometric verification error:', error);
      return false;
    }
  }

  /**
   * Register biometric credential
   */
  async registerBiometricCredential(
    userId: string, 
    credentialData: any, 
    deviceName?: string
  ): Promise<BiometricRegistration> {
    try {
      // TODO: Implement WebAuthn credential registration
      // This would involve verifying the attestation response and storing the public key
      
      const registration: BiometricRegistration = {
        credentialId: credentialData.id,
        publicKey: credentialData.publicKey,
        counter: credentialData.counter || 0,
        deviceName,
        createdAt: new Date()
      };

      // TODO: Store registration in database
      logger.info(`Biometric credential registered for user ${userId}`, {
        credentialId: registration.credentialId,
        deviceName
      });

      return registration;
    } catch (error) {
      logger.error('Biometric registration error:', error);
      throw new Error('Failed to register biometric credential');
    }
  }

  /**
   * Get user's registered biometric credentials
   */
  async getBiometricCredentials(userId: string): Promise<BiometricRegistration[]> {
    try {
      // TODO: Implement database lookup
      // Mock implementation
      return [];
    } catch (error) {
      logger.error('Get biometric credentials error:', error);
      return [];
    }
  }

  /**
   * Remove biometric credential
   */
  async removeBiometricCredential(userId: string, credentialId: string): Promise<void> {
    try {
      // TODO: Implement database removal
      logger.info(`Biometric credential removed for user ${userId}`, { credentialId });
    } catch (error) {
      logger.error('Remove biometric credential error:', error);
      throw new Error('Failed to remove biometric credential');
    }
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<void> {
    try {
      // TODO: Update user in database to disable MFA
      // Clear any MFA-related data from Redis
      await redisService.delete(`mfa_setup:${userId}`);
      await redisService.delete(`biometric_challenge:${userId}`);
      
      logger.info(`MFA disabled for user ${userId}`);
    } catch (error) {
      logger.error('Disable MFA error:', error);
      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      // TODO: Implement database lookup
      // Mock implementation
      return false;
    } catch (error) {
      logger.error('MFA status check error:', error);
      return false;
    }
  }

  /**
   * Get MFA methods available for user
   */
  async getAvailableMFAMethods(userId: string): Promise<string[]> {
    try {
      const methods: string[] = [];
      
      // TODO: Check database for user's MFA setup
      // Mock implementation
      methods.push('totp');
      
      const biometricCredentials = await this.getBiometricCredentials(userId);
      if (biometricCredentials.length > 0) {
        methods.push('biometric');
      }
      
      return methods;
    } catch (error) {
      logger.error('Get MFA methods error:', error);
      return [];
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    // Return hashed codes for storage
    return codes.map(code => this.hashBackupCode(code));
  }

  /**
   * Hash backup code for secure storage
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Generate recovery codes for account recovery
   */
  async generateRecoveryCodes(userId: string): Promise<string[]> {
    try {
      const recoveryCodes = this.generateBackupCodes(5); // Generate 5 recovery codes
      
      // Store recovery codes in Redis with longer expiry (30 days)
      await redisService.set(`recovery_codes:${userId}`, {
        codes: recoveryCodes,
        generatedAt: new Date()
      }, 30 * 24 * 60 * 60);

      logger.info(`Recovery codes generated for user ${userId}`);
      
      return recoveryCodes;
    } catch (error) {
      logger.error('Recovery code generation error:', error);
      throw new Error('Failed to generate recovery codes');
    }
  }

  /**
   * Verify recovery code
   */
  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    try {
      const recoveryData = await redisService.get(`recovery_codes:${userId}`);
      
      if (!recoveryData) {
        return false;
      }

      const hashedCode = this.hashBackupCode(code);
      const isValid = recoveryData.codes.includes(hashedCode);

      if (isValid) {
        // Remove used recovery code
        recoveryData.codes = recoveryData.codes.filter((c: string) => c !== hashedCode);
        
        if (recoveryData.codes.length > 0) {
          await redisService.set(`recovery_codes:${userId}`, recoveryData, 30 * 24 * 60 * 60);
        } else {
          await redisService.delete(`recovery_codes:${userId}`);
        }

        logger.info(`Recovery code used for user ${userId}`);
      }

      return isValid;
    } catch (error) {
      logger.error('Recovery code verification error:', error);
      return false;
    }
  }
}

export const mfaService = new MFAService();