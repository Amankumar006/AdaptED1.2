import { PasswordUtils } from '../password.utils';

describe('PasswordUtils', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123!';
      const hash = await PasswordUtils.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 characters
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await PasswordUtils.hashPassword(password);
      const hash2 = await PasswordUtils.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      const isValid = await PasswordUtils.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      const isValid = await PasswordUtils.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash gracefully', async () => {
      const password = 'testPassword123!';
      const invalidHash = 'invalid-hash';
      const isValid = await PasswordUtils.verifyPassword(password, invalidHash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = PasswordUtils.validatePasswordStrength(strongPassword);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      const result = PasswordUtils.validatePasswordStrength(shortPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = PasswordUtils.validatePasswordStrength(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be no more than 128 characters long');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'PASSWORD123!';
      const result = PasswordUtils.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'password123!';
      const result = PasswordUtils.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const password = 'Password!';
      const result = PasswordUtils.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const password = 'Password123';
      const result = PasswordUtils.validatePasswordStrength(password);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password with common patterns', () => {
      const commonPassword = 'Password123456';
      const result = PasswordUtils.validatePasswordStrength(commonPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password contains common patterns and is not secure');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = PasswordUtils.generateSecurePassword();

      expect(password).toBeDefined();
      expect(password.length).toBe(16);
    });

    it('should generate password with custom length', () => {
      const customLength = 24;
      const password = PasswordUtils.generateSecurePassword(customLength);

      expect(password.length).toBe(customLength);
    });

    it('should generate password that passes strength validation', () => {
      const password = PasswordUtils.generateSecurePassword();
      const validation = PasswordUtils.validatePasswordStrength(password);

      expect(validation.valid).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = PasswordUtils.generateSecurePassword();
      const password2 = PasswordUtils.generateSecurePassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('needsRehash', () => {
    it('should return false for hash with current rounds', async () => {
      const password = 'testPassword123!';
      const hash = await PasswordUtils.hashPassword(password);
      const needsRehash = PasswordUtils.needsRehash(hash);

      expect(needsRehash).toBe(false);
    });

    it('should return true for invalid hash', () => {
      const invalidHash = 'invalid-hash';
      const needsRehash = PasswordUtils.needsRehash(invalidHash);

      expect(needsRehash).toBe(true);
    });
  });
});