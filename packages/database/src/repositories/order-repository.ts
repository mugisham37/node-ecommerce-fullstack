import { eq, and, or, ilike, gte, lte, desc } from 'drizzle-orm';
import { orders } from '../schema/orders';
import { BaseRepository, FilterOptions, PaginationOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { Order, NewOrder } from '../schema/orders';

export interface OrderFilters extends FilterOptions {
  userId?: string;
  status?: string;
  orderNumber?: string;
  minTotal?: number;
  maxTotal?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface OrderUpdateData {
  status?: string;
  totalAmount?: number;
  shippingAddress?: string;
  notes?: string;
}

export interface OrderWithDetails extends Order {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  itemCount?: number;
}

/**
 * Repository for order-related database operations
 */
export class OrderRepository extends BaseRepository<
  typeof orders,
  Order,
  NewOrder,
  OrderUpdateData
> {
  protected table = orders;
  protected tableName = 'orders';

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
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.findOneBy({ orderNumber });
  }

  /**
   * Find orders by user
   */
  async findByUser(userId: string, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<ReturnType<typeof this.findAll>> {
    return await this.findAll(pagination, { userId });
  }

  /**
   * Find orders by status
   */
  async findByStatus(status: string): Promise<Order[]> {
    return await this.findBy({ status });
  }

  /**
   * Get orders with user details
   */
  async getOrdersWithDetails(
    pagination: PaginationOptions = { page: 1, limit: 10 },
    filters: OrderFilters = {}
  ): Promise<{
    data: OrderWithDetails[];
    pagination: ReturnType<typeof this.findAll>['pagination'];
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const offset = (pagination.page - 1) * pagination.limit;
      
      let query = db
        .selectFrom('orders')
        .leftJoin('users', 'orders.user_id', 'users.id')
        .leftJoin('order_items', 'orders.id', 'order_items.order_id')
        .select([
          'orders.id',
          'orders.order_number as orderNumber',
          'orders.user_id as userId',
          'orders.status',
          'orders.total_amount as totalAmount',
          'orders.shipping_address as shippingAddress',
          'orders.notes',
          'orders.created_at as createdAt',
          'orders.updated_at as updatedAt',
          'users.email as user_email',
          'users.first_name as user_firstName',
          'users.last_name as user_lastName',
          db.fn.count('order_items.id').as('itemCount'),
        ])
        .groupBy([
          'orders.id',
          'orders.order_number',
          'orders.user_id',
          'orders.status',
          'orders.total_amount',
          'orders.shipping_address',
          'orders.notes',
          'orders.created_at',
          'orders.updated_at',
          'users.email',
          'users.first_name',
          'users.last_name',
        ]);

      // Apply filters
      if (filters.userId) {
        query = query.where('orders.user_id', '=', filters.userId);
      }

      if (filters.status) {
        query = query.where('orders.status', '=', filters.status);
      }

      if (filters.orderNumber) {
        query = query.where('orders.order_number', 'ilike', `%${filters.orderNumber}%`);
      }

      if (filters.minTotal !== undefined) {
        query = query.where('orders.total_amount', '>=', filters.minTotal);
      }

      if (filters.maxTotal !== undefined) {
        query = query.where('orders.total_amount', '<=', filters.maxTotal);
      }

      if (filters.dateFrom) {
        query = query.where('orders.created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('orders.created_at', '<=', filters.dateTo);
      }

      if (filters.search) {
        query = query.where(
          db.or([
            db('orders.order_number', 'ilike', `%${filters.search}%`),
            db('users.email', 'ilike', `%${filters.search}%`),
            db('users.first_name', 'ilike', `%${filters.search}%`),
            db('users.last_name', 'ilike', `%${filters.search}%`),
          ])
        );
      }

      // Get total count
      const countQuery = query.clearSelect().select(db.fn.count('orders.id').as('count'));
      const [{ count: total }] = await countQuery.execute();

      // Apply pagination and sorting
      query = query
        .orderBy('orders.created_at', 'desc')
        .limit(pagination.limit)
        .offset(offset);

      const data = await query.execute();

      // Transform the result
      const transformedData: OrderWithDetails[] = data.map((row: any) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        userId: row.userId,
        status: row.status,
        totalAmount: row.totalAmount,
        shippingAddress: row.shippingAddress,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: row.user_email ? {
          id: row.userId,
          email: row.user_email,
          firstName: row.user_firstName,
          lastName: row.user_lastName,
        } : undefined,
        itemCount: Number(row.itemCount),
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
   * Get order statistics
   */
  async getOrderStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    recentOrders: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      // Get basic stats
      const [basicStats] = await db
        .selectFrom('orders')
        .select([
          db.fn.count('id').as('totalOrders'),
          db.fn.sum('total_amount').as('totalRevenue'),
          db.fn.avg('total_amount').as('averageOrderValue'),
        ])
        .execute();

      // Get orders by status
      const statusStats = await db
        .selectFrom('orders')
        .select(['status', db.fn.count('id').as('count')])
        .groupBy('status')
        .execute();

      const ordersByStatus = statusStats.reduce((acc, stat) => {
        acc[stat.status] = Number(stat.count);
        return acc;
      }, {} as Record<string, number>);

      // Get recent orders (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [recentStats] = await db
        .selectFrom('orders')
        .select([db.fn.count('id').as('recentOrders')])
        .where('created_at', '>=', sevenDaysAgo)
        .execute();

      return {
        totalOrders: Number(basicStats.totalOrders),
        totalRevenue: Number(basicStats.totalRevenue) || 0,
        averageOrderValue: Number(basicStats.averageOrderValue) || 0,
        ordersByStatus,
        recentOrders: Number(recentStats.recentOrders),
      };
    });
  }

  /**
   * Get daily order statistics for a date range
   */
  async getDailyOrderStats(dateFrom: Date, dateTo: Date): Promise<Array<{
    date: string;
    orderCount: number;
    totalRevenue: number;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      return await db
        .selectFrom('orders')
        .select([
          db.fn('DATE', ['created_at']).as('date'),
          db.fn.count('id').as('orderCount'),
          db.fn.sum('total_amount').as('totalRevenue'),
        ])
        .where('created_at', '>=', dateFrom)
        .where('created_at', '<=', dateTo)
        .groupBy(db.fn('DATE', ['created_at']))
        .orderBy('date', 'asc')
        .execute()
        .then((results: any[]) =>
          results.map(row => ({
            date: row.date,
            orderCount: Number(row.orderCount),
            totalRevenue: Number(row.totalRevenue) || 0,
          }))
        );
    });
  }

  /**
   * Generate unique order number
   */
  async generateOrderNumber(): Promise<string> {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    let orderNumber = `${prefix}-${timestamp}-${random}`;
    
    // Ensure uniqueness
    while (await this.exists({ orderNumber })) {
      const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      orderNumber = `${prefix}-${timestamp}-${newRandom}`;
    }
    
    return orderNumber;
  }

  /**
   * Override buildWhereConditions to handle order-specific filters
   */
  protected buildWhereConditions(filters: OrderFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle search across multiple fields
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(orders.orderNumber, searchTerm),
          ilike(orders.notes, searchTerm)
        )
      );
    }

    // Handle amount range filters
    if (filters.minTotal !== undefined) {
      conditions.push(gte(orders.totalAmount, filters.minTotal.toString()));
    }

    if (filters.maxTotal !== undefined) {
      conditions.push(lte(orders.totalAmount, filters.maxTotal.toString()));
    }

    // Handle date range filters
    if (filters.dateFrom) {
      conditions.push(gte(orders.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(orders.createdAt, filters.dateTo));
    }
    
    return conditions;
  }
}