import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const ProductCreateRequestSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().regex(/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  supplierId: z.string().uuid('Invalid supplier ID'),
  costPrice: z.number().positive('Cost price must be greater than 0'),
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be non-negative').default(0),
  reorderQuantity: z.number().int().min(1, 'Reorder quantity must be at least 1').default(1),
});

const ProductUpdateRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  costPrice: z.number().positive().optional(),
  sellingPrice: z.number().positive().optional(),
  reorderLevel: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(1).optional(),
});

const ProductFiltersSchema = z.object({
  name: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  active: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const PricingUpdateSchema = z.object({
  costPrice: z.number().positive('Cost price must be greater than 0'),
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
});

const BulkOperationSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
});

const BulkCategoryUpdateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
  categoryId: z.string().uuid('Invalid category ID'),
});

// Response schemas
const ProductResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  description: z.string().nullable(),
  categoryId: z.string(),
  categoryName: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  costPrice: z.number(),
  sellingPrice: z.number(),
  profitMargin: z.number(),
  reorderLevel: z.number(),
  reorderQuantity: z.number(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const PagedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

/**
 * Product Management Router
 * Handles comprehensive product management operations
 * Converted from Spring Boot ProductController.java
 */
export const productRouter = router({
  /**
   * Create a new product
   * Converts POST /api/v1/products
   */
  create: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCT_CREATED', 'PRODUCT'))
    .input(ProductCreateRequestSchema)
    .output(ProductResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const {
        name,
        sku,
        description,
        categoryId,
        supplierId,
        costPrice,
        sellingPrice,
        reorderLevel,
        reorderQuantity,
      } = input;

      // Validate selling price >= cost price
      if (sellingPrice < costPrice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selling price must be greater than or equal to cost price',
        });
      }

      // Check if SKU already exists
      const existingProduct = await ctx.db.queryBuilder
        .selectFrom('products')
        .select('id')
        .where('sku', '=', sku)
        .executeTakeFirst();

      if (existingProduct) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Product with SKU '${sku}' already exists`,
        });
      }

      // Verify category exists
      const category = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select(['id', 'name'])
        .where('id', '=', categoryId)
        .executeTakeFirst();

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Verify supplier exists
      const supplier = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .select(['id', 'name'])
        .where('id', '=', supplierId)
        .where('active', '=', true)
        .executeTakeFirst();

      if (!supplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found or inactive',
        });
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Calculate profit margin
      const profitMargin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      // Create product
      const [product] = await ctx.db.queryBuilder
        .insertInto('products')
        .values({
          name,
          slug,
          sku,
          description: description || null,
          category_id: categoryId,
          supplier_id: supplierId,
          cost_price: costPrice,
          selling_price: sellingPrice,
          reorder_level: reorderLevel,
          reorder_quantity: reorderQuantity,
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning([
          'id',
          'name',
          'slug',
          'sku',
          'description',
          'category_id',
          'supplier_id',
          'cost_price',
          'selling_price',
          'reorder_level',
          'reorder_quantity',
          'active',
          'created_at',
          'updated_at',
        ])
        .execute();

      // Create initial inventory record
      await ctx.db.queryBuilder
        .insertInto('inventory')
        .values({
          product_id: product.id,
          quantity_on_hand: 0,
          quantity_allocated: 0,
          quantity_available: 0,
          warehouse_location: 'MAIN',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        categoryId: product.category_id,
        categoryName: category.name,
        supplierId: product.supplier_id,
        supplierName: supplier.name,
        costPrice: Number(product.cost_price),
        sellingPrice: Number(product.selling_price),
        profitMargin: Number(profitMargin.toFixed(2)),
        reorderLevel: product.reorder_level,
        reorderQuantity: product.reorder_quantity,
        active: product.active,
        createdAt: product.created_at.toISOString(),
        updatedAt: product.updated_at.toISOString(),
      };
    }),

  /**
   * Get product by ID
   * Converts GET /api/v1/products/{productId}
   */
  getById: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().uuid() }))
    .output(ProductResponseSchema)
    .query(async ({ input, ctx }) => {
      const product = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id')
        .select([
          'products.id',
          'products.name',
          'products.slug',
          'products.sku',
          'products.description',
          'products.category_id',
          'categories.name as category_name',
          'products.supplier_id',
          'suppliers.name as supplier_name',
          'products.cost_price',
          'products.selling_price',
          'products.reorder_level',
          'products.reorder_quantity',
          'products.active',
          'products.created_at',
          'products.updated_at',
        ])
        .where('products.id', '=', input.id)
        .executeTakeFirst();

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      const profitMargin = ((Number(product.selling_price) - Number(product.cost_price)) / Number(product.selling_price)) * 100;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description,
        categoryId: product.category_id,
        categoryName: product.category_name || 'Unknown',
        supplierId: product.supplier_id,
        supplierName: product.supplier_name || 'Unknown',
        costPrice: Number(product.cost_price),
        sellingPrice: Number(product.selling_price),
        profitMargin: Number(profitMargin.toFixed(2)),
        reorderLevel: product.reorder_level,
        reorderQuantity: product.reorder_quantity,
        active: product.active,
        createdAt: product.created_at.toISOString(),
        updatedAt: product.updated_at.toISOString(),
      };
    }),

  /**
   * Update product information
   * Converts PUT /api/v1/products/{productId}
   */
  update: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCT_UPDATED', 'PRODUCT'))
    .input(z.object({
      id: z.string().uuid(),
      data: ProductUpdateRequestSchema,
    }))
    .output(ProductResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Check if product exists
      const existingProduct = await ctx.db.queryBuilder
        .selectFrom('products')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst();

      if (!existingProduct) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Validate selling price >= cost price if both are provided
      if (data.sellingPrice && data.costPrice && data.sellingPrice < data.costPrice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selling price must be greater than or equal to cost price',
        });
      }

      // Verify category exists if provided
      if (data.categoryId) {
        const category = await ctx.db.queryBuilder
          .selectFrom('categories')
          .select('id')
          .where('id', '=', data.categoryId)
          .executeTakeFirst();

        if (!category) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found',
          });
        }
      }

      // Verify supplier exists if provided
      if (data.supplierId) {
        const supplier = await ctx.db.queryBuilder
          .selectFrom('suppliers')
          .select('id')
          .where('id', '=', data.supplierId)
          .where('active', '=', true)
          .executeTakeFirst();

        if (!supplier) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Supplier not found or inactive',
          });
        }
      }

      // Generate new slug if name is updated
      const slug = data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined;

      // Update product
      await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          ...(data.name && { name: data.name }),
          ...(slug && { slug }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.categoryId && { category_id: data.categoryId }),
          ...(data.supplierId && { supplier_id: data.supplierId }),
          ...(data.costPrice && { cost_price: data.costPrice }),
          ...(data.sellingPrice && { selling_price: data.sellingPrice }),
          ...(data.reorderLevel !== undefined && { reorder_level: data.reorderLevel }),
          ...(data.reorderQuantity && { reorder_quantity: data.reorderQuantity }),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // Return updated product
      return await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id')
        .select([
          'products.id',
          'products.name',
          'products.slug',
          'products.sku',
          'products.description',
          'products.category_id',
          'categories.name as category_name',
          'products.supplier_id',
          'suppliers.name as supplier_name',
          'products.cost_price',
          'products.selling_price',
          'products.reorder_level',
          'products.reorder_quantity',
          'products.active',
          'products.created_at',
          'products.updated_at',
        ])
        .where('products.id', '=', id)
        .executeTakeFirstOrThrow()
        .then(product => {
          const profitMargin = ((Number(product.selling_price) - Number(product.cost_price)) / Number(product.selling_price)) * 100;
          
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: product.description,
            categoryId: product.category_id,
            categoryName: product.category_name || 'Unknown',
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || 'Unknown',
            costPrice: Number(product.cost_price),
            sellingPrice: Number(product.selling_price),
            profitMargin: Number(profitMargin.toFixed(2)),
            reorderLevel: product.reorder_level,
            reorderQuantity: product.reorder_quantity,
            active: product.active,
            createdAt: product.created_at.toISOString(),
            updatedAt: product.updated_at.toISOString(),
          };
        });
    }),

  /**
   * Get all products with pagination and filtering
   * Converts GET /api/v1/products
   */
  getAll: protectedProcedure
    .use(authMiddleware)
    .input(ProductFiltersSchema)
    .output(PagedResponseSchema(ProductResponseSchema))
    .query(async ({ input, ctx }) => {
      const { name, sku, categoryId, supplierId, active, lowStock, page, limit } = input;
      const offset = (page - 1) * limit;

      let query = ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id');

      // Add low stock join if needed
      if (lowStock) {
        query = query.leftJoin('inventory', 'products.id', 'inventory.product_id');
      }

      // Apply filters
      if (name) {
        query = query.where('products.name', 'ilike', `%${name}%`);
      }
      if (sku) {
        query = query.where('products.sku', 'ilike', `%${sku}%`);
      }
      if (categoryId) {
        query = query.where('products.category_id', '=', categoryId);
      }
      if (supplierId) {
        query = query.where('products.supplier_id', '=', supplierId);
      }
      if (active !== undefined) {
        query = query.where('products.active', '=', active);
      }
      if (lowStock) {
        query = query.where('inventory.quantity_available', '<=', ctx.db.queryBuilder.ref('products.reorder_level'));
      }

      // Get total count
      const totalResult = await query
        .select((eb) => eb.fn.count('products.id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get products
      const products = await query
        .select([
          'products.id',
          'products.name',
          'products.slug',
          'products.sku',
          'products.description',
          'products.category_id',
          'categories.name as category_name',
          'products.supplier_id',
          'suppliers.name as supplier_name',
          'products.cost_price',
          'products.selling_price',
          'products.reorder_level',
          'products.reorder_quantity',
          'products.active',
          'products.created_at',
          'products.updated_at',
        ])
        .orderBy('products.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: products.map(product => {
          const profitMargin = ((Number(product.selling_price) - Number(product.cost_price)) / Number(product.selling_price)) * 100;
          
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: product.description,
            categoryId: product.category_id,
            categoryName: product.category_name || 'Unknown',
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || 'Unknown',
            costPrice: Number(product.cost_price),
            sellingPrice: Number(product.selling_price),
            profitMargin: Number(profitMargin.toFixed(2)),
            reorderLevel: product.reorder_level,
            reorderQuantity: product.reorder_quantity,
            active: product.active,
            createdAt: product.created_at.toISOString(),
            updatedAt: product.updated_at.toISOString(),
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Search products
   * Converts GET /api/v1/products/search
   */
  search: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      q: z.string().min(1, 'Search query is required'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(PagedResponseSchema(ProductResponseSchema))
    .query(async ({ input, ctx }) => {
      const { q, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('products')
        .select((eb) => eb.fn.count('id').as('count'))
        .where((eb) => eb.or([
          eb('name', 'ilike', `%${q}%`),
          eb('sku', 'ilike', `%${q}%`),
          eb('description', 'ilike', `%${q}%`),
        ]))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Search products
      const products = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id')
        .select([
          'products.id',
          'products.name',
          'products.slug',
          'products.sku',
          'products.description',
          'products.category_id',
          'categories.name as category_name',
          'products.supplier_id',
          'suppliers.name as supplier_name',
          'products.cost_price',
          'products.selling_price',
          'products.reorder_level',
          'products.reorder_quantity',
          'products.active',
          'products.created_at',
          'products.updated_at',
        ])
        .where((eb) => eb.or([
          eb('products.name', 'ilike', `%${q}%`),
          eb('products.sku', 'ilike', `%${q}%`),
          eb('products.description', 'ilike', `%${q}%`),
        ]))
        .orderBy('products.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: products.map(product => {
          const profitMargin = ((Number(product.selling_price) - Number(product.cost_price)) / Number(product.selling_price)) * 100;
          
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            description: product.description,
            categoryId: product.category_id,
            categoryName: product.category_name || 'Unknown',
            supplierId: product.supplier_id,
            supplierName: product.supplier_name || 'Unknown',
            costPrice: Number(product.cost_price),
            sellingPrice: Number(product.selling_price),
            profitMargin: Number(profitMargin.toFixed(2)),
            reorderLevel: product.reorder_level,
            reorderQuantity: product.reorder_quantity,
            active: product.active,
            createdAt: product.created_at.toISOString(),
            updatedAt: product.updated_at.toISOString(),
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get low stock products
   * Converts GET /api/v1/products/low-stock
   */
  getLowStock: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE']))
    .output(z.array(ProductResponseSchema))
    .query(async ({ ctx }) => {
      const products = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .leftJoin('suppliers', 'products.supplier_id', 'suppliers.id')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .select([
          'products.id',
          'products.name',
          'products.slug',
          'products.sku',
          'products.description',
          'products.category_id',
          'categories.name as category_name',
          'products.supplier_id',
          'suppliers.name as supplier_name',
          'products.cost_price',
          'products.selling_price',
          'products.reorder_level',
          'products.reorder_quantity',
          'products.active',
          'products.created_at',
          'products.updated_at',
        ])
        .where('products.active', '=', true)
        .where('inventory.quantity_available', '<=', ctx.db.queryBuilder.ref('products.reorder_level'))
        .orderBy('inventory.quantity_available', 'asc')
        .execute();

      return products.map(product => {
        const profitMargin = ((Number(product.selling_price) - Number(product.cost_price)) / Number(product.selling_price)) * 100;
        
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description,
          categoryId: product.category_id,
          categoryName: product.category_name || 'Unknown',
          supplierId: product.supplier_id,
          supplierName: product.supplier_name || 'Unknown',
          costPrice: Number(product.cost_price),
          sellingPrice: Number(product.selling_price),
          profitMargin: Number(profitMargin.toFixed(2)),
          reorderLevel: product.reorder_level,
          reorderQuantity: product.reorder_quantity,
          active: product.active,
          createdAt: product.created_at.toISOString(),
          updatedAt: product.updated_at.toISOString(),
        };
      });
    }),

  /**
   * Activate product
   * Converts PUT /api/v1/products/{productId}/activate
   */
  activate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCT_ACTIVATED', 'PRODUCT'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          active: true,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'Product activated successfully',
        productId: input.id,
      };
    }),

  /**
   * Deactivate product
   * Converts PUT /api/v1/products/{productId}/deactivate
   */
  deactivate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCT_DEACTIVATED', 'PRODUCT'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          active: false,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'Product deactivated successfully',
        productId: input.id,
      };
    }),

  /**
   * Update product pricing
   * Converts PUT /api/v1/products/{productId}/pricing
   */
  updatePricing: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCT_PRICING_UPDATED', 'PRODUCT'))
    .input(z.object({
      id: z.string().uuid(),
      pricing: PricingUpdateSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, pricing } = input;
      const { costPrice, sellingPrice } = pricing;

      // Validate selling price >= cost price
      if (sellingPrice < costPrice) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selling price must be greater than or equal to cost price',
        });
      }

      await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          cost_price: costPrice,
          selling_price: sellingPrice,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      return {
        message: 'Product pricing updated successfully',
        productId: id,
        costPrice,
        sellingPrice,
      };
    }),

  /**
   * Bulk activate products
   * Converts PUT /api/v1/products/bulk/activate
   */
  bulkActivate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCTS_BULK_ACTIVATED', 'PRODUCT'))
    .input(BulkOperationSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          active: true,
          updated_at: new Date(),
        })
        .where('id', 'in', input.productIds)
        .execute();

      return {
        message: 'Products activated successfully',
        activatedCount: Number(result.numUpdatedRows),
        productIds: input.productIds,
      };
    }),

  /**
   * Bulk deactivate products
   * Converts PUT /api/v1/products/bulk/deactivate
   */
  bulkDeactivate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCTS_BULK_DEACTIVATED', 'PRODUCT'))
    .input(BulkOperationSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          active: false,
          updated_at: new Date(),
        })
        .where('id', 'in', input.productIds)
        .execute();

      return {
        message: 'Products deactivated successfully',
        deactivatedCount: Number(result.numUpdatedRows),
        productIds: input.productIds,
      };
    }),

  /**
   * Bulk update category
   * Converts PUT /api/v1/products/bulk/update-category
   */
  bulkUpdateCategory: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('PRODUCTS_BULK_CATEGORY_UPDATED', 'PRODUCT'))
    .input(BulkCategoryUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      const { productIds, categoryId } = input;

      // Verify category exists
      const category = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select('id')
        .where('id', '=', categoryId)
        .executeTakeFirst();

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      const result = await ctx.db.queryBuilder
        .updateTable('products')
        .set({
          category_id: categoryId,
          updated_at: new Date(),
        })
        .where('id', 'in', productIds)
        .execute();

      return {
        message: 'Product categories updated successfully',
        updatedCount: Number(result.numUpdatedRows),
        productIds,
        categoryId,
      };
    }),

  /**
   * Get product statistics
   * Converts GET /api/v1/products/statistics
   */
  getStatistics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .query(async ({ ctx }) => {
      const stats = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('inventory', 'products.id', 'inventory.product_id')
        .select([
          (eb) => eb.fn.count('products.id').as('total'),
          (eb) => eb.fn.count('products.id').filterWhere('products.active', '=', true).as('active'),
          (eb) => eb.fn.count('products.id').filterWhere('inventory.quantity_available', '<=', eb.ref('products.reorder_level')).as('lowStock'),
          (eb) => eb.fn.count('products.id').filterWhere('inventory.quantity_available', '=', 0).as('outOfStock'),
          (eb) => eb.fn.avg('products.selling_price').as('avgSellingPrice'),
          (eb) => eb.fn.sum('inventory.quantity_on_hand').as('totalInventoryValue'),
        ])
        .executeTakeFirst();

      return {
        total: Number(stats?.total || 0),
        active: Number(stats?.active || 0),
        inactive: Number(stats?.total || 0) - Number(stats?.active || 0),
        lowStock: Number(stats?.lowStock || 0),
        outOfStock: Number(stats?.outOfStock || 0),
        averageSellingPrice: Number(stats?.avgSellingPrice || 0),
        totalInventoryValue: Number(stats?.totalInventoryValue || 0),
      };
    }),
});