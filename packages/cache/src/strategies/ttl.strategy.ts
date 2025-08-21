import { CacheStrategy } from '../types';

/**
 * Time-To-Live (TTL) based caching strategy
 * Uses different TTL values based on data type and access patterns
 */
export class TTLStrategy implements CacheStrategy {
  public readonly name = 'TTL';

  constructor(
    private options: {
      defaultTtl: number;
      ttlRules: Array<{
        pattern: string | RegExp;
        ttl: number;
        condition?: (key: string, value: any) => boolean;
      }>;
      adaptiveTtl?: boolean;
      minTtl?: number;
      maxTtl?: number;
    }
  ) {
    this.options.adaptiveTtl = this.options.adaptiveTtl ?? false;
    this.options.minTtl = this.options.minTtl ?? 60000; // 1 minute
    this.options.maxTtl = this.options.maxTtl ?? 86400000; // 24 hours
  }

  shouldCache(key: string, value: any): boolean {
    // Don't cache null or undefined values
    if (value === null || value === undefined) {
      return false;
    }

    // Don't cache very large objects (>1MB serialized)
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > 1024 * 1024) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  getTtl(key: string, value: any): number {
    // Check TTL rules in order
    for (const rule of this.options.ttlRules) {
      if (this.matchesRule(key, value, rule)) {
        let ttl = rule.ttl;

        // Apply adaptive TTL if enabled
        if (this.options.adaptiveTtl) {
          ttl = this.calculateAdaptiveTtl(key, value, ttl);
        }

        // Ensure TTL is within bounds
        return Math.max(
          this.options.minTtl!,
          Math.min(this.options.maxTtl!, ttl)
        );
      }
    }

    return this.options.defaultTtl;
  }

  onHit(key: string, value: any): void {
    // Could be used to track hit patterns for adaptive TTL
  }

  onMiss(key: string): void {
    // Could be used to track miss patterns for adaptive TTL
  }

  onSet(key: string, value: any): void {
    // Could be used to track set patterns
  }

  onDelete(key: string): void {
    // Could be used to track deletion patterns
  }

  private matchesRule(
    key: string,
    value: any,
    rule: {
      pattern: string | RegExp;
      ttl: number;
      condition?: (key: string, value: any) => boolean;
    }
  ): boolean {
    // Check pattern match
    let patternMatches = false;
    if (typeof rule.pattern === 'string') {
      // Simple wildcard matching
      const regex = new RegExp(rule.pattern.replace(/\*/g, '.*'));
      patternMatches = regex.test(key);
    } else {
      patternMatches = rule.pattern.test(key);
    }

    if (!patternMatches) {
      return false;
    }

    // Check condition if provided
    if (rule.condition) {
      return rule.condition(key, value);
    }

    return true;
  }

  private calculateAdaptiveTtl(key: string, value: any, baseTtl: number): number {
    // Simple adaptive TTL based on value characteristics
    let multiplier = 1;

    // Larger objects get shorter TTL (they're more expensive to store)
    try {
      const size = JSON.stringify(value).length;
      if (size > 100000) { // >100KB
        multiplier *= 0.5;
      } else if (size > 10000) { // >10KB
        multiplier *= 0.75;
      }
    } catch {
      // If we can't serialize, use shorter TTL
      multiplier *= 0.5;
    }

    // Frequently accessed keys could get longer TTL
    // This would require tracking access patterns
    
    // Static data (like categories, settings) gets longer TTL
    if (key.includes('category') || key.includes('setting') || key.includes('config')) {
      multiplier *= 2;
    }

    // Dynamic data (like inventory, orders) gets shorter TTL
    if (key.includes('inventory') || key.includes('order') || key.includes('stock')) {
      multiplier *= 0.5;
    }

    return Math.round(baseTtl * multiplier);
  }

  addTtlRule(pattern: string | RegExp, ttl: number, condition?: (key: string, value: any) => boolean): void {
    this.options.ttlRules.push({ pattern, ttl, condition });
  }

  removeTtlRule(pattern: string | RegExp): boolean {
    const index = this.options.ttlRules.findIndex(rule => 
      rule.pattern === pattern || 
      (rule.pattern instanceof RegExp && pattern instanceof RegExp && rule.pattern.source === pattern.source)
    );
    
    if (index >= 0) {
      this.options.ttlRules.splice(index, 1);
      return true;
    }
    
    return false;
  }

  getTtlRules() {
    return [...this.options.ttlRules];
  }

  getStats() {
    return {
      name: this.name,
      defaultTtl: this.options.defaultTtl,
      rulesCount: this.options.ttlRules.length,
      adaptiveTtl: this.options.adaptiveTtl,
      minTtl: this.options.minTtl,
      maxTtl: this.options.maxTtl
    };
  }

  // Predefined TTL rules for common e-commerce patterns
  static createEcommerceRules(baseTtl: number = 3600000): TTLStrategy {
    return new TTLStrategy({
      defaultTtl: baseTtl,
      adaptiveTtl: true,
      ttlRules: [
        // Product data - 2 hours
        {
          pattern: /^inventory:products:/,
          ttl: 2 * 60 * 60 * 1000
        },
        // Category data - 4 hours (changes less frequently)
        {
          pattern: /^inventory:categories:/,
          ttl: 4 * 60 * 60 * 1000
        },
        // Supplier data - 6 hours
        {
          pattern: /^inventory:suppliers:/,
          ttl: 6 * 60 * 60 * 1000
        },
        // Inventory levels - 30 minutes (needs to be fresh)
        {
          pattern: /^inventory:inventory:/,
          ttl: 30 * 60 * 1000
        },
        // User sessions - 1 hour
        {
          pattern: /^inventory:users:/,
          ttl: 60 * 60 * 1000
        },
        // Search results - 15 minutes
        {
          pattern: /^inventory:search:/,
          ttl: 15 * 60 * 1000
        },
        // Reports - 4 hours
        {
          pattern: /^inventory:reports:/,
          ttl: 4 * 60 * 60 * 1000
        },
        // Configuration - 12 hours
        {
          pattern: /^inventory:(config|settings):/,
          ttl: 12 * 60 * 60 * 1000
        }
      ]
    });
  }
}