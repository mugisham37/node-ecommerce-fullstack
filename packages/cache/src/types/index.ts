/**
 * Cache layer type definitions
 */

export type SerializationType = 'json' | 'string' | 'buffer' | 'msgpack';

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  compression?: boolean; // Whether to compress cached values
  serialization: SerializationType; // Serialization method
}

export interface CacheConfigOptions {
  [cacheName: string]: CacheConfig;
}

export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
  missRate: number;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<boolean>;
  getStats(): Promise<CacheStats>;
  isHealthy(): Promise<boolean>;
}

export interface CacheStrategy {
  name: string;
  shouldCache(key: string, value: any): boolean;
  getTtl(key: string, value: any): number;
  onHit?(key: string, value: any): void;
  onMiss?(key: string): void;
  onSet?(key: string, value: any): void;
  onDelete?(key: string): void;
}

export interface CacheMiddlewareOptions {
  keyGenerator?: (req: any) => string;
  ttl?: number;
  condition?: (req: any, res: any) => boolean;
  skipCache?: (req: any) => boolean;
  varyBy?: string[];
  tags?: string[];
}

export interface CacheWarmupConfig {
  enabled: boolean;
  strategies: string[];
  schedule?: string; // Cron expression
  batchSize?: number;
  concurrency?: number;
  timeout?: number;
}

export interface CacheMonitoringMetrics {
  timestamp: number;
  provider: string;
  stats: CacheStats;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  connectionStats?: {
    active: number;
    idle: number;
    total: number;
  };
  performance?: {
    avgResponseTime: number;
    slowQueries: number;
    errorRate: number;
  };
}

export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'expire' | 'evict';
  key: string;
  value?: any;
  ttl?: number;
  timestamp: number;
  provider: string;
}

export type CacheEventListener = (event: CacheEvent) => void;

export interface CacheManagerOptions {
  providers: {
    primary: CacheProvider;
    fallback?: CacheProvider;
  };
  strategies: CacheStrategy[];
  monitoring?: {
    enabled: boolean;
    interval: number;
    listeners: CacheEventListener[];
  };
  warmup?: CacheWarmupConfig;
}

export interface CacheKeyOptions {
  prefix?: string;
  suffix?: string;
  namespace?: string;
  separator?: string;
  hash?: boolean;
}

export interface CacheInvalidationOptions {
  pattern?: string;
  tags?: string[];
  cascade?: boolean;
  async?: boolean;
}

export interface CacheCompressionOptions {
  enabled: boolean;
  algorithm: 'gzip' | 'deflate' | 'brotli';
  threshold: number; // Minimum size in bytes to compress
  level?: number; // Compression level
}

export interface CacheSerializationOptions {
  type: SerializationType;
  compression?: CacheCompressionOptions;
  customSerializer?: {
    serialize: (value: any) => string | Buffer;
    deserialize: (data: string | Buffer) => any;
  };
}

export interface CacheHealthCheck {
  provider: string;
  healthy: boolean;
  latency: number;
  error?: string;
  timestamp: number;
}

export interface CacheClusterConfig {
  nodes: Array<{
    host: string;
    port: number;
  }>;
  options?: {
    enableReadyCheck?: boolean;
    redisOptions?: any;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
  };
}

export interface CacheSentinelConfig {
  sentinels: Array<{
    host: string;
    port: number;
  }>;
  name: string;
  options?: {
    role?: 'master' | 'slave';
    sentinelRetryStrategy?: (times: number) => number;
  };
}

export interface CacheConnectionConfig {
  type: 'standalone' | 'cluster' | 'sentinel';
  standalone?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  cluster?: CacheClusterConfig;
  sentinel?: CacheSentinelConfig;
  options?: {
    connectTimeout?: number;
    commandTimeout?: number;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
    keepAlive?: number;
  };
}

export interface CacheError extends Error {
  code: string;
  provider: string;
  operation: string;
  key?: string;
  originalError?: Error;
}

export class CacheOperationError extends Error implements CacheError {
  public code: string;
  public provider: string;
  public operation: string;
  public key?: string;
  public originalError?: Error;

  constructor(
    message: string,
    code: string,
    provider: string,
    operation: string,
    key?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'CacheOperationError';
    this.code = code;
    this.provider = provider;
    this.operation = operation;
    this.key = key;
    this.originalError = originalError;
  }
}

export class CacheConnectionError extends Error implements CacheError {
  public code: string;
  public provider: string;
  public operation: string;
  public originalError?: Error;

  constructor(
    message: string,
    provider: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'CacheConnectionError';
    this.code = 'CONNECTION_ERROR';
    this.provider = provider;
    this.operation = 'connect';
    this.originalError = originalError;
  }
}

export class CacheTimeoutError extends Error implements CacheError {
  public code: string;
  public provider: string;
  public operation: string;
  public key?: string;

  constructor(
    message: string,
    provider: string,
    operation: string,
    key?: string
  ) {
    super(message);
    this.name = 'CacheTimeoutError';
    this.code = 'TIMEOUT_ERROR';
    this.provider = provider;
    this.operation = operation;
    this.key = key;
  }
}