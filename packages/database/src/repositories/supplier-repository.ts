import { eq, and, or, ilike } from 'drizzle-orm';
import { suppliers } from '../schema/suppliers';
import { BaseRepository, FilterOptions } from './base/base-repository';
import { DatabaseConnection } from '../connection';
import type { Supplier, NewSupplier } from '../schema/suppliers';

export interface SupplierFilters extends FilterOptions {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  search?: string;
}

export interface SupplierUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  status?: string;
}

export interface SupplierWithStats extends Supplier {
  productCount?: number;
  totalOrderValue?: number;
  lastOrderDate?: Date;
}

/**
 * Repository for supplier-related database operations
 */
export class SupplierRepository extends BaseRepository<
  typeof suppliers,
  Supplier,
  NewSupplier,
  SupplierUpdateData
> {
  protected table = suppliers;
  protected tableName = 'suppliers';

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
   * Find supplier by email
   */
  async findByEmail(email: string): Promise<Supplier | null> {
    return await this.findOneBy({ email });
  }

  /**
   * Find suppliers by status
   */
  async findByStatus(status: string): Promise<Supplier[]> {
    return await this.findBy({ status });
  }

  /**
   * Get active suppliers
   */
  async getActiveSuppliers(): Promise<Supplier[]> {
    return await this.findByStatus('active');
  }

  /**
   * Get suppliers with statistics
   */
  async getSuppliersWithStats(): Promise<SupplierWithStats[]> {
    return await this.executeKyselyQuery(async (db) => {
      const data = await db
        .selectFrom('suppliers')
        .leftJoin('products', 'suppliers.id', 'products.supplier_id')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .select([
          'suppliers.id',
          'suppliers.name',
          'suppliers.email',
          'suppliers.phone',
          'suppliers.address',
          'suppliers.contact_person as contactPerson',
          'suppliers.status',
          'suppliers.created_at as createdAt',
          'suppliers.updated_at as updatedAt',
          db.fn.count('products.id').as('productCount'),
          db.fn.sum('order_items.total_price').as('totalOrderValue'),
          db.fn.max('orders.created_at').as('lastOrderDate'),
        ])
        .groupBy([
          'suppliers.id',
          'suppliers.name',
          'suppliers.email',
          'suppliers.phone',
          'suppliers.address',
          'suppliers.contact_person',
          'suppliers.status',
          'suppliers.created_at',
          'suppliers.updated_at',
        ])
        .orderBy('suppliers.name', 'asc')
        .execute();

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        contactPerson: row.contactPerson,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        productCount: Number(row.productCount),
        totalOrderValue: Number(row.totalOrderValue) || 0,
        lastOrderDate: row.lastOrderDate,
      }));
    });
  }

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformance(supplierId: string): Promise<{
    productCount: number;
    totalOrderValue: number;
    averageOrderValue: number;
    orderCount: number;
    lastOrderDate: Date | null;
    topProducts: Array<{ productId: string; productName: string; orderCount: number }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      // Get basic metrics
      const [metrics] = await db
        .selectFrom('suppliers')
        .leftJoin('products', 'suppliers.id', 'products.supplier_id')
        .leftJoin('order_items', 'products.id', 'order_items.product_id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .select([
          db.fn.count('products.id').as('productCount'),
          db.fn.sum('order_items.total_price').as('totalOrderValue'),
          db.fn.avg('order_items.total_price').as('averageOrderValue'),
          db.fn.count('orders.id').as('orderCount'),
          db.fn.max('orders.created_at').as('lastOrderDate'),
        ])
        .where('suppliers.id', '=', supplierId)
        .execute();

      // Get top products
      const topProducts = await db
        .selectFrom('products')
        .innerJoin('order_items', 'products.id', 'order_items.product_id')
        .select([
          'products.id as productId',
          'products.name as productName',
          db.fn.count('order_items.id').as('orderCount'),
        ])
        .where('products.supplier_id', '=', supplierId)
        .groupBy(['products.id', 'products.name'])
        .orderBy('orderCount', 'desc')
        .limit(5)
        .execute();

      return {
        productCount: Number(metrics.productCount),
        totalOrderValue: Number(metrics.totalOrderValue) || 0,
        averageOrderValue: Number(metrics.averageOrderValue) || 0,
        orderCount: Number(metrics.orderCount),
        lastOrderDate: metrics.lastOrderDate,
        topProducts: topProducts.map((product: any) => ({
          productId: product.productId,
          productName: product.productName,
          orderCount: Number(product.orderCount),
        })),
      };
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const filters: FilterOptions = { email };
    
    if (excludeId) {
      filters.id = { operator: 'not', value: excludeId };
    }
    
    return await this.exists(filters);
  }

  /**
   * Override buildWhereConditions to handle supplier-specific filters
   */
  protected buildWhereConditions(filters: SupplierFilters): any[] {
    const conditions = super.buildWhereConditions(filters);
    
    // Handle search across multiple fields
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(suppliers.name, searchTerm),
          ilike(suppliers.email, searchTerm),
          ilike(suppliers.contactPerson, searchTerm),
          ilike(suppliers.phone, searchTerm)
        )
      );
    }
    
    return conditions;
  }
}