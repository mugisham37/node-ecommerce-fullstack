import { DatabaseConnection } from '../connection';
import { SeedOptions } from './index';

export async function seedProducts(db: DatabaseConnection, options: SeedOptions): Promise<void> {
  const existingProducts = await db.kysely
    .selectFrom('products')
    .select('id')
    .limit(1)
    .execute();

  if (existingProducts.length > 0 && !options.force) {
    console.log('Products already exist, skipping seed (use --force to override)');
    return;
  }

  // Get categories and suppliers for foreign keys
  const categories = await db.kysely
    .selectFrom('categories')
    .select(['id', 'slug'])
    .execute();

  const suppliers = await db.kysely
    .selectFrom('suppliers')
    .select(['id', 'name'])
    .execute();

  if (categories.length === 0 || suppliers.length === 0) {
    throw new Error('Categories and suppliers must be seeded before products');
  }

  const getCategoryId = (slug: string) => categories.find(c => c.slug === slug)?.id;
  const getSupplierId = (name: string) => suppliers.find(s => s.name.includes(name))?.id;

  if (options.force) {
    await db.kysely.deleteFrom('products').execute();
  }

  const products = [
    // Electronics
    {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      sku: 'APPLE-IP15P-128',
      description: 'Latest iPhone with advanced camera system and A17 Pro chip',
      category_id: getCategoryId('smartphones'),
      supplier_id: getSupplierId('TechCorp'),
      cost_price: 800.00,
      selling_price: 999.00,
      reorder_level: 10,
      reorder_quantity: 50,
      active: true,
    },
    {
      name: 'MacBook Pro 14"',
      slug: 'macbook-pro-14',
      sku: 'APPLE-MBP14-512',
      description: '14-inch MacBook Pro with M3 chip and 512GB storage',
      category_id: getCategoryId('laptops'),
      supplier_id: getSupplierId('TechCorp'),
      cost_price: 1800.00,
      selling_price: 1999.00,
      reorder_level: 5,
      reorder_quantity: 20,
      active: true,
    },
    {
      name: 'Sony WH-1000XM5',
      slug: 'sony-wh1000xm5',
      sku: 'SONY-WH1000XM5-BK',
      description: 'Premium noise-canceling wireless headphones',
      category_id: getCategoryId('audio'),
      supplier_id: getSupplierId('Global Electronics'),
      cost_price: 280.00,
      selling_price: 399.00,
      reorder_level: 15,
      reorder_quantity: 30,
      active: true,
    },
    // Clothing
    {
      name: 'Men\'s Cotton T-Shirt',
      slug: 'mens-cotton-tshirt',
      sku: 'CLOTH-MTSH-001',
      description: '100% cotton comfortable t-shirt for men',
      category_id: getCategoryId('mens-clothing'),
      supplier_id: getSupplierId('Fashion Forward'),
      cost_price: 8.00,
      selling_price: 19.99,
      reorder_level: 50,
      reorder_quantity: 200,
      active: true,
    },
    {
      name: 'Women\'s Summer Dress',
      slug: 'womens-summer-dress',
      sku: 'CLOTH-WDRS-001',
      description: 'Elegant summer dress for women',
      category_id: getCategoryId('womens-clothing'),
      supplier_id: getSupplierId('Fashion Forward'),
      cost_price: 25.00,
      selling_price: 59.99,
      reorder_level: 20,
      reorder_quantity: 100,
      active: true,
    },
    {
      name: 'Running Shoes',
      slug: 'running-shoes',
      sku: 'SHOE-RUN-001',
      description: 'Comfortable running shoes for all terrains',
      category_id: getCategoryId('shoes'),
      supplier_id: getSupplierId('Sports Equipment'),
      cost_price: 45.00,
      selling_price: 89.99,
      reorder_level: 25,
      reorder_quantity: 75,
      active: true,
    },
  ];

  if (options.environment === 'development') {
    // Add more test products for development
    products.push(
      {
        name: 'Test Product One',
        slug: 'test-product-one',
        sku: 'TEST-PROD-001',
        description: 'This is a test product for development',
        category_id: getCategoryId('electronics'),
        supplier_id: suppliers[0].id,
        cost_price: 10.00,
        selling_price: 19.99,
        reorder_level: 5,
        reorder_quantity: 25,
        active: true,
      },
      {
        name: 'Test Product Two',
        slug: 'test-product-two',
        sku: 'TEST-PROD-002',
        description: 'Another test product for development',
        category_id: getCategoryId('clothing'),
        supplier_id: suppliers[1].id,
        cost_price: 15.00,
        selling_price: 29.99,
        reorder_level: 10,
        reorder_quantity: 50,
        active: false, // Test inactive product
      }
    );
  }

  await db.kysely
    .insertInto('products')
    .values(products)
    .execute();

  console.log(`Seeded ${products.length} products`);
}