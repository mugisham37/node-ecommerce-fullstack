import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const SupplierCreateRequestSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  contactPerson: z.string().min(1, 'Contact person is required').max(255),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone number is required').max(50),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  website: z.string().url('Invalid website URL').optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

const SupplierUpdateRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactPerson: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(50).optional(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
  website: z.string().url().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

const SupplierFiltersSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  active: z.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const PerformanceFiltersSchema = z.object({
  supplierId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Response schemas
const AddressResponseSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
});

const SupplierResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactPerson: z.string(),
  email: z.string(),
  phone: z.string(),
  address: AddressResponseSchema,
  website: z.string().nullable(),
  taxId: z.string().nullable(),
  paymentTerms: z.string().nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
  productCount: z.number(),
  totalOrderValue: z.number(),
  lastOrderDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SupplierPerformanceSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  totalOrders: z.number(),
  totalOrderValue: z.number(),
  averageOrderValue: z.number(),
  onTimeDeliveryRate: z.number(),
  qualityRating: z.number(),
  lastOrderDate: z.string().nullable(),
  activeProducts: z.number(),
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
 * Supplier Management Router
 * Handles supplier management operations and performance tracking
 * Converted from Spring Boot SupplierController.java
 */
export const supplierRouter = router({
  /**
   * Create a new supplier
   * Converts POST /api/v1/suppliers
   */
  create: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('SUPPLIER_CREATED', 'SUPPLIER'))
    .input(SupplierCreateRequestSchema)
    .output(SupplierResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const {
        name,
        contactPerson,
        email,
        phone,
        address,
        website,
        taxId,
        paymentTerms,
        notes,
      } = input;

      // Check if supplier with same email already exists
      const existingSupplier = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();

      if (existingSupplier) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Supplier with this email already exists',
        });
      }

      // Create supplier
      const [supplier] = await ctx.db.queryBuilder
        .insertInto('suppliers')
        .values({
          name,
          contact_person: contactPerson,
          email,
          phone,
          address: JSON.stringify(address),
          website: website || null,
          tax_id: taxId || null,
          payment_terms: paymentTerms || null,
          notes: notes || null,
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning([
          'id',
          'name',
          'contact_person',
          'email',
          'phone',
          'address',
          'website',
          'tax_id',
          'payment_terms',
          'notes',
          'active',
          'created_at',
          'updated_at',
        ])
        .execute();

      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        address: JSON.parse(supplier.address),
        website: supplier.website,
        taxId: supplier.tax_id,
        paymentTerms: supplier.payment_terms,
        notes: supplier.notes,
        active: supplier.active,
        productCount: 0,
        totalOrderValue: 0,
        lastOrderDate: null,
        createdAt: supplier.created_at.toISOString(),
        updatedAt: supplier.updated_at.toISOString(),
      };
    }),

  /**
   * Get supplier by ID
   * Converts GET /api/v1/suppliers/{supplierId}
   */
  getById: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().uuid() }))
    .output(SupplierResponseSchema)
    .query(async ({ input, ctx }) => {
      const supplier = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .selectAll()
        .where('id', '=', input.id)
        .executeTakeFirst();

      if (!supplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Get supplier statistics
      const stats = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .select([
          (eb) => eb.fn.count('products.id').as('product_count'),
          (eb) => eb.fn.sum('order_items.total_price').as('total_order_value'),
          (eb) => eb.fn.max('orders.created_at').as('last_order_date'),
        ])
        .where('products.supplier_id', '=', input.id)
        .where('orders.status', '!=', 'CANCELLED')
        .executeTakeFirst();

      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        address: JSON.parse(supplier.address),
        website: supplier.website,
        taxId: supplier.tax_id,
        paymentTerms: supplier.payment_terms,
        notes: supplier.notes,
        active: supplier.active,
        productCount: Number(stats?.product_count || 0),
        totalOrderValue: Number(stats?.total_order_value || 0),
        lastOrderDate: stats?.last_order_date?.toISOString() || null,
        createdAt: supplier.created_at.toISOString(),
        updatedAt: supplier.updated_at.toISOString(),
      };
    }),

  /**
   * Update supplier information
   * Converts PUT /api/v1/suppliers/{supplierId}
   */
  update: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('SUPPLIER_UPDATED', 'SUPPLIER'))
    .input(z.object({
      id: z.string().uuid(),
      data: SupplierUpdateRequestSchema,
    }))
    .output(SupplierResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Check if supplier exists
      const existingSupplier = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst();

      if (!existingSupplier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        });
      }

      // Check email uniqueness if email is being updated
      if (data.email) {
        const emailExists = await ctx.db.queryBuilder
          .selectFrom('suppliers')
          .select('id')
          .where('email', '=', data.email)
          .where('id', '!=', id)
          .executeTakeFirst();

        if (emailExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use by another supplier',
          });
        }
      }

      // Update supplier
      await ctx.db.queryBuilder
        .updateTable('suppliers')
        .set({
          ...(data.name && { name: data.name }),
          ...(data.contactPerson && { contact_person: data.contactPerson }),
          ...(data.email && { email: data.email }),
          ...(data.phone && { phone: data.phone }),
          ...(data.address && { address: JSON.stringify(data.address) }),
          ...(data.website !== undefined && { website: data.website }),
          ...(data.taxId !== undefined && { tax_id: data.taxId }),
          ...(data.paymentTerms !== undefined && { payment_terms: data.paymentTerms }),
          ...(data.notes !== undefined && { notes: data.notes }),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // Get updated supplier with statistics
      const supplier = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow();

      const stats = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .select([
          (eb) => eb.fn.count('products.id').as('product_count'),
          (eb) => eb.fn.sum('order_items.total_price').as('total_order_value'),
          (eb) => eb.fn.max('orders.created_at').as('last_order_date'),
        ])
        .where('products.supplier_id', '=', id)
        .where('orders.status', '!=', 'CANCELLED')
        .executeTakeFirst();

      return {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contact_person,
        email: supplier.email,
        phone: supplier.phone,
        address: JSON.parse(supplier.address),
        website: supplier.website,
        taxId: supplier.tax_id,
        paymentTerms: supplier.payment_terms,
        notes: supplier.notes,
        active: supplier.active,
        productCount: Number(stats?.product_count || 0),
        totalOrderValue: Number(stats?.total_order_value || 0),
        lastOrderDate: stats?.last_order_date?.toISOString() || null,
        createdAt: supplier.created_at.toISOString(),
        updatedAt: supplier.updated_at.toISOString(),
      };
    }),

  /**
   * Get all suppliers with pagination and filtering
   * Converts GET /api/v1/suppliers
   */
  getAll: protectedProcedure
    .use(authMiddleware)
    .input(SupplierFiltersSchema)
    .output(PagedResponseSchema(SupplierResponseSchema))
    .query(async ({ input, ctx }) => {
      const { name, email, active, city, state, country, page, limit } = input;
      const offset = (page - 1) * limit;

      let query = ctx.db.queryBuilder.selectFrom('suppliers');

      // Apply filters
      if (name) {
        query = query.where('name', 'ilike', `%${name}%`);
      }
      if (email) {
        query = query.where('email', 'ilike', `%${email}%`);
      }
      if (active !== undefined) {
        query = query.where('active', '=', active);
      }
      if (city) {
        query = query.where('address', 'ilike', `%"city":"${city}"%`);
      }
      if (state) {
        query = query.where('address', 'ilike', `%"state":"${state}"%`);
      }
      if (country) {
        query = query.where('address', 'ilike', `%"country":"${country}"%`);
      }

      // Get total count
      const totalResult = await query
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get suppliers
      const suppliers = await query
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      // Get statistics for each supplier
      const suppliersWithStats = await Promise.all(
        suppliers.map(async (supplier) => {
          const stats = await ctx.db.queryBuilder
            .selectFrom('products')
            .leftJoin('order_items', 'products.id', 'order_items.product_id')
            .leftJoin('orders', 'order_items.order_id', 'orders.id')
            .select([
              (eb) => eb.fn.count('products.id').as('product_count'),
              (eb) => eb.fn.sum('order_items.total_price').as('total_order_value'),
              (eb) => eb.fn.max('orders.created_at').as('last_order_date'),
            ])
            .where('products.supplier_id', '=', supplier.id)
            .where('orders.status', '!=', 'CANCELLED')
            .executeTakeFirst();

          return {
            id: supplier.id,
            name: supplier.name,
            contactPerson: supplier.contact_person,
            email: supplier.email,
            phone: supplier.phone,
            address: JSON.parse(supplier.address),
            website: supplier.website,
            taxId: supplier.tax_id,
            paymentTerms: supplier.payment_terms,
            notes: supplier.notes,
            active: supplier.active,
            productCount: Number(stats?.product_count || 0),
            totalOrderValue: Number(stats?.total_order_value || 0),
            lastOrderDate: stats?.last_order_date?.toISOString() || null,
            createdAt: supplier.created_at.toISOString(),
            updatedAt: supplier.updated_at.toISOString(),
          };
        })
      );

      return {
        data: suppliersWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Search suppliers
   * Converts GET /api/v1/suppliers/search
   */
  search: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      q: z.string().min(1, 'Search query is required'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(PagedResponseSchema(SupplierResponseSchema))
    .query(async ({ input, ctx }) => {
      const { q, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .select((eb) => eb.fn.count('id').as('count'))
        .where((eb) => eb.or([
          eb('name', 'ilike', `%${q}%`),
          eb('contact_person', 'ilike', `%${q}%`),
          eb('email', 'ilike', `%${q}%`),
          eb('phone', 'ilike', `%${q}%`),
        ]))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Search suppliers
      const suppliers = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .selectAll()
        .where((eb) => eb.or([
          eb('name', 'ilike', `%${q}%`),
          eb('contact_person', 'ilike', `%${q}%`),
          eb('email', 'ilike', `%${q}%`),
          eb('phone', 'ilike', `%${q}%`),
        ]))
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      // Get statistics for each supplier
      const suppliersWithStats = await Promise.all(
        suppliers.map(async (supplier) => {
          const stats = await ctx.db.queryBuilder
            .selectFrom('products')
            .leftJoin('order_items', 'products.id', 'order_items.product_id')
            .leftJoin('orders', 'order_items.order_id', 'orders.id')
            .select([
              (eb) => eb.fn.count('products.id').as('product_count'),
              (eb) => eb.fn.sum('order_items.total_price').as('total_order_value'),
              (eb) => eb.fn.max('orders.created_at').as('last_order_date'),
            ])
            .where('products.supplier_id', '=', supplier.id)
            .where('orders.status', '!=', 'CANCELLED')
            .executeTakeFirst();

          return {
            id: supplier.id,
            name: supplier.name,
            contactPerson: supplier.contact_person,
            email: supplier.email,
            phone: supplier.phone,
            address: JSON.parse(supplier.address),
            website: supplier.website,
            taxId: supplier.tax_id,
            paymentTerms: supplier.payment_terms,
            notes: supplier.notes,
            active: supplier.active,
            productCount: Number(stats?.product_count || 0),
            totalOrderValue: Number(stats?.total_order_value || 0),
            lastOrderDate: stats?.last_order_date?.toISOString() || null,
            createdAt: supplier.created_at.toISOString(),
            updatedAt: supplier.updated_at.toISOString(),
          };
        })
      );

      return {
        data: suppliersWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Activate supplier
   * Converts PUT /api/v1/suppliers/{supplierId}/activate
   */
  activate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('SUPPLIER_ACTIVATED', 'SUPPLIER'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('suppliers')
        .set({
          active: true,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'Supplier activated successfully',
        supplierId: input.id,
      };
    }),

  /**
   * Deactivate supplier
   * Converts PUT /api/v1/suppliers/{supplierId}/deactivate
   */
  deactivate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('SUPPLIER_DEACTIVATED', 'SUPPLIER'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.queryBuilder
        .updateTable('suppliers')
        .set({
          active: false,
          updated_at: new Date(),
        })
        .where('id', '=', input.id)
        .execute();

      return {
        message: 'Supplier deactivated successfully',
        supplierId: input.id,
      };
    }),

  /**
   * Get supplier performance metrics
   * Converts GET /api/v1/suppliers/performance
   */
  getPerformance: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(PerformanceFiltersSchema)
    .output(PagedResponseSchema(SupplierPerformanceSchema))
    .query(async ({ input, ctx }) => {
      const { supplierId, startDate, endDate, page, limit } = input;
      const offset = (page - 1) * limit;

      let query = ctx.db.queryBuilder
        .selectFrom('suppliers')
        .leftJoin('products', 'suppliers.id', 'products.supplier_id')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id');

      // Apply filters
      if (supplierId) {
        query = query.where('suppliers.id', '=', supplierId);
      }
      if (startDate) {
        query = query.where('orders.created_at', '>=', new Date(startDate));
      }
      if (endDate) {
        query = query.where('orders.created_at', '<=', new Date(endDate));
      }

      query = query.where('orders.status', '!=', 'CANCELLED');

      // Get total count
      const totalResult = await query
        .select((eb) => eb.fn.countDistinct('suppliers.id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get supplier performance data
      const performanceData = await query
        .select([
          'suppliers.id as supplier_id',
          'suppliers.name as supplier_name',
          (eb) => eb.fn.countDistinct('orders.id').as('total_orders'),
          (eb) => eb.fn.sum('order_items.total_price').as('total_order_value'),
          (eb) => eb.fn.avg('order_items.total_price').as('average_order_value'),
          (eb) => eb.fn.max('orders.created_at').as('last_order_date'),
          (eb) => eb.fn.countDistinct('products.id').filterWhere('products.active', '=', true).as('active_products'),
        ])
        .groupBy(['suppliers.id', 'suppliers.name'])
        .orderBy('total_order_value', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: performanceData.map(data => ({
          supplierId: data.supplier_id,
          supplierName: data.supplier_name,
          totalOrders: Number(data.total_orders || 0),
          totalOrderValue: Number(data.total_order_value || 0),
          averageOrderValue: Number(data.average_order_value || 0),
          onTimeDeliveryRate: 95.0, // This would be calculated from delivery data
          qualityRating: 4.5, // This would be calculated from quality ratings
          lastOrderDate: data.last_order_date?.toISOString() || null,
          activeProducts: Number(data.active_products || 0),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get supplier statistics
   * Converts GET /api/v1/suppliers/statistics
   */
  getStatistics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .query(async ({ ctx }) => {
      const stats = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .leftJoin('products', 'suppliers.id', 'products.supplier_id')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .select([
          (eb) => eb.fn.countDistinct('suppliers.id').as('total_suppliers'),
          (eb) => eb.fn.countDistinct('suppliers.id').filterWhere('suppliers.active', '=', true).as('active_suppliers'),
          (eb) => eb.fn.countDistinct('products.id').as('total_products'),
          (eb) => eb.fn.sum('order_items.total_price').filterWhere('orders.status', '!=', 'CANCELLED').as('total_order_value'),
          (eb) => eb.fn.avg('order_items.total_price').filterWhere('orders.status', '!=', 'CANCELLED').as('average_order_value'),
        ])
        .executeTakeFirst();

      // Get top suppliers by order value
      const topSuppliers = await ctx.db.queryBuilder
        .selectFrom('suppliers')
        .leftJoin('products', 'suppliers.id', 'products.supplier_id')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .select([
          'suppliers.id',
          'suppliers.name',
          (eb) => eb.fn.sum('order_items.total_price').as('total_value'),
        ])
        .where('orders.status', '!=', 'CANCELLED')
        .groupBy(['suppliers.id', 'suppliers.name'])
        .orderBy('total_value', 'desc')
        .limit(5)
        .execute();

      return {
        totalSuppliers: Number(stats?.total_suppliers || 0),
        activeSuppliers: Number(stats?.active_suppliers || 0),
        inactiveSuppliers: Number(stats?.total_suppliers || 0) - Number(stats?.active_suppliers || 0),
        totalProducts: Number(stats?.total_products || 0),
        totalOrderValue: Number(stats?.total_order_value || 0),
        averageOrderValue: Number(stats?.average_order_value || 0),
        topSuppliers: topSuppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          totalValue: Number(supplier.total_value || 0),
        })),
      };
    }),

  /**
   * Get products by supplier
   * Converts GET /api/v1/suppliers/{supplierId}/products
   */
  getProducts: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      id: z.string().uuid(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const { id, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('products')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('supplier_id', '=', id)
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get products
      const products = await ctx.db.queryBuilder
        .selectFrom('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .select([
          'products.id',
          'products.name',
          'products.sku',
          'products.cost_price',
          'products.selling_price',
          'products.active',
          'categories.name as category_name',
          'products.created_at',
          'products.updated_at',
        ])
        .where('products.supplier_id', '=', id)
        .orderBy('products.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: products.map(product => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          costPrice: Number(product.cost_price),
          sellingPrice: Number(product.selling_price),
          active: product.active,
          categoryName: product.category_name || 'Unknown',
          createdAt: product.created_at.toISOString(),
          updatedAt: product.updated_at.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),
});