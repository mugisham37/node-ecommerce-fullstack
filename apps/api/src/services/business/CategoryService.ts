/**
 * Category Service for managing category operations
 * Handles hierarchical category management and business logic
 * Converted from Java Spring Boot CategoryService
 */

import { AbstractBaseService, ServiceContext, PaginationOptions, PagedResult } from '../base/BaseService';
import { 
  Category, 
  CategoryCreateDTO, 
  CategoryUpdateDTO,
  NotFoundError,
  ValidationError 
} from '../base/types';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  sortOrder: number;
  productCount: number;
  children?: CategoryResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryStatistics {
  totalCategories: number;
  rootCategories: number;
  childCategories: number;
}

export class CategoryService extends AbstractBaseService<Category, CategoryCreateDTO, CategoryUpdateDTO> {
  constructor(context: ServiceContext) {
    super(context, 'Category');
  }

  /**
   * Create a new category
   */
  async create(request: CategoryCreateDTO): Promise<CategoryResponse> {
    this.log('info', `Creating new category: ${request.name}`);

    // Create category entity
    const categoryData = {
      id: this.generateId(),
      name: request.name,
      slug: this.generateSlug(request.name),
      description: request.description,
      parentId: request.parentId,
      sortOrder: request.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Set parent if provided
    if (request.parentId) {
      await this.validateParentExists(request.parentId);
    }

    const savedCategory = await this.saveCategory(categoryData);

    // Publish event
    await this.publishEvent('CATEGORY_CREATED', {
      categoryId: savedCategory.id,
      categoryName: savedCategory.name,
      parentId: savedCategory.parentId,
    });

    // Invalidate caches
    await this.invalidateCategoryCaches();

    this.log('info', `Successfully created category with ID: ${savedCategory.id}`);
    return await this.convertToCategoryResponse(savedCategory);
  }

  /**
   * Update category information
   */
  async update(categoryId: string, request: CategoryUpdateDTO): Promise<CategoryResponse> {
    this.log('info', `Updating category with ID: ${categoryId}`);

    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    // Update fields if provided
    const updatedData = {
      ...category,
      ...request,
      slug: request.name ? this.generateSlug(request.name) : category.slug,
      updatedAt: new Date(),
    };

    // Update parent if provided
    if (request.parentId !== undefined) {
      if (request.parentId) {
        await this.validateParentExists(request.parentId);
        // Prevent circular references
        if (await this.wouldCreateCircularReference(categoryId, request.parentId)) {
          throw new ValidationError('Cannot set parent that would create circular reference');
        }
      }
      updatedData.parentId = request.parentId;
    }

    const updatedCategory = await this.saveCategory(updatedData);

    // Publish event
    await this.publishEvent('CATEGORY_UPDATED', {
      categoryId: updatedCategory.id,
      categoryName: updatedCategory.name,
      changes: request,
    });

    // Invalidate caches
    await this.invalidateCategoryCaches();

    this.log('info', `Successfully updated category with ID: ${updatedCategory.id}`);
    return await this.convertToCategoryResponse(updatedCategory);
  }

  /**
   * Get category by ID with caching
   */
  async findById(categoryId: string): Promise<Category> {
    const cacheKey = this.getCacheKey('findById', categoryId);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const category = await this.queryCategoryById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, category, 300); // 5 minutes TTL
    }

