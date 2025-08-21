import { DatabaseConnection } from '../../connection';
import { UserRepository } from '../user-repository';
import { ProductRepository } from '../product-repository';
import { CategoryRepository } from '../category-repository';
import { SupplierRepository } from '../supplier-repository';
import { InventoryRepository } from '../inventory-repository';
import { OrderRepository } from '../order-repository';
import { OrderItemRepository } from '../order-item-repository';
import { StockMovementRepository } from '../stock-movement-repository';
import { UserActivityRepository } from '../user-activity-repository';

/**
 * Repository factory for creating and managing repository instances
 */
export class RepositoryFactory {
  private db: DatabaseConnection;
  private repositories: Map<string, any> = new Map();

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Get or create a user repository
   */
  getUserRepository(): UserRepository {
    if (!this.repositories.has('user')) {
      this.repositories.set('user', new UserRepository(this.db));
    }
    return this.repositories.get('user');
  }

  /**
   * Get or create a product repository
   */
  getProductRepository(): ProductRepository {
    if (!this.repositories.has('product')) {
      this.repositories.set('product', new ProductRepository(this.db));
    }
    return this.repositories.get('product');
  }

  /**
   * Get or create a category repository
   */
  getCategoryRepository(): CategoryRepository {
    if (!this.repositories.has('category')) {
      this.repositories.set('category', new CategoryRepository(this.db));
    }
    return this.repositories.get('category');
  }

  /**
   * Get or create a supplier repository
   */
  getSupplierRepository(): SupplierRepository {
    if (!this.repositories.has('supplier')) {
      this.repositories.set('supplier', new SupplierRepository(this.db));
    }
    return this.repositories.get('supplier');
  }

  /**
   * Get or create an inventory repository
   */
  getInventoryRepository(): InventoryRepository {
    if (!this.repositories.has('inventory')) {
      this.repositories.set('inventory', new InventoryRepository(this.db));
    }
    return this.repositories.get('inventory');
  }

  /**
   * Get or create an order repository
   */
  getOrderRepository(): OrderRepository {
    if (!this.repositories.has('order')) {
      this.repositories.set('order', new OrderRepository(this.db));
    }
    return this.repositories.get('order');
  }

  /**
   * Get or create an order item repository
   */
  getOrderItemRepository(): OrderItemRepository {
    if (!this.repositories.has('orderItem')) {
      this.repositories.set('orderItem', new OrderItemRepository(this.db));
    }
    return this.repositories.get('orderItem');
  }

  /**
   * Get or create a stock movement repository
   */
  getStockMovementRepository(): StockMovementRepository {
    if (!this.repositories.has('stockMovement')) {
      this.repositories.set('stockMovement', new StockMovementRepository(this.db));
    }
    return this.repositories.get('stockMovement');
  }

  /**
   * Get or create a user activity repository
   */
  getUserActivityRepository(): UserActivityRepository {
    if (!this.repositories.has('userActivity')) {
      this.repositories.set('userActivity', new UserActivityRepository(this.db));
    }
    return this.repositories.get('userActivity');
  }

  /**
   * Clear all cached repositories
   */
  clearCache(): void {
    this.repositories.clear();
  }

  /**
   * Get all repositories as an object
   */
  getAllRepositories() {
    return {
      users: this.getUserRepository(),
      products: this.getProductRepository(),
      categories: this.getCategoryRepository(),
      suppliers: this.getSupplierRepository(),
      inventory: this.getInventoryRepository(),
      orders: this.getOrderRepository(),
      orderItems: this.getOrderItemRepository(),
      stockMovements: this.getStockMovementRepository(),
      userActivities: this.getUserActivityRepository(),
    };
  }
}

/**
 * Create a repository factory instance
 */
export function createRepositoryFactory(db: DatabaseConnection): RepositoryFactory {
  return new RepositoryFactory(db);
}