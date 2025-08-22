import { eq, gte, lte, and, desc, count, sum, sql } from 'drizzle-orm';
import { 
  VendorRepository,
  VendorAnalyticsRepository,
  OrderRepository,
  OrderItemRepository,
  ProductRepository,
  UserRepository
} from '@packages/database';
import { CacheManager } from '@packages/cache';
import { ApiError } from '@packages/shared/utils/api-error';
import { createRequestLogger } from '@packages/shared/utils/logger';
import { 
  safeDecimalToNumber,
  calculateGrowthPercentage,
  getDateTruncFunction,
  createAnalyticsCacheKey
} from '@packages/shared/utils/analytics';
import { 
  orders, 
  orderItems, 
  products, 
  users, 
  vendors, 
  categories,
  payouts
} from '@packages/database/schema';

// Cache TTL in seconds
const CACHE_TTL = {
  DASHBOARD_SUMMARY: 1800, // 30 minutes
  SALES_ANALYTICS: 3600, // 1 hour
  PRODUCT_ANALYTICS: 3600, // 1 hour
  ORDER_ANALYTICS: 3600, // 1 hour
};

export interface VendorDashboardSummary {
  salesSummary: VendorSalesSummary;
  productSummary: VendorProductSummary;
  orderSummary: VendorOrderSummary;
  payoutSummary: VendorPayoutSummary;
  recentOrders: VendorRecentOrder[];
  topProducts: VendorTopProduct[];
  salesTrend: VendorSalesTrend[];
  period: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
}

export interface VendorSalesSummary {
  totalSales: number;
  totalItems: number;
  orderCount: number;
  averageOrderValue: number;
  commission: number;
  netSales: number;
  growth: {
    salesGrowth: number;
    itemsGrowth: number;
    orderCountGrowth: number;
  };
}

export interface VendorProductSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
  totalItems: number;
}

export interface VendorOrderSummary {
  totalOrders: number;
  statusCounts: Record<string, number>;
}

export interface VendorPayoutSummary {
  totalPayouts: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalSales: number;
  commission: number;
  availableBalance: number;
  payoutCount: number;
}

export interface VendorRecentOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  } | null;
  status: string;
  vendorTotal: number;
  itemCount: number;
  createdAt: Date;
  paymentStatus: string;
}

export interface VendorTopProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface VendorSalesTrend {
  date: Date;
  sales: number;
  items: number;
  orderCount: number;
}

export class VendorAnalyticsService {
  constructor(
    private vendorRepository: VendorRepository,
    private vendorAnalyticsRepository: VendorAnalyticsRepository,
    private orderRepository: OrderRepository,
    private orderItemRepository: OrderItemRepository,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
    private cacheManager: CacheManager
  ) {}

