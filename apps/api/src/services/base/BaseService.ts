/**
 * Base service interface for common CRUD operations
 * Provides type-safe foundation for all business services
 */
export interface BaseService<T, CreateDTO, UpdateDTO> {
  /**
   * Find all entities with pagination
   */
  findAll(pagination: PaginationOptions): Promise<PagedResult<T>>;

  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T>;

  /**
   * Create new entity
   */
  create(data: CreateDTO): Promise<T>;

  /**
   * Update existing entity
   */
  update(id: string, data: UpdateDTO): Promise<T>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<void>;
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result wrapper
 */
export interface PagedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Service context for dependency injection
 */
export interface ServiceContext {
  // Database access
  db: any; // Will be typed properly with database layer
  
  // Cache service
  cache: any; // Will be typed properly with cache layer
  
  // Event publisher
  eventPublisher: any; // Will be typed properly with event system
  
  // Logger
  logger: any; // Will be typed properly with logging system
  
  // Current user context
  currentUser?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Base service implementation with common functionality
 */
export abstract class AbstractBaseService<T, CreateDTO, UpdateDTO> 
  implements BaseService<T, CreateDTO, UpdateDTO> {
  
  protected context: ServiceContext;
  protected entityName: string;

  constructor(context: ServiceContext, entityName: string) {
    this.context = context;
    this.entityName = entityName;
  }

  abstract findAll(pagination: PaginationOptions): Promise<PagedResult<T>>;
  abstract findById(id: string): Promise<T>;
  abstract create(data: CreateDTO): Promise<T>;
  abstract update(id: string, data: UpdateDTO): Promise<T>;
  abstract delete(id: string): Promise<void>;

  /**
   * Log service operations
   */
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any): void {
    if (this.context.logger) {
      this.context.logger[level](`[${this.entityName}Service] ${message}`, meta);
    }
  }

  /**
   * Get current user ID for audit trails
   */
  protected getCurrentUserId(): string {
    return this.context.currentUser?.id || 'SYSTEM';
  }

  /**
   * Validate entity exists
   */
  protected async validateEntityExists(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`${this.entityName} not found with ID: ${id}`);
    }
  }

  /**
   * Cache key generator
   */
  protected getCacheKey(operation: string, ...params: any[]): string {
    return `${this.entityName.toLowerCase()}:${operation}:${params.join(':')}`;
  }

  /**
   * Invalidate related caches
   */
  protected async invalidateRelatedCaches(entityId: string): Promise<void> {
    if (this.context.cache) {
      // Invalidate entity-specific caches
      await this.context.cache.del(this.getCacheKey('findById', entityId));
      await this.context.cache.del(this.getCacheKey('findAll', '*'));
    }
  }

  /**
   * Publish domain event
   */
  protected async publishEvent(eventType: string, data: any): Promise<void> {
    if (this.context.eventPublisher) {
      await this.context.eventPublisher.publish({
        type: eventType,
        entityType: this.entityName,
        data,
        timestamp: new Date(),
        userId: this.getCurrentUserId(),
      });
    }
  }
}