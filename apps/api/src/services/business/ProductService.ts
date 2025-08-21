/**
 * Product Management Service with comprehensive caching integration
 * Handles product CRUD operations, search functionality, and business logic
 * Converted from Java Spring Boot ProductService
 */

import { AbstractBaseService, ServiceContext, PaginationOptions, PagedResult } from '../base/BaseService';
import { 
  Product, 
  ProductCreateDTO, 
  ProductUpdateDTO,
  NotFoundError,
  ConflictError,
  ValidationError 
} from '../base/types';

export interface ProductFilters {
  name?: string;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  active?: boolean;
  lowStock?: boolean;
}

export interface ProductStatistics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
}

export class ProductService extends AbstractBaseService<Product, ProductCreateDTO, ProductUpdateDTO> {
  constructor(context: ServiceContext) {
    super(context, 'Product');
  }

  /**
   * Create a new product with cache warming
   */
  async create(request: ProductCreateDTO): Promise<Product> {
    this.log('info', `Creating new product with SKU: ${request.sku}`);

    // Validate category exists
    await this.validateCategoryExists(request.categoryId);

    // Validate supplier exists
    await this.validateSupplierExists(request.supplierId);

    // Check if SKU already exists
    const existingProduct = await this.findBySku(request.sku);
    if (existingProduct) {
      throw new ConflictError(`Product with SKU ${request.sku} already exists`);
    }

    // Create product entity
    const productData = {
      id: this.generateId(),
      name: request.name,
      sku: request.sku,
      slug: this.generateSlug(request.name),
      description: request.description,
      categoryId: request.categoryId,
      supplierId: request.supplierId,
      costPrice: request.costPrice,
      sellingPrice: request.sellingPrice,
      reorderLevel: request.reorderLevel,
      reorderQuantity: request.reorderQuantity,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const savedProduct = await this.saveProduct(productData);

    // Warm cache
    await this.warmProductCache(savedProduct);

    // Invalidate related caches
    await this.invalidateRelatedCaches(savedProduct.id);

    // Publish event
    await this.publishEvent('PRODUCT_CREATED', {
      productId: savedProduct.id,
      sku: savedProduct.sku,
      name: savedProduct.name,
      categoryId: savedProduct.categoryId,
      supplierId: savedProduct.supplierId,
    });

    this.log('info', `Successfully created product with ID: ${savedProduct.id}`);
    return savedProduct;
  }

  /**
   * Update product with intelligent cache invalidation
   */
  async update(id: string, request: ProductUpdateDTO): Promise<Product> {
    this.log('info', `Updating product with ID: ${id}`);

    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    // Validate category if provided
    if (request.categoryId) {
      await this.validateCategoryExists(request.categoryId);
    }

    // Validate supplier if provided
    if (request.supplierId) {
      await this.validateSupplierExists(request.supplierId);
    }

    // Update product fields
    const updatedData = {
      ...product,
      ...request,
      slug: request.name ? this.generateSlug(request.name) : product.slug,
      updatedAt: new Date(),
    };

    const updatedProduct = await this.saveProduct(updatedData);

    // Update cache
    await this.warmProductCache(updatedProduct);

    // Invalidate related caches
    await this.invalidateRelatedCaches(updatedProduct.id);

    // Publish event
    await this.publishEvent('PRODUCT_UPDATED', {
      productId: updatedProduct.id,
      changes: request,
    });

    this.log('info', `Successfully updated product with ID: ${updatedProduct.id}`);
    return updatedProduct;
  }

  /**
   * Get product by ID with caching
   */
  async findById(id: string): Promise<Product> {
    const cacheKey = this.getCacheKey('findById', id);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const product = await this.queryProductById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, product, 300); // 5 minutes TTL
    }

