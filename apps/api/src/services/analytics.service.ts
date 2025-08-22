import { eq, gte, lte, and, desc, count, sum, sql } from 'drizzle-orm';
import { 
  OrderRepository, 
  ProductRepository, 
  UserRepository, 
  LoyaltyRepository,
  OrderItemRepository,
  CategoryRepository,
  VendorRepository
} from '@packages/database';
import { CacheManager } from '@packages/cache';
import { 
  safeDecimalToNumber,
  calculateGrowthPercentage,
  safeGetCount,
  safeGetSum,
  safeGetAverage,
  getPreviousPeriodDates,
  formatOrderNumber,
  calculatePercentage,
  validateDateRange,
  getDateTruncFunction,
  createAnalyticsCacheKey
} from '@packages/shared/utils/analytics';
import { ApiError } from '@packages/shared/utils/api-error';
import { createRequestLogger } from '@packages/shared/utils/logger';
import { orders, orderItems, products, users, categories, vendors } from '@packages/database/schema';

// Cache TTL in seconds
const CACHE_TTL = {
  DASHBOARD_ANALYTICS: 1800, // 30 minutes
  SALES_ANALYTICS: 3600, // 1 hour
  PRODUCT_ANALYTICS: 3600, // 1 hour
  CUSTOMER_ANALYTICS: 3600, // 1 hour
  VENDOR_ANALYTICS: 3600, // 1 hour
  INVENTORY_ANALYTICS: 3600, // 1 hour
  MARKETING_ANALYTICS: 3600, // 1 hour
};

export interface AnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  compareWithPrevious?: boolean;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  groupBy?: 'product' | 'category' | 'vendor' | 'customer' | 'paymentMethod' | 'country';
}

