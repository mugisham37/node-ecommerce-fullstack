import { eq, and, or, desc, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import { 
  vendors, 
  vendorAnalytics, 
  vendorProductAnalytics, 
  vendorPayouts, 
  vendorReviews,
  vendorPerformanceMetrics,
  Vendor,
  NewVendor,
  VendorAnalytics,
  NewVendorAnalytics,
  VendorProductAnalytics,
  NewVendorProductAnalytics,
  VendorPayout,
  NewVendorPayout,
  VendorReview,
  NewVendorReview,
  VendorPerformanceMetrics,
  NewVendorPerformanceMetrics,
  VendorStatus,
  PayoutStatus,
  ReviewStatus
} from '../schema/vendor-analytics';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';

export interface VendorFilters extends FilterOptions {
  businessName?: string;
  email?: string;
  status?: string;
  isVerified?: boolean;
  search?: string;
}

export interface VendorAnalyticsFilters extends FilterOptions {
  vendorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PayoutFilters extends FilterOptions {
  vendorId?: string;
  status?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface ReviewFilters extends FilterOptions {
  vendorId?: string;
  userId?: string;
  rating?: number;
  status?: string;
  isVerifiedPurchase?: boolean;
}

export interface VendorWithStats extends Vendor {
  analytics?: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  recentReviews?: VendorReview[];
}

export interface VendorDashboardData {
  vendor: Vendor;
  todayStats: {
    sales: number;
    orders: number;
    visitors: number;
    conversionRate: number;
  };
  monthlyStats: {
    sales: number;
    orders: number;
    customers: number;
    averageOrderValue: number;
  };
  topProducts: Array<{
    productId: string;
    sales: number;
    orders: number;
    views: number;
  }>;
  recentReviews: VendorReview[];
  payoutSummary: {
    pendingAmount: number;
    nextPayoutDate: Date | null;
    lastPayoutAmount: number;
  };
}

/**
 * Repository for vendors
 */
export class VendorRepository extends BaseRepository<
  typeof vendors,
  Vendor,
  NewVendor
> {
  protected table = vendors;
  protected tableName = 'vendors';

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
   * Find vendor by slug
   */
  async findBySlug(slug: string): Promise<Vendor | null> {
    return await this.findOneBy({ slug });
  }

  /**
   * Find vendor by email
   */
  async findByEmail(email: string): Promise<Vendor | null> {
    return await this.findOneBy({ email });
  }

  /**
   * Find verified vendors
   */
  async findVerifiedVendors(): Promise<Vendor[]> {
    return await this.findBy({ isVerified: true, status: VendorStatus.APPROVED });
  }

  /**
   * Search vendors with filters
   */
  async searchVendors(
    filters: VendorFilters,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PagedResult<Vendor>> {
    if (filters.search) {
      return await this.search(
        {
          query: filters.search,
          searchFields: ['businessName', 'email', 'description'],
        },
        pagination,
        { 
          status: filters.status,
          isVerified: filters.isVerified 
        }
      );
    }

    return await this.findAll(pagination, filters);
  }

  /**
   * Get vendor with statistics
   */
  async getVendorWithStats(vendorId: string): Promise<VendorWithStats | null> {
    const vendor = await this.findById(vendorId);
    if (!vendor) return null;

    return await this.executeKyselyQuery(async (db) => {
      // Get analytics summary
      const analytics = await db
        .selectFrom('vendor_analytics')
        .select([
          db.fn.sum('total_sales').as('totalSales'),
          db.fn.sum('total_orders').as('totalOrders'),
          db.fn.avg('average_order_value').as('averageOrderValue'),
          db.fn.avg('conversion_rate').as('conversionRate'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
        .executeTakeFirst();

      // Get recent reviews
      const recentReviews = await db
        .selectFrom('vendor_reviews')
        .selectAll()
        .where('vendor_id', '=', vendorId)
        .where('status', '=', ReviewStatus.PUBLISHED)
        .orderBy('created_at', 'desc')
        .limit(5)
        .execute();

      return {
        ...vendor,
        analytics: analytics ? {
          totalSales: Number(analytics.totalSales) || 0,
          totalOrders: Number(analytics.totalOrders) || 0,
          averageOrderValue: Number(analytics.averageOrderValue) || 0,
          conversionRate: Number(analytics.conversionRate) || 0,
        } : undefined,
        recentReviews: recentReviews.map(review => ({
          id: review.id,
          vendorId: review.vendor_id,
          userId: review.user_id,
          orderId: review.order_id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          communicationRating: review.communication_rating,
          shippingRating: review.shipping_rating,
          qualityRating: review.quality_rating,
          status: review.status,
          isVerifiedPurchase: review.is_verified_purchase,
          moderatedBy: review.moderated_by,
          moderatedAt: review.moderated_at,
          moderationNotes: review.moderation_notes,
          vendorResponse: review.vendor_response,
          vendorResponseAt: review.vendor_response_at,
          helpfulVotes: review.helpful_votes,
          totalVotes: review.total_votes,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
        })),
      } as VendorWithStats;
    });
  }

  /**
   * Update vendor performance metrics
   */
  async updatePerformanceMetrics(vendorId: string, metrics: {
    ratingAverage?: number;
    ratingCount?: number;
    totalSales?: number;
    totalOrders?: number;
    totalProducts?: number;
  }): Promise<Vendor | null> {
    return await this.update(vendorId, {
      ...metrics,
      updatedAt: new Date(),
    });
  }

  /**
   * Get vendor dashboard data
   */
  async getVendorDashboardData(vendorId: string): Promise<VendorDashboardData | null> {
    const vendor = await this.findById(vendorId);
    if (!vendor) return null;

    return await this.executeKyselyQuery(async (db) => {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's stats
      const todayStats = await db
        .selectFrom('vendor_analytics')
        .select([
          db.fn.sum('total_sales').as('sales'),
          db.fn.sum('total_orders').as('orders'),
          db.fn.sum('unique_visitors').as('visitors'),
          db.fn.avg('conversion_rate').as('conversionRate'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '=', startOfToday)
        .executeTakeFirst();

      // Monthly stats
      const monthlyStats = await db
        .selectFrom('vendor_analytics')
        .select([
          db.fn.sum('total_sales').as('sales'),
          db.fn.sum('total_orders').as('orders'),
          db.fn.sum('unique_customers').as('customers'),
          db.fn.avg('average_order_value').as('averageOrderValue'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', startOfMonth)
        .executeTakeFirst();

      // Top products
      const topProducts = await db
        .selectFrom('vendor_product_analytics')
        .select([
          'product_id as productId',
          db.fn.sum('sales').as('sales'),
          db.fn.sum('orders').as('orders'),
          db.fn.sum('views').as('views'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', startOfMonth)
        .groupBy('product_id')
        .orderBy('sales', 'desc')
        .limit(5)
        .execute();

      // Recent reviews
      const recentReviews = await db
        .selectFrom('vendor_reviews')
        .selectAll()
        .where('vendor_id', '=', vendorId)
        .orderBy('created_at', 'desc')
        .limit(5)
        .execute();

      // Payout summary
      const payoutSummary = await db
        .selectFrom('vendor_payouts')
        .select([
          db.fn.sum('net_amount').filterWhere('status', '=', PayoutStatus.PENDING).as('pendingAmount'),
          db.fn.max('processed_at').as('lastPayoutDate'),
        ])
        .where('vendor_id', '=', vendorId)
        .executeTakeFirst();

      const lastPayout = await db
        .selectFrom('vendor_payouts')
        .select('net_amount')
        .where('vendor_id', '=', vendorId)
        .where('status', '=', PayoutStatus.COMPLETED)
        .orderBy('processed_at', 'desc')
        .executeTakeFirst();

      return {
        vendor,
        todayStats: {
          sales: Number(todayStats?.sales) || 0,
          orders: Number(todayStats?.orders) || 0,
          visitors: Number(todayStats?.visitors) || 0,
          conversionRate: Number(todayStats?.conversionRate) || 0,
        },
        monthlyStats: {
          sales: Number(monthlyStats?.sales) || 0,
          orders: Number(monthlyStats?.orders) || 0,
          customers: Number(monthlyStats?.customers) || 0,
          averageOrderValue: Number(monthlyStats?.averageOrderValue) || 0,
        },
        topProducts: topProducts.map(product => ({
          productId: product.productId,
          sales: Number(product.sales) || 0,
          orders: Number(product.orders) || 0,
          views: Number(product.views) || 0,
        })),
        recentReviews: recentReviews.map(review => ({
          id: review.id,
          vendorId: review.vendor_id,
          userId: review.user_id,
          orderId: review.order_id,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          communicationRating: review.communication_rating,
          shippingRating: review.shipping_rating,
          qualityRating: review.quality_rating,
          status: review.status,
          isVerifiedPurchase: review.is_verified_purchase,
          moderatedBy: review.moderated_by,
          moderatedAt: review.moderated_at,
          moderationNotes: review.moderation_notes,
          vendorResponse: review.vendor_response,
          vendorResponseAt: review.vendor_response_at,
          helpfulVotes: review.helpful_votes,
          totalVotes: review.total_votes,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
        })),
        payoutSummary: {
          pendingAmount: Number(payoutSummary?.pendingAmount) || 0,
          nextPayoutDate: null, // Would need business logic to calculate
          lastPayoutAmount: Number(lastPayout?.net_amount) || 0,
        },
      } as VendorDashboardData;
    });
  }
}/**
 * Re
pository for vendor analytics
 */
export class VendorAnalyticsRepository extends BaseRepository<
  typeof vendorAnalytics,
  VendorAnalytics,
  NewVendorAnalytics
> {
  protected table = vendorAnalytics;
  protected tableName = 'vendor_analytics';

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
   * Get analytics for vendor and date range
   */
  async getAnalyticsByDateRange(
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VendorAnalytics[]> {
    return await this.executeKyselyQuery(async (db) => {
      const analytics = await db
        .selectFrom('vendor_analytics')
        .selectAll()
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'asc')
        .execute();

      return analytics.map(a => ({
        id: a.id,
        vendorId: a.vendor_id,
        date: a.date,
        totalSales: a.total_sales,
        totalOrders: a.total_orders,
        totalItems: a.total_items,
        averageOrderValue: a.average_order_value,
        totalCommission: a.total_commission,
        netRevenue: a.net_revenue,
        uniqueCustomers: a.unique_customers,
        newCustomers: a.new_customers,
        returningCustomers: a.returning_customers,
        productsViewed: a.products_viewed,
        productsAddedToCart: a.products_added_to_cart,
        conversionRate: a.conversion_rate,
        pageViews: a.page_views,
        uniqueVisitors: a.unique_visitors,
        bounceRate: a.bounce_rate,
        refunds: a.refunds,
        refundCount: a.refund_count,
        cancellations: a.cancellations,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      }));
    });
  }

  /**
   * Create or update daily analytics
   */
  async upsertDailyAnalytics(vendorId: string, date: Date, data: Partial<VendorAnalytics>): Promise<VendorAnalytics> {
    return await this.executeKyselyQuery(async (db) => {
      const existing = await db
        .selectFrom('vendor_analytics')
        .selectAll()
        .where('vendor_id', '=', vendorId)
        .where('date', '=', date)
        .executeTakeFirst();

      if (existing) {
        const updated = await db
          .updateTable('vendor_analytics')
          .set({
            ...data,
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .returningAll()
          .executeTakeFirst();

        return {
          id: updated!.id,
          vendorId: updated!.vendor_id,
          date: updated!.date,
          totalSales: updated!.total_sales,
          totalOrders: updated!.total_orders,
          totalItems: updated!.total_items,
          averageOrderValue: updated!.average_order_value,
          totalCommission: updated!.total_commission,
          netRevenue: updated!.net_revenue,
          uniqueCustomers: updated!.unique_customers,
          newCustomers: updated!.new_customers,
          returningCustomers: updated!.returning_customers,
          productsViewed: updated!.products_viewed,
          productsAddedToCart: updated!.products_added_to_cart,
          conversionRate: updated!.conversion_rate,
          pageViews: updated!.page_views,
          uniqueVisitors: updated!.unique_visitors,
          bounceRate: updated!.bounce_rate,
          refunds: updated!.refunds,
          refundCount: updated!.refund_count,
          cancellations: updated!.cancellations,
          createdAt: updated!.created_at,
          updatedAt: updated!.updated_at,
        } as VendorAnalytics;
      } else {
        const created = await db
          .insertInto('vendor_analytics')
          .values({
            vendor_id: vendorId,
            date,
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        return {
          id: created!.id,
          vendorId: created!.vendor_id,
          date: created!.date,
          totalSales: created!.total_sales,
          totalOrders: created!.total_orders,
          totalItems: created!.total_items,
          averageOrderValue: created!.average_order_value,
          totalCommission: created!.total_commission,
          netRevenue: created!.net_revenue,
          uniqueCustomers: created!.unique_customers,
          newCustomers: created!.new_customers,
          returningCustomers: created!.returning_customers,
          productsViewed: created!.products_viewed,
          productsAddedToCart: created!.products_added_to_cart,
          conversionRate: created!.conversion_rate,
          pageViews: created!.page_views,
          uniqueVisitors: created!.unique_visitors,
          bounceRate: created!.bounce_rate,
          refunds: created!.refunds,
          refundCount: created!.refund_count,
          cancellations: created!.cancellations,
          createdAt: created!.created_at,
          updatedAt: created!.updated_at,
        } as VendorAnalytics;
      }
    });
  }

  /**
   * Get aggregated analytics summary
   */
  async getAnalyticsSummary(vendorId: string, days: number = 30): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
    conversionRate: number;
    growthRate: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

      const currentPeriod = await db
        .selectFrom('vendor_analytics')
        .select([
          db.fn.sum('total_sales').as('totalSales'),
          db.fn.sum('total_orders').as('totalOrders'),
          db.fn.avg('average_order_value').as('averageOrderValue'),
          db.fn.sum('unique_customers').as('totalCustomers'),
          db.fn.avg('conversion_rate').as('conversionRate'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .executeTakeFirst();

      const previousPeriod = await db
        .selectFrom('vendor_analytics')
        .select([
          db.fn.sum('total_sales').as('totalSales'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', previousStartDate)
        .where('date', '<', startDate)
        .executeTakeFirst();

      const currentSales = Number(currentPeriod?.totalSales) || 0;
      const previousSales = Number(previousPeriod?.totalSales) || 0;
      const growthRate = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0;

      return {
        totalSales: currentSales,
        totalOrders: Number(currentPeriod?.totalOrders) || 0,
        averageOrderValue: Number(currentPeriod?.averageOrderValue) || 0,
        totalCustomers: Number(currentPeriod?.totalCustomers) || 0,
        conversionRate: Number(currentPeriod?.conversionRate) || 0,
        growthRate,
      };
    });
  }
}

/**
 * Repository for vendor product analytics
 */
export class VendorProductAnalyticsRepository extends BaseRepository<
  typeof vendorProductAnalytics,
  VendorProductAnalytics,
  NewVendorProductAnalytics
> {
  protected table = vendorProductAnalytics;
  protected tableName = 'vendor_product_analytics';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
      },
    });
  }

  /**
   * Get top performing products
   */
  async getTopProducts(vendorId: string, days: number = 30, limit: number = 10): Promise<Array<{
    productId: string;
    totalSales: number;
    totalOrders: number;
    totalViews: number;
    conversionRate: number;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const products = await db
        .selectFrom('vendor_product_analytics')
        .select([
          'product_id as productId',
          db.fn.sum('sales').as('totalSales'),
          db.fn.sum('orders').as('totalOrders'),
          db.fn.sum('views').as('totalViews'),
          db.fn.avg('conversion_rate').as('conversionRate'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('date', '>=', startDate)
        .groupBy('product_id')
        .orderBy('totalSales', 'desc')
        .limit(limit)
        .execute();

      return products.map(product => ({
        productId: product.productId,
        totalSales: Number(product.totalSales) || 0,
        totalOrders: Number(product.totalOrders) || 0,
        totalViews: Number(product.totalViews) || 0,
        conversionRate: Number(product.conversionRate) || 0,
      }));
    });
  }

  /**
   * Upsert product analytics
   */
  async upsertProductAnalytics(
    vendorId: string,
    productId: string,
    date: Date,
    data: Partial<VendorProductAnalytics>
  ): Promise<VendorProductAnalytics> {
    return await this.executeKyselyQuery(async (db) => {
      const existing = await db
        .selectFrom('vendor_product_analytics')
        .selectAll()
        .where('vendor_id', '=', vendorId)
        .where('product_id', '=', productId)
        .where('date', '=', date)
        .executeTakeFirst();

      if (existing) {
        const updated = await db
          .updateTable('vendor_product_analytics')
          .set(data)
          .where('id', '=', existing.id)
          .returningAll()
          .executeTakeFirst();

        return {
          id: updated!.id,
          vendorId: updated!.vendor_id,
          productId: updated!.product_id,
          date: updated!.date,
          sales: updated!.sales,
          orders: updated!.orders,
          quantity: updated!.quantity,
          views: updated!.views,
          uniqueViews: updated!.unique_views,
          addToCart: updated!.add_to_cart,
          conversionRate: updated!.conversion_rate,
          cartConversionRate: updated!.cart_conversion_rate,
          stockLevel: updated!.stock_level,
          stockOuts: updated!.stock_outs,
          createdAt: updated!.created_at,
        } as VendorProductAnalytics;
      } else {
        const created = await db
          .insertInto('vendor_product_analytics')
          .values({
            vendor_id: vendorId,
            product_id: productId,
            date,
            ...data,
            created_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        return {
          id: created!.id,
          vendorId: created!.vendor_id,
          productId: created!.product_id,
          date: created!.date,
          sales: created!.sales,
          orders: created!.orders,
          quantity: created!.quantity,
          views: created!.views,
          uniqueViews: created!.unique_views,
          addToCart: created!.add_to_cart,
          conversionRate: created!.conversion_rate,
          cartConversionRate: created!.cart_conversion_rate,
          stockLevel: created!.stock_level,
          stockOuts: created!.stock_outs,
          createdAt: created!.created_at,
        } as VendorProductAnalytics;
      }
    });
  }
}

/**
 * Repository for vendor payouts
 */
export class VendorPayoutRepository extends BaseRepository<
  typeof vendorPayouts,
  VendorPayout,
  NewVendorPayout
> {
  protected table = vendorPayouts;
  protected tableName = 'vendor_payouts';

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
   * Find payout by number
   */
  async findByPayoutNumber(payoutNumber: string): Promise<VendorPayout | null> {
    return await this.findOneBy({ payoutNumber });
  }

  /**
   * Get pending payouts for vendor
   */
  async getPendingPayouts(vendorId: string): Promise<VendorPayout[]> {
    return await this.findBy({ vendorId, status: PayoutStatus.PENDING });
  }

  /**
   * Generate unique payout number
   */
  async generatePayoutNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    let payoutNumber: string;
    let exists: boolean;
    let counter = 1;
    
    do {
      payoutNumber = `PO-${year}${month}${day}-${String(counter).padStart(4, '0')}`;
      exists = await this.exists({ payoutNumber });
      counter++;
    } while (exists);
    
    return payoutNumber;
  }

  /**
   * Update payout status
   */
  async updatePayoutStatus(
    id: string,
    status: string,
    processedBy?: string,
    transactionId?: string,
    failureReason?: string
  ): Promise<VendorPayout | null> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === PayoutStatus.COMPLETED || status === PayoutStatus.PROCESSING) {
      updateData.processedAt = new Date();
      if (processedBy) updateData.processedBy = processedBy;
      if (transactionId) updateData.transactionId = transactionId;
    }

    if (status === PayoutStatus.FAILED && failureReason) {
      updateData.failureReason = failureReason;
    }

    return await this.update(id, updateData);
  }

  /**
   * Get payout summary for vendor
   */
  async getPayoutSummary(vendorId: string): Promise<{
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    lastPayoutDate: Date | null;
    nextPayoutAmount: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const summary = await db
        .selectFrom('vendor_payouts')
        .select([
          db.fn.sum('net_amount').filterWhere('status', '=', PayoutStatus.COMPLETED).as('totalPaid'),
          db.fn.sum('net_amount').filterWhere('status', '=', PayoutStatus.PENDING).as('totalPending'),
          db.fn.sum('net_amount').filterWhere('status', '=', PayoutStatus.FAILED).as('totalFailed'),
          db.fn.max('processed_at').filterWhere('status', '=', PayoutStatus.COMPLETED).as('lastPayoutDate'),
        ])
        .where('vendor_id', '=', vendorId)
        .executeTakeFirst();

      const nextPayout = await db
        .selectFrom('vendor_payouts')
        .select('net_amount')
        .where('vendor_id', '=', vendorId)
        .where('status', '=', PayoutStatus.PENDING)
        .orderBy('created_at', 'asc')
        .executeTakeFirst();

      return {
        totalPaid: Number(summary?.totalPaid) || 0,
        totalPending: Number(summary?.totalPending) || 0,
        totalFailed: Number(summary?.totalFailed) || 0,
        lastPayoutDate: summary?.lastPayoutDate || null,
        nextPayoutAmount: Number(nextPayout?.net_amount) || 0,
      };
    });
  }
}

/**
 * Repository for vendor reviews
 */
export class VendorReviewRepository extends BaseRepository<
  typeof vendorReviews,
  VendorReview,
  NewVendorReview
> {
  protected table = vendorReviews;
  protected tableName = 'vendor_reviews';

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
   * Find reviews by vendor
   */
  async findByVendor(
    vendorId: string,
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PagedResult<VendorReview>> {
    return await this.findAll(pagination, { 
      vendorId, 
      status: ReviewStatus.PUBLISHED 
    });
  }

  /**
   * Get review statistics for vendor
   */
  async getReviewStats(vendorId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    averageCommunicationRating: number;
    averageShippingRating: number;
    averageQualityRating: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const stats = await db
        .selectFrom('vendor_reviews')
        .select([
          db.fn.count('id').as('totalReviews'),
          db.fn.avg('rating').as('averageRating'),
          db.fn.avg('communication_rating').as('averageCommunicationRating'),
          db.fn.avg('shipping_rating').as('averageShippingRating'),
          db.fn.avg('quality_rating').as('averageQualityRating'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('status', '=', ReviewStatus.PUBLISHED)
        .executeTakeFirst();

      // Get rating distribution
      const distribution = await db
        .selectFrom('vendor_reviews')
        .select([
          'rating',
          db.fn.count('id').as('count'),
        ])
        .where('vendor_id', '=', vendorId)
        .where('status', '=', ReviewStatus.PUBLISHED)
        .groupBy('rating')
        .execute();

      const ratingDistribution: Record<number, number> = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = 0;
      }
      distribution.forEach(d => {
        ratingDistribution[d.rating] = Number(d.count);
      });

      return {
        totalReviews: Number(stats?.totalReviews) || 0,
        averageRating: Number(stats?.averageRating) || 0,
        ratingDistribution,
        averageCommunicationRating: Number(stats?.averageCommunicationRating) || 0,
        averageShippingRating: Number(stats?.averageShippingRating) || 0,
        averageQualityRating: Number(stats?.averageQualityRating) || 0,
      };
    });
  }

  /**
   * Add vendor response to review
   */
  async addVendorResponse(reviewId: string, response: string): Promise<VendorReview | null> {
    return await this.update(reviewId, {
      vendorResponse: response,
      vendorResponseAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Update helpful votes
   */
  async updateHelpfulVotes(reviewId: string, helpful: boolean): Promise<VendorReview | null> {
    return await this.executeKyselyQuery(async (db) => {
      const updated = await db
        .updateTable('vendor_reviews')
        .set({
          helpful_votes: helpful ? sql`helpful_votes + 1` : sql`helpful_votes`,
          total_votes: sql`total_votes + 1`,
          updated_at: new Date(),
        })
        .where('id', '=', reviewId)
        .returningAll()
        .executeTakeFirst();

      if (!updated) return null;

      return {
        id: updated.id,
        vendorId: updated.vendor_id,
        userId: updated.user_id,
        orderId: updated.order_id,
        rating: updated.rating,
        title: updated.title,
        comment: updated.comment,
        communicationRating: updated.communication_rating,
        shippingRating: updated.shipping_rating,
        qualityRating: updated.quality_rating,
        status: updated.status,
        isVerifiedPurchase: updated.is_verified_purchase,
        moderatedBy: updated.moderated_by,
        moderatedAt: updated.moderated_at,
        moderationNotes: updated.moderation_notes,
        vendorResponse: updated.vendor_response,
        vendorResponseAt: updated.vendor_response_at,
        helpfulVotes: updated.helpful_votes,
        totalVotes: updated.total_votes,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      } as VendorReview;
    });
  }
}