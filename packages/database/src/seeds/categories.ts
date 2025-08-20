import { DatabaseConnection } from '../connection';
import { SeedOptions } from './index';

export async function seedCategories(db: DatabaseConnection, options: SeedOptions): Promise<void> {
  const existingCategories = await db.kysely
    .selectFrom('categories')
    .select('id')
    .limit(1)
    .execute();

  if (existingCategories.length > 0 && !options.force) {
    console.log('Categories already exist, skipping seed (use --force to override)');
    return;
  }

  if (options.force) {
    await db.kysely.deleteFrom('categories').execute();
  }

  // Root categories
  const rootCategories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      parent_id: null,
      sort_order: 1,
      active: true,
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and fashion items',
      parent_id: null,
      sort_order: 2,
      active: true,
    },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and garden supplies',
      parent_id: null,
      sort_order: 3,
      active: true,
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
      parent_id: null,
      sort_order: 4,
      active: true,
    },
  ];

  const insertedRootCategories = await db.kysely
    .insertInto('categories')
    .values(rootCategories)
    .returning('id')
    .execute();

  // Sub-categories
  const subCategories = [
    // Electronics subcategories
    {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      parent_id: insertedRootCategories[0].id,
      sort_order: 1,
      active: true,
    },
    {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Portable computers',
      parent_id: insertedRootCategories[0].id,
      sort_order: 2,
      active: true,
    },
    {
      name: 'Audio',
      slug: 'audio',
      description: 'Headphones, speakers, and audio equipment',
      parent_id: insertedRootCategories[0].id,
      sort_order: 3,
      active: true,
    },
    // Clothing subcategories
    {
      name: 'Men\'s Clothing',
      slug: 'mens-clothing',
      description: 'Clothing for men',
      parent_id: insertedRootCategories[1].id,
      sort_order: 1,
      active: true,
    },
    {
      name: 'Women\'s Clothing',
      slug: 'womens-clothing',
      description: 'Clothing for women',
      parent_id: insertedRootCategories[1].id,
      sort_order: 2,
      active: true,
    },
    {
      name: 'Shoes',
      slug: 'shoes',
      description: 'Footwear for all occasions',
      parent_id: insertedRootCategories[1].id,
      sort_order: 3,
      active: true,
    },
  ];

  await db.kysely
    .insertInto('categories')
    .values(subCategories)
    .execute();

  console.log(`Seeded ${rootCategories.length + subCategories.length} categories`);
}