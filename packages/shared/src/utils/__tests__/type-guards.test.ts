import {
  ensureString,
  convertNullToUndefined,
  isValidString,
  safeStringExtract,
  generateRequestId,
  isValidNumber,
  isValidUUID,
  isValidEmail,
  isValidDate,
  safeNumberExtract,
} from '../type-guards';

describe('Type Guards Utils', () => {
  describe('ensureString', () => {
    it('should return string value when valid', () => {
      expect(ensureString('hello', 'fallback')).toBe('hello');
    });

    it('should return fallback for null/undefined', () => {
      expect(ensureString(null, 'fallback')).toBe('fallback');
      expect(ensureString(undefined, 'fallback')).toBe('fallback');
    });
  });

  describe('convertNullToUndefined', () => {
    it('should convert null to undefined', () => {
      expect(convertNullToUndefined(null)).toBeUndefined();
    });

    it('should preserve non-null values', () => {
      expect(convertNullToUndefined('hello')).toBe('hello');
      expect(convertNullToUndefined(123)).toBe(123);
    });
  });

  describe('isValidString', () => {
    it('should identify valid non-empty strings', () => {
      expect(isValidString('hello')).toBe(true);
      expect(isValidString('a')).toBe(true);
    });

    it('should reject invalid strings', () => {
      expect(isValidString('')).toBe(false);
      expect(isValidString(null)).toBe(false);
      expect(isValidString(undefined)).toBe(false);
      expect(isValidString(123)).toBe(false);
    });
  });

  describe('safeStringExtract', () => {
    it('should extract valid string properties', () => {
      const obj = { name: 'John', age: 30 };
      expect(safeStringExtract(obj, 'name', 'fallback')).toBe('John');
    });

    it('should return fallback for invalid properties', () => {
      const obj = { name: '', age: 30 };
      expect(safeStringExtract(obj, 'name', 'fallback')).toBe('fallback');
      expect(safeStringExtract(obj, 'missing', 'fallback')).toBe('fallback');
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toMatch(/^req-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^req-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidNumber', () => {
    it('should identify valid numbers', () => {
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-123.45)).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber('123')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should identify valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should identify valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should identify valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2023-01-01'))).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('2023-01-01')).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('safeNumberExtract', () => {
    it('should extract valid number properties', () => {
      const obj = { age: 30, name: 'John' };
      expect(safeNumberExtract(obj, 'age', 0)).toBe(30);
    });

    it('should return fallback for invalid properties', () => {
      const obj = { age: 'invalid', name: 'John' };
      expect(safeNumberExtract(obj, 'age', 0)).toBe(0);
      expect(safeNumberExtract(obj, 'missing', 25)).toBe(25);
    });
  });
});