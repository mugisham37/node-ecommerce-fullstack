import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const ReportFiltersSchema = z.object({
  ...DateRangeSchema.shape,
  groupBy: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).default('DAILY'),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

const TopItemsSchema = z.object({
  ...DateRangeSchema.shape,
  limit: z.number().min(1).max(100).default(10),
});

const InventoryAnalyticsSchema = z.object({
  ...DateRangeSchema.shape,
  warehouseLocation: z.string().optional(),
  includeInactive: z.boolean().default(false),
});

// Response schemas
const SalesMetricsSchema = z.object({
  totalRevenue: z.number(),
  totalOrders: z.number(),
  averageOrderValue: z.number(),
  totalItems: z.number(),
  conversionRate: z.number(),
  growthRate: z.number(),
});

const InventoryMetricsSchema = z.object({
  totalProducts: z.number(),
  totalValue: z.number(),
  lowStockItems: z.number(),
  outOfStockItems: z.number(),
  turnoverRate: z.number(),
  averageStockLevel: z.number(),
});

const CustomerMetricsSchema = z.object({
  totalCustomers: z.number(),
  newCustomers: z.number(),
  returningCustomers: z.number(),
  customerRetentionRate: z.number(),
  averageCustomerValue: z.number(),
  customerLifetimeValue: z.number(),
});

const TimeSeriesDataSchema = z.object({
  date: z.string(),
  value: z.number(),
  count: z.number().optional(),
  label: z.string().optional(),
});

const TopItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  count: z.number(),
  percentage: z.number(),
});

const DashboardMetricsSchema = z.object({
  sales: SalesMetricsSchema,
  inventory: InventoryMetricsSchema,
  customers: CustomerMetricsSchema,
  recentActivity: z.array(z.object({
    type: z.string(),
    description: z.string(),
    timestamp: z.string(),
    value: z.number().optional(),
  })),
});

/**
 * Analytics and Reporting Router
 * Handles business intelligence, reporting, and analytics operations
 * Converted from Spring Boot ReportController.java
 */
