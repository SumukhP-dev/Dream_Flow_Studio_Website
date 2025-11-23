import {
  sanitizeString,
  sanitizeHTML,
  validateEmail,
  validatePasswordStrength,
  validateFileType,
  validateFileSize,
  sanitizeObject,
} from '../../utils/validation';

describe('Validation Utils', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });
  });

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous tags', () => {
      const input = '<script>alert("xss")</script><p>Safe</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check for uppercase', () => {
      const result = validatePasswordStrength('lowercase123!');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should check for lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should check for number', () => {
      const result = validatePasswordStrength('NoNumber!');
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should check for special character', () => {
      const result = validatePasswordStrength('NoSpecial123');
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('validateFileType', () => {
    it('should validate allowed file type', () => {
      expect(validateFileType('image/jpeg', ['image/jpeg', 'image/png'])).toBe(true);
    });

    it('should reject disallowed file type', () => {
      expect(validateFileType('application/pdf', ['image/jpeg', 'image/png'])).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate file within size limit', () => {
      expect(validateFileSize(1024, 2048)).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
      expect(validateFileSize(2048, 1024)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        age: 30,
        nested: {
          description: '<p>Safe</p>',
        },
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.nested.description).toBe('Safe');
    });
  });
});

