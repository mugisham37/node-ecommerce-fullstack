import { CacheProvider } from '../types';

/**
 * Response caching middleware specifically for HTTP responses
 */
export class ResponseCacheMiddleware {
  constructor(
    private cacheProvider: CacheProvider,
    private options: {
      defaultTtl?: number;
      varyHeaders?: string[];
      cacheableStatusCodes?: number[];
      cacheableMethods?: string[];
      skipCacheHeader?: string;
      cacheControlHeader?: boolean;
    } = {}
  ) {
    this.options = {
      defaultTtl: 300000, // 5 minutes
      varyHeaders: ['accept', 'accept-encoding', 'accept-language'],
      cacheableStatusCodes: [200, 201, 203, 204, 206, 300, 301, 404, 410],
      cacheableMethods: ['GET', 'HEAD'],
      skipCacheHeader: 'x-skip-cache',
      cacheControlHeader: true,
      ...options
    };
  }

  /**
   * Express middleware for response caching
   */
  express() {
    return async (req: any, res: any, next: any) => {
      // Skip non-cacheable methods
      if (!this.options.cacheableMethods!.includes(req.method)) {
        return next();
      }

      // Skip if cache skip header is present
      if (req.headers[this.options.skipCacheHeader!]) {
        return next();
      }

      const cacheKey = this.generateCacheKey(req);

      try {
        // Try to get cached response
        const cached = await this.cacheProvider.get<{
          statusCode: number;
          headers: Record<string, string>;
          body: any;
          etag?: string;
          lastModified?: string;
        }>(cacheKey);

        if (cached) {
          // Check if client has cached version (ETag/If-None-Match)
          const clientETag = req.headers['if-none-match'];
          if (clientETag && cached.etag && clientETag === cached.etag) {
            res.status(304);
            res.set('ETag', cached.etag);
            res.set('X-Cache', 'HIT-304');
            return res.end();
          }

          // Check if client has cached version (Last-Modified/If-Modified-Since)
          const ifModifiedSince = req.headers['if-modified-since'];
          if (ifModifiedSince && cached.lastModified) {
            const clientDate = new Date(ifModifiedSince);
            const cachedDate = new Date(cached.lastModified);
            if (clientDate >= cachedDate) {
              res.status(304);
              res.set('Last-Modified', cached.lastModified);
              res.set('X-Cache', 'HIT-304');
              return res.end();
            }
          }

          // Return cached response
          res.status(cached.statusCode);
          Object.entries(cached.headers).forEach(([key, value]) => {
            res.set(key, value);
          });
          res.set('X-Cache', 'HIT');
          
          if (this.options.cacheControlHeader) {
            const ttl = await this.cacheProvider.ttl(cacheKey);
            if (ttl > 0) {
              res.set('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`);
            }
          }

          return res.send(cached.body);
        }

        // Cache miss - intercept response
        res.set('X-Cache', 'MISS');
        this.interceptResponse(req, res, cacheKey);
        
      } catch (error) {
        console.error('Response cache middleware error:', error);
      }

      next();
    };
  }

  /**
   * Intercept and cache response
   */
  private interceptResponse(req: any, res: any, cacheKey: string): void {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseBody: any;
    let responseSent = false;

    // Override send method
    res.send = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalSend.call(this, body);
    };

    // Override json method
    res.json = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
      }
      return originalJson.call(this, body);
    };

    // Override end method
    res.end = function(chunk?: any) {
      if (!responseSent && chunk) {
        responseBody = chunk;
        responseSent = true;
      }
      return originalEnd.call(this, chunk);
    };

    // Cache response when finished
    res.on('finish', async () => {
      try {
        if (this.shouldCacheResponse(res)) {
          const etag = this.generateETag(responseBody);
          const lastModified = new Date().toUTCString();

          const cacheData = {
            statusCode: res.statusCode,
            headers: this.extractCacheableHeaders(res),
            body: responseBody,
            etag,
            lastModified
          };

          await this.cacheProvider.set(cacheKey, cacheData, this.options.defaultTtl);
        }
      } catch (error) {
        console.error('Error caching response:', error);
      }
    });
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(req: any): string {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const query = req.query ? JSON.stringify(req.query) : '';
    
    // Include vary headers in cache key
    const varyValues = this.options.varyHeaders!
      .map(header => req.headers[header] || '')
      .join('|');

    return `response:${method}:${url}:${query}:${varyValues}`;
  }

  /**
   * Generate ETag for response body
   */
  private generateETag(body: any): string {
    const content = typeof body === 'string' ? body : JSON.stringify(body);
    const hash = require('crypto').createHash('md5').update(content).digest('hex');
    return `"${hash}"`;
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(res: any): boolean {
    // Check status code
    if (!this.options.cacheableStatusCodes!.includes(res.statusCode)) {
      return false;
    }

    // Check cache-control header
    const cacheControl = res.get('cache-control');
    if (cacheControl && (
      cacheControl.includes('no-cache') ||
      cacheControl.includes('no-store') ||
      cacheControl.includes('private')
    )) {
      return false;
    }

    return true;
  }

  /**
   * Extract cacheable headers
   */
  private extractCacheableHeaders(res: any): Record<string, string> {
    const cacheableHeaders = [
      'content-type',
      'content-encoding',
      'content-language',
      'content-length',
      'vary',
      'etag',
      'last-modified',
      'expires',
      'cache-control'
    ];

    const headers: Record<string, string> = {};
    
    cacheableHeaders.forEach(header => {
      const value = res.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    return headers;
  }

  /**
   * Invalidate cached responses by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.cacheProvider.keys(`response:*${pattern}*`);
      const deletePromises = keys.map(key => this.cacheProvider.delete(key));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error invalidating response cache:', error);
    }
  }

  /**
   * Invalidate cached responses by URL
   */
  async invalidateByUrl(url: string, method: string = 'GET'): Promise<void> {
    try {
      const pattern = `response:${method}:${url}:*`;
      const keys = await this.cacheProvider.keys(pattern);
      const deletePromises = keys.map(key => this.cacheProvider.delete(key));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error invalidating response cache by URL:', error);
    }
  }

  /**
   * Warm up response cache
   */
  async warmup(requests: Array<{
    method: string;
    url: string;
    headers?: Record<string, string>;
  }>): Promise<void> {
    // This would require making actual HTTP requests to warm up the cache
    // Implementation would depend on the specific HTTP client being used
    console.log(`Warming up ${requests.length} response cache entries`);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    return await this.cacheProvider.getStats();
  }
}