import { DatabaseConnection } from '../connection';
import { SeedOptions } from './index';

export async function seedInventory(db: DatabaseConnection, options: SeedOptions): Promise<void> {
  const existingInventory = await db.kysely
    .selectFrom('inventory')
    .select('id')
    .limit(1)
    .execute();

  if (existingInventory.length > 0 && !options.force) {
    console.log('Inventory already exists, skipping seed (use --force to override)');
    return;
  }

  // Get all products for inventory creation
  const products = await db.kysely
    .selectFrom('products')
    .select(['id', 'sku', 'reorder_level'])
    .execute();

  if (products.length === 0) {
    throw new Error('Products must be seeded before inventory');
  }

  if (options.force) {
    await db.kysely.deleteFrom('inventory').execute();
  }

  const inventory = products.map((product, index) => {
    // Generate realistic inventory levels
    const baseQuantity = options.environment === 'development' ? 100 : 500;
    const randomMultiplier = Math.random() * 2 + 0.5; // 0.5 to 2.5
    const quantity = Math.floor(baseQuantity * randomMultiplier);
    
    // Some products might be low stock for testing
    const isLowStock = index % 7 === 0; // Every 7th product is low stock
    const finalQuantity = isLowStock ? Math.floor(product.reorder_level * 0.5) : quantity;

    return {
      product_id: product.id,
      quantity_on_hand: finalQuantity,
      quantity_reserved: Math.floor(finalQuantity * 0.1), // 10% reserved
      quantity_available: Math.floor(finalQuantity * 0.9), // 90% available
      last_updated: new Date(),
    };
  });

  await db.kysely
    .insertInto('inventory')
    .values(inventory)
    .execute();

  // Create some initial stock movements for realistic data
  const stockMovements = [];
  for (let i = 0; i < Math.min(products.length, 20); i++) {
    const product = products[i];
    const inventoryRecord = inventory[i];
    
    // Initial stock receipt
    stockMovements.push({
      product_id: product.id,
      movement_type: 'IN',
      quantity: inventoryRecord.quantity_on_hand,
      reference_type: 'INITIAL_STOCK',
      reference_id: null,
      notes: 'Initial stock setup',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    });

    // Some recent adjustments
    if (i % 3 === 0) {
      stockMovements.push({
        product_id: product.id,
        movement_type: 'ADJUSTMENT',
        quantity: Math.floor(Math.random() * 20) - 10, // -10 to +10
        reference_type: 'STOCK_ADJUSTMENT',
        reference_id: null,
        notes: 'Stock count adjustment',
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last 7 days
      });
    }
  }

  if (stockMovements.length > 0) {
    await db.kysely
      .insertInto('stock_movements')
      .values(stockMovements)
      .execute();
  }

  console.log(`Seeded inventory for ${products.length} products with ${stockMovements.length} stock movements`);
}