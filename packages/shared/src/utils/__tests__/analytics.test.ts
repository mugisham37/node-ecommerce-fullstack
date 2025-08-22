import {
  safeDecimalToNumber,
  calculateGrowthPercentage,
  safeGetCount,
  safeGetSum,
  safeGetAverage,
  getPreviousPeriodDates,
  formatOrderNumber,
  calculatePercentage,
  validateDateRange,
  getDateTruncFunction,
  createAnalyticsCacheKey,
} from '../analytics';

describe('Analytics Utils', () => {
  describe('safeDecimalToNumber', () => {
    it('should convert decimal-like objects to numbers', () => {
      const mockDecimal = { toNumber: () => 123.45 };
      expect(safeDecimalToNumber(mockDecimal)).toBe(123.45);
    });

    it('should convert string numbers to numbers', () => {
      expect(safeDecimalToNumber('123.45')).toBe(123.45);
    });

    it('should handle null/undefined with default value', () => {
      expect(safeDecimalToNumber(null)).toBe(0);
      expect(safeDecimalToNumber(undefined)).toBe(0);
      expect(safeDecimalToNumber(null, 10)).toBe(10);
    });

    it('should handle regular numbers', () => {
      expect(safeDecimalToNumber(123.45)).toBe(123.45);
    });
  });

  describe('calculateGrowthPercentage', () => {
    it('should calculate positive growth', () => {
      expect(calculateGrowthPercentage(120, 100)).toBe(20);
    });

    it('should calculate negative growth', () => {
      expect(calculateGrowthPercentage(80, 100)).toBe(-20);
    });

    it('should handle zero previous value', () => {
      expect(calculateGrowthPercentage(100, 0)).toBe(100);
      expect(calculateGrowthPercentage(0, 0)).toBe(0);
    });
  });

  describe('safeGetCount', () => {
    it('should extract count from aggregation result', () => {
      expect(safeGetCount({ id: 5 })).toBe(5);
      expect(safeGetCount({ _all: 10 })).toBe(10);
      expect(safeGetCount(15)).toBe(15);
    });

    it('should return 0 for null/undefined', () => {
      expect(safeGetCount(null)).toBe(0);
      expect(safeGetCount(undefined)).toBe(0);
    });
  });

  describe('getPreviousPeriodDates', () => {
    it('should calculate previous period dates correctly', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const { previousStartDate, previousEndDate } = getPreviousPeriodDates(startDate, endDate);
      
      expect(previousStartDate).toEqual(new Date('2022-12-02'));
      expect(previousEndDate).toEqual(startDate);
    });
  });

  describe('formatOrderNumber', () => {
    it('should format order ID to order number', () => {
      const orderId = 'order-123456789abcdef';
      expect(formatOrderNumber(orderId)).toBe('9ABCDEF');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(1, 3)).toBe(33);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date range', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      expect(() => validateDateRange(startDate, endDate)).not.toThrow();
    });

    it('should throw error for invalid date range', () => {
      const startDate = new Date('2023-01-31');
      const endDate = new Date('2023-01-01');
      expect(() => validateDateRange(startDate, endDate)).toThrow('Start date must be before end date');
    });

    it('should throw error for date range exceeding max days', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2024-12-31');
      expect(() => validateDateRange(startDate, endDate)).toThrow('Date range cannot exceed 365 days');
    });
  });

  describe('getDateTruncFunction', () => {
    it('should return correct SQL date truncation functions', () => {
      expect(getDateTruncFunction('hourly')).toBe('hour');
      expect(getDateTruncFunction('daily')).toBe('day');
      expect(getDateTruncFunction('weekly')).toBe('week');
      expect(getDateTruncFunction('monthly')).toBe('month');
    });
  });

  describe('createAnalyticsCacheKey', () => {
    it('should create consistent cache keys', () => {
      const params = { startDate: '2023-01-01', endDate: '2023-01-31', userId: '123' };
      const key = createAnalyticsCacheKey('analytics', params);
      expect(key).toBe('analytics:endDate:2023-01-31:startDate:2023-01-01:userId:123');
    });
  });
});