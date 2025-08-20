import { DatabaseConnection } from '../connection';
import { SeedOptions } from './index';

export async function seedSuppliers(db: DatabaseConnection, options: SeedOptions): Promise<void> {
  const existingSuppliers = await db.kysely
    .selectFrom('suppliers')
    .select('id')
    .limit(1)
    .execute();

  if (existingSuppliers.length > 0 && !options.force) {
    console.log('Suppliers already exist, skipping seed (use --force to override)');
    return;
  }

  if (options.force) {
    await db.kysely.deleteFrom('suppliers').execute();
  }

  const suppliers = [
    {
      name: 'TechCorp Electronics',
      contact_person: 'John Smith',
      email: 'orders@techcorp.com',
      phone: '+1-555-0101',
      address: '123 Tech Street, Silicon Valley, CA 94000',
      payment_terms: 'Net 30',
      active: true,
    },
    {
      name: 'Fashion Forward Ltd',
      contact_person: 'Sarah Johnson',
      email: 'procurement@fashionforward.com',
      phone: '+1-555-0102',
      address: '456 Fashion Ave, New York, NY 10001',
      payment_terms: 'Net 15',
      active: true,
    },
    {
      name: 'Global Electronics Supply',
      contact_person: 'Mike Chen',
      email: 'sales@globalsupply.com',
      phone: '+1-555-0103',
      address: '789 Supply Chain Blvd, Los Angeles, CA 90001',
      payment_terms: 'Net 45',
      active: true,
    },
    {
      name: 'Home & Garden Wholesale',
      contact_person: 'Lisa Brown',
      email: 'orders@homegardenws.com',
      phone: '+1-555-0104',
      address: '321 Garden Way, Portland, OR 97001',
      payment_terms: 'Net 30',
      active: true,
    },
    {
      name: 'Sports Equipment Direct',
      contact_person: 'Tom Wilson',
      email: 'wholesale@sportsdirect.com',
      phone: '+1-555-0105',
      address: '654 Athletic Drive, Denver, CO 80001',
      payment_terms: 'Net 30',
      active: true,
    },
  ];

  if (options.environment === 'development') {
    // Add more test suppliers for development
    suppliers.push(
      {
        name: 'Test Supplier One',
        contact_person: 'Test Contact',
        email: 'test1@supplier.com',
        phone: '+1-555-9901',
        address: '123 Test Street, Test City, TC 12345',
        payment_terms: 'Net 30',
        active: true,
      },
      {
        name: 'Test Supplier Two',
        contact_person: 'Another Test Contact',
        email: 'test2@supplier.com',
        phone: '+1-555-9902',
        address: '456 Test Avenue, Test Town, TT 67890',
        payment_terms: 'Net 15',
        active: false, // Test inactive supplier
      }
    );
  }

  await db.kysely
    .insertInto('suppliers')
    .values(suppliers)
    .execute();

  console.log(`Seeded ${suppliers.length} suppliers`);
}