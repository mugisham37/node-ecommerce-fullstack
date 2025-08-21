import { eq, and, or, lte, gte, sql } from 'drizzle-orm';
import { inventory } from '../schema/inventory';
import { BaseRepository, FilterOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { Inventory, NewInventory } from '../schema/inventory';

export interface InventoryFilters extends FilterOptions {
  productId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  belowReorderLevel?: boolean;
}

export interface InventoryUpdateData {
  quantity?: number;
  reservedQuantity?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

/**
 * Repository for inventory-related database operations
 */
export class InventoryRepository extends BaseRepository<
  typeof inventory,
  Inventory,
  NewInventory,
  InventoryUpdateData
> {
  protected table = inventory;
  protected tableName = 'inventory';

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
   * Find inventory by product ID
   */
  async findByProductId(productId: string): Promise<Inventory | null> {
    return await this.findOneBy({ productId });
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(): Promise<Inventory[]> {
    return await this.executeKyselyQuery(async (db) => {
      return await db
        .selectFrom('inventory')
        .selectAll()
        .where(sql`quantity <= reorder_level`)
        .orderBy('quantity', 'asc')
        .execute();
    });
  }

  /**
   * Get out of stock items
   */
  async getOutOfStockItems(): Promise<Inventory[]> {
    return await this.findBy({ quantity: 0 });
  }

  /**
   * Update stock quantity
   */
  async updateQuantity(productId: string, newQuantity: number): Promise<Inventory | null> {
    const inventoryItem = await this.findByProductId(productId);
    if (!inventoryItem) return null;

    return await this.update(inventoryItem.id, { quantity: newQuantity });
  }

  /**
   * Reserve stock
   */
  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    return await this.transactionManager.executeWithDrizzle(async (tx) => {
      const inventoryItem = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .limit(1);

      if (!inventoryItem[0]) return false;

      const availableQuantity = inventoryItem[0].quantity - inventoryItem[0].reservedQuantity;
      if (availableQuantity < quantity) return false;

      await tx
        .update(inventory)
        .set({
          reservedQuantity: inventoryItem[0].reservedQuantity + quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryItem[0].id));

      return true;
    });
  }

  /**
   * Release reserved stock
   */
  async releaseReservedStock(productId: string, quantity: number): Promise<boolean> {
    return await this.transactionManager.executeWithDrizzle(async (tx) => {
      const inventoryItem = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .limit(1);

      if (!inventoryItem[0]) return false;

      const newReservedQuantity = Math.max(0, inventoryItem[0].reservedQuantity - quantity);

      await tx
        .update(inventory)
        .set({
          reservedQuantity: newReservedQuantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryItem[0].id));

      return true;
    });
  }

  /**
   * Consume reserved stock (complete order)
   */
  async consumeReservedStock(productId: string, quantity: number): Promise<boolean> {
    return await this.transactionManager.executeWithDrizzle(async (tx) => {
      const inventoryItem = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, productId))
        .limit(1);

      if (!inventoryItem[0]) return false;

      if (inventoryItem[0].reservedQuantity < quantity) return false;

      await tx
        .update(inventory)
        .set({
          quantity: inventoryItem[0].quantity - quantity,
          reservedQuantity: inventoryItem[0].reservedQuantity - quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryItem[0].id));

      return true;
    });
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalReserved: number;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const [stats] = await db
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          db.fn.count('inventory.id').as('totalItems'),
          db.fn.sum(sql`inventory.quantity * products.price`).as('totalValue'),
          db.fn
            .count('inventory.id')
            .filterWhere(sql`inventory.quantity <= inventory.reorder_level`)
            .as('lowStockCount'),
          db.fn
            .count('inventory.id')
            .filterWhere('inventory.quantity', '=', 0)
            .as('outOfStockCount'),
          db.fn.sum('inventory.reserved_quantity').as('totalReserved'),
        ])
        .execute();

      return {
        totalItems: Number(stats.totalItems),
        totalValue: Number(stats.totalValue) || 0,
        lowStockCount: Number(stats.lowStockCount),
        outOfStockCount: Number(stats.outOfStockCount),
        totalReserved: Number(stats.totalReserved) || 0,
      };
    });
  }

  /**
   * Override buildWhereConditions to handle inventory-specific filters
   */
  protected buildWhereConditions(filters: InventoryFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    if (filters.lowStock) {
      conditions.push(sql`${inventory.quantity} <= ${inventory.reorderLevel}`);
    }

    if (filters.outOfStock) {
      conditions.push(eq(inventory.quantity, 0));
    }

    if (filters.belowReorderLevel) {
      conditions.push(sql`${inventory.quantity} <= ${inventory.reorderLevel}`);
    }
    
    return conditions;
  }
}