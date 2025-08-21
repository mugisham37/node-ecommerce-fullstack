import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const CategoryCreateRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255),
  description: z.string().optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative').default(0),
});

const CategoryUpdateRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const CategoryMoveRequestSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

const CategorySortOrderUpdateSchema = z.object({
  sortOrder: z.number().int().min(0, 'Sort order must be non-negative'),
});

const BulkCategoryCreateSchema = z.object({
  categories: z.array(CategoryCreateRequestSchema).min(1, 'At least one category is required'),
});

const BulkCategoryUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    data: CategoryUpdateRequestSchema,
  })).min(1, 'At least one update is required'),
});

const BulkCategoryDeleteSchema = z.object({
  categoryIds: z.array(z.string().uuid()).min(1, 'At least one category ID is required'),
});

const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Response schemas
const CategoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parentId: z.string().nullable(),
  parentName: z.string().nullable(),
  sortOrder: z.number(),
  level: z.number(),
  path: z.string(),
  productCount: z.number(),
  childrenCount: z.number(),
  children: z.array(z.lazy(() => CategoryResponseSchema)).optional(),
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
 * Category Management Router
 * Handles hierarchical category management operations
 * Converted from Spring Boot CategoryController.java
 */
export const categoryRouter = router({
  /**
   * Create a new category
   * Converts POST /api/v1/categories
   */
  create: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('CATEGORY_CREATED', 'CATEGORY'))
    .input(CategoryCreateRequestSchema)
    .output(CategoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, description, parentId, sortOrder } = input;

      // Check if category with same name already exists at the same level
      let existingQuery = ctx.db.queryBuilder
        .selectFrom('categories')
        .select('id')
        .where('name', '=', name);

      if (parentId) {
        existingQuery = existingQuery.where('parent_id', '=', parentId);
      } else {
        existingQuery = existingQuery.where('parent_id', 'is', null);
      }

      const existingCategory = await existingQuery.executeTakeFirst();

      if (existingCategory) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Category with this name already exists at this level',
        });
      }

      // Verify parent category exists if provided
      let parentCategory = null;
      if (parentId) {
        parentCategory = await ctx.db.queryBuilder
          .selectFrom('categories')
          .select(['id', 'name', 'level', 'path'])
          .where('id', '=', parentId)
          .executeTakeFirst();

        if (!parentCategory) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent category not found',
          });
        }
      }

      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Calculate level and path
      const level = parentCategory ? parentCategory.level + 1 : 0;
      const path = parentCategory ? `${parentCategory.path}/${slug}` : slug;

      // Create category
      const [category] = await ctx.db.queryBuilder
        .insertInto('categories')
        .values({
          name,
          slug,
          description: description || null,
          parent_id: parentId || null,
          sort_order: sortOrder,
          level,
          path,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning([
          'id',
          'name',
          'slug',
          'description',
          'parent_id',
          'sort_order',
          'level',
          'path',
          'created_at',
          'updated_at',
        ])
        .execute();

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parent_id,
        parentName: parentCategory?.name || null,
        sortOrder: category.sort_order,
        level: category.level,
        path: category.path,
        productCount: 0,
        childrenCount: 0,
        createdAt: category.created_at.toISOString(),
        updatedAt: category.updated_at.toISOString(),
      };
    }),

  /**
   * Get category by ID
   * Converts GET /api/v1/categories/{categoryId}
   */
  getById: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().uuid() }))
    .output(CategoryResponseSchema)
    .query(async ({ input, ctx }) => {
      const category = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .where('categories.id', '=', input.id)
        .executeTakeFirst();

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Get product count
      const productCount = await ctx.db.queryBuilder
        .selectFrom('products')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('category_id', '=', input.id)
        .where('active', '=', true)
        .executeTakeFirst();

      // Get children count
      const childrenCount = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('parent_id', '=', input.id)
        .executeTakeFirst();

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parent_id,
        parentName: category.parent_name,
        sortOrder: category.sort_order,
        level: category.level,
        path: category.path,
        productCount: Number(productCount?.count || 0),
        childrenCount: Number(childrenCount?.count || 0),
        createdAt: category.created_at.toISOString(),
        updatedAt: category.updated_at.toISOString(),
      };
    }),

  /**
   * Update category information
   * Converts PUT /api/v1/categories/{categoryId}
   */
  update: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('CATEGORY_UPDATED', 'CATEGORY'))
    .input(z.object({
      id: z.string().uuid(),
      data: CategoryUpdateRequestSchema,
    }))
    .output(CategoryResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Check if category exists
      const existingCategory = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select(['id', 'parent_id', 'level', 'path'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!existingCategory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Check name uniqueness if name is being updated
      if (data.name) {
        let nameQuery = ctx.db.queryBuilder
          .selectFrom('categories')
          .select('id')
          .where('name', '=', data.name)
          .where('id', '!=', id);

        if (existingCategory.parent_id) {
          nameQuery = nameQuery.where('parent_id', '=', existingCategory.parent_id);
        } else {
          nameQuery = nameQuery.where('parent_id', 'is', null);
        }

        const nameExists = await nameQuery.executeTakeFirst();

        if (nameExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Category with this name already exists at this level',
          });
        }
      }

      // Generate new slug if name is updated
      const slug = data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : undefined;

      // Update path if name changes
      let newPath = undefined;
      if (slug) {
        const pathParts = existingCategory.path.split('/');
        pathParts[pathParts.length - 1] = slug;
        newPath = pathParts.join('/');
      }

      // Update category
      await ctx.db.queryBuilder
        .updateTable('categories')
        .set({
          ...(data.name && { name: data.name }),
          ...(slug && { slug }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.sortOrder !== undefined && { sort_order: data.sortOrder }),
          ...(newPath && { path: newPath }),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // If path changed, update all descendant paths
      if (newPath && newPath !== existingCategory.path) {
        await updateDescendantPaths(ctx, id, existingCategory.path, newPath);
      }

      // Get updated category
      const category = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .where('categories.id', '=', id)
        .executeTakeFirstOrThrow();

      // Get counts
      const productCount = await ctx.db.queryBuilder
        .selectFrom('products')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('category_id', '=', id)
        .where('active', '=', true)
        .executeTakeFirst();

      const childrenCount = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('parent_id', '=', id)
        .executeTakeFirst();

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parent_id,
        parentName: category.parent_name,
        sortOrder: category.sort_order,
        level: category.level,
        path: category.path,
        productCount: Number(productCount?.count || 0),
        childrenCount: Number(childrenCount?.count || 0),
        createdAt: category.created_at.toISOString(),
        updatedAt: category.updated_at.toISOString(),
      };
    }),

  /**
   * Get all categories with pagination
   * Converts GET /api/v1/categories
   */
  getAll: protectedProcedure
    .use(authMiddleware)
    .input(PaginationSchema)
    .output(PagedResponseSchema(CategoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get categories
      const categories = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .orderBy(['categories.level', 'categories.sort_order', 'categories.name'])
        .limit(limit)
        .offset(offset)
        .execute();

      // Get counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const [productCount, childrenCount] = await Promise.all([
            ctx.db.queryBuilder
              .selectFrom('products')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('category_id', '=', category.id)
              .where('active', '=', true)
              .executeTakeFirst(),
            ctx.db.queryBuilder
              .selectFrom('categories')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('parent_id', '=', category.id)
              .executeTakeFirst(),
          ]);

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parent_id,
            parentName: category.parent_name,
            sortOrder: category.sort_order,
            level: category.level,
            path: category.path,
            productCount: Number(productCount?.count || 0),
            childrenCount: Number(childrenCount?.count || 0),
            createdAt: category.created_at.toISOString(),
            updatedAt: category.updated_at.toISOString(),
          };
        })
      );

      return {
        data: categoriesWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get root categories (categories without parent)
   * Converts GET /api/v1/categories/root
   */
  getRoot: protectedProcedure
    .use(authMiddleware)
    .output(z.array(CategoryResponseSchema))
    .query(async ({ ctx }) => {
      const categories = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select([
          'id',
          'name',
          'slug',
          'description',
          'parent_id',
          'sort_order',
          'level',
          'path',
          'created_at',
          'updated_at',
        ])
        .where('parent_id', 'is', null)
        .orderBy(['sort_order', 'name'])
        .execute();

      // Get counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const [productCount, childrenCount] = await Promise.all([
            ctx.db.queryBuilder
              .selectFrom('products')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('category_id', '=', category.id)
              .where('active', '=', true)
              .executeTakeFirst(),
            ctx.db.queryBuilder
              .selectFrom('categories')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('parent_id', '=', category.id)
              .executeTakeFirst(),
          ]);

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parent_id,
            parentName: null,
            sortOrder: category.sort_order,
            level: category.level,
            path: category.path,
            productCount: Number(productCount?.count || 0),
            childrenCount: Number(childrenCount?.count || 0),
            createdAt: category.created_at.toISOString(),
            updatedAt: category.updated_at.toISOString(),
          };
        })
      );

      return categoriesWithCounts;
    }),

  /**
   * Get category hierarchy
   * Converts GET /api/v1/categories/hierarchy
   */
  getHierarchy: protectedProcedure
    .use(authMiddleware)
    .output(z.array(CategoryResponseSchema))
    .query(async ({ ctx }) => {
      // Get all categories
      const allCategories = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .orderBy(['categories.level', 'categories.sort_order', 'categories.name'])
        .execute();

      // Get counts for all categories
      const categoriesWithCounts = await Promise.all(
        allCategories.map(async (category) => {
          const [productCount, childrenCount] = await Promise.all([
            ctx.db.queryBuilder
              .selectFrom('products')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('category_id', '=', category.id)
              .where('active', '=', true)
              .executeTakeFirst(),
            ctx.db.queryBuilder
              .selectFrom('categories')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('parent_id', '=', category.id)
              .executeTakeFirst(),
          ]);

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parent_id,
            parentName: category.parent_name,
            sortOrder: category.sort_order,
            level: category.level,
            path: category.path,
            productCount: Number(productCount?.count || 0),
            childrenCount: Number(childrenCount?.count || 0),
            createdAt: category.created_at.toISOString(),
            updatedAt: category.updated_at.toISOString(),
          };
        })
      );

      // Build hierarchy
      return buildCategoryHierarchy(categoriesWithCounts);
    }),

  /**
   * Get child categories
   * Converts GET /api/v1/categories/{categoryId}/children
   */
  getChildren: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().uuid() }))
    .output(z.array(CategoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const categories = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .where('categories.parent_id', '=', input.id)
        .orderBy(['categories.sort_order', 'categories.name'])
        .execute();

      // Get counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const [productCount, childrenCount] = await Promise.all([
            ctx.db.queryBuilder
              .selectFrom('products')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('category_id', '=', category.id)
              .where('active', '=', true)
              .executeTakeFirst(),
            ctx.db.queryBuilder
              .selectFrom('categories')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('parent_id', '=', category.id)
              .executeTakeFirst(),
          ]);

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parent_id,
            parentName: category.parent_name,
            sortOrder: category.sort_order,
            level: category.level,
            path: category.path,
            productCount: Number(productCount?.count || 0),
            childrenCount: Number(childrenCount?.count || 0),
            createdAt: category.created_at.toISOString(),
            updatedAt: category.updated_at.toISOString(),
          };
        })
      );

      return categoriesWithCounts;
    }),

  /**
   * Get category ancestors (breadcrumb path)
   * Converts GET /api/v1/categories/{categoryId}/ancestors
   */
  getAncestors: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().uuid() }))
    .output(z.array(CategoryResponseSchema))
    .query(async ({ input, ctx }) => {
      // Get the category and its path
      const category = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select(['path', 'level'])
        .where('id', '=', input.id)
        .executeTakeFirst();

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Get all ancestors by path
      const pathParts = category.path.split('/');
      const ancestorPaths = [];
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        ancestorPaths.push(pathParts.slice(0, i + 1).join('/'));
      }

      if (ancestorPaths.length === 0) {
        return [];
      }

      const ancestors = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .where('categories.path', 'in', ancestorPaths)
        .orderBy('categories.level')
        .execute();

      // Get counts for each category
      const ancestorsWithCounts = await Promise.all(
        ancestors.map(async (ancestor) => {
          const [productCount, childrenCount] = await Promise.all([
            ctx.db.queryBuilder
              .selectFrom('products')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('category_id', '=', ancestor.id)
              .where('active', '=', true)
              .executeTakeFirst(),
            ctx.db.queryBuilder
              .selectFrom('categories')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('parent_id', '=', ancestor.id)
              .executeTakeFirst(),
          ]);

          return {
            id: ancestor.id,
            name: ancestor.name,
            slug: ancestor.slug,
            description: ancestor.description,
            parentId: ancestor.parent_id,
            parentName: ancestor.parent_name,
            sortOrder: ancestor.sort_order,
            level: ancestor.level,
            path: ancestor.path,
            productCount: Number(productCount?.count || 0),
            childrenCount: Number(childrenCount?.count || 0),
            createdAt: ancestor.created_at.toISOString(),
            updatedAt: ancestor.updated_at.toISOString(),
          };
        })
      );

      return ancestorsWithCounts;
    }),

  /**
   * Search categories
   * Converts GET /api/v1/categories/search
   */
  search: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      q: z.string().min(1, 'Search query is required'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(PagedResponseSchema(CategoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const { q, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select((eb) => eb.fn.count('id').as('count'))
        .where((eb) => eb.or([
          eb('name', 'ilike', `%${q}%`),
          eb('description', 'ilike', `%${q}%`),
        ]))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Search categories
      const categories = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('categories as parent', 'categories.parent_id', 'parent.id')
        .select([
          'categories.id',
          'categories.name',
          'categories.slug',
          'categories.description',
          'categories.parent_id',
          'parent.name as parent_name',
          'categories.sort_order',
          'categories.level',
          'categories.path',
          'categories.created_at',
          'categories.updated_at',
        ])
        .where((eb) => eb.or([
          eb('categories.name', 'ilike', `%${q}%`),
          eb('categories.description', 'ilike', `%${q}%`),
        ]))
        .orderBy(['categories.level', 'categories.sort_order', 'categories.name'])
        .limit(limit)
        .offset(offset)
        .execute();

      // Get counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const [productCount, childrenCount] = await Promise.all([
            ctx.db.queryBuilder
              .selectFrom('products')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('category_id', '=', category.id)
              .where('active', '=', true)
              .executeTakeFirst(),
            ctx.db.queryBuilder
              .selectFrom('categories')
              .select((eb) => eb.fn.count('id').as('count'))
              .where('parent_id', '=', category.id)
              .executeTakeFirst(),
          ]);

          return {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            parentId: category.parent_id,
            parentName: category.parent_name,
            sortOrder: category.sort_order,
            level: category.level,
            path: category.path,
            productCount: Number(productCount?.count || 0),
            childrenCount: Number(childrenCount?.count || 0),
            createdAt: category.created_at.toISOString(),
            updatedAt: category.updated_at.toISOString(),
          };
        })
      );

      return {
        data: categoriesWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Move category to new parent
   * Converts PUT /api/v1/categories/{categoryId}/move
   */
  move: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('CATEGORY_MOVED', 'CATEGORY'))
    .input(z.object({
      id: z.string().uuid(),
      data: CategoryMoveRequestSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      const { parentId } = data;

      // Get current category
      const currentCategory = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select(['id', 'name', 'slug', 'parent_id', 'level', 'path'])
        .where('id', '=', id)
        .executeTakeFirst();

      if (!currentCategory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Verify new parent exists if provided
      let newParent = null;
      if (parentId) {
        newParent = await ctx.db.queryBuilder
          .selectFrom('categories')
          .select(['id', 'level', 'path'])
          .where('id', '=', parentId)
          .executeTakeFirst();

        if (!newParent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent category not found',
          });
        }

        // Check for circular reference
        if (newParent.path.startsWith(currentCategory.path + '/') || newParent.id === id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot move category to its own descendant',
          });
        }
      }

      // Calculate new level and path
      const newLevel = newParent ? newParent.level + 1 : 0;
      const newPath = newParent ? `${newParent.path}/${currentCategory.slug}` : currentCategory.slug;

      // Update category
      await ctx.db.queryBuilder
        .updateTable('categories')
        .set({
          parent_id: parentId,
          level: newLevel,
          path: newPath,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // Update all descendant paths and levels
      await updateDescendantPaths(ctx, id, currentCategory.path, newPath);

      return {
        message: 'Category moved successfully',
        categoryId: id,
        newParentId: parentId,
      };
    }),

  /**
   * Update category sort order
   * Converts PUT /api/v1/categories/{categoryId}/sort-order
   */
  updateSortOrder: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('CATEGORY_SORT_ORDER_UPDATED', 'CATEGORY'))
    .input(z.object({
      id: z.string().uuid(),
      data: CategorySortOrderUpdateSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      const { sortOrder } = data;

      await ctx.db.queryBuilder
        .updateTable('categories')
        .set({
          sort_order: sortOrder,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      return {
        message: 'Category sort order updated successfully',
        categoryId: id,
        sortOrder,
      };
    }),

  /**
   * Delete category
   * Converts DELETE /api/v1/categories/{categoryId}
   */
  delete: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN']))
    .use(activityLoggingMiddleware('CATEGORY_DELETED', 'CATEGORY'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Check if category has children
      const childrenCount = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('parent_id', '=', input.id)
        .executeTakeFirst();

      if (Number(childrenCount?.count || 0) > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete category with child categories',
        });
      }

      // Check if category has products
      const productCount = await ctx.db.queryBuilder
        .selectFrom('products')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('category_id', '=', input.id)
        .executeTakeFirst();

      if (Number(productCount?.count || 0) > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete category with products',
        });
      }

      // Delete category
      await ctx.db.queryBuilder
        .deleteFrom('categories')
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'Category deleted successfully',
        categoryId: input.id,
      };
    }),

  /**
   * Get category statistics
   * Converts GET /api/v1/categories/statistics
   */
  getStatistics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .query(async ({ ctx }) => {
      const stats = await ctx.db.queryBuilder
        .selectFrom('categories')
        .leftJoin('products', 'categories.id', 'products.category_id')
        .select([
          (eb) => eb.fn.count('categories.id').as('totalCategories'),
          (eb) => eb.fn.count('categories.id').filterWhere('categories.parent_id', 'is', null).as('rootCategories'),
          (eb) => eb.fn.max('categories.level').as('maxDepth'),
          (eb) => eb.fn.count('products.id').filterWhere('products.active', '=', true).as('totalProducts'),
        ])
        .executeTakeFirst();

      // Get categories by level
      const levelStats = await ctx.db.queryBuilder
        .selectFrom('categories')
        .select([
          'level',
          (eb) => eb.fn.count('id').as('count'),
        ])
        .groupBy('level')
        .orderBy('level')
        .execute();

      return {
        totalCategories: Number(stats?.totalCategories || 0),
        rootCategories: Number(stats?.rootCategories || 0),
        maxDepth: Number(stats?.maxDepth || 0),
        totalProducts: Number(stats?.totalProducts || 0),
        byLevel: levelStats.map(stat => ({
          level: stat.level,
          count: Number(stat.count),
        })),
      };
    }),
});

// Helper functions
function buildCategoryHierarchy(categories: any[]): any[] {
  const categoryMap = new Map();
  const rootCategories: any[] = [];

  // Create a map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Build the hierarchy
  categories.forEach(category => {
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(categoryMap.get(category.id));
      }
    } else {
      rootCategories.push(categoryMap.get(category.id));
    }
  });

  return rootCategories;
}

async function updateDescendantPaths(ctx: any, categoryId: string, oldPath: string, newPath: string): Promise<void> {
  // Get all descendants
  const descendants = await ctx.db.queryBuilder
    .selectFrom('categories')
    .select(['id', 'path', 'level'])
    .where('path', 'like', `${oldPath}/%`)
    .execute();

  // Update each descendant
  for (const descendant of descendants) {
    const newDescendantPath = descendant.path.replace(oldPath, newPath);
    const newDescendantLevel = newDescendantPath.split('/').length - 1;

    await ctx.db.queryBuilder
      .updateTable('categories')
      .set({
        path: newDescendantPath,
        level: newDescendantLevel,
        updated_at: new Date(),
      })
      .where('id', '=', descendant.id)
      .execute();
  }
}