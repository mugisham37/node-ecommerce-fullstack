import { createDatabaseConnection } from '../connection';
import { seedUsers } from './users';
import { seedCategories } from './categories';
import { seedSuppliers } from './suppliers';
import { seedProducts } from './products';
import { seedInventory } from './inventory';

export interface SeedOptions {
  environment: 'development' | 'staging' | 'production';
  force?: boolean; // Force reseed even if data exists
  tables?: string[]; // Specific tables to seed
}

export class DatabaseSeeder {
  private db = createDatabaseConnection();

  async seed(options: SeedOptions = { environment: 'development' }): Promise<void> {
    console.log(`🌱 Starting database seeding for ${options.environment} environment...`);

    try {
      // Check if database is healthy
      const isHealthy = await this.db.healthCheck();
      if (!isHealthy) {
        throw new Error('Database is not healthy. Cannot proceed with seeding.');
      }

      // Seed in dependency order
      const seedTasks = [
        { name: 'users', fn: () => seedUsers(this.db, options) },
        { name: 'categories', fn: () => seedCategories(this.db, options) },
        { name: 'suppliers', fn: () => seedSuppliers(this.db, options) },
        { name: 'products', fn: () => seedProducts(this.db, options) },
        { name: 'inventory', fn: () => seedInventory(this.db, options) },
      ];

      for (const task of seedTasks) {
        if (options.tables && !options.tables.includes(task.name)) {
          console.log(`⏭️  Skipping ${task.name} (not in specified tables)`);
          continue;
        }

        console.log(`🌱 Seeding ${task.name}...`);
        await task.fn();
        console.log(`✅ Completed seeding ${task.name}`);
      }

      console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async clearData(tables?: string[]): Promise<void> {
    console.log('🧹 Clearing database data...');

    const clearOrder = ['inventory', 'products', 'suppliers', 'categories', 'users'];
    
    for (const table of clearOrder) {
      if (tables && !tables.includes(table)) {
        continue;
      }

      try {
        await this.db.kysely
          .deleteFrom(table as any)
          .execute();
        console.log(`✅ Cleared ${table} table`);
      } catch (error) {
        console.warn(`⚠️  Failed to clear ${table}:`, error);
      }
    }

    console.log('🧹 Data clearing completed');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const environment = (args[0] as SeedOptions['environment']) || 'development';
  const force = args.includes('--force');
  const tables = args.find(arg => arg.startsWith('--tables='))?.split('=')[1]?.split(',');

  const seeder = new DatabaseSeeder();
  
  if (args.includes('--clear')) {
    seeder.clearData(tables)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    seeder.seed({ environment, force, tables })
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}

export { seedUsers, seedCategories, seedSuppliers, seedProducts, seedInventory };