import { gzip, gunzip, deflate, inflate } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

/**
 * Cache compression utility
 * Handles compression and decompression of cache values
 */
export class CacheCompressor {
  constructor(
    private options: {
      algorithm?: 'gzip' | 'deflate';
      level?: number; // Compression level (1-9)
      threshold?: number; // Minimum size to compress (bytes)
    } = {}
  ) {
    this.options = {
      algorithm: 'gzip',
      level: 6,
      threshold: 1024, // 1KB
      ...options
    };
  }

  async compress(data: string | Buffer): Promise<Buffer> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // Don't compress if below threshold
    if (buffer.length < this.options.threshold!) {
      return buffer;
    }

    try {
      switch (this.options.algorithm) {
        case 'gzip':
          return await gzipAsync(buffer, { level: this.options.level });
        
        case 'deflate':
          return await deflateAsync(buffer, { level: this.options.level });
        
        default:
          return await gzipAsync(buffer, { level: this.options.level });
      }
    } catch (error) {
      console.error('Compression error:', error);
      return buffer; // Return original data if compression fails
    }
  }

  async decompress(data: Buffer): Promise<string> {
    try {
      let decompressed: Buffer;
      
      switch (this.options.algorithm) {
        case 'gzip':
          decompressed = await gunzipAsync(data);
          break;
        
        case 'deflate':
          decompressed = await inflateAsync(data);
          break;
        
        default:
          decompressed = await gunzipAsync(data);
          break;
      }
      
      return decompressed.toString();
    } catch (error) {
      // If decompression fails, assume data wasn't compressed
      return data.toString();
    }
  }

  shouldCompress(data: string | Buffer): boolean {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
    return size >= this.options.threshold!;
  }

  getCompressionRatio(originalSize: number, compressedSize: number): number {
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  getOptions() {
    return { ...this.options };
  }

  setOptions(options: Partial<typeof this.options>): void {
    this.options = { ...this.options, ...options };
  }
}