  /**
   * Get vendor dashboard summary
   */
  async getVendorDashboardSummary(
    vendorId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
    requestId?: string
  ): Promise<VendorDashboardSummary> {
    const logger = createRequestLogger(requestId || 'vendor-dashboard');
    logger.info(`Getting dashboard summary for vendor ID: ${vendorId} with period: ${period}`);

    // Try to get from cache
    const cacheKey = createAnalyticsCacheKey('vendor_dashboard', { vendorId, period });
    const cachedData = await this.cacheManager.get<VendorDashboardSummary>(cacheKey);

    if (cachedData) {
      logger.info('Retrieved vendor dashboard summary from cache');
      return cachedData;
    }

    try {
      // Check if vendor exists
      const vendor = await this.vendorRepository.findById(vendorId);
      if (!vendor) {
        throw new ApiError('Vendor not found', 404);
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date(0); // Unix epoch

      if (period === 'day') {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'year') {
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Get sales summary
      const salesSummary = await this.getVendorSalesSummary(vendorId, startDate, now, requestId);

      // Get product summary
      const productSummary = await this.getVendorProductSummary(vendorId, requestId);

      // Get order summary
      const orderSummary = await this.getVendorOrderSummary(vendorId, startDate, now, requestId);

      // Get payout summary
      const payoutSummary = await this.getVendorPayoutSummary(vendorId, startDate, now, requestId);

      // Get recent orders
      const recentOrders = await this.getVendorRecentOrders(vendorId, 5, requestId);

      // Get top products
      const topProducts = await this.getVendorTopProducts(vendorId, startDate, now, 5, requestId);

      // Get sales trend
      const salesTrend = await this.getVendorSalesTrend(
        vendorId,
        startDate,
        now,
        period === 'day' ? 'hourly' : 'daily',
        requestId
      );

      // Compile dashboard summary
      const dashboardSummary: VendorDashboardSummary = {
        salesSummary,
        productSummary,
        orderSummary,
        payoutSummary,
        recentOrders,
        topProducts,
        salesTrend,
        period: {
          type: period,
          startDate,
          endDate: now,
        },
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, dashboardSummary, CACHE_TTL.DASHBOARD_SUMMARY);

      return dashboardSummary;
    } catch (error: any) {
      logger.error(`Error getting vendor dashboard summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor sales summary
   */
  private async getVendorSalesSummary(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    requestId?: string
  ): Promise<VendorSalesSummary> {
    const logger = createRequestLogger(requestId || 'vendor-sales-summary');
    logger.info(`Getting sales summary for vendor ID: ${vendorId}`);

    try {
      // Get orders for this vendor using raw SQL for better performance
      const salesData = await this.orderRepository.db.execute(sql`
        SELECT 
          SUM(oi.price * oi.quantity) as total_sales,
          SUM(oi.quantity) as total_items,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
      `);

      // Get previous period sales for comparison
      const periodDiff = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodDiff);
      const previousEndDate = new Date(startDate);

      const previousSalesData = await this.orderRepository.db.execute(sql`
        SELECT 
          SUM(oi.price * oi.quantity) as total_sales,
          SUM(oi.quantity) as total_items,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${previousStartDate}
          AND o.created_at <= ${previousEndDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
      `);

      // Calculate growth percentages
      const currentPeriod = salesData.rows[0] || { total_sales: 0, total_items: 0, order_count: 0 };
      const previousPeriod = previousSalesData.rows[0] || { total_sales: 0, total_items: 0, order_count: 0 };

      const growth = {
        salesGrowth: calculateGrowthPercentage(
          Number(currentPeriod.total_sales || 0), 
          Number(previousPeriod.total_sales || 0)
        ),
        itemsGrowth: calculateGrowthPercentage(
          Number(currentPeriod.total_items || 0), 
          Number(previousPeriod.total_items || 0)
        ),
        orderCountGrowth: calculateGrowthPercentage(
          Number(currentPeriod.order_count || 0), 
          Number(previousPeriod.order_count || 0)
        ),
      };

      // Get vendor commission rate
      const vendor = await this.vendorRepository.findById(vendorId);
      const commissionRate = vendor?.commissionRate || 0;

      // Calculate commission and net sales
      const totalSales = Number(currentPeriod.total_sales) || 0;
      const commission = Math.round((totalSales * commissionRate / 100) * 100) / 100;
      const netSales = Math.round((totalSales - commission) * 100) / 100;

      return {
        totalSales,
        totalItems: Number(currentPeriod.total_items) || 0,
        orderCount: Number(currentPeriod.order_count) || 0,
        averageOrderValue:
          Number(currentPeriod.order_count) > 0
            ? Math.round((totalSales / Number(currentPeriod.order_count)) * 100) / 100
            : 0,
        commission,
        netSales,
        growth,
      };
    } catch (error: any) {
      logger.error(`Error getting vendor sales summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor product summary
   */
  private async getVendorProductSummary(vendorId: string, requestId?: string): Promise<VendorProductSummary> {
    const logger = createRequestLogger(requestId || 'vendor-product-summary');
    logger.info(`Getting product summary for vendor ID: ${vendorId}`);

    try {
      // Get product counts
      const totalProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(eq(products.vendorId, vendorId));

      const activeProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(and(eq(products.vendorId, vendorId), eq(products.active, true)));

      const inactiveProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(and(eq(products.vendorId, vendorId), eq(products.active, false)));

      const lowStockProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            eq(products.vendorId, vendorId),
            sql`${products.quantity} > 0`,
            sql`${products.quantity} <= 5`
          )
        );

      const outOfStockProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            eq(products.vendorId, vendorId),
            sql`${products.quantity} <= 0`
          )
        );

      // Get inventory value
      const inventoryValue = await this.productRepository.db
        .select({ total: sum(products.price) })
        .from(products)
        .where(eq(products.vendorId, vendorId));

      // Get total inventory items
      const totalItems = await this.productRepository.db
        .select({ total: sum(products.quantity) })
        .from(products)
        .where(eq(products.vendorId, vendorId));

      return {
        totalProducts: totalProducts[0]?.count || 0,
        activeProducts: activeProducts[0]?.count || 0,
        inactiveProducts: inactiveProducts[0]?.count || 0,
        lowStockProducts: lowStockProducts[0]?.count || 0,
        outOfStockProducts: outOfStockProducts[0]?.count || 0,
        inventoryValue: Number(inventoryValue[0]?.total) || 0,
        totalItems: Number(totalItems[0]?.total) || 0,
      };
    } catch (error: any) {
      logger.error(`Error getting vendor product summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor order summary
   */
  private async getVendorOrderSummary(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    requestId?: string
  ): Promise<VendorOrderSummary> {
    const logger = createRequestLogger(requestId || 'vendor-order-summary');
    logger.info(`Getting order summary for vendor ID: ${vendorId}`);

    try {
      // Get orders containing vendor's products
      const ordersByStatus = await this.orderRepository.db.execute(sql`
        SELECT 
          o.status,
          COUNT(DISTINCT o.id) as count
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
        GROUP BY o.status
      `);

      // Convert to object
      const statusCounts: Record<string, number> = {
        PENDING: 0,
        PROCESSING: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      };

      ordersByStatus.rows.forEach((item: any) => {
        statusCounts[item.status] = Number(item.count);
      });

      // Calculate total orders
      const totalOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

      return {
        totalOrders,
        statusCounts,
      };
    } catch (error: any) {
      logger.error(`Error getting vendor order summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor payout summary
   */
  private async getVendorPayoutSummary(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    requestId?: string
  ): Promise<VendorPayoutSummary> {
    const logger = createRequestLogger(requestId || 'vendor-payout-summary');
    logger.info(`Getting payout summary for vendor ID: ${vendorId}`);

    try {
      // Get payouts for this vendor
      const payoutData = await this.orderRepository.db
        .select({
          status: payouts.status,
          netAmount: payouts.netAmount,
        })
        .from(payouts)
        .where(
          and(
            eq(payouts.vendorId, vendorId),
            gte(payouts.createdAt, startDate),
            lte(payouts.createdAt, endDate)
          )
        );

      // Calculate payout totals
      let totalPayouts = 0;
      let pendingPayouts = 0;
      let completedPayouts = 0;

      payoutData.forEach((payout) => {
        const amount = Number(payout.netAmount);
        if (payout.status === 'COMPLETED') {
          completedPayouts += amount;
        } else if (payout.status === 'PENDING' || payout.status === 'PROCESSING') {
          pendingPayouts += amount;
        }
        totalPayouts += amount;
      });

      // Get sales data for the period
      const salesData = await this.orderRepository.db.execute(sql`
        SELECT 
          SUM(oi.price * oi.quantity) as total_sales
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
          AND o.payment_status = 'COMPLETED'
      `);

      // Get vendor commission rate
      const vendor = await this.vendorRepository.findById(vendorId);
      const commissionRate = vendor?.commissionRate || 0;

      // Calculate total sales and available balance
      const totalSales = Number(salesData.rows[0]?.total_sales) || 0;
      const commission = Math.round((totalSales * commissionRate / 100) * 100) / 100;
      const availableBalance = Math.round((totalSales - commission - totalPayouts) * 100) / 100;

      return {
        totalPayouts: Math.round(totalPayouts * 100) / 100,
        pendingPayouts: Math.round(pendingPayouts * 100) / 100,
        completedPayouts: Math.round(completedPayouts * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        commission: Math.round(commission * 100) / 100,
        availableBalance: Math.max(0, availableBalance),
        payoutCount: payoutData.length,
      };
    } catch (error: any) {
      logger.error(`Error getting vendor payout summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor recent orders
   */
  private async getVendorRecentOrders(vendorId: string, limit: number, requestId?: string): Promise<VendorRecentOrder[]> {
    const logger = createRequestLogger(requestId || 'vendor-recent-orders');
    logger.info(`Getting recent orders for vendor ID: ${vendorId}`);

    try {
      // Get orders containing vendor's products
      const recentOrders = await this.orderRepository.db.execute(sql`
        SELECT DISTINCT
          o.id,
          o.status,
          o.payment_status,
          o.created_at,
          u.first_name,
          u.last_name,
          u.email,
          (
            SELECT SUM(oi2.price * oi2.quantity)
            FROM order_items oi2
            JOIN products p2 ON oi2.product_id = p2.id
            WHERE oi2.order_id = o.id AND p2.vendor_id = ${vendorId}
          ) as vendor_total,
          (
            SELECT COUNT(*)
            FROM order_items oi3
            JOIN products p3 ON oi3.product_id = p3.id
            WHERE oi3.order_id = o.id AND p3.vendor_id = ${vendorId}
          ) as item_count
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE p.vendor_id = ${vendorId}
        ORDER BY o.created_at DESC
        LIMIT ${limit}
      `);

      // Format orders
      return recentOrders.rows.map((order: any) => ({
        id: order.id,
        orderNumber: order.id.substring(order.id.length - 8).toUpperCase(),
        customer: order.first_name
          ? {
              name: `${order.first_name} ${order.last_name}`,
              email: order.email,
            }
          : null,
        status: order.status,
        vendorTotal: Math.round(Number(order.vendor_total) * 100) / 100,
        itemCount: Number(order.item_count),
        createdAt: order.created_at,
        paymentStatus: order.payment_status,
      }));
    } catch (error: any) {
      logger.error(`Error getting vendor recent orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor top products
   */
  private async getVendorTopProducts(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    limit: number,
    requestId?: string
  ): Promise<VendorTopProduct[]> {
    const logger = createRequestLogger(requestId || 'vendor-top-products');
    logger.info(`Getting top products for vendor ID: ${vendorId}`);

    try {
      // Get top selling products using raw SQL for better performance
      const topProducts = await this.orderRepository.db.execute(sql`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.price,
          COALESCE(
            json_agg(
              json_build_object('url', pi.url, 'alt_text', pi.alt_text)
              ORDER BY pi.sort_order
            ) FILTER (WHERE pi.id IS NOT NULL), 
            '[]'::json
          ) as images,
          SUM(oi.quantity) as quantity_sold,
          SUM(oi.price * oi.quantity) as revenue,
          COUNT(DISTINCT o.id) as order_count
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY p.id, p.name, p.sku, p.price
        ORDER BY revenue DESC
        LIMIT ${limit}
      `);

      return topProducts.rows.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0].url : null,
        quantitySold: Number(product.quantity_sold),
        revenue: Math.round(Number(product.revenue) * 100) / 100,
        orderCount: Number(product.order_count),
      }));
    } catch (error: any) {
      logger.error(`Error getting vendor top products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor sales trend
   */
  private async getVendorSalesTrend(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    requestId?: string
  ): Promise<VendorSalesTrend[]> {
    const logger = createRequestLogger(requestId || 'vendor-sales-trend');
    logger.info(`Getting sales trend for vendor ID: ${vendorId}`);

    try {
      const truncFunction = getDateTruncFunction(interval);

      // Get sales trend data using PostgreSQL date_trunc
      const salesTrend = await this.orderRepository.db.execute(sql`
        SELECT 
          DATE_TRUNC(${truncFunction}, o.created_at) as date,
          SUM(oi.price * oi.quantity) as sales,
          SUM(oi.quantity) as items,
          COUNT(DISTINCT o.id) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY DATE_TRUNC(${truncFunction}, o.created_at)
        ORDER BY date ASC
      `);

      return salesTrend.rows.map((item: any) => ({
        date: item.date,
        sales: Math.round(Number(item.sales) * 100) / 100,
        items: Number(item.items),
        orderCount: Number(item.order_count),
      }));
    } catch (error: any) {
      logger.error(`Error getting vendor sales trend: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor sales analytics
   */
  async getVendorSalesAnalytics(
    vendorId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
      compareWithPrevious?: boolean;
      groupBy?: 'product' | 'category' | 'customer';
    } = {},
    requestId?: string
  ): Promise<any> {
    const logger = createRequestLogger(requestId || 'vendor-sales-analytics');
    logger.info(`Getting sales analytics for vendor ID: ${vendorId}`);

    // Set default options
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const interval = options.interval || 'daily';
    const compareWithPrevious = options.compareWithPrevious !== undefined ? options.compareWithPrevious : true;
    const groupBy = options.groupBy || 'product';

    // Try to get from cache
    const cacheKey = createAnalyticsCacheKey('vendor_sales_analytics', {
      vendorId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      interval,
      compareWithPrevious,
      groupBy
    });

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      logger.info('Retrieved vendor sales analytics from cache');
      return cachedData;
    }

    try {
      // Check if vendor exists
      const vendor = await this.vendorRepository.findById(vendorId);
      if (!vendor) {
        throw new ApiError('Vendor not found', 404);
      }

      // Get sales summary
      const salesSummary = await this.getVendorSalesSummary(vendorId, startDate, endDate, requestId);

      // Get sales trend
      const salesTrend = await this.getVendorSalesTrend(vendorId, startDate, endDate, interval, requestId);

      // Get previous period sales trend if needed
      let previousSalesTrend = null;
      if (compareWithPrevious) {
        const periodDiff = endDate.getTime() - startDate.getTime();
        const previousStartDate = new Date(startDate.getTime() - periodDiff);
        const previousEndDate = new Date(startDate);
        previousSalesTrend = await this.getVendorSalesTrend(vendorId, previousStartDate, previousEndDate, interval, requestId);
      }

      // Get grouped sales data
      let groupedSales = [];
      if (groupBy === 'product') {
        groupedSales = await this.getVendorSalesByProduct(vendorId, startDate, endDate, requestId);
      } else if (groupBy === 'category') {
        groupedSales = await this.getVendorSalesByCategory(vendorId, startDate, endDate, requestId);
      } else if (groupBy === 'customer') {
        groupedSales = await this.getVendorSalesByCustomer(vendorId, startDate, endDate, requestId);
      }

      // Compile sales analytics
      const salesAnalytics = {
        summary: salesSummary,
        trend: {
          current: salesTrend,
          previous: previousSalesTrend,
        },
        groupedBy: {
          type: groupBy,
          data: groupedSales,
        },
        period: {
          startDate,
          endDate,
          interval,
        },
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, salesAnalytics, CACHE_TTL.SALES_ANALYTICS);

      return salesAnalytics;
    } catch (error: any) {
      logger.error(`Error getting vendor sales analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor sales by product
   */
  private async getVendorSalesByProduct(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    requestId?: string
  ): Promise<any[]> {
    const logger = createRequestLogger(requestId || 'vendor-sales-by-product');
    logger.info(`Getting sales by product for vendor ID: ${vendorId}`);

    try {
      // Get sales by product using raw SQL
      const salesByProduct = await this.orderRepository.db.execute(sql`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.price,
          COALESCE(
            json_agg(
              json_build_object('url', pi.url, 'alt_text', pi.alt_text)
              ORDER BY pi.sort_order
            ) FILTER (WHERE pi.id IS NOT NULL), 
            '[]'::json
          ) as images,
          SUM(oi.price * oi.quantity) as sales,
          SUM(oi.quantity) as quantity,
          COUNT(DISTINCT o.id) as order_count
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY p.id, p.name, p.sku, p.price
        ORDER BY sales DESC
      `);

      // Calculate total sales for percentage
      const totalSales = salesByProduct.rows.reduce((sum: number, product: any) => sum + Number(product.sales), 0);

      // Add percentage to each product
      return salesByProduct.rows.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0].url : null,
        sales: Math.round(Number(product.sales) * 100) / 100,
        quantity: Number(product.quantity),
        orderCount: Number(product.order_count),
        percentage: totalSales > 0 ? Math.round((Number(product.sales) / totalSales) * 100) : 0,
      }));
    } catch (error: any) {
      logger.error(`Error getting vendor sales by product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor sales by category
   */
  private async getVendorSalesByCategory(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    requestId?: string
  ): Promise<any[]> {
    const logger = createRequestLogger(requestId || 'vendor-sales-by-category');
    logger.info(`Getting sales by category for vendor ID: ${vendorId}`);

    try {
      // Get sales by category using raw SQL
      const salesByCategory = await this.orderRepository.db.execute(sql`
        SELECT 
          c.id,
          c.name,
          SUM(oi.price * oi.quantity) as sales,
          SUM(oi.quantity) as quantity,
          COUNT(DISTINCT o.id) as order_count
        FROM categories c
        JOIN products p ON c.id = p.category_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY c.id, c.name
        ORDER BY sales DESC
      `);

      // Calculate total sales for percentage
      const totalSales = salesByCategory.rows.reduce((sum: number, category: any) => sum + Number(category.sales), 0);

      // Add percentage to each category
      return salesByCategory.rows.map((category: any) => ({
        id: category.id,
        name: category.name,
        sales: Math.round(Number(category.sales) * 100) / 100,
        quantity: Number(category.quantity),
        orderCount: Number(category.order_count),
        percentage: totalSales > 0 ? Math.round((Number(category.sales) / totalSales) * 100) : 0,
      }));
    } catch (error: any) {
      logger.error(`Error getting vendor sales by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vendor sales by customer
   */
  private async getVendorSalesByCustomer(
    vendorId: string,
    startDate: Date,
    endDate: Date,
    requestId?: string
  ): Promise<any[]> {
    const logger = createRequestLogger(requestId || 'vendor-sales-by-customer');
    logger.info(`Getting sales by customer for vendor ID: ${vendorId}`);

    try {
      // Get sales by customer using raw SQL
      const salesByCustomer = await this.orderRepository.db.execute(sql`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          SUM(oi.price * oi.quantity) as sales,
          SUM(oi.quantity) as quantity,
          COUNT(DISTINCT o.id) as order_count
        FROM users u
        JOIN orders o ON u.id = o.user_id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.vendor_id = ${vendorId}
          AND o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY sales DESC
        LIMIT 20
      `);

      // Calculate total sales for percentage
      const totalSales = salesByCustomer.rows.reduce((sum: number, customer: any) => sum + Number(customer.sales), 0);

      // Add percentage to each customer
      return salesByCustomer.rows.map((customer: any) => ({
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        sales: Math.round(Number(customer.sales) * 100) / 100,
        quantity: Number(customer.quantity),
        orderCount: Number(customer.order_count),
        percentage: totalSales > 0 ? Math.round((Number(customer.sales) / totalSales) * 100) : 0,
      }));
    } catch (error: any) {
      logger.error(`Error getting vendor sales by customer: ${error.message}`);
      throw error;
    }
  }
}