    return product;
  }

  /**
   * Get product by SKU with caching
   */
  async findBySku(sku: string): Promise<Product | null> {
    const cacheKey = this.getCacheKey('findBySku', sku);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Query database
    const product = await this.queryProductBySku(sku);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, product, 300); // 5 minutes TTL
    }

    return product;
  }

  /**
   * Get all active products with caching
   */
  async findAll(pagination: PaginationOptions): Promise<PagedResult<Product>> {
    const cacheKey = this.getCacheKey('findAll', pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.queryActiveProducts(pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 180); // 3 minutes TTL
    }

    return result;
  }

  /**
   * Search products with caching
   */
  async searchProducts(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    this.log('debug', `Searching products with term: ${searchTerm}`);
    
    const cacheKey = this.getCacheKey('search', searchTerm, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.querySearchProducts(searchTerm, pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 180); // 3 minutes TTL
    }

    return result;
  }

  /**
   * Get products by category with caching
   */
  async getProductsByCategory(categoryId: string, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    this.log('debug', `Fetching products for category ID: ${categoryId}`);
    
    // Verify category exists
    await this.validateCategoryExists(categoryId);

    const cacheKey = this.getCacheKey('byCategory', categoryId, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.queryProductsByCategory(categoryId, pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 300); // 5 minutes TTL
    }

    return result;
  }

  /**
   * Get products by supplier with caching
   */
  async getProductsBySupplier(supplierId: string, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    this.log('debug', `Fetching products for supplier ID: ${supplierId}`);
    
    // Verify supplier exists
    await this.validateSupplierExists(supplierId);

    const cacheKey = this.getCacheKey('bySupplier', supplierId, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.queryProductsBySupplier(supplierId, pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 300); // 5 minutes TTL
    }

    return result;
  }

  /**
   * Get low stock products with caching (shorter TTL)
   */
  async getLowStockProducts(): Promise<Product[]> {
    this.log('debug', 'Fetching low stock products');
    
    const cacheKey = this.getCacheKey('lowStock');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const products = await this.queryLowStockProducts();
    
    // Cache result with shorter TTL
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, products, 60); // 1 minute TTL
    }

    return products;
  }

  /**
   * Update product pricing with cache invalidation
   */
  async updateProductPricing(id: string, costPrice: number, sellingPrice: number): Promise<void> {
    this.log('info', `Updating pricing for product ID: ${id}`);

    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const updatedData = {
      ...product,
      costPrice,
      sellingPrice,
      updatedAt: new Date(),
    };

    const updatedProduct = await this.saveProduct(updatedData);

    // Update cache
    await this.warmProductCache(updatedProduct);

    // Publish event
    await this.publishEvent('PRODUCT_PRICING_UPDATED', {
      productId: id,
      previousCostPrice: product.costPrice,
      newCostPrice: costPrice,
      previousSellingPrice: product.sellingPrice,
      newSellingPrice: sellingPrice,
    });

    this.log('info', `Successfully updated pricing for product ID: ${id}`);
  }

  /**
   * Deactivate product with cache eviction
   */
  async deactivateProduct(id: string): Promise<void> {
    this.log('info', `Deactivating product with ID: ${id}`);

    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const updatedData = {
      ...product,
      active: false,
      updatedAt: new Date(),
    };

    await this.saveProduct(updatedData);

    // Remove from cache
    await this.evictProductFromCache(id, product.sku);

    // Invalidate related caches
    await this.invalidateRelatedCaches(id);

    // Publish event
    await this.publishEvent('PRODUCT_DEACTIVATED', {
      productId: id,
      sku: product.sku,
    });

    this.log('info', `Successfully deactivated product with ID: ${id}`);
  }

  /**
   * Activate product with cache warming
   */
  async activateProduct(id: string): Promise<void> {
    this.log('info', `Activating product with ID: ${id}`);

    const product = await this.queryProductById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const updatedData = {
      ...product,
      active: true,
      updatedAt: new Date(),
    };

    const activatedProduct = await this.saveProduct(updatedData);

    // Warm cache
    await this.warmProductCache(activatedProduct);

    // Publish event
    await this.publishEvent('PRODUCT_ACTIVATED', {
      productId: id,
      sku: product.sku,
    });

    this.log('info', `Successfully activated product with ID: ${id}`);
  }

  /**
   * Get all products with filtering
   */
  async getAllProducts(filters: ProductFilters, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    this.log('debug', 'Fetching products with filters', filters);
    
    const result = await this.queryProductsWithFilters(filters, pagination);
    return result;
  }

  /**
   * Bulk activate products
   */
  async bulkActivateProducts(productIds: string[]): Promise<number> {
    this.log('info', `Bulk activating ${productIds.length} products`);

    let activatedCount = 0;
    for (const productId of productIds) {
      try {
        await this.activateProduct(productId);
        activatedCount++;
      } catch (error) {
        this.log('warn', `Failed to activate product ${productId}`, error);
      }
    }

    this.log('info', `Successfully bulk activated ${activatedCount} out of ${productIds.length} products`);
    return activatedCount;
  }

  /**
   * Bulk deactivate products
   */
  async bulkDeactivateProducts(productIds: string[]): Promise<number> {
    this.log('info', `Bulk deactivating ${productIds.length} products`);

    let deactivatedCount = 0;
    for (const productId of productIds) {
      try {
        await this.deactivateProduct(productId);
        deactivatedCount++;
      } catch (error) {
        this.log('warn', `Failed to deactivate product ${productId}`, error);
      }
    }

    this.log('info', `Successfully bulk deactivated ${deactivatedCount} out of ${productIds.length} products`);
    return deactivatedCount;
  }

  /**
   * Bulk update category for products
   */
  async bulkUpdateCategory(productIds: string[], categoryId: string): Promise<number> {
    this.log('info', `Bulk updating category for ${productIds.length} products to category ID: ${categoryId}`);

    // Validate category exists
    await this.validateCategoryExists(categoryId);

    let updatedCount = 0;
    for (const productId of productIds) {
      try {
        await this.update(productId, { categoryId });
        updatedCount++;
      } catch (error) {
        this.log('warn', `Failed to update category for product ${productId}`, error);
      }
    }

    this.log('info', `Successfully bulk updated category for ${updatedCount} out of ${productIds.length} products`);
    return updatedCount;
  }

  /**
   * Get product statistics
   */
  async getProductStatistics(): Promise<ProductStatistics> {
    const cacheKey = this.getCacheKey('getProductStatistics');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const stats = await this.queryProductStatistics();
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, stats, 600); // 10 minutes TTL
    }

    return stats;
  }

  /**
   * Delete product (hard delete)
   */
  async delete(id: string): Promise<void> {
    this.log('info', `Deleting product with ID: ${id}`);

    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    // Check if product can be deleted (business rules)
    const canDelete = await this.canDeleteProduct(id);
    if (!canDelete) {
      throw new ValidationError('Product cannot be deleted due to existing dependencies');
    }

    await this.deleteProductFromDatabase(id);

    // Remove from cache
    await this.evictProductFromCache(id, product.sku);

    // Invalidate related caches
    await this.invalidateRelatedCaches(id);

    // Publish event
    await this.publishEvent('PRODUCT_DELETED', {
      productId: id,
      sku: product.sku,
      deletedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully deleted product with ID: ${id}`);
  }

  // Private helper methods

  private generateId(): string {
    return `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async warmProductCache(product: Product): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.set(this.getCacheKey('findById', product.id), product, 300);
      await this.context.cache.set(this.getCacheKey('findBySku', product.sku), product, 300);
    }
  }

  private async evictProductFromCache(id: string, sku: string): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.del(this.getCacheKey('findById', id));
      await this.context.cache.del(this.getCacheKey('findBySku', sku));
    }
  }

  private async validateCategoryExists(categoryId: string): Promise<void> {
    // Implementation would validate category exists
    // For now, just a placeholder
  }

  private async validateSupplierExists(supplierId: string): Promise<void> {
    // Implementation would validate supplier exists
    // For now, just a placeholder
  }

  // Database query methods (to be implemented with actual database layer)
  private async saveProduct(productData: any): Promise<Product> {
    // Implementation would use database layer
    return productData as Product;
  }

  private async queryProductById(id: string): Promise<Product | null> {
    // Implementation would use database layer
    return null;
  }

  private async queryProductBySku(sku: string): Promise<Product | null> {
    // Implementation would use database layer
    return null;
  }

  private async queryActiveProducts(pagination: PaginationOptions): Promise<PagedResult<Product>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async querySearchProducts(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async queryProductsByCategory(categoryId: string, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async queryProductsBySupplier(supplierId: string, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async queryLowStockProducts(): Promise<Product[]> {
    // Implementation would use database layer
    return [];
  }

  private async queryProductsWithFilters(filters: ProductFilters, pagination: PaginationOptions): Promise<PagedResult<Product>> {
    // Implementation would use database layer
    return {
      data: [],
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  private async queryProductStatistics(): Promise<ProductStatistics> {
    // Implementation would use database layer
    return {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      lowStockProducts: 0,
    };
  }

  private async canDeleteProduct(id: string): Promise<boolean> {
    // Implementation would check business rules
    return true;
  }

  private async deleteProductFromDatabase(id: string): Promise<void> {
    // Implementation would use database layer
  }
}