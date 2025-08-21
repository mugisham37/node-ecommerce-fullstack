import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { stockMovements } from '../schema/stock-movements';
import { BaseRepository, FilterOptions, PaginationOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { StockMovement, NewStockMovement } from '../schema/stock-movements';

export interface StockMovementFilters extends FilterOptions {
  productId?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface StockMovementUpdateData {
  quantity?: number;
  type?: string;
  reason?: string;
  reference?: string;
}

export interface StockMovementWithProduct extends StockMovement {
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

/**
 * Repository for stock movement-related database operations
 */
export class StockMovementRepository extends BaseRepository<
  typeof stockMovements,
  StockMovement,
  NewStockMovement,
  StockMovementUpdateData
> {
  protected table = stockMovements;
  protected tableName = 'stock_movements';

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
   * Find stock movements by product ID
   */
  async findByProductId(
    productId: string,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<ReturnType<typeof this.findAll>> {
    return await this.findAll(pagination, { productId });
  }

  /**
   * Find stock movements by type
   */
  async findByType(type: string): Promise<StockMovement[]> {
    return await this.findBy({ type });
  }

  /**
   * Get stock movements with product details
   */
  async getMovementsWithProduct(
    pagination: PaginationOptions = { page: 1, limit: 10 },
    filters: StockMovementFilters = {}
  ): Promise<{
    data: StockMovementWithProduct[];
    pagination: ReturnType<typeof this.findAll>['pagination'];
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const offset = (pagination.page - 1) * pagination.limit;
      
      let query = db
        .selectFrom('stock_movements')
        .leftJoin('products', 'stock_movements.product_id', 'products.id')
        .select([
          'stock_movements.id',
          'stock_movements.product_id as productId',
          'stock_movements.quantity',
          'stock_movements.type',
          'stock_movements.reason',
          'stock_movements.reference',
          'stock_movements.created_at as createdAt',
          'stock_movements.updated_at as updatedAt',
          'products.name as product_name',
          'products.sku as product_sku',
        ]);

      // Apply filters
      if (filters.productId) {
        query = query.where('stock_movements.product_id', '=', filters.productId);
      }

      if (filters.type) {
        query = query.where('stock_movements.type', '=', filters.type);
      }

      if (filters.dateFrom) {
        query = query.where('stock_movements.created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('stock_movements.created_at', '<=', filters.dateTo);
      }

      // Get total count
      const countQuery = query.clearSelect().select(db.fn.count('stock_movements.id').as('count'));
      const [{ count: total }] = await countQuery.execute();

      // Apply pagination and sorting
      query = query
        .orderBy('stock_movements.created_at', 'desc')
        .limit(pagination.limit)
        .offset(offset);

      const data = await query.execute();

      // Transform the result
      const transformedData: StockMovementWithProduct[] = data.map((row: any) => ({
        id: row.id,
        productId: row.productId,
        quantity: row.quantity,
        type: row.type,
        reason: row.reason,
        reference: row.reference,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        product: row.product_name ? {
          id: row.productId,
          name: row.product_name,
          sku: row.product_sku,
        } : undefined,
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
   * Record stock movement
   */
  async recordMovement(
    productId: string,
    quantity: number,
    type: 'in' | 'out' | 'adjustment',
    reason: string,
    reference?: string
  ): Promise<StockMovement> {
    const movementData: NewStockMovement = {
      productId,
      quantity,
      type,
      reason,
      reference,
    };

    return await this.create(movementData);
  }

  /**
   * Get stock movement summary for a product
   */
  async getProductMovementSummary(
    productId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
    netMovement: number;
    movementCount: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      let query = db
        .selectFrom('stock_movements')
        .select([
          db.fn
            .sum('quantity')
            .filterWhere('type', '=', 'in')
            .as('totalIn'),
          db.fn
            .sum('quantity')
            .filterWhere('type', '=', 'out')
            .as('totalOut'),
          db.fn
            .sum('quantity')
            .filterWhere('type', '=', 'adjustment')
            .as('totalAdjustments'),
          db.fn.count('id').as('movementCount'),
        ])
        .where('product_id', '=', productId);

      if (dateFrom) {
        query = query.where('created_at', '>=', dateFrom);
      }

      if (dateTo) {
        query = query.where('created_at', '<=', dateTo);
      }

      const [result] = await query.execute();

      const totalIn = Number(result.totalIn) || 0;
      const totalOut = Number(result.totalOut) || 0;
      const totalAdjustments = Number(result.totalAdjustments) || 0;

      return {
        totalIn,
        totalOut,
        totalAdjustments,
        netMovement: totalIn - totalOut + totalAdjustments,
        movementCount: Number(result.movementCount),
      };
    });
  }

  /**
   * Get daily movement statistics
   */
  async getDailyMovementStats(
    dateFrom: Date,
    dateTo: Date
  ): Promise<Array<{
    date: string;
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
    movementCount: number;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      return await db
        .selectFrom('stock_movements')
        .select([
          db.fn('DATE', ['created_at']).as('date'),
          db.fn
            .sum('quantity')
            .filterWhere('type', '=', 'in')
            .as('totalIn'),
          db.fn
            .sum('quantity')
            .filterWhere('type', '=', 'out')
            .as('totalOut'),
          db.fn
            .sum('quantity')
            .filterWhere('type', '=', 'adjustment')
            .as('totalAdjustments'),
          db.fn.count('id').as('movementCount'),
        ])
        .where('created_at', '>=', dateFrom)
        .where('created_at', '<=', dateTo)
        .groupBy(db.fn('DATE', ['created_at']))
        .orderBy('date', 'asc')
        .execute()
        .then((results: any[]) =>
          results.map(row => ({
            date: row.date,
            totalIn: Number(row.totalIn) || 0,
            totalOut: Number(row.totalOut) || 0,
            totalAdjustments: Number(row.totalAdjustments) || 0,
            movementCount: Number(row.movementCount),
          }))
        );
    });
  }

  /**
   * Override buildWhereConditions to handle stock movement-specific filters
   */
  protected buildWhereConditions(filters: StockMovementFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle date range filters
    if (filters.dateFrom) {
      conditions.push(gte(stockMovements.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(stockMovements.createdAt, filters.dateTo));
    }
    
    return conditions;
  }
}