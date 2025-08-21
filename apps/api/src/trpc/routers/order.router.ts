import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Enums
const OrderStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']);

// Input validation schemas
const OrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().positive('Unit price must be positive'),
});

const OrderCreateRequestSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(255),
  customerEmail: z.string().email('Invalid email format'),
  customerPhone: z.string().optional(),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  billingAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'Zip code is required'),
    country: z.string().min(1, 'Country is required'),
  }).optional(),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

const OrderStatusUpdateRequestSchema = z.object({
  status: OrderStatusEnum,
  notes: z.string().optional(),
});

const OrderCancellationRequestSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500),
});

const FulfillmentRequestSchema = z.object({
  trackingNumber: z.string().min(1, 'Tracking number is required'),
  shippingCarrier: z.string().min(1, 'Shipping carrier is required'),
  shippingMethod: z.string().optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const PartialFulfillmentRequestSchema = z.object({
  orderItemId: z.string().uuid('Invalid order item ID'),
  quantityShipped: z.number().int().min(1, 'Quantity shipped must be at least 1'),
  trackingNumber: z.string().min(1, 'Tracking number is required'),
  shippingCarrier: z.string().min(1, 'Shipping carrier is required'),
  shippingMethod: z.string().optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const OrderFiltersSchema = z.object({
  status: OrderStatusEnum.optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Response schemas
const OrderItemResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  quantityShipped: z.number(),
  quantityRemaining: z.number(),
});

const AddressResponseSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
});

const OrderResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusEnum,
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string().nullable(),
  shippingAddress: AddressResponseSchema,
  billingAddress: AddressResponseSchema.nullable(),
  items: z.array(OrderItemResponseSchema),
  subtotal: z.number(),
  taxAmount: z.number(),
  shippingAmount: z.number(),
  totalAmount: z.number(),
  notes: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  shippingCarrier: z.string().nullable(),
  shippedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const OrderSummaryResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: OrderStatusEnum,
  customerName: z.string(),
  customerEmail: z.string(),
  totalAmount: z.number(),
  itemCount: z.number(),
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
 * Order Management Router
 * Handles complex order processing workflows and order lifecycle management
 * Converted from Spring Boot OrderController.java
 */
export const orderRouter = router({
  /**
   * Create a new order
   * Converts POST /api/v1/orders
   */
  create: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE']))
    .use(activityLoggingMiddleware('ORDER_CREATED', 'ORDER'))
    .input(OrderCreateRequestSchema)
    .output(OrderResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const {
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        billingAddress,
        items,
        notes,
      } = input;

      const user = ctx.requireAuth();

      // Generate order number
      const orderNumber = await generateOrderNumber(ctx);

      // Validate product availability
      for (const item of items) {
        const inventory = await ctx.db.queryBuilder
          .selectFrom('inventory')
          .select(['quantity_available'])
          .where('product_id', '=', item.productId)
          .executeTakeFirst();

        if (!inventory || inventory.quantity_available < item.quantity) {
          const product = await ctx.db.queryBuilder
            .selectFrom('products')
            .select(['name', 'sku'])
            .where('id', '=', item.productId)
            .executeTakeFirst();

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient inventory for product ${product?.name || item.productId}. Available: ${inventory?.quantity_available || 0}, Requested: ${item.quantity}`,
          });
        }
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = subtotal * 0.1; // 10% tax rate
      const shippingAmount = subtotal > 100 ? 0 : 10; // Free shipping over $100
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Create order
      const [order] = await ctx.db.queryBuilder
        .insertInto('orders')
        .values({
          order_number: orderNumber,
          status: 'PENDING',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone || null,
          shipping_address: JSON.stringify(shippingAddress),
          billing_address: billingAddress ? JSON.stringify(billingAddress) : JSON.stringify(shippingAddress),
          subtotal,
          tax_amount: taxAmount,
          shipping_amount: shippingAmount,
          total_amount: totalAmount,
          notes: notes || null,
          created_by: user.id,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning([
          'id',
          'order_number',
          'status',
          'customer_name',
          'customer_email',
          'customer_phone',
          'shipping_address',
          'billing_address',
          'subtotal',
          'tax_amount',
          'shipping_amount',
          'total_amount',
          'notes',
          'tracking_number',
          'shipping_carrier',
          'shipped_at',
          'delivered_at',
          'created_at',
          'updated_at',
        ])
        .execute();

      // Create order items and allocate inventory
      const orderItems = [];
      for (const item of items) {
        const [orderItem] = await ctx.db.queryBuilder
          .insertInto('order_items')
          .values({
            order_id: order.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.quantity * item.unitPrice,
            quantity_shipped: 0,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning([
            'id',
            'product_id',
            'quantity',
            'unit_price',
            'total_price',
            'quantity_shipped',
          ])
          .execute();

        // Allocate inventory
        await ctx.db.queryBuilder
          .updateTable('inventory')
          .set((eb) => ({
            quantity_allocated: eb('quantity_allocated', '+', item.quantity),
            quantity_available: eb('quantity_available', '-', item.quantity),
            updated_at: new Date(),
          }))
          .where('product_id', '=', item.productId)
          .execute();

        // Get product details for response
        const product = await ctx.db.queryBuilder
          .selectFrom('products')
          .select(['name', 'sku'])
          .where('id', '=', item.productId)
          .executeTakeFirst();

        orderItems.push({
          id: orderItem.id,
          productId: orderItem.product_id,
          productName: product?.name || 'Unknown',
          productSku: product?.sku || 'Unknown',
          quantity: orderItem.quantity,
          unitPrice: Number(orderItem.unit_price),
          totalPrice: Number(orderItem.total_price),
          quantityShipped: orderItem.quantity_shipped,
          quantityRemaining: orderItem.quantity - orderItem.quantity_shipped,
        });
      }

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status as any,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: JSON.parse(order.shipping_address),
        billingAddress: order.billing_address ? JSON.parse(order.billing_address) : null,
        items: orderItems,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        shippingAmount: Number(order.shipping_amount),
        totalAmount: Number(order.total_amount),
        notes: order.notes,
        trackingNumber: order.tracking_number,
        shippingCarrier: order.shipping_carrier,
        shippedAt: order.shipped_at?.toISOString() || null,
        deliveredAt: order.delivered_at?.toISOString() || null,
        createdAt: order.created_at.toISOString(),
        updatedAt: order.updated_at.toISOString(),
      };
    }),

  /**
   * Get order by ID
   * Converts GET /api/v1/orders/{orderId}
   */
  getById: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().uuid() }))
    .output(OrderResponseSchema)
    .query(async ({ input, ctx }) => {
      const order = await ctx.db.queryBuilder
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', input.id)
        .executeTakeFirst();

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Get order items
      const orderItems = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select([
          'order_items.id',
          'order_items.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'order_items.quantity',
          'order_items.unit_price',
          'order_items.total_price',
          'order_items.quantity_shipped',
        ])
        .where('order_items.order_id', '=', input.id)
        .execute();

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status as any,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: JSON.parse(order.shipping_address),
        billingAddress: order.billing_address ? JSON.parse(order.billing_address) : null,
        items: orderItems.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || 'Unknown',
          productSku: item.product_sku || 'Unknown',
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          totalPrice: Number(item.total_price),
          quantityShipped: item.quantity_shipped,
          quantityRemaining: item.quantity - item.quantity_shipped,
        })),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        shippingAmount: Number(order.shipping_amount),
        totalAmount: Number(order.total_amount),
        notes: order.notes,
        trackingNumber: order.tracking_number,
        shippingCarrier: order.shipping_carrier,
        shippedAt: order.shipped_at?.toISOString() || null,
        deliveredAt: order.delivered_at?.toISOString() || null,
        createdAt: order.created_at.toISOString(),
        updatedAt: order.updated_at.toISOString(),
      };
    }),

  /**
   * Get order by order number
   * Converts GET /api/v1/orders/number/{orderNumber}
   */
  getByNumber: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ orderNumber: z.string() }))
    .output(OrderResponseSchema)
    .query(async ({ input, ctx }) => {
      const order = await ctx.db.queryBuilder
        .selectFrom('orders')
        .selectAll()
        .where('order_number', '=', input.orderNumber)
        .executeTakeFirst();

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Get order items
      const orderItems = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select([
          'order_items.id',
          'order_items.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'order_items.quantity',
          'order_items.unit_price',
          'order_items.total_price',
          'order_items.quantity_shipped',
        ])
        .where('order_items.order_id', '=', order.id)
        .execute();

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status as any,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: JSON.parse(order.shipping_address),
        billingAddress: order.billing_address ? JSON.parse(order.billing_address) : null,
        items: orderItems.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || 'Unknown',
          productSku: item.product_sku || 'Unknown',
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          totalPrice: Number(item.total_price),
          quantityShipped: item.quantity_shipped,
          quantityRemaining: item.quantity - item.quantity_shipped,
        })),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        shippingAmount: Number(order.shipping_amount),
        totalAmount: Number(order.total_amount),
        notes: order.notes,
        trackingNumber: order.tracking_number,
        shippingCarrier: order.shipping_carrier,
        shippedAt: order.shipped_at?.toISOString() || null,
        deliveredAt: order.delivered_at?.toISOString() || null,
        createdAt: order.created_at.toISOString(),
        updatedAt: order.updated_at.toISOString(),
      };
    }),

  /**
   * Update order status
   * Converts PUT /api/v1/orders/{orderId}/status
   */
  updateStatus: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('ORDER_STATUS_UPDATED', 'ORDER'))
    .input(z.object({
      id: z.string().uuid(),
      data: OrderStatusUpdateRequestSchema,
    }))
    .output(OrderResponseSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      const { status, notes } = data;

      // Update order status
      await ctx.db.queryBuilder
        .updateTable('orders')
        .set({
          status,
          ...(notes && { notes }),
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      // Get updated order
      const order = await ctx.db.queryBuilder
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow();

      // Get order items
      const orderItems = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select([
          'order_items.id',
          'order_items.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'order_items.quantity',
          'order_items.unit_price',
          'order_items.total_price',
          'order_items.quantity_shipped',
        ])
        .where('order_items.order_id', '=', id)
        .execute();

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status as any,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingAddress: JSON.parse(order.shipping_address),
        billingAddress: order.billing_address ? JSON.parse(order.billing_address) : null,
        items: orderItems.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || 'Unknown',
          productSku: item.product_sku || 'Unknown',
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          totalPrice: Number(item.total_price),
          quantityShipped: item.quantity_shipped,
          quantityRemaining: item.quantity - item.quantity_shipped,
        })),
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        shippingAmount: Number(order.shipping_amount),
        totalAmount: Number(order.total_amount),
        notes: order.notes,
        trackingNumber: order.tracking_number,
        shippingCarrier: order.shipping_carrier,
        shippedAt: order.shipped_at?.toISOString() || null,
        deliveredAt: order.delivered_at?.toISOString() || null,
        createdAt: order.created_at.toISOString(),
        updatedAt: order.updated_at.toISOString(),
      };
    }),

  /**
   * Get all orders with pagination and filtering
   * Converts GET /api/v1/orders
   */
  getAll: protectedProcedure
    .use(authMiddleware)
    .input(OrderFiltersSchema)
    .output(PagedResponseSchema(OrderSummaryResponseSchema))
    .query(async ({ input, ctx }) => {
      const {
        status,
        customerName,
        customerEmail,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page,
        limit,
      } = input;
      const offset = (page - 1) * limit;

      let query = ctx.db.queryBuilder.selectFrom('orders');

      // Apply filters
      if (status) {
        query = query.where('status', '=', status);
      }
      if (customerName) {
        query = query.where('customer_name', 'ilike', `%${customerName}%`);
      }
      if (customerEmail) {
        query = query.where('customer_email', 'ilike', `%${customerEmail}%`);
      }
      if (startDate) {
        query = query.where('created_at', '>=', new Date(startDate));
      }
      if (endDate) {
        query = query.where('created_at', '<=', new Date(endDate));
      }
      if (minAmount) {
        query = query.where('total_amount', '>=', minAmount);
      }
      if (maxAmount) {
        query = query.where('total_amount', '<=', maxAmount);
      }

      // Get total count
      const totalResult = await query
        .select((eb) => eb.fn.count('id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get orders with item count
      const orders = await query
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .select([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
          (eb) => eb.fn.count('order_items.id').as('item_count'),
        ])
        .groupBy([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
        ])
        .orderBy('orders.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: orders.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          status: order.status as any,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          totalAmount: Number(order.total_amount),
          itemCount: Number(order.item_count),
          createdAt: order.created_at.toISOString(),
          updatedAt: order.updated_at.toISOString(),
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
   * Search orders
   * Converts GET /api/v1/orders/search
   */
  search: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      q: z.string().min(1, 'Search query is required'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(PagedResponseSchema(OrderSummaryResponseSchema))
    .query(async ({ input, ctx }) => {
      const { q, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('orders')
        .select((eb) => eb.fn.count('id').as('count'))
        .where((eb) => eb.or([
          eb('order_number', 'ilike', `%${q}%`),
          eb('customer_name', 'ilike', `%${q}%`),
          eb('customer_email', 'ilike', `%${q}%`),
        ]))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Search orders
      const orders = await ctx.db.queryBuilder
        .selectFrom('orders')
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .select([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
          (eb) => eb.fn.count('order_items.id').as('item_count'),
        ])
        .where((eb) => eb.or([
          eb('orders.order_number', 'ilike', `%${q}%`),
          eb('orders.customer_name', 'ilike', `%${q}%`),
          eb('orders.customer_email', 'ilike', `%${q}%`),
        ]))
        .groupBy([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
        ])
        .orderBy('orders.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: orders.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          status: order.status as any,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          totalAmount: Number(order.total_amount),
          itemCount: Number(order.item_count),
          createdAt: order.created_at.toISOString(),
          updatedAt: order.updated_at.toISOString(),
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
   * Get orders by status
   * Converts GET /api/v1/orders/by-status/{status}
   */
  getByStatus: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      status: OrderStatusEnum,
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(PagedResponseSchema(OrderSummaryResponseSchema))
    .query(async ({ input, ctx }) => {
      const { status, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('orders')
        .select((eb) => eb.fn.count('id').as('count'))
        .where('status', '=', status)
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get orders
      const orders = await ctx.db.queryBuilder
        .selectFrom('orders')
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .select([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
          (eb) => eb.fn.count('order_items.id').as('item_count'),
        ])
        .where('orders.status', '=', status)
        .groupBy([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
        ])
        .orderBy('orders.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: orders.map(order => ({
          id: order.id,
          orderNumber: order.order_number,
          status: order.status as any,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          totalAmount: Number(order.total_amount),
          itemCount: Number(order.item_count),
          createdAt: order.created_at.toISOString(),
          updatedAt: order.updated_at.toISOString(),
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
   * Get pending orders
   * Converts GET /api/v1/orders/pending
   */
  getPending: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE']))
    .output(z.array(OrderSummaryResponseSchema))
    .query(async ({ ctx }) => {
      const orders = await ctx.db.queryBuilder
        .selectFrom('orders')
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .select([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
          (eb) => eb.fn.count('order_items.id').as('item_count'),
        ])
        .where('orders.status', '=', 'PENDING')
        .groupBy([
          'orders.id',
          'orders.order_number',
          'orders.status',
          'orders.customer_name',
          'orders.customer_email',
          'orders.total_amount',
          'orders.created_at',
          'orders.updated_at',
        ])
        .orderBy('orders.created_at', 'asc')
        .execute();

      return orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status as any,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        totalAmount: Number(order.total_amount),
        itemCount: Number(order.item_count),
        createdAt: order.created_at.toISOString(),
        updatedAt: order.updated_at.toISOString(),
      }));
    }),

  /**
   * Cancel order
   * Converts POST /api/v1/orders/{orderId}/cancel
   */
  cancel: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('ORDER_CANCELLED', 'ORDER'))
    .input(z.object({
      id: z.string().uuid(),
      data: OrderCancellationRequestSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;
      const { reason } = data;

      // Get order items to release inventory
      const orderItems = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .select(['product_id', 'quantity', 'quantity_shipped'])
        .where('order_id', '=', id)
        .execute();

      // Release allocated inventory for unshipped items
      for (const item of orderItems) {
        const quantityToRelease = item.quantity - item.quantity_shipped;
        if (quantityToRelease > 0) {
          await ctx.db.queryBuilder
            .updateTable('inventory')
            .set((eb) => ({
              quantity_allocated: eb('quantity_allocated', '-', quantityToRelease),
              quantity_available: eb('quantity_available', '+', quantityToRelease),
              updated_at: new Date(),
            }))
            .where('product_id', '=', item.product_id)
            .execute();
        }
      }

      // Update order status
      await ctx.db.queryBuilder
        .updateTable('orders')
        .set({
          status: 'CANCELLED',
          notes: reason,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .execute();

      return {
        message: 'Order cancelled successfully',
        orderId: id,
        reason,
      };
    }),

  /**
   * Get order statistics
   * Converts GET /api/v1/orders/statistics
   */
  getStatistics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .query(async ({ ctx }) => {
      const stats = await ctx.db.queryBuilder
        .selectFrom('orders')
        .select([
          (eb) => eb.fn.count('id').as('total'),
          (eb) => eb.fn.count('id').filterWhere('status', '=', 'PENDING').as('pending'),
          (eb) => eb.fn.count('id').filterWhere('status', '=', 'CONFIRMED').as('confirmed'),
          (eb) => eb.fn.count('id').filterWhere('status', '=', 'PROCESSING').as('processing'),
          (eb) => eb.fn.count('id').filterWhere('status', '=', 'SHIPPED').as('shipped'),
          (eb) => eb.fn.count('id').filterWhere('status', '=', 'DELIVERED').as('delivered'),
          (eb) => eb.fn.count('id').filterWhere('status', '=', 'CANCELLED').as('cancelled'),
          (eb) => eb.fn.sum('total_amount').as('totalRevenue'),
          (eb) => eb.fn.avg('total_amount').as('averageOrderValue'),
        ])
        .executeTakeFirst();

      return {
        total: Number(stats?.total || 0),
        byStatus: {
          pending: Number(stats?.pending || 0),
          confirmed: Number(stats?.confirmed || 0),
          processing: Number(stats?.processing || 0),
          shipped: Number(stats?.shipped || 0),
          delivered: Number(stats?.delivered || 0),
          cancelled: Number(stats?.cancelled || 0),
        },
        revenue: {
          total: Number(stats?.totalRevenue || 0),
          average: Number(stats?.averageOrderValue || 0),
        },
      };
    }),
});

// Helper functions
async function generateOrderNumber(ctx: any): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const prefix = `ORD-${year}${month}${day}`;
  
  // Get the count of orders created today
  const count = await ctx.db.queryBuilder
    .selectFrom('orders')
    .select((eb) => eb.fn.count('id').as('count'))
    .where('created_at', '>=', new Date(year, today.getMonth(), today.getDate()))
    .where('created_at', '<', new Date(year, today.getMonth(), today.getDate() + 1))
    .executeTakeFirst();
  
  const sequence = String(Number(count?.count || 0) + 1).padStart(4, '0');
  
  return `${prefix}-${sequence}`;
}