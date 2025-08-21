/**
 * Service layer exports
 * Central export point for all business services
 */

// Base services
export * from './base/BaseService';
export * from './base/types';
export * from './base/ServiceContainer';

// Business services
export { UserService } from './business/UserService';
export { ProductService } from './business/ProductService';
export { InventoryService } from './business/InventoryService';
export { OrderService } from './business/OrderService';
export { SupplierService } from './business/SupplierService';
export { CategoryService } from './business/CategoryService';

// Analytics services
export { ReportService } from './analytics/ReportService';

// Service registry and container
export { ServiceRegistry, ServiceContainer } from './base/ServiceContainer';

/**
 * Service factory for creating service instances
 */
export class ServiceFactory {
  private static registry: ServiceRegistry;

  static initialize(context: any) {
    ServiceFactory.registry = ServiceRegistry.getInstance();
    ServiceFactory.registry.initialize(context);
  }

  static getUserService(): UserService {
    return ServiceFactory.registry.getService<UserService>('userService');
  }

  static getProductService(): ProductService {
    return ServiceFactory.registry.getService<ProductService>('productService');
  }

  static getInventoryService(): InventoryService {
    return ServiceFactory.registry.getService<InventoryService>('inventoryService');
  }

  static getOrderService(): OrderService {
    return ServiceFactory.registry.getService<OrderService>('orderService');
  }

  static getSupplierService(): SupplierService {
    return ServiceFactory.registry.getService<SupplierService>('supplierService');
  }

  static getCategoryService(): CategoryService {
    return ServiceFactory.registry.getService<CategoryService>('categoryService');
  }

  static getReportService(): ReportService {
    return ServiceFactory.registry.getService<ReportService>('reportService');
  }
}

/**
 * Service initialization helper
 */
export function initializeServices(context: any) {
  const registry = ServiceRegistry.getInstance();
  registry.initialize(context);

  // Register all services
  const container = registry.getContainer();
  
  container.register('userService', (ctx) => new UserService(ctx));
  container.register('productService', (ctx) => new ProductService(ctx));
  container.register('inventoryService', (ctx) => new InventoryService(ctx));
  container.register('orderService', (ctx) => new OrderService(ctx));
  container.register('supplierService', (ctx) => new SupplierService(ctx));
  container.register('categoryService', (ctx) => new CategoryService(ctx));
  container.register('reportService', (ctx) => new ReportService(ctx));

  return registry;
}