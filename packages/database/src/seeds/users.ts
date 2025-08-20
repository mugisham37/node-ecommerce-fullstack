import { DatabaseConnection } from '../connection';
import { SeedOptions } from './index';

export async function seedUsers(db: DatabaseConnection, options: SeedOptions): Promise<void> {
  const existingUsers = await db.kysely
    .selectFrom('users')
    .select('id')
    .limit(1)
    .execute();

  if (existingUsers.length > 0 && !options.force) {
    console.log('Users already exist, skipping seed (use --force to override)');
    return;
  }

  const users = [
    {
      email: 'admin@ecommerce.com',
      password_hash: '$2b$10$rQZ8kHWiZ8.qhJ5FqJ5FqOzJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5F', // password: admin123
      first_name: 'System',
      last_name: 'Administrator',
      role: 'ADMIN',
      active: true,
    },
    {
      email: 'manager@ecommerce.com',
      password_hash: '$2b$10$rQZ8kHWiZ8.qhJ5FqJ5FqOzJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5F', // password: manager123
      first_name: 'Store',
      last_name: 'Manager',
      role: 'MANAGER',
      active: true,
    },
    {
      email: 'employee@ecommerce.com',
      password_hash: '$2b$10$rQZ8kHWiZ8.qhJ5FqJ5FqOzJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5F', // password: employee123
      first_name: 'Store',
      last_name: 'Employee',
      role: 'EMPLOYEE',
      active: true,
    },
  ];

  if (options.environment === 'development') {
    // Add more test users for development
    users.push(
      {
        email: 'test1@example.com',
        password_hash: '$2b$10$rQZ8kHWiZ8.qhJ5FqJ5FqOzJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5F',
        first_name: 'Test',
        last_name: 'User One',
        role: 'EMPLOYEE',
        active: true,
      },
      {
        email: 'test2@example.com',
        password_hash: '$2b$10$rQZ8kHWiZ8.qhJ5FqJ5FqOzJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5FqJ5F',
        first_name: 'Test',
        last_name: 'User Two',
        role: 'MANAGER',
        active: true,
      }
    );
  }

  if (options.force) {
    await db.kysely.deleteFrom('users').execute();
  }

  await db.kysely
    .insertInto('users')
    .values(users)
    .execute();

  console.log(`Seeded ${users.length} users`);
}