export interface DashboardAnalytics {
  salesSummary: SalesAnalytics;
  customerSummary: CustomerSummary;
  productSummary: ProductSummary;
  orderSummary: OrderSummary;
  recentOrders: RecentOrderSummary[];
  topProducts: ProductSalesData[];
  salesByCategory: CategorySalesData[];
  salesByVendor: VendorSalesData[];
  salesTrend: SalesTrendData[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface SalesAnalytics {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  totalItems: number;
  growth: {
    totalSales: number;
    totalOrders: number;
    avgOrderValue: number;
    totalItems: number;
  };
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  retentionRate: number;
  growth: {
    newCustomers: number;
    activeCustomers: number;
    retentionRate: number;
  };
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  featuredProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
  newProducts: number;
  updatedProducts: number;
}

export interface OrderSummary {
  statusCounts: Record<string, number>;
  paymentCounts: {
    paid: number;
    unpaid: number;
    paidTotal: number;
    unpaidTotal: number;
  };
  totalOrders: number;
}

export interface RecentOrderSummary {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  itemCount: number;
}

export interface ProductSalesData {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string | null;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface CategorySalesData {
  id: string;
  name: string;
  sales: number;
  items: number;
  percentage: number;
}

export interface VendorSalesData {
  id: string;
  name: string;
  sales: number;
  items: number;
  percentage: number;
}

export interface SalesTrendData {
  date: Date;
  sales: number;
  orders: number;
  items: number;
}

export class AnalyticsService {
  constructor(
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
    private loyaltyRepository: LoyaltyRepository,
    private orderItemRepository: OrderItemRepository,
    private categoryRepository: CategoryRepository,
    private vendorRepository: VendorRepository,
    private cacheManager: CacheManager
  ) {}

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(
    options: AnalyticsOptions = {},
    requestId?: string
  ): Promise<DashboardAnalytics> {
    const logger = createRequestLogger(requestId || 'analytics-dashboard');
    logger.info('Getting dashboard analytics');

    // Set default options
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const compareWithPrevious = options.compareWithPrevious !== undefined ? options.compareWithPrevious : true;

    // Calculate previous period
    const { previousStartDate, previousEndDate } = getPreviousPeriodDates(startDate, endDate);

    // Try to get from cache
    const cacheKey = createAnalyticsCacheKey('dashboard_analytics', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      compareWithPrevious
    });

    const cachedData = await this.cacheManager.get<DashboardAnalytics>(cacheKey);
    if (cachedData) {
      logger.info('Retrieved dashboard analytics from cache');
      return cachedData;
    }

    try {
      // Get sales summary
      const salesSummary = await this.getSalesSummary(
        startDate,
        endDate,
        compareWithPrevious ? previousStartDate : null,
        compareWithPrevious ? previousEndDate : null,
        requestId
      );

      // Get customer summary
      const customerSummary = await this.getCustomerSummary(
        startDate,
        endDate,
        compareWithPrevious ? previousStartDate : null,
        compareWithPrevious ? previousEndDate : null,
        requestId
      );

      // Get product summary
      const productSummary = await this.getProductSummary(startDate, endDate, requestId);

      // Get order summary
      const orderSummary = await this.getOrderSummary(startDate, endDate, requestId);

      // Get recent orders
      const recentOrders = await this.getRecentOrders(10, requestId);

      // Get top products
      const topProducts = await this.getTopProducts(5, startDate, endDate, requestId);

      // Get sales by category
      const salesByCategory = await this.getSalesByCategory(startDate, endDate, requestId);

      // Get sales by vendor
      const salesByVendor = await this.getSalesByVendor(startDate, endDate, requestId);

      // Get sales trend
      const salesTrend = await this.getSalesTrend(startDate, endDate, 'daily', requestId);

      // Compile dashboard data
      const dashboardData: DashboardAnalytics = {
        salesSummary,
        customerSummary,
        productSummary,
        orderSummary,
        recentOrders,
        topProducts,
        salesByCategory,
        salesByVendor,
        salesTrend,
        period: {
          startDate,
          endDate,
        },
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, dashboardData, CACHE_TTL.DASHBOARD_ANALYTICS);

      return dashboardData;
    } catch (error: any) {
      logger.error(`Error getting dashboard analytics: ${error.message}`);
      throw new ApiError(`Failed to get dashboard analytics: ${error.message}`, 500);
    }
  }

  /**
   * Get sales summary
   */
  private async getSalesSummary(
    startDate: Date,
    endDate: Date,
    previousStartDate: Date | null,
    previousEndDate: Date | null,
    requestId?: string
  ): Promise<SalesAnalytics> {
    const logger = createRequestLogger(requestId || 'analytics-sales-summary');
    logger.info('Getting sales summary');

    try {
      // Get current period sales data
      const currentSales = await this.orderRepository.db
        .select({
          totalSales: sum(orders.totalAmount),
          orderCount: count(orders.id),
          avgOrderValue: sql<number>`AVG(${orders.totalAmount})`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            sql`${orders.status} IN ('DELIVERED', 'SHIPPED')`
          )
        );

      // Get order items count for current period
      const currentOrderItems = await this.orderItemRepository.db
        .select({
          totalItems: sum(orderItems.quantity),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            sql`${orders.status} IN ('DELIVERED', 'SHIPPED')`
          )
        );

      // Default values if no sales
      const currentPeriod = {
        totalSales: Number(currentSales[0]?.totalSales) || 0,
        totalOrders: Number(currentSales[0]?.orderCount) || 0,
        avgOrderValue: Number(currentSales[0]?.avgOrderValue) || 0,
        totalItems: Number(currentOrderItems[0]?.totalItems) || 0,
      };

      // Calculate growth if previous period dates are provided
      let growth = {
        totalSales: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        totalItems: 0,
      };

      if (previousStartDate && previousEndDate) {
        // Get previous period sales data
        const previousSales = await this.orderRepository.db
          .select({
            totalSales: sum(orders.totalAmount),
            orderCount: count(orders.id),
            avgOrderValue: sql<number>`AVG(${orders.totalAmount})`,
          })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, previousStartDate),
              lte(orders.createdAt, previousEndDate),
              sql`${orders.status} IN ('DELIVERED', 'SHIPPED')`
            )
          );

        const previousOrderItems = await this.orderItemRepository.db
          .select({
            totalItems: sum(orderItems.quantity),
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(
            and(
              gte(orders.createdAt, previousStartDate),
              lte(orders.createdAt, previousEndDate),
              sql`${orders.status} IN ('DELIVERED', 'SHIPPED')`
            )
          );

        const previousPeriod = {
          totalSales: Number(previousSales[0]?.totalSales) || 0,
          totalOrders: Number(previousSales[0]?.orderCount) || 0,
          avgOrderValue: Number(previousSales[0]?.avgOrderValue) || 0,
          totalItems: Number(previousOrderItems[0]?.totalItems) || 0,
        };

        // Calculate growth percentages
        growth = {
          totalSales: calculateGrowthPercentage(currentPeriod.totalSales, previousPeriod.totalSales),
          totalOrders: calculateGrowthPercentage(currentPeriod.totalOrders, previousPeriod.totalOrders),
          avgOrderValue: calculateGrowthPercentage(currentPeriod.avgOrderValue, previousPeriod.avgOrderValue),
          totalItems: calculateGrowthPercentage(currentPeriod.totalItems, previousPeriod.totalItems),
        };
      }

      return {
        ...currentPeriod,
        growth,
      };
    } catch (error: any) {
      logger.error(`Error getting sales summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get customer summary
   */
  private async getCustomerSummary(
    startDate: Date,
    endDate: Date,
    previousStartDate: Date | null,
    previousEndDate: Date | null,
    requestId?: string
  ): Promise<CustomerSummary> {
    const logger = createRequestLogger(requestId || 'analytics-customer-summary');
    logger.info('Getting customer summary');

    try {
      // Get total customers
      const totalCustomers = await this.userRepository.db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, 'CUSTOMER'));

      // Get new customers in current period
      const newCustomers = await this.userRepository.db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role, 'CUSTOMER'),
            gte(users.createdAt, startDate),
            lte(users.createdAt, endDate)
          )
        );

      // Get active customers (customers who placed an order in the period)
      const activeCustomers = await this.userRepository.db
        .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
        .from(users)
        .innerJoin(orders, eq(users.id, orders.userId))
        .where(
          and(
            eq(users.role, 'CUSTOMER'),
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate),
            sql`${orders.status} IN ('DELIVERED', 'SHIPPED')`
          )
        );

      // Calculate customer retention rate
      const customersBeforePeriod = await this.userRepository.db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role, 'CUSTOMER'),
            sql`${users.createdAt} < ${startDate}`
          )
        );

      const retentionRate = customersBeforePeriod[0]?.count > 0 
        ? Math.round((activeCustomers[0]?.count / customersBeforePeriod[0].count) * 100) 
        : 0;

      // Calculate growth if previous period dates are provided
      let growth = {
        newCustomers: 0,
        activeCustomers: 0,
        retentionRate: 0,
      };

      if (previousStartDate && previousEndDate) {
        // Get new customers in previous period
        const previousNewCustomers = await this.userRepository.db
          .select({ count: count() })
          .from(users)
          .where(
            and(
              eq(users.role, 'CUSTOMER'),
              gte(users.createdAt, previousStartDate),
              lte(users.createdAt, previousEndDate)
            )
          );

        // Get active customers in previous period
        const previousActiveCustomers = await this.userRepository.db
          .select({ count: sql<number>`COUNT(DISTINCT ${users.id})` })
          .from(users)
          .innerJoin(orders, eq(users.id, orders.userId))
          .where(
            and(
              eq(users.role, 'CUSTOMER'),
              gte(orders.createdAt, previousStartDate),
              lte(orders.createdAt, previousEndDate),
              sql`${orders.status} IN ('DELIVERED', 'SHIPPED')`
            )
          );

        // Calculate previous retention rate
        const customersBeforePreviousPeriod = await this.userRepository.db
          .select({ count: count() })
          .from(users)
          .where(
            and(
              eq(users.role, 'CUSTOMER'),
              sql`${users.createdAt} < ${previousStartDate}`
            )
          );

        const previousRetentionRate = customersBeforePreviousPeriod[0]?.count > 0
          ? Math.round((previousActiveCustomers[0]?.count / customersBeforePreviousPeriod[0].count) * 100)
          : 0;

        // Calculate growth percentages
        growth = {
          newCustomers: calculateGrowthPercentage(newCustomers[0]?.count || 0, previousNewCustomers[0]?.count || 0),
          activeCustomers: calculateGrowthPercentage(activeCustomers[0]?.count || 0, previousActiveCustomers[0]?.count || 0),
          retentionRate: calculateGrowthPercentage(retentionRate, previousRetentionRate),
        };
      }

      return {
        totalCustomers: totalCustomers[0]?.count || 0,
        newCustomers: newCustomers[0]?.count || 0,
        activeCustomers: activeCustomers[0]?.count || 0,
        retentionRate,
        growth,
      };
    } catch (error: any) {
      logger.error(`Error getting customer summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get product summary
   */
  private async getProductSummary(startDate: Date, endDate: Date, requestId?: string): Promise<ProductSummary> {
    const logger = createRequestLogger(requestId || 'analytics-product-summary');
    logger.info('Getting product summary');

    try {
      // Get product counts
      const totalProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products);

      const activeProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(eq(products.active, true));

      const featuredProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(eq(products.featured, true));

      const lowStockProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            sql`${products.quantity} > 0`,
            sql`${products.quantity} <= 5`
          )
        );

      const outOfStockProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(sql`${products.quantity} <= 0`);

      // Get inventory value
      const inventoryValue = await this.productRepository.db
        .select({ total: sum(products.price) })
        .from(products)
        .where(eq(products.active, true));

      // Get new products in period
      const newProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            gte(products.createdAt, startDate),
            lte(products.createdAt, endDate)
          )
        );

      // Get updated products in period
      const updatedProducts = await this.productRepository.db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            gte(products.updatedAt, startDate),
            lte(products.updatedAt, endDate),
            sql`${products.createdAt} < ${startDate}`
          )
        );

      return {
        totalProducts: totalProducts[0]?.count || 0,
        activeProducts: activeProducts[0]?.count || 0,
        featuredProducts: featuredProducts[0]?.count || 0,
        lowStockProducts: lowStockProducts[0]?.count || 0,
        outOfStockProducts: outOfStockProducts[0]?.count || 0,
        inventoryValue: Number(inventoryValue[0]?.total) || 0,
        newProducts: newProducts[0]?.count || 0,
        updatedProducts: updatedProducts[0]?.count || 0,
      };
    } catch (error: any) {
      logger.error(`Error getting product summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get order summary
   */
  private async getOrderSummary(startDate: Date, endDate: Date, requestId?: string): Promise<OrderSummary> {
    const logger = createRequestLogger(requestId || 'analytics-order-summary');
    logger.info('Getting order summary');

    try {
      // Get order counts by status
      const ordersByStatus = await this.orderRepository.db
        .select({
          status: orders.status,
          count: count(),
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate)
          )
        )
        .groupBy(orders.status);

      // Convert to object
      const statusCounts: Record<string, number> = {
        PENDING: 0,
        PROCESSING: 0,
        SHIPPED: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      };

      ordersByStatus.forEach((item) => {
        statusCounts[item.status] = item.count;
      });

      // Get payment stats
      const paymentStats = await this.orderRepository.db
        .select({
          paymentStatus: orders.paymentStatus,
          count: count(),
          total: sum(orders.totalAmount),
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate)
          )
        )
        .groupBy(orders.paymentStatus);

      // Convert to object
      const paymentCounts = {
        paid: 0,
        unpaid: 0,
        paidTotal: 0,
        unpaidTotal: 0,
      };

      paymentStats.forEach((item) => {
        if (item.paymentStatus === 'COMPLETED') {
          paymentCounts.paid = item.count;
          paymentCounts.paidTotal = Number(item.total) || 0;
        } else {
          paymentCounts.unpaid = item.count;
          paymentCounts.unpaidTotal = Number(item.total) || 0;
        }
      });

      return {
        statusCounts,
        paymentCounts,
        totalOrders: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      };
    } catch (error: any) {
      logger.error(`Error getting order summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent orders
   */
  private async getRecentOrders(limit: number, requestId?: string): Promise<RecentOrderSummary[]> {
    const logger = createRequestLogger(requestId || 'analytics-recent-orders');
    logger.info(`Getting recent orders, limit: ${limit}`);

    try {
      const recentOrders = await this.orderRepository.db
        .select({
          id: orders.id,
          totalAmount: orders.totalAmount,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
          userId: orders.userId,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      // Get item counts for each order
      const orderIds = recentOrders.map(order => order.id);
      const itemCounts = await this.orderItemRepository.db
        .select({
          orderId: orderItems.orderId,
          itemCount: sum(orderItems.quantity),
        })
        .from(orderItems)
        .where(sql`${orderItems.orderId} IN ${orderIds}`)
        .groupBy(orderItems.orderId);

      const itemCountMap = new Map(itemCounts.map(item => [item.orderId, Number(item.itemCount)]));

      return recentOrders.map((order) => ({
        id: order.id,
        orderNumber: formatOrderNumber(order.id),
        customer: order.userId
          ? {
              id: order.userId,
              name: `${order.userFirstName} ${order.userLastName}`,
              email: order.userEmail,
            }
          : null,
        totalAmount: safeDecimalToNumber(order.totalAmount),
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemCount: itemCountMap.get(order.id) || 0,
      }));
    } catch (error: any) {
      logger.error(`Error getting recent orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top products
   */
  private async getTopProducts(limit: number, startDate: Date, endDate: Date, requestId?: string): Promise<ProductSalesData[]> {
    const logger = createRequestLogger(requestId || 'analytics-top-products');
    logger.info(`Getting top products, limit: ${limit}`);

    try {
      // Get top selling products by quantity using raw SQL for better performance
      const topProducts = await this.orderItemRepository.db.execute(sql`
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
        WHERE o.created_at >= ${startDate}
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
        revenue: Number(product.revenue),
        orderCount: Number(product.order_count),
      }));
    } catch (error: any) {
      logger.error(`Error getting top products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sales by category
   */
  private async getSalesByCategory(startDate: Date, endDate: Date, requestId?: string): Promise<CategorySalesData[]> {
    const logger = createRequestLogger(requestId || 'analytics-sales-category');
    logger.info('Getting sales by category');

    try {
      // Get sales by category using raw SQL
      const salesByCategory = await this.orderItemRepository.db.execute(sql`
        SELECT 
          c.id,
          c.name,
          SUM(oi.price * oi.quantity) as sales,
          SUM(oi.quantity) as items
        FROM categories c
        JOIN products p ON c.id = p.category_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY c.id, c.name
        ORDER BY sales DESC
      `);

      const results = salesByCategory.rows.map((category: any) => ({
        id: category.id,
        name: category.name,
        sales: Number(category.sales),
        items: Number(category.items),
        percentage: 0, // Will be calculated below
      }));

      // Calculate total sales for percentage
      const totalSales = results.reduce((sum, category) => sum + category.sales, 0);

      // Add percentage to each category
      return results.map((category) => ({
        ...category,
        percentage: calculatePercentage(category.sales, totalSales),
      }));
    } catch (error: any) {
      logger.error(`Error getting sales by category: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sales by vendor
   */
  private async getSalesByVendor(startDate: Date, endDate: Date, requestId?: string): Promise<VendorSalesData[]> {
    const logger = createRequestLogger(requestId || 'analytics-sales-vendor');
    logger.info('Getting sales by vendor');

    try {
      // Get sales by vendor using raw SQL
      const salesByVendor = await this.orderItemRepository.db.execute(sql`
        SELECT 
          v.id,
          v.business_name as name,
          SUM(oi.price * oi.quantity) as sales,
          SUM(oi.quantity) as items
        FROM vendors v
        JOIN products p ON v.id = p.vendor_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.created_at >= ${startDate}
          AND o.created_at <= ${endDate}
          AND o.status IN ('DELIVERED', 'SHIPPED')
        GROUP BY v.id, v.business_name
        ORDER BY sales DESC
      `);

      const results = salesByVendor.rows.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name,
        sales: Number(vendor.sales),
        items: Number(vendor.items),
        percentage: 0, // Will be calculated below
      }));

      // Calculate total sales for percentage
      const totalSales = results.reduce((sum, vendor) => sum + vendor.sales, 0);

      // Add percentage to each vendor
      return results.map((vendor) => ({
        ...vendor,
        percentage: calculatePercentage(vendor.sales, totalSales),
      }));
    } catch (error: any) {
      logger.error(`Error getting sales by vendor: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sales trend
   */
  private async getSalesTrend(
    startDate: Date,
    endDate: Date,
    interval: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    requestId?: string
  ): Promise<SalesTrendData[]> {
    const logger = createRequestLogger(requestId || 'analytics-sales-trend');
    logger.info(`Getting sales trend with interval: ${interval}`);

    try {
      const truncFunction = getDateTruncFunction(interval);

      // Use raw SQL for date truncation
      const salesTrend = await this.orderRepository.db.execute(sql`
        SELECT 
          DATE_TRUNC(${truncFunction}, created_at) as date,
          SUM(total_amount) as sales,
          COUNT(*) as orders,
          SUM((
            SELECT SUM(quantity) 
            FROM order_items 
            WHERE order_id = orders.id
          )) as items
        FROM orders
        WHERE created_at >= ${startDate}
          AND created_at <= ${endDate}
          AND status IN ('DELIVERED', 'SHIPPED')
        GROUP BY DATE_TRUNC(${truncFunction}, created_at)
        ORDER BY date ASC
      `);

      return salesTrend.rows.map((item: any) => ({
        date: item.date,
        sales: Number(item.sales) || 0,
        orders: Number(item.orders) || 0,
        items: Number(item.items) || 0,
      }));
    } catch (error: any) {
      logger.error(`Error getting sales trend: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed sales analytics
   */
  async getSalesAnalytics(
    options: AnalyticsOptions = {},
    requestId?: string
  ): Promise<any> {
    const logger = createRequestLogger(requestId || 'analytics-sales-detailed');
    logger.info('Getting detailed sales analytics');

    // Set default options
    const endDate = options.endDate || new Date();
    const startDate = options.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const interval = options.interval || 'daily';
    const compareWithPrevious = options.compareWithPrevious !== undefined ? options.compareWithPrevious : true;
    const groupBy = options.groupBy || 'product';

    // Calculate previous period
    const { previousStartDate, previousEndDate } = getPreviousPeriodDates(startDate, endDate);

    // Try to get from cache
    const cacheKey = createAnalyticsCacheKey('sales_analytics', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      interval,
      compareWithPrevious,
      groupBy
    });

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      logger.info('Retrieved sales analytics from cache');
      return cachedData;
    }

    try {
      // Get sales trend
      const salesTrend = await this.getSalesTrend(startDate, endDate, interval, requestId);

      // Get previous period sales trend if needed
      let previousSalesTrend = null;
      if (compareWithPrevious) {
        previousSalesTrend = await this.getSalesTrend(previousStartDate, previousEndDate, interval, requestId);
      }

      // Get sales summary
      const salesSummary = await this.getSalesSummary(
        startDate, 
        endDate, 
        compareWithPrevious ? previousStartDate : null, 
        compareWithPrevious ? previousEndDate : null, 
        requestId
      );

      // Get grouped sales data
      let groupedSales = [];
      if (groupBy === 'product') {
        groupedSales = await this.getTopProducts(100, startDate, endDate, requestId);
      } else if (groupBy === 'category') {
        groupedSales = await this.getSalesByCategory(startDate, endDate, requestId);
      } else if (groupBy === 'vendor') {
        groupedSales = await this.getSalesByVendor(startDate, endDate, requestId);
      }

      // Compile sales analytics
      const salesAnalytics = {
        summary: salesSummary,
        trend: {
          current: salesTrend,
          previous: previousSalesTrend,
        },
        groupedSales,
        period: {
          startDate,
          endDate,
        },
        options: {
          interval,
          groupBy,
          compareWithPrevious,
        },
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, salesAnalytics, CACHE_TTL.SALES_ANALYTICS);

      return salesAnalytics;
    } catch (error: any) {
      logger.error(`Error getting sales analytics: ${error.message}`);
      throw new ApiError(`Failed to get sales analytics: ${error.message}`, 500);
    }
  }
}