export const analyticsRouter = router({
  /**
   * Get dashboard overview metrics
   * Provides key business metrics for the main dashboard
   */
  getDashboard: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(DateRangeSchema)
    .output(DashboardMetricsSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate) : new Date();

      // Sales metrics
      const salesData = await ctx.db.queryBuilder
        .selectFrom('orders')
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .select([
          (eb) => eb.fn.sum('orders.total_amount').filterWhere('orders.status', '!=', 'CANCELLED').as('totalRevenue'),
          (eb) => eb.fn.count('orders.id').filterWhere('orders.status', '!=', 'CANCELLED').as('totalOrders'),
          (eb) => eb.fn.avg('orders.total_amount').filterWhere('orders.status', '!=', 'CANCELLED').as('averageOrderValue'),
          (eb) => eb.fn.sum('order_items.quantity').filterWhere('orders.status', '!=', 'CANCELLED').as('totalItems'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .executeTakeFirst();

      // Inventory metrics
      const inventoryData = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          (eb) => eb.fn.count('inventory.id').as('totalProducts'),
          (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.cost_price')).as('totalValue'),
          (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '<=', eb.ref('products.reorder_level')).as('lowStockItems'),
          (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '=', 0).as('outOfStockItems'),
          (eb) => eb.fn.avg('inventory.quantity_on_hand').as('averageStockLevel'),
        ])
        .where('products.active', '=', true)
        .executeTakeFirst();

      // Customer metrics (simplified - would need customer table in real implementation)
      const customerData = await ctx.db.queryBuilder
        .selectFrom('orders')
        .select([
          (eb) => eb.fn.countDistinct('customer_email').as('totalCustomers'),
          (eb) => eb.fn.countDistinct('customer_email').filterWhere('orders.created_at', '>=', start).as('newCustomers'),
        ])
        .where('orders.status', '!=', 'CANCELLED')
        .executeTakeFirst();

      // Recent activity
      const recentActivity = await ctx.db.queryBuilder
        .selectFrom('user_activities')
        .leftJoin('users', 'user_activities.user_id', 'users.id')
        .select([
          'user_activities.action',
          'user_activities.resource_type',
          'user_activities.details',
          'user_activities.created_at',
          'users.first_name',
          'users.last_name',
        ])
        .orderBy('user_activities.created_at', 'desc')
        .limit(10)
        .execute();

      return {
        sales: {
          totalRevenue: Number(salesData?.totalRevenue || 0),
          totalOrders: Number(salesData?.totalOrders || 0),
          averageOrderValue: Number(salesData?.averageOrderValue || 0),
          totalItems: Number(salesData?.totalItems || 0),
          conversionRate: 0.0, // Would calculate from traffic data
          growthRate: 0.0, // Would calculate from previous period
        },
        inventory: {
          totalProducts: Number(inventoryData?.totalProducts || 0),
          totalValue: Number(inventoryData?.totalValue || 0),
          lowStockItems: Number(inventoryData?.lowStockItems || 0),
          outOfStockItems: Number(inventoryData?.outOfStockItems || 0),
          turnoverRate: 0.0, // Would calculate from sales/inventory ratio
          averageStockLevel: Number(inventoryData?.averageStockLevel || 0),
        },
        customers: {
          totalCustomers: Number(customerData?.totalCustomers || 0),
          newCustomers: Number(customerData?.newCustomers || 0),
          returningCustomers: Number(customerData?.totalCustomers || 0) - Number(customerData?.newCustomers || 0),
          customerRetentionRate: 0.0, // Would calculate from repeat purchases
          averageCustomerValue: Number(salesData?.totalRevenue || 0) / Math.max(Number(customerData?.totalCustomers || 0), 1),
          customerLifetimeValue: 0.0, // Would calculate from historical data
        },
        recentActivity: recentActivity.map(activity => ({
          type: activity.action,
          description: `${activity.first_name} ${activity.last_name} ${activity.action.toLowerCase().replace('_', ' ')} ${activity.resource_type.toLowerCase()}`,
          timestamp: activity.created_at.toISOString(),
        })),
      };
    }),

  /**
   * Get sales analytics
   * Provides detailed sales performance metrics and trends
   */
  getSalesAnalytics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(ReportFiltersSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, groupBy, categoryId, supplierId } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      let query = ctx.db.queryBuilder
        .selectFrom('orders')
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .leftJoin('products', 'order_items.product_id', 'products.id');

      // Apply filters
      if (categoryId) {
        query = query.where('products.category_id', '=', categoryId);
      }
      if (supplierId) {
        query = query.where('products.supplier_id', '=', supplierId);
      }

      // Time series data
      const dateFormat = getDateFormat(groupBy);
      const timeSeriesData = await query
        .select([
          (eb) => eb.fn('date_trunc', [groupBy.toLowerCase(), 'orders.created_at']).as('period'),
          (eb) => eb.fn.sum('orders.total_amount').as('revenue'),
          (eb) => eb.fn.count('orders.id').as('orderCount'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .where('orders.status', '!=', 'CANCELLED')
        .groupBy('period')
        .orderBy('period')
        .execute();

      // Overall metrics
      const overallMetrics = await query
        .select([
          (eb) => eb.fn.sum('orders.total_amount').as('totalRevenue'),
          (eb) => eb.fn.count('orders.id').as('totalOrders'),
          (eb) => eb.fn.avg('orders.total_amount').as('averageOrderValue'),
          (eb) => eb.fn.sum('order_items.quantity').as('totalItems'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .where('orders.status', '!=', 'CANCELLED')
        .executeTakeFirst();

      return {
        metrics: {
          totalRevenue: Number(overallMetrics?.totalRevenue || 0),
          totalOrders: Number(overallMetrics?.totalOrders || 0),
          averageOrderValue: Number(overallMetrics?.averageOrderValue || 0),
          totalItems: Number(overallMetrics?.totalItems || 0),
          conversionRate: 0.0,
          growthRate: 0.0,
        },
        timeSeries: timeSeriesData.map(data => ({
          date: data.period.toISOString(),
          value: Number(data.revenue),
          count: Number(data.orderCount),
        })),
      };
    }),

  /**
   * Get inventory analytics
   * Provides inventory performance metrics and insights
   */
  getInventoryAnalytics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(InventoryAnalyticsSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, warehouseLocation, includeInactive } = input;

      let query = ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .leftJoin('categories', 'products.category_id', 'categories.id');

      // Apply filters
      if (warehouseLocation) {
        query = query.where('inventory.warehouse_location', '=', warehouseLocation);
      }
      if (!includeInactive) {
        query = query.where('products.active', '=', true);
      }

      // Overall inventory metrics
      const inventoryMetrics = await query
        .select([
          (eb) => eb.fn.count('inventory.id').as('totalProducts'),
          (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.cost_price')).as('totalCostValue'),
          (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.selling_price')).as('totalSellingValue'),
          (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '<=', eb.ref('products.reorder_level')).as('lowStockItems'),
          (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '=', 0).as('outOfStockItems'),
          (eb) => eb.fn.sum('inventory.quantity_on_hand').as('totalQuantity'),
          (eb) => eb.fn.sum('inventory.quantity_allocated').as('totalAllocated'),
          (eb) => eb.fn.sum('inventory.quantity_available').as('totalAvailable'),
        ])
        .executeTakeFirst();

      // Inventory by category
      const categoryBreakdown = await query
        .select([
          'categories.id',
          'categories.name',
          (eb) => eb.fn.count('inventory.id').as('productCount'),
          (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.cost_price')).as('totalValue'),
          (eb) => eb.fn.sum('inventory.quantity_on_hand').as('totalQuantity'),
        ])
        .groupBy(['categories.id', 'categories.name'])
        .orderBy('totalValue', 'desc')
        .limit(10)
        .execute();

      // Stock movements over time (if date range provided)
      let movementTrends = [];
      if (startDate && endDate) {
        movementTrends = await ctx.db.queryBuilder
          .selectFrom('stock_movements')
          .leftJoin('products', 'stock_movements.product_id', 'products.id')
          .select([
            (eb) => eb.fn('date_trunc', ['day', 'stock_movements.created_at']).as('date'),
            (eb) => eb.fn.sum('stock_movements.quantity').filterWhere('stock_movements.movement_type', '=', 'INCREASE').as('inbound'),
            (eb) => eb.fn.sum(eb('stock_movements.quantity', '*', -1)).filterWhere('stock_movements.movement_type', '=', 'DECREASE').as('outbound'),
          ])
          .where('stock_movements.created_at', '>=', new Date(startDate))
          .where('stock_movements.created_at', '<=', new Date(endDate))
          .groupBy('date')
          .orderBy('date')
          .execute();
      }

      return {
        metrics: {
          totalProducts: Number(inventoryMetrics?.totalProducts || 0),
          totalValue: Number(inventoryMetrics?.totalCostValue || 0),
          lowStockItems: Number(inventoryMetrics?.lowStockItems || 0),
          outOfStockItems: Number(inventoryMetrics?.outOfStockItems || 0),
          turnoverRate: 0.0, // Would calculate from sales data
          averageStockLevel: Number(inventoryMetrics?.totalQuantity || 0) / Math.max(Number(inventoryMetrics?.totalProducts || 0), 1),
        },
        valuation: {
          costValue: Number(inventoryMetrics?.totalCostValue || 0),
          sellingValue: Number(inventoryMetrics?.totalSellingValue || 0),
          potentialProfit: Number(inventoryMetrics?.totalSellingValue || 0) - Number(inventoryMetrics?.totalCostValue || 0),
        },
        breakdown: {
          totalQuantity: Number(inventoryMetrics?.totalQuantity || 0),
          allocated: Number(inventoryMetrics?.totalAllocated || 0),
          available: Number(inventoryMetrics?.totalAvailable || 0),
        },
        categoryBreakdown: categoryBreakdown.map(category => ({
          id: category.id,
          name: category.name || 'Unknown',
          productCount: Number(category.productCount),
          totalValue: Number(category.totalValue || 0),
          totalQuantity: Number(category.totalQuantity || 0),
        })),
        movementTrends: movementTrends.map(trend => ({
          date: trend.date.toISOString(),
          inbound: Number(trend.inbound || 0),
          outbound: Number(trend.outbound || 0),
        })),
      };
    }),

  /**
   * Get top selling products
   * Returns the best performing products by various metrics
   */
  getTopProducts: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(TopItemsSchema)
    .output(z.array(TopItemSchema))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, limit } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const topProducts = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select([
          'products.id',
          'products.name',
          (eb) => eb.fn.sum('order_items.total_price').as('totalRevenue'),
          (eb) => eb.fn.sum('order_items.quantity').as('totalQuantity'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .where('orders.status', '!=', 'CANCELLED')
        .groupBy(['products.id', 'products.name'])
        .orderBy('totalRevenue', 'desc')
        .limit(limit)
        .execute();

      // Calculate total revenue for percentage calculation
      const totalRevenue = topProducts.reduce((sum, product) => sum + Number(product.totalRevenue), 0);

      return topProducts.map(product => ({
        id: product.id,
        name: product.name || 'Unknown',
        value: Number(product.totalRevenue),
        count: Number(product.totalQuantity),
        percentage: totalRevenue > 0 ? (Number(product.totalRevenue) / totalRevenue) * 100 : 0,
      }));
    }),

  /**
   * Get top customers
   * Returns the highest value customers
   */
  getTopCustomers: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(TopItemsSchema)
    .output(z.array(TopItemSchema))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, limit } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const topCustomers = await ctx.db.queryBuilder
        .selectFrom('orders')
        .select([
          'customer_email as id',
          'customer_name as name',
          (eb) => eb.fn.sum('total_amount').as('totalValue'),
          (eb) => eb.fn.count('id').as('orderCount'),
        ])
        .where('created_at', '>=', start)
        .where('created_at', '<=', end)
        .where('status', '!=', 'CANCELLED')
        .groupBy(['customer_email', 'customer_name'])
        .orderBy('totalValue', 'desc')
        .limit(limit)
        .execute();

      // Calculate total revenue for percentage calculation
      const totalRevenue = topCustomers.reduce((sum, customer) => sum + Number(customer.totalValue), 0);

      return topCustomers.map(customer => ({
        id: customer.id,
        name: customer.name,
        value: Number(customer.totalValue),
        count: Number(customer.orderCount),
        percentage: totalRevenue > 0 ? (Number(customer.totalValue) / totalRevenue) * 100 : 0,
      }));
    }),

  /**
   * Get top categories
   * Returns the best performing categories
   */
  getTopCategories: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(TopItemsSchema)
    .output(z.array(TopItemSchema))
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, limit } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const topCategories = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .select([
          'categories.id',
          'categories.name',
          (eb) => eb.fn.sum('order_items.total_price').as('totalRevenue'),
          (eb) => eb.fn.sum('order_items.quantity').as('totalQuantity'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .where('orders.status', '!=', 'CANCELLED')
        .groupBy(['categories.id', 'categories.name'])
        .orderBy('totalRevenue', 'desc')
        .limit(limit)
        .execute();

      // Calculate total revenue for percentage calculation
      const totalRevenue = topCategories.reduce((sum, category) => sum + Number(category.totalRevenue), 0);

      return topCategories.map(category => ({
        id: category.id,
        name: category.name || 'Unknown',
        value: Number(category.totalRevenue),
        count: Number(category.totalQuantity),
        percentage: totalRevenue > 0 ? (Number(category.totalRevenue) / totalRevenue) * 100 : 0,
      }));
    }),

  /**
   * Generate comprehensive business report
   * Creates a detailed business performance report
   */
  generateBusinessReport: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('BUSINESS_REPORT_GENERATED', 'REPORT'))
    .input(ReportFiltersSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, groupBy } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get all the analytics data
      const [salesAnalytics, inventoryAnalytics, topProducts, topCustomers, topCategories] = await Promise.all([
        // Sales data
        ctx.db.queryBuilder
          .selectFrom('orders')
          .leftJoin('order_items', 'orders.id', 'order_items.order_id')
          .select([
            (eb) => eb.fn.sum('orders.total_amount').as('totalRevenue'),
            (eb) => eb.fn.count('orders.id').as('totalOrders'),
            (eb) => eb.fn.avg('orders.total_amount').as('averageOrderValue'),
            (eb) => eb.fn.sum('order_items.quantity').as('totalItems'),
          ])
          .where('orders.created_at', '>=', start)
          .where('orders.created_at', '<=', end)
          .where('orders.status', '!=', 'CANCELLED')
          .executeTakeFirst(),

        // Inventory data
        ctx.db.queryBuilder
          .selectFrom('inventory')
          .leftJoin('products', 'inventory.product_id', 'products.id')
          .select([
            (eb) => eb.fn.count('inventory.id').as('totalProducts'),
            (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.cost_price')).as('totalValue'),
            (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '<=', eb.ref('products.reorder_level')).as('lowStockItems'),
            (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '=', 0).as('outOfStockItems'),
          ])
          .where('products.active', '=', true)
          .executeTakeFirst(),

        // Top products (limited query for report)
        ctx.db.queryBuilder
          .selectFrom('order_items')
          .leftJoin('orders', 'order_items.order_id', 'orders.id')
          .leftJoin('products', 'order_items.product_id', 'products.id')
          .select([
            'products.name',
            (eb) => eb.fn.sum('order_items.total_price').as('revenue'),
          ])
          .where('orders.created_at', '>=', start)
          .where('orders.created_at', '<=', end)
          .where('orders.status', '!=', 'CANCELLED')
          .groupBy('products.name')
          .orderBy('revenue', 'desc')
          .limit(5)
          .execute(),

        // Top customers (limited query for report)
        ctx.db.queryBuilder
          .selectFrom('orders')
          .select([
            'customer_name',
            (eb) => eb.fn.sum('total_amount').as('totalValue'),
          ])
          .where('created_at', '>=', start)
          .where('created_at', '<=', end)
          .where('status', '!=', 'CANCELLED')
          .groupBy('customer_name')
          .orderBy('totalValue', 'desc')
          .limit(5)
          .execute(),

        // Top categories (limited query for report)
        ctx.db.queryBuilder
          .selectFrom('order_items')
          .leftJoin('orders', 'order_items.order_id', 'orders.id')
          .leftJoin('products', 'order_items.product_id', 'products.id')
          .leftJoin('categories', 'products.category_id', 'categories.id')
          .select([
            'categories.name',
            (eb) => eb.fn.sum('order_items.total_price').as('revenue'),
          ])
          .where('orders.created_at', '>=', start)
          .where('orders.created_at', '<=', end)
          .where('orders.status', '!=', 'CANCELLED')
          .groupBy('categories.name')
          .orderBy('revenue', 'desc')
          .limit(5)
          .execute(),
      ]);

      return {
        reportMetadata: {
          generatedAt: new Date().toISOString(),
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            groupBy,
          },
          generatedBy: ctx.user.isAuthenticated ? ctx.user.email : 'System',
        },
        summary: {
          sales: {
            totalRevenue: Number(salesAnalytics?.totalRevenue || 0),
            totalOrders: Number(salesAnalytics?.totalOrders || 0),
            averageOrderValue: Number(salesAnalytics?.averageOrderValue || 0),
            totalItems: Number(salesAnalytics?.totalItems || 0),
          },
          inventory: {
            totalProducts: Number(inventoryAnalytics?.totalProducts || 0),
            totalValue: Number(inventoryAnalytics?.totalValue || 0),
            lowStockItems: Number(inventoryAnalytics?.lowStockItems || 0),
            outOfStockItems: Number(inventoryAnalytics?.outOfStockItems || 0),
          },
        },
        topPerformers: {
          products: topProducts.map(p => ({
            name: p.name || 'Unknown',
            revenue: Number(p.revenue),
          })),
          customers: topCustomers.map(c => ({
            name: c.customer_name,
            totalValue: Number(c.totalValue),
          })),
          categories: topCategories.map(c => ({
            name: c.name || 'Unknown',
            revenue: Number(c.revenue),
          })),
        },
      };
    }),

  /**
   * Get profit and loss analytics
   * Provides P&L insights and profitability analysis
   */
  getProfitLossAnalytics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(ReportFiltersSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate } = input;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Revenue and cost analysis
      const profitData = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select([
          (eb) => eb.fn.sum('order_items.total_price').as('totalRevenue'),
          (eb) => eb.fn.sum(eb('order_items.quantity', '*', 'products.cost_price')).as('totalCost'),
          (eb) => eb.fn.sum('order_items.quantity').as('totalQuantity'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .where('orders.status', '!=', 'CANCELLED')
        .executeTakeFirst();

      const totalRevenue = Number(profitData?.totalRevenue || 0);
      const totalCost = Number(profitData?.totalCost || 0);
      const grossProfit = totalRevenue - totalCost;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Profit by category
      const categoryProfits = await ctx.db.queryBuilder
        .selectFrom('order_items')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .select([
          'categories.id',
          'categories.name',
          (eb) => eb.fn.sum('order_items.total_price').as('revenue'),
          (eb) => eb.fn.sum(eb('order_items.quantity', '*', 'products.cost_price')).as('cost'),
        ])
        .where('orders.created_at', '>=', start)
        .where('orders.created_at', '<=', end)
        .where('orders.status', '!=', 'CANCELLED')
        .groupBy(['categories.id', 'categories.name'])
        .orderBy('revenue', 'desc')
        .execute();

      return {
        summary: {
          totalRevenue,
          totalCost,
          grossProfit,
          grossMargin,
          totalQuantity: Number(profitData?.totalQuantity || 0),
        },
        categoryBreakdown: categoryProfits.map(category => {
          const revenue = Number(category.revenue);
          const cost = Number(category.cost);
          const profit = revenue - cost;
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

          return {
            id: category.id,
            name: category.name || 'Unknown',
            revenue,
            cost,
            profit,
            margin,
          };
        }),
      };
    }),
});

// Helper function to get date format based on groupBy
function getDateFormat(groupBy: string): string {
  switch (groupBy.toUpperCase()) {
    case 'DAILY':
      return 'YYYY-MM-DD';
    case 'WEEKLY':
      return 'YYYY-"W"WW';
    case 'MONTHLY':
      return 'YYYY-MM';
    case 'YEARLY':
      return 'YYYY';
    default:
      return 'YYYY-MM-DD';
  }
}