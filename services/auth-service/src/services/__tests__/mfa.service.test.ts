import { mfaService } from '../mfa.service';
import { redisService } from '../redis.service';

// Mock Redis service
jest.mock('../redis.service', () => ({
  redisService: {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  }
}));

// Mock speakeasy
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    ascii: 'test-ascii-secret',
    base32: 'TEST-BASE32-SECRET'
  })),
  otpauthURL: jest.fn(() => 'otpauth://totp/test@example.com?secret=TEST-BASE32-SECRET&issuer=Educational%20Platform'),
  totp: {
    verify: jest.fn()
  }
}));

// Mock QRCode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code'))
}));

describe('MFAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupTOTP', () => {
    it('should setup TOTP successfully', async () => {
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await mfaService.setupTOTP('user123', 'test@example.com');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toBe('TEST-BASE32-SECRET');
      expect(result.qrCode).toBe('data:image/png;base64,mock-qr-code');
      expect(Array.isArray(result.backupCodes)).toBe(true);
      expect(result.backupCodes.length).toBe(10);
    });

    it('should store setup data in Redis', async () => {
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      await mfaService.setupTOTP('user123', 'test@example.com');

      expect(redisService.set).toHaveBeenCalledWith(
        'mfa_setup:user123',
        expect.objectContaining({
          secret: 'TEST-BASE32-SECRET',
          backupCodes: expect.any(Array),
          setupAt: expect.any(Date)
        }),
        600
      );
    });
  });

  describe('verifyTOTPSetup', () => {
    it('should verify TOTP setup successfully', async () => {
      const mockSetupData = {
        secret: 'TEST-BASE32-SECRET',
        backupCodes: ['code1', 'code2'],
        setupAt: new Date()
      };

      (redisService.get as jest.Mock).mockResolvedValue(mockSetupData);
      (redisService.delete as jest.Mock).mockResolvedValue(undefined);

      const speakeasy = require('speakeasy');
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await mfaService.verifyTOTPSetup('user123', '123456');

      expect(result.secret).toBe('TEST-BASE32-SECRET');
      expect(result.backupCodes).toEqual(['code1', 'code2']);
      expect(redisService.delete).toHaveBeenCalledWith('mfa_setup:user123');
    });

    it('should throw error if setup data not found', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);

      await expect(mfaService.verifyTOTPSetup('user123', '123456'))
        .rejects.toThrow('MFA setup not found or expired');
    });

    it('should throw error if TOTP code is invalid', async () => {
      const mockSetupData = {
        secret: 'TEST-BASE32-SECRET',
        backupCodes: ['code1', 'code2'],
        setupAt: new Date()
      };

      (redisService.get as jest.Mock).mockResolvedValue(mockSetupData);

      const speakeasy = require('speakeasy');
      speakeasy.totp.verify.mockReturnValue(false);

      await expect(mfaService.verifyTOTPSetup('user123', '123456'))
        .rejects.toThrow('Invalid TOTP code');
    });
  });

  describe('verifyTOTP', () => {
    it('should verify TOTP code successfully', async () => {
      const speakeasy = require('speakeasy');
      speakeasy.totp.verify.mockReturnValue(true);

      const result = await mfaService.verifyTOTP('TEST-SECRET', '123456');

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'TEST-SECRET',
        encoding: 'base32',
        token: '123456',
        window: 2
      });
    });

    it('should return false for invalid TOTP code', async () => {
      const speakeasy = require('speakeasy');
      speakeasy.totp.verify.mockReturnValue(false);

      const result = await mfaService.verifyTOTP('TEST-SECRET', '123456');

      expect(result).toBe(false);
    });
  });

  describe('generateBiometricChallenge', () => {
    it('should generate biometric challenge', async () => {
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      const challenge = await mfaService.generateBiometricChallenge('user123');

      expect(challenge).toHaveProperty('challenge');
      expect(challenge).toHaveProperty('allowCredentials');
      expect(challenge).toHaveProperty('timeout');
      expect(challenge).toHaveProperty('userVerification');
      expect(challenge.timeout).toBe(60000);
      expect(challenge.userVerification).toBe('required');
    });

    it('should store challenge in Redis', async () => {
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      await mfaService.generateBiometricChallenge('user123');

      expect(redisService.set).toHaveBeenCalledWith(
        'biometric_challenge:user123',
        expect.objectContaining({
          challenge: expect.any(String),
          createdAt: expect.any(Date)
        }),
        120
      );
    });
  });

  describe('verifyBiometricResponse', () => {
    it('should verify biometric response successfully', async () => {
      const mockChallengeData = {
        challenge: 'test-challenge',
        createdAt: new Date()
      };

      (redisService.get as jest.Mock).mockResolvedValue(mockChallengeData);
      (redisService.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await mfaService.verifyBiometricResponse('user123', { response: 'test' });

      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalledWith('biometric_challenge:user123');
    });

    it('should return false if challenge not found', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);

      const result = await mfaService.verifyBiometricResponse('user123', { response: 'test' });

      expect(result).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify backup code successfully', async () => {
      // Mock crypto.createHash
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-code')
      };
      const crypto = require('crypto');
      crypto.createHash = jest.fn().mockReturnValue(mockHash);

      const backupCodes = ['hashed-code', 'other-code'];
      const result = await mfaService.verifyBackupCode('user123', 'test-code', backupCodes);

      expect(result).toBe(true);
    });

    it('should return false for invalid backup code', async () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('wrong-hash')
      };
      const crypto = require('crypto');
      crypto.createHash = jest.fn().mockReturnValue(mockHash);

      const backupCodes = ['hashed-code', 'other-code'];
      const result = await mfaService.verifyBackupCode('user123', 'test-code', backupCodes);

      expect(result).toBe(false);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('should generate recovery codes', async () => {
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      const codes = await mfaService.generateRecoveryCodes('user123');

      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(5);
      expect(redisService.set).toHaveBeenCalledWith(
        'recovery_codes:user123',
        expect.objectContaining({
          codes: expect.any(Array),
          generatedAt: expect.any(Date)
        }),
        30 * 24 * 60 * 60
      );
    });
  });

  describe('verifyRecoveryCode', () => {
    it('should verify recovery code successfully', async () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('hashed-code')
      };
      const crypto = require('crypto');
      crypto.createHash = jest.fn().mockReturnValue(mockHash);

      const mockRecoveryData = {
        codes: ['hashed-code', 'other-code'],
        generatedAt: new Date()
      };

      (redisService.get as jest.Mock).mockResolvedValue(mockRecoveryData);
      (redisService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await mfaService.verifyRecoveryCode('user123', 'test-code');

      expect(result).toBe(true);
    });

    it('should return false if recovery data not found', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);

      const result = await mfaService.verifyRecoveryCode('user123', 'test-code');

      expect(result).toBe(false);
    });
  });
});