    return category;
  }

  /**
   * Get all categories with pagination
   */
  async findAll(pagination: PaginationOptions): Promise<PagedResult<Category>> {
    const cacheKey = this.getCacheKey('findAll', pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.queryAllCategories(pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 300);
    }

    return result;
  }

  /**
   * Get root categories (categories without parent)
   */
  async getRootCategories(): Promise<CategoryResponse[]> {
    this.log('debug', 'Fetching root categories');

    const cacheKey = this.getCacheKey('rootCategories');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const rootCategories = await this.queryRootCategories();
    
    // Convert to responses
    const responses = await Promise.all(
      rootCategories.map(category => this.convertToCategoryResponse(category))
    );
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, responses, 600); // 10 minutes TTL
    }

    return responses;
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<CategoryResponse[]> {
    this.log('debug', 'Fetching category hierarchy');

    const cacheKey = this.getCacheKey('hierarchy');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const rootCategories = await this.queryRootCategories();
    
    // Convert to responses with children
    const responses = await Promise.all(
      rootCategories.map(category => this.convertToCategoryResponseWithChildren(category))
    );
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, responses, 600); // 10 minutes TTL
    }

    return responses;
  }

  /**
   * Get child categories
   */
  async getChildCategories(categoryId: string): Promise<CategoryResponse[]> {
    this.log('debug', `Fetching child categories for category ID: ${categoryId}`);

    const cacheKey = this.getCacheKey('children', categoryId);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Validate parent exists
    await this.findById(categoryId);

    // Query database
    const children = await this.queryChildCategories(categoryId);
    
    // Convert to responses
    const responses = await Promise.all(
      children.map(category => this.convertToCategoryResponse(category))
    );
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, responses, 300);
    }

    return responses;
  }

  /**
   * Get category ancestors (breadcrumb path)
   */
  async getCategoryAncestors(categoryId: string): Promise<CategoryResponse[]> {
    this.log('debug', `Fetching ancestors for category ID: ${categoryId}`);

    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    const ancestors: Category[] = [];
    let currentCategory = category;

    // Traverse up the hierarchy
    while (currentCategory.parentId) {
      const parent = await this.findById(currentCategory.parentId);
      if (parent) {
        ancestors.unshift(parent); // Add to beginning to maintain order
        currentCategory = parent;
      } else {
        break;
      }
    }

    // Convert to responses
    return await Promise.all(
      ancestors.map(ancestor => this.convertToCategoryResponse(ancestor))
    );
  }

  /**
   * Get all descendants of a category
   */
  async getCategoryDescendants(categoryId: string): Promise<CategoryResponse[]> {
    this.log('debug', `Fetching descendants for category ID: ${categoryId}`);

    // Validate category exists
    await this.findById(categoryId);

    const descendants: Category[] = [];
    await this.collectDescendants(categoryId, descendants);

    // Convert to responses
    return await Promise.all(
      descendants.map(descendant => this.convertToCategoryResponse(descendant))
    );
  }

  /**
   * Search categories by name
   */
  async searchCategories(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<CategoryResponse>> {
    this.log('debug', `Searching categories with term: ${searchTerm}`);

    const cacheKey = this.getCacheKey('search', searchTerm, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.querySearchCategories(searchTerm, pagination);
    
    // Convert to responses
    const responseResult = {
      ...result,
      data: await Promise.all(result.data.map(category => this.convertToCategoryResponse(category)))
    };
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, responseResult, 180); // 3 minutes TTL
    }

    return responseResult;
  }

  /**
   * Move category to new parent
   */
  async moveCategory(categoryId: string, newParentId?: string): Promise<void> {
    this.log('info', `Moving category ${categoryId} to parent ${newParentId}`);

    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    if (newParentId) {
      await this.validateParentExists(newParentId);
      
      // Prevent circular references
      if (await this.wouldCreateCircularReference(categoryId, newParentId)) {
        throw new ValidationError('Cannot move category to its own descendant');
      }
    }

    // Update category parent
    const updatedData = {
      ...category,
      parentId: newParentId,
      updatedAt: new Date(),
    };

    await this.saveCategory(updatedData);

    // Publish event
    await this.publishEvent('CATEGORY_MOVED', {
      categoryId,
      previousParentId: category.parentId,
      newParentId,
    });

    // Invalidate caches
    await this.invalidateCategoryCaches();

    this.log('info', `Successfully moved category ${categoryId}`);
  }

  /**
   * Update category sort order
   */
  async updateCategorySortOrder(categoryId: string, sortOrder: number): Promise<void> {
    this.log('info', `Updating sort order for category ${categoryId} to ${sortOrder}`);

    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    const updatedData = {
      ...category,
      sortOrder,
      updatedAt: new Date(),
    };

    await this.saveCategory(updatedData);

    // Publish event
    await this.publishEvent('CATEGORY_SORT_ORDER_UPDATED', {
      categoryId,
      previousSortOrder: category.sortOrder,
      newSortOrder: sortOrder,
    });

    // Invalidate caches
    await this.invalidateCategoryCaches();

    this.log('info', `Successfully updated sort order for category ${categoryId}`);
  }

  /**
   * Delete category
   */
  async delete(categoryId: string): Promise<void> {
    this.log('info', `Deleting category with ID: ${categoryId}`);

    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category', categoryId);
    }

    // Check if category has products
    const productCount = await this.getCategoryProductCount(categoryId);
    if (productCount > 0) {
      throw new ValidationError('Cannot delete category with associated products');
    }

    // Check if category has children
    const children = await this.queryChildCategories(categoryId);
    if (children.length > 0) {
      throw new ValidationError('Cannot delete category with child categories');
    }

    await this.deleteCategoryFromDatabase(categoryId);

    // Publish event
    await this.publishEvent('CATEGORY_DELETED', {
      categoryId,
      categoryName: category.name,
      deletedBy: this.getCurrentUserId(),
    });

    // Invalidate caches
    await this.invalidateCategoryCaches();

    this.log('info', `Successfully deleted category with ID: ${categoryId}`);
  }

  /**
   * Bulk create categories
   */
  async bulkCreateCategories(requests: CategoryCreateDTO[]): Promise<CategoryResponse[]> {
    this.log('info', `Bulk creating ${requests.length} categories`);

    const responses: CategoryResponse[] = [];
    for (const request of requests) {
      try {
        const response = await this.create(request);
        responses.push(response);
      } catch (error) {
        this.log('warn', `Failed to create category ${request.name}`, error);
      }
    }

    this.log('info', `Successfully bulk created ${responses.length} categories`);
    return responses;
  }

  /**
   * Bulk update categories
   */
  async bulkUpdateCategories(updates: Array<{ id: string } & CategoryUpdateDTO>): Promise<CategoryResponse[]> {
    this.log('info', `Bulk updating ${updates.length} categories`);

    const responses: CategoryResponse[] = [];
    for (const update of updates) {
      try {
        const { id, ...updateData } = update;
        const response = await this.update(id, updateData);
        responses.push(response);
      } catch (error) {
        this.log('warn', `Failed to update category ${update.id}`, error);
      }
    }

    this.log('info', `Successfully bulk updated ${responses.length} categories`);
    return responses;
  }

  /**
   * Bulk delete categories
   */
  async bulkDeleteCategories(categoryIds: string[]): Promise<number> {
    this.log('info', `Bulk deleting ${categoryIds.length} categories`);

    let deletedCount = 0;
    for (const categoryId of categoryIds) {
      try {
        await this.delete(categoryId);
        deletedCount++;
      } catch (error) {
        this.log('warn', `Failed to delete category ${categoryId}`, error);
      }
    }

    this.log('info', `Successfully bulk deleted ${deletedCount} out of ${categoryIds.length} categories`);
    return deletedCount;
  }

  /**
   * Get category statistics
   */
  async getCategoryStatistics(): Promise<CategoryStatistics> {
    const cacheKey = this.getCacheKey('statistics');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const stats = await this.queryCategoryStatistics();
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, stats, 600); // 10 minutes TTL
    }

    return stats;
  }

  // Private helper methods

  private generateId(): string {
    return `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async validateParentExists(parentId: string): Promise<void> {
    const parent = await this.queryCategoryById(parentId);
    if (!parent) {
      throw new NotFoundError('Parent category', parentId);
    }
  }

  private async wouldCreateCircularReference(categoryId: string, newParentId: string): Promise<boolean> {
    // Check if newParentId is a descendant of categoryId
    const descendants = await this.getCategoryDescendants(categoryId);
    return descendants.some(descendant => descendant.id === newParentId);
  }

  private async collectDescendants(categoryId: string, descendants: Category[]): Promise<void> {
    const children = await this.queryChildCategories(categoryId);
    for (const child of children) {
      descendants.push(child);
      await this.collectDescendants(child.id, descendants);
    }
  }

  private async invalidateCategoryCaches(): Promise<void> {
    if (this.context.cache) {
      // Invalidate all category-related caches
      await this.context.cache.del(this.getCacheKey('rootCategories'));
      await this.context.cache.del(this.getCacheKey('hierarchy'));
      await this.context.cache.del(this.getCacheKey('statistics'));
      // Note: In a real implementation, you'd want more sophisticated cache invalidation
    }
  }

  private async convertToCategoryResponse(category: Category): Promise<CategoryResponse> {
    const productCount = await this.getCategoryProductCount(category.id);
    let parentName: string | undefined;

    if (category.parentId) {
      try {
        const parent = await this.findById(category.parentId);
        parentName = parent.name;
      } catch (error) {
        // Parent might not exist, ignore error
      }
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      parentName,
      sortOrder: category.sortOrder,
      productCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private async convertToCategoryResponseWithChildren(category: Category): Promise<CategoryResponse> {
    const response = await this.convertToCategoryResponse(category);
    
    // Get children
    const children = await this.queryChildCategories(category.id);
    if (children.length > 0) {
      response.children = await Promise.all(
        children.map(child => this.convertToCategoryResponseWithChildren(child))
      );
    }
    
    return response;
  }

  // Database query method stubs (to be implemented with actual database layer)
  private async saveCategory(categoryData: any): Promise<Category> { return categoryData as Category; }
  private async queryCategoryById(id: string): Promise<Category | null> { return null; }
  private async queryAllCategories(pagination: PaginationOptions): Promise<PagedResult<Category>> { return { data: [], pagination: {} as any }; }
  private async queryRootCategories(): Promise<Category[]> { return []; }
  private async queryChildCategories(parentId: string): Promise<Category[]> { return []; }
  private async querySearchCategories(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<Category>> { return { data: [], pagination: {} as any }; }
  private async queryCategoryStatistics(): Promise<CategoryStatistics> { return { totalCategories: 0, rootCategories: 0, childCategories: 0 }; }
  private async deleteCategoryFromDatabase(id: string): Promise<void> { }
  private async getCategoryProductCount(categoryId: string): Promise<number> { return 0; }
}