import { CacheProvider, CacheMiddlewareOptions } from '../types';

/**
 * Generic cache middleware for API responses
 * Can be used with Express, Fastify, or other Node.js frameworks
 */
export class CacheMiddleware {
  constructor(
    private cacheProvider: CacheProvider,
    private defaultOptions: CacheMiddlewareOptions = {}
  ) {
    this.defaultOptions = {
      ttl: 300000, // 5 minutes default
      keyGenerator: this.defaultKeyGenerator,
      condition: () => true,
      skipCache: () => false,
      varyBy: [],
      tags: [],
      ...defaultOptions
    };
  }

  /**
   * Express.js middleware
   */
  express(options: CacheMiddlewareOptions = {}) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, res: any, next: any) => {
      try {
        // Check if we should skip caching
        if (opts.skipCache!(req)) {
          return next();
        }

        // Generate cache key
        const cacheKey = opts.keyGenerator!(req);

        // Try to get cached response
        const cached = await this.cacheProvider.get<{
          statusCode: number;
          headers: Record<string, string>;
          body: any;
        }>(cacheKey);

        if (cached) {
          // Return cached response
          res.status(cached.statusCode);
          Object.entries(cached.headers).forEach(([key, value]) => {
            res.set(key, value);
          });
          res.set('X-Cache', 'HIT');
          return res.json(cached.body);
        }

        // Cache miss - intercept response
        const originalJson = res.json;
        const originalSend = res.send;
        const originalStatus = res.status;
        let statusCode = 200;
        let responseBody: any;

        res.status = function(code: number) {
          statusCode = code;
          return originalStatus.call(this, code);
        };

        res.json = function(body: any) {
          responseBody = body;
          return originalJson.call(this, body);
        };

        res.send = function(body: any) {
          responseBody = body;
          return originalSend.call(this, body);
        };

        // Continue to next middleware
        res.on('finish', async () => {
          try {
            // Check if response should be cached
            if (opts.condition!(req, res) && statusCode >= 200 && statusCode < 300) {
              const cacheData = {
                statusCode,
                headers: this.extractCacheableHeaders(res),
                body: responseBody
              };

              await this.cacheProvider.set(cacheKey, cacheData, opts.ttl);
            }
          } catch (error) {
            console.error('Error caching response:', error);
          }
        });

        res.set('X-Cache', 'MISS');
        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Fastify plugin
   */
  fastify(options: CacheMiddlewareOptions = {}) {
    const opts = { ...this.defaultOptions, ...options };

    return async (request: any, reply: any) => {
      try {
        // Check if we should skip caching
        if (opts.skipCache!(request)) {
          return;
        }

        // Generate cache key
        const cacheKey = opts.keyGenerator!(request);

        // Try to get cached response
        const cached = await this.cacheProvider.get<{
          statusCode: number;
          headers: Record<string, string>;
          body: any;
        }>(cacheKey);

        if (cached) {
          // Return cached response
          reply.code(cached.statusCode);
          Object.entries(cached.headers).forEach(([key, value]) => {
            reply.header(key, value);
          });
          reply.header('X-Cache', 'HIT');
          return reply.send(cached.body);
        }

        // Cache miss - set up response caching
        reply.header('X-Cache', 'MISS');

        // Hook into response to cache it
        reply.addHook('onSend', async (request: any, reply: any, payload: any) => {
          try {
            if (opts.condition!(request, reply) && reply.statusCode >= 200 && reply.statusCode < 300) {
              const cacheData = {
                statusCode: reply.statusCode,
                headers: this.extractCacheableHeaders(reply),
                body: payload
              };

              await this.cacheProvider.set(cacheKey, cacheData, opts.ttl);
            }
          } catch (error) {
            console.error('Error caching response:', error);
          }
          return payload;
        });
      } catch (error) {
        console.error('Cache middleware error:', error);
      }
    };
  }

  /**
   * tRPC middleware
   */
  trpc(options: CacheMiddlewareOptions = {}) {
    const opts = { ...this.defaultOptions, ...options };

    return async ({ ctx, next, path, type, input }: any) => {
      try {
        // Only cache queries, not mutations
        if (type !== 'query') {
          return next();
        }

        // Check if we should skip caching
        const mockReq = { path, input, ctx };
        if (opts.skipCache!(mockReq)) {
          return next();
        }

        // Generate cache key
        const cacheKey = opts.keyGenerator!(mockReq);

        // Try to get cached response
        const cached = await this.cacheProvider.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Cache miss - execute procedure and cache result
        const result = await next();

        // Cache successful results
        if (result && opts.condition!(mockReq, { result })) {
          await this.cacheProvider.set(cacheKey, result, opts.ttl);
        }

        return result;
      } catch (error) {
        console.error('tRPC cache middleware error:', error);
        return next();
      }
    };
  }

  /**
   * Default cache key generator
   */
  private defaultKeyGenerator(req: any): string {
    const method = req.method || 'GET';
    const url = req.url || req.path || '';
    const query = req.query ? JSON.stringify(req.query) : '';
    const input = req.input ? JSON.stringify(req.input) : '';
    
    return `api:${method}:${url}:${query}:${input}`;
  }

  /**
   * Extract cacheable headers from response
   */
  private extractCacheableHeaders(res: any): Record<string, string> {
    const cacheableHeaders = [
      'content-type',
      'content-encoding',
      'content-language',
      'etag',
      'last-modified'
    ];

    const headers: Record<string, string> = {};
    
    cacheableHeaders.forEach(header => {
      const value = res.get ? res.get(header) : res.getHeader(header);
      if (value) {
        headers[header] = value;
      }
    });

    return headers;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.cacheProvider.keys(pattern);
      const deletePromises = keys.map(key => this.cacheProvider.delete(key));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        await this.invalidate(`*:tag:${tag}:*`);
      }
    } catch (error) {
      console.error('Error invalidating cache by tags:', error);
    }
  }

  /**
   * Warm up cache with data
   */
  async warmup<T>(
    key: string,
    dataLoader: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    try {
      const data = await dataLoader();
      await this.cacheProvider.set(key, data, ttl || this.defaultOptions.ttl);
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return await this.cacheProvider.getStats();
  }

  /**
   * Check cache health
   */
  async isHealthy(): Promise<boolean> {
    return await this.cacheProvider.isHealthy();
  }
}