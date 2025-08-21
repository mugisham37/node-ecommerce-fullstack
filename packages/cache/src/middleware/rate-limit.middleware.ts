import { CacheProvider } from '../types';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any, res: any) => void;
  headers?: boolean; // Include rate limit headers in response
}

/**
 * Rate limiting middleware using cache provider
 */
export class RateLimitMiddleware {
  constructor(
    private cacheProvider: CacheProvider,
    private options: RateLimitOptions
  ) {
    this.options = {
      keyGenerator: this.defaultKeyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      headers: true,
      ...options
    };
  }

  /**
   * Express middleware for rate limiting
   */
  express() {
    return async (req: any, res: any, next: any) => {
      try {
        const key = this.options.keyGenerator!(req);
        const windowStart = this.getWindowStart();
        const cacheKey = `ratelimit:${key}:${windowStart}`;

        // Get current request count
        const currentCount = await this.cacheProvider.get<number>(cacheKey) || 0;

        // Check if limit exceeded
        if (currentCount >= this.options.maxRequests) {
          if (this.options.onLimitReached) {
            this.options.onLimitReached(req, res);
          }

          if (this.options.headers) {
            this.setRateLimitHeaders(res, this.options.maxRequests, 0, this.getRemainingTime());
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil(this.getRemainingTime() / 1000)
          });
        }

        // Increment counter
        const newCount = currentCount + 1;
        await this.cacheProvider.set(cacheKey, newCount, this.getRemainingTime());

        // Set rate limit headers
        if (this.options.headers) {
          this.setRateLimitHeaders(
            res,
            this.options.maxRequests,
            this.options.maxRequests - newCount,
            this.getRemainingTime()
          );
        }

        // Handle response to potentially skip counting
        if (this.options.skipSuccessfulRequests || this.options.skipFailedRequests) {
          this.handleResponseCounting(req, res, cacheKey, newCount);
        }

        next();
      } catch (error) {
        console.error('Rate limit middleware error:', error);
        next(); // Continue on error
      }
    };
  }

  /**
   * Fastify plugin for rate limiting
   */
  fastify() {
    return async (request: any, reply: any) => {
      try {
        const key = this.options.keyGenerator!(request);
        const windowStart = this.getWindowStart();
        const cacheKey = `ratelimit:${key}:${windowStart}`;

        // Get current request count
        const currentCount = await this.cacheProvider.get<number>(cacheKey) || 0;

        // Check if limit exceeded
        if (currentCount >= this.options.maxRequests) {
          if (this.options.onLimitReached) {
            this.options.onLimitReached(request, reply);
          }

          if (this.options.headers) {
            this.setRateLimitHeadersFastify(reply, this.options.maxRequests, 0, this.getRemainingTime());
          }

          reply.code(429);
          return reply.send({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil(this.getRemainingTime() / 1000)
          });
        }

        // Increment counter
        const newCount = currentCount + 1;
        await this.cacheProvider.set(cacheKey, newCount, this.getRemainingTime());

        // Set rate limit headers
        if (this.options.headers) {
          this.setRateLimitHeadersFastify(
            reply,
            this.options.maxRequests,
            this.options.maxRequests - newCount,
            this.getRemainingTime()
          );
        }
      } catch (error) {
        console.error('Rate limit middleware error:', error);
      }
    };
  }

  /**
   * Default key generator (IP-based)
   */
  private defaultKeyGenerator(req: any): string {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Get window start timestamp
   */
  private getWindowStart(): number {
    return Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs;
  }

  /**
   * Get remaining time in current window
   */
  private getRemainingTime(): number {
    const windowStart = this.getWindowStart();
    return windowStart + this.options.windowMs - Date.now();
  }

  /**
   * Set rate limit headers for Express
   */
  private setRateLimitHeaders(res: any, limit: number, remaining: number, resetTime: number): void {
    res.set('X-RateLimit-Limit', limit.toString());
    res.set('X-RateLimit-Remaining', remaining.toString());
    res.set('X-RateLimit-Reset', new Date(Date.now() + resetTime).toISOString());
    res.set('Retry-After', Math.ceil(resetTime / 1000).toString());
  }

  /**
   * Set rate limit headers for Fastify
   */
  private setRateLimitHeadersFastify(reply: any, limit: number, remaining: number, resetTime: number): void {
    reply.header('X-RateLimit-Limit', limit.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Reset', new Date(Date.now() + resetTime).toISOString());
    reply.header('Retry-After', Math.ceil(resetTime / 1000).toString());
  }

  /**
   * Handle response counting for skip options
   */
  private handleResponseCounting(req: any, res: any, cacheKey: string, currentCount: number): void {
    res.on('finish', async () => {
      try {
        const shouldSkip = 
          (this.options.skipSuccessfulRequests && res.statusCode < 400) ||
          (this.options.skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip) {
          // Decrement counter
          const newCount = Math.max(0, currentCount - 1);
          if (newCount === 0) {
            await this.cacheProvider.delete(cacheKey);
          } else {
            await this.cacheProvider.set(cacheKey, newCount, this.getRemainingTime());
          }
        }
      } catch (error) {
        console.error('Error handling response counting:', error);
      }
    });
  }

  /**
   * Reset rate limit for specific key
   */
  async resetLimit(key: string): Promise<void> {
    try {
      const windowStart = this.getWindowStart();
      const cacheKey = `ratelimit:${key}:${windowStart}`;
      await this.cacheProvider.delete(cacheKey);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Get current count for key
   */
  async getCurrentCount(key: string): Promise<number> {
    try {
      const windowStart = this.getWindowStart();
      const cacheKey = `ratelimit:${key}:${windowStart}`;
      return await this.cacheProvider.get<number>(cacheKey) || 0;
    } catch (error) {
      console.error('Error getting current count:', error);
      return 0;
    }
  }

  /**
   * Get remaining requests for key
   */
  async getRemainingRequests(key: string): Promise<number> {
    const currentCount = await this.getCurrentCount(key);
    return Math.max(0, this.options.maxRequests - currentCount);
  }

  /**
   * Check if key is rate limited
   */
  async isRateLimited(key: string): Promise<boolean> {
    const currentCount = await this.getCurrentCount(key);
    return currentCount >= this.options.maxRequests;
  }

  /**
   * Get rate limit status for key
   */
  async getStatus(key: string): Promise<{
    limit: number;
    current: number;
    remaining: number;
    resetTime: number;
    isLimited: boolean;
  }> {
    const currentCount = await this.getCurrentCount(key);
    const remaining = Math.max(0, this.options.maxRequests - currentCount);
    const resetTime = this.getRemainingTime();

    return {
      limit: this.options.maxRequests,
      current: currentCount,
      remaining,
      resetTime,
      isLimited: currentCount >= this.options.maxRequests
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  async cleanup(): Promise<void> {
    try {
      const pattern = 'ratelimit:*';
      const keys = await this.cacheProvider.keys(pattern);
      
      const now = Date.now();
      const deletePromises: Promise<boolean>[] = [];

      for (const key of keys) {
        // Extract timestamp from key
        const parts = key.split(':');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[parts.length - 1]);
          if (timestamp + this.options.windowMs < now) {
            deletePromises.push(this.cacheProvider.delete(key));
          }
        }
      }

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error cleaning up rate limit entries:', error);
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    activeWindows: number;
    topLimitedKeys: Array<{ key: string; count: number }>;
  }> {
    try {
      const pattern = 'ratelimit:*';
      const keys = await this.cacheProvider.keys(pattern);
      
      const now = Date.now();
      const currentWindowStart = this.getWindowStart();
      let activeWindows = 0;
      const keyCounts: Array<{ key: string; count: number }> = [];

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[parts.length - 1]);
          
          if (timestamp === currentWindowStart) {
            activeWindows++;
            const count = await this.cacheProvider.get<number>(key) || 0;
            const originalKey = parts.slice(1, -1).join(':');
            keyCounts.push({ key: originalKey, count });
          }
        }
      }

      // Sort by count descending and take top 10
      const topLimitedKeys = keyCounts
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalKeys: keys.length,
        activeWindows,
        topLimitedKeys
      };
    } catch (error) {
      console.error('Error getting rate limit stats:', error);
      return {
        totalKeys: 0,
        activeWindows: 0,
        topLimitedKeys: []
      };
    }
  }
}