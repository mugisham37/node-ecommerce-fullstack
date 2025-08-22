/**
 * Analytics utility functions for data processing and calculations
 */

/**
 * Safely convert Decimal-like values to number
 * @param decimal Decimal value that might be null or undefined
 * @param defaultValue Default value if decimal is null/undefined
 * @returns Number value
 */
export function safeDecimalToNumber(decimal: any | null | undefined, defaultValue: number = 0): number {
  if (!decimal) return defaultValue;
  
  // Handle Decimal-like objects with toNumber method
  if (typeof decimal === 'object' && typeof decimal.toNumber === 'function') {
    return decimal.toNumber();
  }
  
  // Handle numeric strings
  if (typeof decimal === 'string') {
    const num = parseFloat(decimal);
    return isNaN(num) ? defaultValue : num;
  }
  
  // Handle numbers
  if (typeof decimal === 'number') {
    return isNaN(decimal) ? defaultValue : decimal;
  }
  
  return defaultValue;
}

/**
 * Calculate growth percentage between two values
 * @param current Current period value
 * @param previous Previous period value
 * @returns Growth percentage (positive for growth, negative for decline)
 */
export function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Safely get count from aggregation result
 * @param countResult Aggregation count result
 * @param field Field to get count for (defaults to 'id')
 * @returns Count value
 */
export function safeGetCount(countResult: any, field: string = 'id'): number {
  if (!countResult) return 0;
  if (typeof countResult === 'number') return countResult;
  if (countResult[field] !== undefined) return countResult[field];
  if (countResult._all !== undefined) return countResult._all;
  return 0;
}

/**
 * Safely get sum from aggregation result
 * @param sumResult Aggregation sum result
 * @param field Field to get sum for
 * @returns Sum value as number
 */
export function safeGetSum(sumResult: any, field: string): number {
  if (!sumResult || !sumResult[field]) return 0;
  return safeDecimalToNumber(sumResult[field]);
}

/**
 * Safely get average from aggregation result
 * @param avgResult Aggregation average result
 * @param field Field to get average for
 * @returns Average value as number
 */
export function safeGetAverage(avgResult: any, field: string): number {
  if (!avgResult || !avgResult[field]) return 0;
  return safeDecimalToNumber(avgResult[field]);
}

/**
 * Generate date range for previous period
 * @param startDate Current period start date
 * @param endDate Current period end date
 * @returns Previous period date range
 */
export function getPreviousPeriodDates(startDate: Date, endDate: Date): { previousStartDate: Date; previousEndDate: Date } {
  const periodDiff = endDate.getTime() - startDate.getTime();
  const previousStartDate = new Date(startDate.getTime() - periodDiff);
  const previousEndDate = new Date(startDate.getTime());
  
  return { previousStartDate, previousEndDate };
}

/**
 * Format order number from ID
 * @param orderId Order ID
 * @returns Formatted order number
 */
export function formatOrderNumber(orderId: string): string {
  return orderId.substring(orderId.length - 8).toUpperCase();
}

/**
 * Calculate percentage of total
 * @param value Individual value
 * @param total Total value
 * @returns Percentage (0-100)
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Validate date range
 * @param startDate Start date
 * @param endDate End date
 * @throws Error if date range is invalid
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }
  
  const maxRangeDays = 365; // 1 year
  const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (rangeDays > maxRangeDays) {
    throw new Error(`Date range cannot exceed ${maxRangeDays} days`);
  }
}

/**
 * Get SQL date truncation function based on interval
 * @param interval Analytics interval
 * @returns SQL date truncation function name
 */
export function getDateTruncFunction(interval: 'hourly' | 'daily' | 'weekly' | 'monthly'): string {
  switch (interval) {
    case 'hourly':
      return 'hour';
    case 'daily':
      return 'day';
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
    default:
      return 'day';
  }
}

/**
 * Create cache key for analytics data
 * @param prefix Cache key prefix
 * @param params Parameters to include in key
 * @returns Cache key string
 */
export function createAnalyticsCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join(':');
  
  return `${prefix}:${sortedParams}`;
}