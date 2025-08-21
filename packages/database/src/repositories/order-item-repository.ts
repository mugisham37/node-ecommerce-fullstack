import { eq, and } from 'drizzle-orm';
import { orderItems } from '../schema/order-items';
import { BaseRepository, FilterOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { OrderItem, NewOrderItem } from '../schema/order-items';

export interface OrderItemFilters extends FilterOptions {
  orderId?: string;
  productId?: string;
}

export interface OrderItemUpdateData {
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface OrderItemWithDetails extends OrderItem {
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

/**
 * Repository for order item-related database operations
 */
export class OrderItemRepository extends BaseRepository<
  typeof orderItems,
  OrderItem,
  NewOrderItem,
  OrderItemUpdateData
> {
  protected table = orderItems;
  protected tableName = 'order_items';

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
   * Find order items by order ID
   */
  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    return await this.findBy({ orderId });
  }

  /**
   * Find order items by product ID
   */
  async findByProductId(productId: string): Promise<OrderItem[]> {
    return await this.findBy({ productId });
  }

  /**
   * Get order items with product details
   */
  async getOrderItemsWithDetails(orderId: string): Promise<OrderItemWithDetails[]> {
    return await this.executeKyselyQuery(async (db) => {
      const data = await db
        .selectFrom('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .select([
          'order_items.id',
          'order_items.order_id as orderId',
          'order_items.product_id as productId',
          'order_items.quantity',
          'order_items.unit_price as unitPrice',
          'order_items.total_price as totalPrice',
          'order_items.created_at as createdAt',
          'order_items.updated_at as updatedAt',
          'products.name as product_name',
          'products.sku as product_sku',
        ])
        .where('order_items.order_id', '=', orderId)
        .orderBy('order_items.created_at', 'asc')
        .execute();

      return data.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        productId: row.productId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        product: row.product_name ? {
          id: row.productId,
          name: row.product_name,
          sku: row.product_sku,
        } : undefined,
      }));
    });
  }

  /**
   * Get total order value for an order
   */
  async getOrderTotal(orderId: string): Promise<number> {
    return await this.executeKyselyQuery(async (db) => {
      const [result] = await db
        .selectFrom('order_items')
        .select([db.fn.sum('total_price').as('total')])
        .where('order_id', '=', orderId)
        .execute();

      return Number(result.total) || 0;
    });
  }

  /**
   * Get product sales statistics
   */
  async getProductSalesStats(productId: string): Promise<{
    totalQuantitySold: number;
    totalRevenue: number;
    orderCount: number;
    averageQuantityPerOrder: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const [stats] = await db
        .selectFrom('order_items')
        .select([
          db.fn.sum('quantity').as('totalQuantitySold'),
          db.fn.sum('total_price').as('totalRevenue'),
          db.fn.count('order_id').as('orderCount'),
          db.fn.avg('quantity').as('averageQuantityPerOrder'),
        ])
        .where('product_id', '=', productId)
        .execute();

      return {
        totalQuantitySold: Number(stats.totalQuantitySold) || 0,
        totalRevenue: Number(stats.totalRevenue) || 0,
        orderCount: Number(stats.orderCount),
        averageQuantityPerOrder: Number(stats.averageQuantityPerOrder) || 0,
      };
    });
  }

  /**
   * Get top selling products
   */
  async getTopSellingProducts(limit: number = 10): Promise<Array<{
    productId: string;
    productName: string;
    productSku: string;
    totalQuantitySold: number;
    totalRevenue: number;
    orderCount: number;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      const data = await db
        .selectFrom('order_items')
        .innerJoin('products', 'order_items.product_id', 'products.id')
        .select([
          'products.id as productId',
          'products.name as productName',
          'products.sku as productSku',
          db.fn.sum('order_items.quantity').as('totalQuantitySold'),
          db.fn.sum('order_items.total_price').as('totalRevenue'),
          db.fn.count('order_items.order_id').as('orderCount'),
        ])
        .groupBy(['products.id', 'products.name', 'products.sku'])
        .orderBy('totalQuantitySold', 'desc')
        .limit(limit)
        .execute();

      return data.map((row: any) => ({
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        totalQuantitySold: Number(row.totalQuantitySold),
        totalRevenue: Number(row.totalRevenue),
        orderCount: Number(row.orderCount),
      }));
    });
  }

  /**
   * Delete all items for an order
   */
  async deleteByOrderId(orderId: string): Promise<boolean> {
    const result = await this.db.drizzle
      .delete(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .returning();

    return result.length > 0;
  }
}