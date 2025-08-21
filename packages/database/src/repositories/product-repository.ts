import { eq, and, or, ilike, gte, lte, sql } from 'drizzle-orm';
import { products } from '../schema/products';
import { categories } from '../schema/categories';
import { suppliers } from '../schema/suppliers';
import { inventory } from '../schema/inventory';
import { BaseRepository, FilterOptions, PaginationOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { Product, NewProduct } from '../schema/products';

export interface ProductFilters extends FilterOptions {
  name?: string;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  inStock?: boolean;
  lowStock?: boolean;
}

export interface ProductUpdateData {
  name?: string;
  description?: string;
  sku?: string;
  price?: number;
  categoryId?: string;
  supplierId?: string;
}

export interface ProductWithRelations extends Product {
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  supplier?: {
    id: string;
    name: string;
    email: string;
  };
  inventory?: {
    id: string;
    quantity: number;
    reservedQuantity: number;
    reorderLevel: number;
    reorderQuantity: number;
  };
}

/**
 * Repository for product-related database operations
 */
export class ProductRepository extends BaseRepository<
  typeof products,
  Product,
  NewProduct,
  ProductUpdateData
> {
  protected table = products;
  protected tableName = 'products';

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
   * Find product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    return await this.findOneBy({ sku });
  }

  /**
   * Find products by category
   */
  async findByCategory(categoryId: string): Promise<Product[]> {
    return await this.findBy({ categoryId });
  }

  /**
   * Find products by supplier
   */
  async findBySupplier(supplierId: string): Promise<Product[]> {
    return await this.findBy({ supplierId });
  }

  /**
   * Find products with their relations (category, supplier, inventory)
   */
  async findWithRelations(
    pagination: PaginationOptions = { page: 1, limit: 10 },
    filters: ProductFilters = {}
  ): Promise<{
    data: ProductWithRelations[];
    pagination: ReturnType<typeof this.findAll>['pagination'];
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const offset = (pagination.page - 1) * pagination.limit;
      
      let query = db
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .select([
          'products.id',
          'products.name',
          'products.description',
          'products.sku',
          'products.price',
          'products.category_id as categoryId',
          'products.supplier_id as supplierId',
          'products.created_at as createdAt',
          'products.updated_at as updatedAt',
          'categories.id as category_id',
          'categories.name as category_name',
          'categories.slug as category_slug',
          'suppliers.id as supplier_id',
          'suppliers.name as supplier_name',
          'suppliers.email as supplier_email',
          'inventory.id as inventory_id',
          'inventory.quantity as inventory_quantity',
          'inventory.reserved_quantity as inventory_reserved_quantity',
          'inventory.reorder_level as inventory_reorder_level',
          'inventory.reorder_quantity as inventory_reorder_quantity',
        ]);

      // Apply filters
      if (filters.search) {
        query = query.where(
          db.or([
            db('products.name', 'ilike', `%${filters.search}%`),
            db('products.sku', 'ilike', `%${filters.search}%`),
            db('products.description', 'ilike', `%${filters.search}%`),
          ])
        );
      }

      if (filters.categoryId) {
        query = query.where('products.category_id', '=', filters.categoryId);
      }

      if (filters.supplierId) {
        query = query.where('products.supplier_id', '=', filters.supplierId);
      }

      if (filters.minPrice !== undefined) {
        query = query.where('products.price', '>=', filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        query = query.where('products.price', '<=', filters.maxPrice);
      }

      if (filters.inStock) {
        query = query.where('inventory.quantity', '>', 0);
      }

      if (filters.lowStock) {
        query = query.where(
          db.raw('inventory.quantity <= inventory.reorder_level')
        );
      }

      // Get total count
      const countQuery = query.clearSelect().select(db.fn.count('products.id').as('count'));
      const [{ count: total }] = await countQuery.execute();

      // Apply pagination and sorting
      if (pagination.sortBy) {
        const sortColumn = `products.${pagination.sortBy}`;
        query = query.orderBy(sortColumn, pagination.sortOrder || 'asc');
      } else {
        query = query.orderBy('products.created_at', 'desc');
      }

      const data = await query
        .limit(pagination.limit)
        .offset(offset)
        .execute();

      // Transform the flat result into nested structure
      const transformedData: ProductWithRelations[] = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        sku: row.sku,
        price: row.price,
        categoryId: row.categoryId,
        supplierId: row.supplierId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        category: row.category_id ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
        } : undefined,
        supplier: row.supplier_id ? {
          id: row.supplier_id,
          name: row.supplier_name,
          email: row.supplier_email,
        } : undefined,
        inventory: row.inventory_id ? {
          id: row.inventory_id,
          quantity: row.inventory_quantity,
          reservedQuantity: row.inventory_reserved_quantity,
          reorderLevel: row.inventory_reorder_level,
          reorderQuantity: row.inventory_reorder_quantity,
        } : undefined,
      }));

      const totalPages = Math.ceil(Number(total) / pagination.limit);

      return {
        data: transformedData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: Number(total),
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      };
    });
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(): Promise<ProductWithRelations[]> {
    return await this.executeKyselyQuery(async (db) => {
      const data = await db
        .selectFrom('products')
        .innerJoin('inventory', 'products.id', 'inventory.product_id')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id')
        .select([
          'products.id',
          'products.name',
          'products.description',
          'products.sku',
          'products.price',
          'products.category_id as categoryId',
          'products.supplier_id as supplierId',
          'products.created_at as createdAt',
          'products.updated_at as updatedAt',
          'categories.name as category_name',
          'suppliers.name as supplier_name',
          'inventory.quantity',
          'inventory.reorder_level',
          'inventory.reorder_quantity',
        ])
        .where(db.raw('inventory.quantity <= inventory.reorder_level'))
        .orderBy('inventory.quantity', 'asc')
        .execute();

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        sku: row.sku,
        price: row.price,
        categoryId: row.categoryId,
        supplierId: row.supplierId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        category: row.category_name ? {
          id: row.categoryId,
          name: row.category_name,
          slug: '',
        } : undefined,
        supplier: row.supplier_name ? {
          id: row.supplierId,
          name: row.supplier_name,
          email: '',
        } : undefined,
        inventory: {
          id: '',
          quantity: row.quantity,
          reservedQuantity: 0,
          reorderLevel: row.reorder_level,
          reorderQuantity: row.reorder_quantity,
        },
      }));
    });
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(): Promise<{
    totalProducts: number;
    totalValue: number;
    averagePrice: number;
    lowStockCount: number;
    outOfStockCount: number;
    topCategories: Array<{ categoryId: string; categoryName: string; count: number }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      // Get basic stats
      const [basicStats] = await db
        .selectFrom('products')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .select([
          db.fn.count('products.id').as('totalProducts'),
          db.fn.sum('products.price').as('totalValue'),
          db.fn.avg('products.price').as('averagePrice'),
          db.fn
            .count('inventory.id')
            .filterWhere(db.raw('inventory.quantity <= inventory.reorder_level'))
            .as('lowStockCount'),
          db.fn
            .count('inventory.id')
            .filterWhere('inventory.quantity', '=', 0)
            .as('outOfStockCount'),
        ])
        .execute();

      // Get top categories
      const topCategories = await db
        .selectFrom('products')
        .innerJoin('categories', 'products.category_id', 'categories.id')
        .select([
          'categories.id as categoryId',
          'categories.name as categoryName',
          db.fn.count('products.id').as('count'),
        ])
        .groupBy(['categories.id', 'categories.name'])
        .orderBy('count', 'desc')
        .limit(5)
        .execute();

      return {
        totalProducts: Number(basicStats.totalProducts),
        totalValue: Number(basicStats.totalValue) || 0,
        averagePrice: Number(basicStats.averagePrice) || 0,
        lowStockCount: Number(basicStats.lowStockCount),
        outOfStockCount: Number(basicStats.outOfStockCount),
        topCategories: topCategories.map((cat: any) => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          count: Number(cat.count),
        })),
      };
    });
  }

  /**
   * Check if SKU exists
   */
  async skuExists(sku: string, excludeId?: string): Promise<boolean> {
    const filters: FilterOptions = { sku };
    
    if (excludeId) {
      filters.id = { operator: 'not', value: excludeId };
    }
    
    return await this.exists(filters);
  }

  /**
   * Override buildWhereConditions to handle product-specific filters
   */
  protected buildWhereConditions(filters: ProductFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle search across multiple fields
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.sku, searchTerm),
          ilike(products.description, searchTerm)
        )
      );
    }

    // Handle price range filters
    if (filters.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice.toString()));
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice.toString()));
    }
    
    return conditions;
  }
}