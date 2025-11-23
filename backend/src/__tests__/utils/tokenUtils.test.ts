import { generateSecureToken, hashToken, verifyToken } from '../../utils/tokenUtils';

describe('Token Utils', () => {
  describe('generateSecureToken', () => {
    it('should generate a token of default length', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate a token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
      expect(hash1.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a token against its hash', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);

      expect(verifyToken(token, hash)).toBe(true);
    });

    it('should reject incorrect token', () => {
      const token = 'test-token-123';
      const hash = hashToken(token);
      const wrongToken = 'wrong-token';

      expect(verifyToken(wrongToken, hash)).toBe(false);
    });

    it('should reject incorrect hash', () => {
      const token = 'test-token-123';
      const wrongHash = hashToken('different-token');

      expect(verifyToken(token, wrongHash)).toBe(false);
    });
  });
});

