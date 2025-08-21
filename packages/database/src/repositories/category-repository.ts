import { eq, and, or, ilike, isNull } from 'drizzle-orm';
import { categories } from '../schema/categories';
import { BaseRepository, FilterOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { Category, NewCategory } from '../schema/categories';

export interface CategoryFilters extends FilterOptions {
  name?: string;
  slug?: string;
  parentId?: string | null;
  search?: string;
}

export interface CategoryUpdateData {
  name?: string;
  description?: string;
  slug?: string;
  parentId?: string | null;
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  productCount?: number;
}

/**
 * Repository for category-related database operations
 */
export class CategoryRepository extends BaseRepository<
  typeof categories,
  Category,
  NewCategory,
  CategoryUpdateData
> {
  protected table = categories;
  protected tableName = 'categories';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    return await this.findOneBy({ slug });
  }

  /**
   * Find root categories (no parent)
   */
  async findRootCategories(): Promise<Category[]> {
    return await this.findBy({ parentId: null });
  }

  /**
   * Find child categories of a parent
   */
  async findChildren(parentId: string): Promise<Category[]> {
    return await this.findBy({ parentId });
  }

  /**
   * Get category tree with children
   */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    const allCategories = await this.findAll({ page: 1, limit: 1000 });
    
    // Build tree structure
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create map of all categories
    allCategories.data.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build tree structure
    allCategories.data.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children!.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });

    return rootCategories;
  }

  /**
   * Get categories with product counts
   */
  async getCategoriesWithProductCount(): Promise<CategoryWithChildren[]> {
    return await this.executeKyselyQuery(async (db) => {
      const data = await db
        .selectFrom('categories')
        .leftJoin('products', 'categories.id', 'products.category_id')
        .select([
          'categories.id',
          'categories.name',
          'categories.description',
          'categories.slug',
          'categories.parent_id as parentId',
          'categories.created_at as createdAt',
          'categories.updated_at as updatedAt',
          db.fn.count('products.id').as('productCount'),
        ])
        .groupBy([
          'categories.id',
          'categories.name',
          'categories.description',
          'categories.slug',
          'categories.parent_id',
          'categories.created_at',
          'categories.updated_at',
        ])
        .orderBy('categories.name', 'asc')
        .execute();

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        slug: row.slug,
        parentId: row.parentId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        productCount: Number(row.productCount),
      }));
    });
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const filters: FilterOptions = { slug };
    
    if (excludeId) {
      filters.id = { operator: 'not', value: excludeId };
    }
    
    return await this.exists(filters);
  }

  /**
   * Get category path (breadcrumb)
   */
  async getCategoryPath(categoryId: string): Promise<Category[]> {
    const path: Category[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.findById(currentId);
      if (!category) break;
      
      path.unshift(category);
      currentId = category.parentId;
    }

    return path;
  }

  /**
   * Override buildWhereConditions to handle category-specific filters
   */
  protected buildWhereConditions(filters: CategoryFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle search across name and description
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(categories.name, searchTerm),
          ilike(categories.description, searchTerm)
        )
      );
    }

    // Handle null parent filter
    if (filters.parentId === null) {
      conditions.push(isNull(categories.parentId));
    }
    
    return conditions;
  }
}