import {
  toNumber,
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide,
  safePercentage,
  safeRound,
  isDecimal,
  isValidNumber,
} from '../decimal';

describe('Decimal Utils', () => {
  describe('toNumber', () => {
    it('should convert numbers', () => {
      expect(toNumber(123.45)).toBe(123.45);
      expect(toNumber(0)).toBe(0);
    });

    it('should handle NaN numbers', () => {
      expect(toNumber(NaN)).toBe(0);
    });

    it('should convert decimal-like objects', () => {
      const mockDecimal = { toNumber: () => 123.45 };
      expect(toNumber(mockDecimal)).toBe(123.45);
    });

    it('should convert string numbers', () => {
      expect(toNumber('123.45')).toBe(123.45);
      expect(toNumber('invalid')).toBe(0);
    });

    it('should handle null and undefined', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
    });

    it('should convert other types', () => {
      expect(toNumber(true)).toBe(1);
      expect(toNumber(false)).toBe(0);
    });
  });

  describe('safeAdd', () => {
    it('should add two numbers', () => {
      expect(safeAdd(10, 5)).toBe(15);
    });

    it('should handle mixed types', () => {
      expect(safeAdd('10', 5)).toBe(15);
      expect(safeAdd(null, 5)).toBe(5);
    });
  });

  describe('safeSubtract', () => {
    it('should subtract two numbers', () => {
      expect(safeSubtract(10, 5)).toBe(5);
    });

    it('should handle mixed types', () => {
      expect(safeSubtract('10', 3)).toBe(7);
    });
  });

  describe('safeMultiply', () => {
    it('should multiply two numbers', () => {
      expect(safeMultiply(10, 5)).toBe(50);
    });

    it('should handle mixed types', () => {
      expect(safeMultiply('10', 2)).toBe(20);
    });
  });

  describe('safeDivide', () => {
    it('should divide two numbers', () => {
      expect(safeDivide(10, 5)).toBe(2);
    });

    it('should handle division by zero', () => {
      expect(safeDivide(10, 0)).toBe(0);
    });

    it('should handle mixed types', () => {
      expect(safeDivide('10', 2)).toBe(5);
    });
  });

  describe('safePercentage', () => {
    it('should calculate percentage', () => {
      expect(safePercentage(100, 10)).toBe(10);
      expect(safePercentage(200, 50)).toBe(100);
    });
  });

  describe('safeRound', () => {
    it('should round to specified decimal places', () => {
      expect(safeRound(123.456, 2)).toBe(123.46);
      expect(safeRound(123.456, 0)).toBe(123);
    });

    it('should use default 2 decimal places', () => {
      expect(safeRound(123.456)).toBe(123.46);
    });
  });

  describe('isDecimal', () => {
    it('should identify decimal-like objects', () => {
      const mockDecimal = { toNumber: () => 123 };
      expect(isDecimal(mockDecimal)).toBe(true);
    });

    it('should return false for non-decimal objects', () => {
      expect(isDecimal(123)).toBe(false);
      expect(isDecimal('123')).toBe(false);
      expect(isDecimal(null)).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('should identify valid numbers', () => {
      expect(isValidNumber(123)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-123)).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber('123')).toBe(false);
    });
  });
});