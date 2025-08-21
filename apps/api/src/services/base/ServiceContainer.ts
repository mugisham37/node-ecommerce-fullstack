/**
 * Service container for dependency injection
 * Manages service instances and their dependencies
 */

import { ServiceContext } from './BaseService';

export class ServiceContainer {
  private services = new Map<string, any>();
  private context: ServiceContext;

  constructor(context: ServiceContext) {
    this.context = context;
  }

  /**
   * Register a service instance
   */
  register<T>(name: string, serviceFactory: (context: ServiceContext) => T): void {
    this.services.set(name, serviceFactory);
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T {
    const serviceFactory = this.services.get(name);
    if (!serviceFactory) {
      throw new Error(`Service '${name}' not found`);
    }

    // Create service instance with context
    return serviceFactory(this.context);
  }

  /**
   * Check if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Update service context (e.g., for user context changes)
   */
  updateContext(updates: Partial<ServiceContext>): void {
    this.context = { ...this.context, ...updates };
  }
}

/**
 * Service registry for managing service dependencies
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private container: ServiceContainer;

  private constructor() {
    // Will be initialized with proper context
    this.container = new ServiceContainer({} as ServiceContext);
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Initialize the registry with context
   */
  initialize(context: ServiceContext): void {
    this.container = new ServiceContainer(context);
    this.registerServices();
  }

  /**
   * Register all services
   */
  private registerServices(): void {
    // Business services will be registered here
    // Example:
    // this.container.register('userService', (ctx) => new UserService(ctx));
    // this.container.register('productService', (ctx) => new ProductService(ctx));
    // etc.
  }

  /**
   * Get service container
   */
  getContainer(): ServiceContainer {
    return this.container;
  }

  /**
   * Get service by name
   */
  getService<T>(name: string): T {
    return this.container.get<T>(name);
  }
}

/**
 * Service decorator for automatic registration
 */
export function Service(name: string) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    // Register service in the registry
    const registry = ServiceRegistry.getInstance();
    registry.getContainer().register(name, (context) => new constructor(context));
    
    return constructor;
  };
}

/**
 * Inject decorator for dependency injection
 */
export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string) {
    // Define property getter that resolves service from container
    Object.defineProperty(target, propertyKey, {
      get: function () {
        const registry = ServiceRegistry.getInstance();
        return registry.getService(serviceName);
      },
      enumerable: true,
      configurable: true,
    });
  };
}

/**
 * Service factory interface
 */
export interface ServiceFactory<T> {
  create(context: ServiceContext): T;
}

/**
 * Abstract service factory
 */
export abstract class AbstractServiceFactory<T> implements ServiceFactory<T> {
  abstract create(context: ServiceContext): T;
}