import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { authMiddleware, anyRoleMiddleware, activityLoggingMiddleware } from '../middleware';

// Input validation schemas
const InventoryAdjustmentRequestSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  adjustmentType: z.enum(['INCREASE', 'DECREASE', 'SET']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required').max(500),
  warehouseLocation: z.string().default('MAIN'),
});

const AllocationRequestSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  referenceId: z.string().min(1, 'Reference ID is required'),
});

const InventoryFiltersSchema = z.object({
  warehouseLocation: z.string().optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const MovementFiltersSchema = z.object({
  productId: z.string().uuid().optional(),
  movementType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const ReorderLevelUpdateSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be non-negative'),
  reorderQuantity: z.number().int().min(1, 'Reorder quantity must be at least 1'),
});

const AvailabilityCheckSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1, 'At least one item is required'),
});

// Response schemas
const InventoryResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityOnHand: z.number(),
  quantityAllocated: z.number(),
  quantityAvailable: z.number(),
  warehouseLocation: z.string(),
  reorderLevel: z.number(),
  reorderQuantity: z.number(),
  lastMovementAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const LowStockAlertSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  quantityAvailable: z.number(),
  reorderLevel: z.number(),
  reorderQuantity: z.number(),
  warehouseLocation: z.string(),
  severity: z.enum(['LOW', 'CRITICAL', 'OUT_OF_STOCK']),
});

const StockMovementResponseSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSku: z.string(),
  movementType: z.string(),
  quantity: z.number(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
  reason: z.string().nullable(),
  referenceId: z.string().nullable(),
  warehouseLocation: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
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
 * Inventory Management Router
 * Handles real-time inventory tracking and management operations
 * Converted from Spring Boot InventoryController.java
 */
export const inventoryRouter = router({
  /**
   * Get inventory by product ID
   * Converts GET /api/v1/inventory/product/{productId}
   */
  getByProduct: protectedProcedure
    .use(authMiddleware)
    .input(z.object({ productId: z.string().uuid() }))
    .output(InventoryResponseSchema)
    .query(async ({ input, ctx }) => {
      const inventory = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          'inventory.id',
          'inventory.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'inventory.quantity_on_hand',
          'inventory.quantity_allocated',
          'inventory.quantity_available',
          'inventory.warehouse_location',
          'products.reorder_level',
          'products.reorder_quantity',
          'inventory.last_movement_at',
          'inventory.created_at',
          'inventory.updated_at',
        ])
        .where('inventory.product_id', '=', input.productId)
        .executeTakeFirst();

      if (!inventory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Inventory record not found for this product',
        });
      }

      return {
        id: inventory.id,
        productId: inventory.product_id,
        productName: inventory.product_name || 'Unknown',
        productSku: inventory.product_sku || 'Unknown',
        quantityOnHand: inventory.quantity_on_hand,
        quantityAllocated: inventory.quantity_allocated,
        quantityAvailable: inventory.quantity_available,
        warehouseLocation: inventory.warehouse_location,
        reorderLevel: inventory.reorder_level || 0,
        reorderQuantity: inventory.reorder_quantity || 1,
        lastMovementAt: inventory.last_movement_at?.toISOString() || null,
        createdAt: inventory.created_at.toISOString(),
        updatedAt: inventory.updated_at.toISOString(),
      };
    }),

  /**
   * Get all inventory with pagination and filtering
   * Converts GET /api/v1/inventory
   */
  getAll: protectedProcedure
    .use(authMiddleware)
    .input(InventoryFiltersSchema)
    .output(PagedResponseSchema(InventoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const { warehouseLocation, lowStock, outOfStock, page, limit } = input;
      const offset = (page - 1) * limit;

      let query = ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id');

      // Apply filters
      if (warehouseLocation) {
        query = query.where('inventory.warehouse_location', '=', warehouseLocation);
      }
      if (lowStock) {
        query = query.where('inventory.quantity_available', '<=', ctx.db.queryBuilder.ref('products.reorder_level'));
      }
      if (outOfStock) {
        query = query.where('inventory.quantity_available', '=', 0);
      }

      // Get total count
      const totalResult = await query
        .select((eb) => eb.fn.count('inventory.id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get inventory records
      const inventoryRecords = await query
        .select([
          'inventory.id',
          'inventory.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'inventory.quantity_on_hand',
          'inventory.quantity_allocated',
          'inventory.quantity_available',
          'inventory.warehouse_location',
          'products.reorder_level',
          'products.reorder_quantity',
          'inventory.last_movement_at',
          'inventory.created_at',
          'inventory.updated_at',
        ])
        .orderBy('inventory.updated_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: inventoryRecords.map(inventory => ({
          id: inventory.id,
          productId: inventory.product_id,
          productName: inventory.product_name || 'Unknown',
          productSku: inventory.product_sku || 'Unknown',
          quantityOnHand: inventory.quantity_on_hand,
          quantityAllocated: inventory.quantity_allocated,
          quantityAvailable: inventory.quantity_available,
          warehouseLocation: inventory.warehouse_location,
          reorderLevel: inventory.reorder_level || 0,
          reorderQuantity: inventory.reorder_quantity || 1,
          lastMovementAt: inventory.last_movement_at?.toISOString() || null,
          createdAt: inventory.created_at.toISOString(),
          updatedAt: inventory.updated_at.toISOString(),
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
   * Search inventory
   * Converts GET /api/v1/inventory/search
   */
  search: protectedProcedure
    .use(authMiddleware)
    .input(z.object({
      q: z.string().min(1, 'Search query is required'),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .output(PagedResponseSchema(InventoryResponseSchema))
    .query(async ({ input, ctx }) => {
      const { q, page, limit } = input;
      const offset = (page - 1) * limit;

      // Get total count
      const totalResult = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select((eb) => eb.fn.count('inventory.id').as('count'))
        .where((eb) => eb.or([
          eb('products.name', 'ilike', `%${q}%`),
          eb('products.sku', 'ilike', `%${q}%`),
        ]))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Search inventory
      const inventoryRecords = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          'inventory.id',
          'inventory.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'inventory.quantity_on_hand',
          'inventory.quantity_allocated',
          'inventory.quantity_available',
          'inventory.warehouse_location',
          'products.reorder_level',
          'products.reorder_quantity',
          'inventory.last_movement_at',
          'inventory.created_at',
          'inventory.updated_at',
        ])
        .where((eb) => eb.or([
          eb('products.name', 'ilike', `%${q}%`),
          eb('products.sku', 'ilike', `%${q}%`),
        ]))
        .orderBy('inventory.updated_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: inventoryRecords.map(inventory => ({
          id: inventory.id,
          productId: inventory.product_id,
          productName: inventory.product_name || 'Unknown',
          productSku: inventory.product_sku || 'Unknown',
          quantityOnHand: inventory.quantity_on_hand,
          quantityAllocated: inventory.quantity_allocated,
          quantityAvailable: inventory.quantity_available,
          warehouseLocation: inventory.warehouse_location,
          reorderLevel: inventory.reorder_level || 0,
          reorderQuantity: inventory.reorder_quantity || 1,
          lastMovementAt: inventory.last_movement_at?.toISOString() || null,
          createdAt: inventory.created_at.toISOString(),
          updatedAt: inventory.updated_at.toISOString(),
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
   * Get low stock products
   * Converts GET /api/v1/inventory/low-stock
   */
  getLowStock: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE']))
    .output(z.array(LowStockAlertSchema))
    .query(async ({ ctx }) => {
      const lowStockItems = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          'inventory.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'inventory.quantity_available',
          'products.reorder_level',
          'products.reorder_quantity',
          'inventory.warehouse_location',
        ])
        .where('products.active', '=', true)
        .where('inventory.quantity_available', '<=', ctx.db.queryBuilder.ref('products.reorder_level'))
        .orderBy('inventory.quantity_available', 'asc')
        .execute();

      return lowStockItems.map(item => {
        let severity: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' = 'LOW';
        
        if (item.quantity_available === 0) {
          severity = 'OUT_OF_STOCK';
        } else if (item.quantity_available <= (item.reorder_level || 0) * 0.5) {
          severity = 'CRITICAL';
        }

        return {
          productId: item.product_id,
          productName: item.product_name || 'Unknown',
          productSku: item.product_sku || 'Unknown',
          quantityAvailable: item.quantity_available,
          reorderLevel: item.reorder_level || 0,
          reorderQuantity: item.reorder_quantity || 1,
          warehouseLocation: item.warehouse_location,
          severity,
        };
      });
    }),

  /**
   * Get out of stock products
   * Converts GET /api/v1/inventory/out-of-stock
   */
  getOutOfStock: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER', 'EMPLOYEE']))
    .output(z.array(InventoryResponseSchema))
    .query(async ({ ctx }) => {
      const outOfStockItems = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          'inventory.id',
          'inventory.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'inventory.quantity_on_hand',
          'inventory.quantity_allocated',
          'inventory.quantity_available',
          'inventory.warehouse_location',
          'products.reorder_level',
          'products.reorder_quantity',
          'inventory.last_movement_at',
          'inventory.created_at',
          'inventory.updated_at',
        ])
        .where('products.active', '=', true)
        .where('inventory.quantity_available', '=', 0)
        .orderBy('inventory.updated_at', 'desc')
        .execute();

      return outOfStockItems.map(inventory => ({
        id: inventory.id,
        productId: inventory.product_id,
        productName: inventory.product_name || 'Unknown',
        productSku: inventory.product_sku || 'Unknown',
        quantityOnHand: inventory.quantity_on_hand,
        quantityAllocated: inventory.quantity_allocated,
        quantityAvailable: inventory.quantity_available,
        warehouseLocation: inventory.warehouse_location,
        reorderLevel: inventory.reorder_level || 0,
        reorderQuantity: inventory.reorder_quantity || 1,
        lastMovementAt: inventory.last_movement_at?.toISOString() || null,
        createdAt: inventory.created_at.toISOString(),
        updatedAt: inventory.updated_at.toISOString(),
      }));
    }),

  /**
   * Adjust inventory levels
   * Converts POST /api/v1/inventory/adjust
   */
  adjust: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('INVENTORY_ADJUSTED', 'INVENTORY'))
    .input(InventoryAdjustmentRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { productId, adjustmentType, quantity, reason, warehouseLocation } = input;
      const user = ctx.requireAuth();

      // Get current inventory
      const currentInventory = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .select(['quantity_on_hand', 'quantity_allocated'])
        .where('product_id', '=', productId)
        .where('warehouse_location', '=', warehouseLocation)
        .executeTakeFirst();

      if (!currentInventory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Inventory record not found',
        });
      }

      let newQuantityOnHand = currentInventory.quantity_on_hand;

      // Calculate new quantity based on adjustment type
      switch (adjustmentType) {
        case 'INCREASE':
          newQuantityOnHand += quantity;
          break;
        case 'DECREASE':
          newQuantityOnHand = Math.max(0, newQuantityOnHand - quantity);
          break;
        case 'SET':
          newQuantityOnHand = quantity;
          break;
      }

      const newQuantityAvailable = Math.max(0, newQuantityOnHand - currentInventory.quantity_allocated);

      // Update inventory
      await ctx.db.queryBuilder
        .updateTable('inventory')
        .set({
          quantity_on_hand: newQuantityOnHand,
          quantity_available: newQuantityAvailable,
          last_movement_at: new Date(),
          updated_at: new Date(),
        })
        .where('product_id', '=', productId)
        .where('warehouse_location', '=', warehouseLocation)
        .execute();

      // Create stock movement record
      await ctx.db.queryBuilder
        .insertInto('stock_movements')
        .values({
          product_id: productId,
          movement_type: adjustmentType,
          quantity: adjustmentType === 'DECREASE' ? -quantity : quantity,
          previous_quantity: currentInventory.quantity_on_hand,
          new_quantity: newQuantityOnHand,
          reason,
          warehouse_location: warehouseLocation,
          created_by: user.id,
          created_at: new Date(),
        })
        .execute();

      return {
        message: 'Inventory adjusted successfully',
        productId,
        adjustmentType,
        quantity,
        previousQuantity: currentInventory.quantity_on_hand,
        newQuantity: newQuantityOnHand,
      };
    }),

  /**
   * Allocate inventory for order
   * Converts POST /api/v1/inventory/allocate
   */
  allocate: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('INVENTORY_ALLOCATED', 'INVENTORY'))
    .input(AllocationRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { productId, quantity, referenceId } = input;
      const user = ctx.requireAuth();

      // Get current inventory
      const currentInventory = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .select(['quantity_on_hand', 'quantity_allocated', 'quantity_available'])
        .where('product_id', '=', productId)
        .executeTakeFirst();

      if (!currentInventory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Inventory record not found',
        });
      }

      // Check if sufficient quantity is available
      if (currentInventory.quantity_available < quantity) {
        return {
          allocated: false,
          message: 'Insufficient inventory available',
          available: currentInventory.quantity_available,
          requested: quantity,
        };
      }

      const newQuantityAllocated = currentInventory.quantity_allocated + quantity;
      const newQuantityAvailable = currentInventory.quantity_available - quantity;

      // Update inventory
      await ctx.db.queryBuilder
        .updateTable('inventory')
        .set({
          quantity_allocated: newQuantityAllocated,
          quantity_available: newQuantityAvailable,
          updated_at: new Date(),
        })
        .where('product_id', '=', productId)
        .execute();

      // Create stock movement record
      await ctx.db.queryBuilder
        .insertInto('stock_movements')
        .values({
          product_id: productId,
          movement_type: 'ALLOCATION',
          quantity: -quantity, // Negative because it reduces available quantity
          previous_quantity: currentInventory.quantity_available,
          new_quantity: newQuantityAvailable,
          reason: 'Inventory allocated',
          reference_id: referenceId,
          created_by: user.id,
          created_at: new Date(),
        })
        .execute();

      return {
        allocated: true,
        productId,
        quantity,
        referenceId,
        newQuantityAllocated,
        newQuantityAvailable,
      };
    }),

  /**
   * Release allocated inventory
   * Converts POST /api/v1/inventory/release
   */
  release: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .use(activityLoggingMiddleware('INVENTORY_RELEASED', 'INVENTORY'))
    .input(AllocationRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const { productId, quantity, referenceId } = input;
      const user = ctx.requireAuth();

      // Get current inventory
      const currentInventory = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .select(['quantity_on_hand', 'quantity_allocated', 'quantity_available'])
        .where('product_id', '=', productId)
        .executeTakeFirst();

      if (!currentInventory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Inventory record not found',
        });
      }

      const newQuantityAllocated = Math.max(0, currentInventory.quantity_allocated - quantity);
      const newQuantityAvailable = Math.min(
        currentInventory.quantity_on_hand,
        currentInventory.quantity_available + quantity
      );

      // Update inventory
      await ctx.db.queryBuilder
        .updateTable('inventory')
        .set({
          quantity_allocated: newQuantityAllocated,
          quantity_available: newQuantityAvailable,
          updated_at: new Date(),
        })
        .where('product_id', '=', productId)
        .execute();

      // Create stock movement record
      await ctx.db.queryBuilder
        .insertInto('stock_movements')
        .values({
          product_id: productId,
          movement_type: 'RELEASE',
          quantity: quantity, // Positive because it increases available quantity
          previous_quantity: currentInventory.quantity_available,
          new_quantity: newQuantityAvailable,
          reason: 'Inventory released',
          reference_id: referenceId,
          created_by: user.id,
          created_at: new Date(),
        })
        .execute();

      return {
        message: 'Inventory released successfully',
        productId,
        quantity,
        referenceId,
        newQuantityAllocated,
        newQuantityAvailable,
      };
    }),

  /**
   * Get inventory movements
   * Converts GET /api/v1/inventory/movements
   */
  getMovements: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .input(MovementFiltersSchema)
    .output(PagedResponseSchema(StockMovementResponseSchema))
    .query(async ({ input, ctx }) => {
      const { productId, movementType, startDate, endDate, page, limit } = input;
      const offset = (page - 1) * limit;

      let query = ctx.db.queryBuilder
        .selectFrom('stock_movements')
        .leftJoin('products', 'stock_movements.product_id', 'products.id')
        .leftJoin('users', 'stock_movements.created_by', 'users.id');

      // Apply filters
      if (productId) {
        query = query.where('stock_movements.product_id', '=', productId);
      }
      if (movementType) {
        query = query.where('stock_movements.movement_type', '=', movementType);
      }
      if (startDate) {
        query = query.where('stock_movements.created_at', '>=', new Date(startDate));
      }
      if (endDate) {
        query = query.where('stock_movements.created_at', '<=', new Date(endDate));
      }

      // Get total count
      const totalResult = await query
        .select((eb) => eb.fn.count('stock_movements.id').as('count'))
        .executeTakeFirst();

      const total = Number(totalResult?.count || 0);

      // Get movements
      const movements = await query
        .select([
          'stock_movements.id',
          'stock_movements.product_id',
          'products.name as product_name',
          'products.sku as product_sku',
          'stock_movements.movement_type',
          'stock_movements.quantity',
          'stock_movements.previous_quantity',
          'stock_movements.new_quantity',
          'stock_movements.reason',
          'stock_movements.reference_id',
          'stock_movements.warehouse_location',
          'users.email as created_by',
          'stock_movements.created_at',
        ])
        .orderBy('stock_movements.created_at', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return {
        data: movements.map(movement => ({
          id: movement.id,
          productId: movement.product_id,
          productName: movement.product_name || 'Unknown',
          productSku: movement.product_sku || 'Unknown',
          movementType: movement.movement_type,
          quantity: movement.quantity,
          previousQuantity: movement.previous_quantity,
          newQuantity: movement.new_quantity,
          reason: movement.reason,
          referenceId: movement.reference_id,
          warehouseLocation: movement.warehouse_location,
          createdBy: movement.created_by,
          createdAt: movement.created_at.toISOString(),
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
   * Check inventory availability
   * Converts POST /api/v1/inventory/check-availability
   */
  checkAvailability: protectedProcedure
    .use(authMiddleware)
    .input(AvailabilityCheckSchema)
    .query(async ({ input, ctx }) => {
      const { items } = input;
      
      const availabilityResults = await Promise.all(
        items.map(async (item) => {
          const inventory = await ctx.db.queryBuilder
            .selectFrom('inventory')
            .leftJoin('products', 'inventory.product_id', 'products.id')
            .select([
              'inventory.product_id',
              'products.name as product_name',
              'products.sku as product_sku',
              'inventory.quantity_available',
            ])
            .where('inventory.product_id', '=', item.productId)
            .executeTakeFirst();

          const available = inventory?.quantity_available || 0;
          const isAvailable = available >= item.quantity;

          return {
            productId: item.productId,
            productName: inventory?.product_name || 'Unknown',
            productSku: inventory?.product_sku || 'Unknown',
            requestedQuantity: item.quantity,
            availableQuantity: available,
            isAvailable,
            shortfall: isAvailable ? 0 : item.quantity - available,
          };
        })
      );

      const allAvailable = availabilityResults.every(result => result.isAvailable);

      return {
        allAvailable,
        items: availabilityResults,
        summary: {
          totalItems: items.length,
          availableItems: availabilityResults.filter(r => r.isAvailable).length,
          unavailableItems: availabilityResults.filter(r => !r.isAvailable).length,
        },
      };
    }),

  /**
   * Get inventory statistics
   * Converts GET /api/v1/inventory/statistics
   */
  getStatistics: protectedProcedure
    .use(authMiddleware)
    .use(anyRoleMiddleware(['ADMIN', 'MANAGER']))
    .query(async ({ ctx }) => {
      const stats = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          (eb) => eb.fn.count('inventory.id').as('totalProducts'),
          (eb) => eb.fn.sum('inventory.quantity_on_hand').as('totalQuantityOnHand'),
          (eb) => eb.fn.sum('inventory.quantity_allocated').as('totalQuantityAllocated'),
          (eb) => eb.fn.sum('inventory.quantity_available').as('totalQuantityAvailable'),
          (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '=', 0).as('outOfStockCount'),
          (eb) => eb.fn.count('inventory.id').filterWhere('inventory.quantity_available', '<=', eb.ref('products.reorder_level')).as('lowStockCount'),
        ])
        .where('products.active', '=', true)
        .executeTakeFirst();

      // Get inventory valuation
      const valuationResult = await ctx.db.queryBuilder
        .selectFrom('inventory')
        .leftJoin('products', 'inventory.product_id', 'products.id')
        .select([
          (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.cost_price')).as('totalCostValue'),
          (eb) => eb.fn.sum(eb('inventory.quantity_on_hand', '*', 'products.selling_price')).as('totalSellingValue'),
        ])
        .where('products.active', '=', true)
        .executeTakeFirst();

      return {
        totalProducts: Number(stats?.totalProducts || 0),
        totalQuantityOnHand: Number(stats?.totalQuantityOnHand || 0),
        totalQuantityAllocated: Number(stats?.totalQuantityAllocated || 0),
        totalQuantityAvailable: Number(stats?.totalQuantityAvailable || 0),
        outOfStockCount: Number(stats?.outOfStockCount || 0),
        lowStockCount: Number(stats?.lowStockCount || 0),
        valuation: {
          totalCostValue: Number(valuationResult?.totalCostValue || 0),
          totalSellingValue: Number(valuationResult?.totalSellingValue || 0),
          potentialProfit: Number(valuationResult?.totalSellingValue || 0) - Number(valuationResult?.totalCostValue || 0),
        },
      };
    }),
});