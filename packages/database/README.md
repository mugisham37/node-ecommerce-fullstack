# @ecommerce/database

Database layer package providing Drizzle ORM and Kysely query builder integration for the e-commerce inventory management system.

## Features

- **Dual ORM Approach**: Drizzle ORM for type-safe operations and Kysely for complex queries
- **Connection Management**: Centralized database connection handling with health checks
- **Transaction Support**: Unified transaction management across both ORMs
- **Schema Definitions**: Complete TypeScript schema definitions with relations
- **Database Seeding**: Comprehensive seeding system for development and testing
- **Migration Support**: SQL migrations converted from existing Flyway migrations
- **Backup & Restore**: PowerShell scripts for database backup and restore operations

## Installation

```bash
npm install @ecommerce/database
```

## Usage

### Basic Setup

```typescript
import { createDatabaseConnection, getDatabase } from '@ecommerce/database';

// Create database connection
const db = createDatabaseConnection({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'ecommerce_inventory',
});

// Or use the default instance
const db = getDatabase();
```

### Using Drizzle ORM

```typescript
import { users, products } from '@ecommerce/database';
import { eq } from 'drizzle-orm';

// Simple queries with Drizzle
const allUsers = await db.drizzle.select().from(users);
const user = await db.drizzle.select().from(users).where(eq(users.id, 1));

// Insert with Drizzle
const newUser = await db.drizzle.insert(users).values({
  email: 'user@example.com',
  passwordHash: 'hashed_password',
  firstName: 'John',
  lastName: 'Doe',
  role: 'EMPLOYEE',
}).returning();
```

### Using Kysely Query Builder

```typescript
// Complex queries with Kysely
const productAnalytics = await db.kysely
  .selectFrom('products')
  .leftJoin('inventory', 'products.id', 'inventory.product_id')
  .leftJoin('categories', 'products.category_id', 'categories.id')
  .select([
    'products.name',
    'categories.name as category_name',
    'inventory.quantity_on_hand',
    db.kysely.fn.coalesce('inventory.quantity_on_hand', 0).as('stock_level')
  ])
  .where('products.active', '=', true)
  .execute();
```

### Transaction Management

```typescript
import { createTransactionManager } from '@ecommerce/database';

const txManager = createTransactionManager(db);

// Execute within transaction
const result = await txManager.execute(async ({ drizzle, kysely }) => {
  // Use both ORMs within the same transaction
  const user = await drizzle.insert(users).values(userData).returning();
  await kysely.insertInto('user_activities').values({
    user_id: user[0].id,
    action: 'USER_CREATED',
    status: 'SUCCESS',
  }).execute();
  
  return user[0];
});
```

### Database Seeding

```typescript
import { DatabaseSeeder } from '@ecommerce/database';

const seeder = new DatabaseSeeder();

// Seed development data
await seeder.seed({ environment: 'development' });

// Seed specific tables
await seeder.seed({ 
  environment: 'development', 
  tables: ['users', 'categories'] 
});

// Force reseed
await seeder.seed({ 
  environment: 'development', 
  force: true 
});
```

### Health Checks

```typescript
import { createHealthChecker } from '@ecommerce/database';

const healthChecker = createHealthChecker(db);

// Basic health check
const health = await healthChecker.check();
console.log(health.status); // 'healthy' or 'unhealthy'

// Detailed health check
const detailedHealth = await healthChecker.checkDetailed();
console.log(detailedHealth.details);
```

## Scripts

### Database Operations

```bash
# Build the package
npm run build

# Generate Drizzle migrations
npm run generate

# Apply migrations
npm run migrate

# Open Drizzle Studio
npm run studio

# Seed database
npm run seed

# Backup database
npm run backup

# Restore database
npm run restore
```

### PowerShell Scripts

```powershell
# Backup database (from packages/database directory)
.\scripts\backup.ps1 -Environment dev -BackupType full

# Restore database
.\scripts\restore.ps1 -BackupFile ".\backups\backup.sql" -Environment dev

# Backup with compression
.\scripts\backup.ps1 -Environment prod -BackupType full -Compress

# Create database and restore
.\scripts\restore.ps1 -BackupFile ".\backups\backup.sql" -Environment dev -CreateDatabase
```

## Environment Variables

```env
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=ecommerce_inventory
DB_SSL=false

# Connection pool settings
DB_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=5000
DB_IDLE_TIMEOUT=30000

# Environment-specific settings
STAGING_DB_HOST=staging-db.example.com
STAGING_DB_NAME=ecommerce_inventory_staging
STAGING_DB_USER=postgres
STAGING_DB_PASSWORD=staging_password

PROD_DB_HOST=prod-db.example.com
PROD_DB_NAME=ecommerce_inventory_prod
PROD_DB_USER=postgres
PROD_DB_PASSWORD=prod_password
```

## Schema Overview

The database includes the following main entities:

- **Users**: System users with role-based access
- **Categories**: Hierarchical product categories
- **Suppliers**: Supplier information and contacts
- **Products**: Product catalog with pricing and inventory settings
- **Inventory**: Stock levels and warehouse locations
- **Orders**: Customer orders and order management
- **Order Items**: Individual items within orders
- **Stock Movements**: Audit trail for inventory changes
- **User Activities**: User action logging and audit trail

## Migration Strategy

The package includes SQL migrations converted from the existing Flyway migrations:

1. **V1-V12**: Core schema creation and initial data
2. **Drizzle Migrations**: TypeScript migrations for future changes
3. **Backup/Restore**: PowerShell scripts for data management

## Development

### Adding New Tables

1. Create schema definition in `src/schema/`
2. Add to `src/schema/index.ts`
3. Update `DatabaseSchema` interface
4. Generate migration: `npm run generate`
5. Apply migration: `npm run migrate`

### Adding Seed Data

1. Create seed file in `src/seeds/`
2. Add to `src/seeds/index.ts`
3. Update seeding order if needed

## License

MIT