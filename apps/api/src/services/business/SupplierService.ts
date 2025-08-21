/**
 * Supplier Relationship Management Service with comprehensive supplier lifecycle management
 * Handles supplier CRUD operations, performance tracking, and analytics
 * Converted from Java Spring Boot SupplierService
 */

import { AbstractBaseService, ServiceContext, PaginationOptions, PagedResult } from '../base/BaseService';
import { 
  Supplier, 
  SupplierCreateDTO, 
  SupplierUpdateDTO,
  SupplierStatus,
  NotFoundError,
  ConflictError,
  ValidationError 
} from '../base/types';

export interface SupplierResponse {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  status: SupplierStatus;
  statusDescription: string;
  totalProductCount: number;
  activeProductCount: number;
  isActive: boolean;
  canBeDeleted: boolean;
  hasCompleteContactInfo: boolean;
  primaryContact: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierSummaryResponse {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: SupplierStatus;
  statusDescription: string;
  totalProductCount: number;
  activeProductCount: number;
  isActive: boolean;
  primaryContact: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierPerformanceResponse {
  supplierId: string;
  supplierName: string;
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalOrderValue: number;
  averageOrderValue: number;
  orderCompletionRate: number;
  orderCancellationRate: number;
  averageDeliveryDays: number;
  totalReturns: number;
  returnRate: number;
  qualityScore: number;
  totalPurchaseValue: number;
  averagePurchasePrice: number;
  totalSavings: number;
  firstOrderDate?: Date;
  lastOrderDate?: Date;
  daysSinceLastOrder?: number;
  performanceRating: string;
  recommendations: string;
}

export interface SupplierStatusUpdateRequest {
  newStatus: SupplierStatus;
  reason?: string;
}

export interface SupplierFilters {
  name?: string;
  email?: string;
  status?: SupplierStatus;
}

export class SupplierService extends AbstractBaseService<Supplier, SupplierCreateDTO, SupplierUpdateDTO> {
  constructor(context: ServiceContext) {
    super(context, 'Supplier');
  }

  /**
   * Create a new supplier
   */
  async create(request: SupplierCreateDTO): Promise<SupplierResponse> {
    this.log('info', `Creating new supplier: ${request.name}`);

    // Check if supplier with same name already exists
    const existingSupplier = await this.findByName(request.name);
    if (existingSupplier) {
      throw new ConflictError(`Supplier with name '${request.name}' already exists`);
    }

    // Create supplier entity
    const supplierData = {
      id: this.generateId(),
      name: request.name,
      contactPerson: request.contactPerson,
      email: request.email,
      phone: request.phone,
      address: request.address,
      paymentTerms: request.paymentTerms,
      status: SupplierStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedSupplier = await this.saveSupplier(supplierData);

    // Publish supplier created event
    await this.publishEvent('SUPPLIER_CREATED', {
      supplierId: savedSupplier.id,
      supplierName: savedSupplier.name,
    });

    // Update cache
    const response = await this.convertToSupplierResponse(savedSupplier);
    await this.warmSupplierCache(response);

    this.log('info', `Successfully created supplier with ID: ${savedSupplier.id}`);
    return response;
  }

  /**
   * Update supplier information
   */
  async update(id: string, request: SupplierUpdateDTO): Promise<SupplierResponse> {
    this.log('info', `Updating supplier with ID: ${id}`);

    const supplier = await this.findById(id);
    if (!supplier) {
      throw new NotFoundError('Supplier', id);
    }

    // Check if new name conflicts with existing supplier
    if (request.name && request.name !== supplier.name) {
      const existingSupplier = await this.findByName(request.name);
      if (existingSupplier) {
        throw new ConflictError(`Supplier with name '${request.name}' already exists`);
      }
    }

    // Update supplier fields
    const updatedData = {
      ...supplier,
      ...request,
      updatedAt: new Date(),
    };

    const updatedSupplier = await this.saveSupplier(updatedData);

    // Publish supplier updated event
    await this.publishEvent('SUPPLIER_UPDATED', {
      supplierId: updatedSupplier.id,
      supplierName: updatedSupplier.name,
      changes: request,
    });

    // Update cache
    const response = await this.convertToSupplierResponse(updatedSupplier);
    await this.warmSupplierCache(response);

    this.log('info', `Successfully updated supplier with ID: ${id}`);
    return response;
  }

  /**
   * Update supplier status with business rule validation
   */
  async updateSupplierStatus(id: string, request: SupplierStatusUpdateRequest): Promise<SupplierResponse> {
    this.log('info', `Updating supplier status for ID: ${id} to ${request.newStatus}`);

    const supplier = await this.findById(id);
    if (!supplier) {
      throw new NotFoundError('Supplier', id);
    }

    const previousStatus = supplier.status;

    // Validate status change based on business rules
    this.validateStatusChange(supplier, request.newStatus, request.reason);

    // Update status
    const updatedData = {
      ...supplier,
      status: request.newStatus,
      updatedAt: new Date(),
    };

    const updatedSupplier = await this.saveSupplier(updatedData);

    // Handle status-specific business logic
    await this.handleStatusChange(updatedSupplier, previousStatus, request.newStatus, request.reason);

    // Publish status change event
    await this.publishEvent('SUPPLIER_STATUS_CHANGED', {
      supplierId: updatedSupplier.id,
      previousStatus,
      newStatus: request.newStatus,
      reason: request.reason,
    });

    // Update cache
    const response = await this.convertToSupplierResponse(updatedSupplier);
    await this.warmSupplierCache(response);

    this.log('info', `Successfully updated supplier status for ID: ${id} from ${previousStatus} to ${request.newStatus}`);
    return response;
  }

  /**
   * Get supplier by ID with caching
   */
  async findById(id: string): Promise<Supplier> {
    const cacheKey = this.getCacheKey('findById', id);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const supplier = await this.querySupplierById(id);
    if (!supplier) {
      throw new NotFoundError('Supplier', id);
    }

    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, supplier, 300); // 5 minutes TTL
    }

    return supplier;
  }

  /**
   * Find supplier by name
   */
  async findByName(name: string): Promise<Supplier | null> {
    const cacheKey = this.getCacheKey('findByName', name);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Query database
    const supplier = await this.querySupplierByName(name);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, supplier, 300); // 5 minutes TTL
    }

    return supplier;
  }

  /**
   * Get all active suppliers with caching
   */
  async getActiveSuppliers(pagination: PaginationOptions): Promise<PagedResult<SupplierSummaryResponse>> {
    this.log('debug', `Fetching active suppliers, page: ${pagination.page}, size: ${pagination.limit}`);

    const cacheKey = this.getCacheKey('activeSuppliers', pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.querySuppliersByStatus(SupplierStatus.ACTIVE, pagination);
    
    // Convert to summary responses
    const summaryResult = {
      ...result,
      data: await Promise.all(result.data.map(supplier => this.convertToSupplierSummaryResponse(supplier)))
    };
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, summaryResult, 300);
    }

    return summaryResult;
  }

  /**
   * Get suppliers by status with caching
   */
  async getSuppliersByStatus(status: SupplierStatus, pagination: PaginationOptions): Promise<PagedResult<SupplierSummaryResponse>> {
    this.log('debug', `Fetching suppliers with status: ${status}`);

    const cacheKey = this.getCacheKey('byStatus', status, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.querySuppliersByStatus(status, pagination);
    
    // Convert to summary responses
    const summaryResult = {
      ...result,
      data: await Promise.all(result.data.map(supplier => this.convertToSupplierSummaryResponse(supplier)))
    };
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, summaryResult, 300);
    }

    return summaryResult;
  }

  /**
   * Search suppliers with caching
   */
  async searchSuppliers(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<SupplierSummaryResponse>> {
    this.log('debug', `Searching suppliers with term: ${searchTerm}`);

    const cacheKey = this.getCacheKey('search', searchTerm, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Query database
    const result = await this.querySearchSuppliers(searchTerm, pagination);
    
    // Convert to summary responses
    const summaryResult = {
      ...result,
      data: await Promise.all(result.data.map(supplier => this.convertToSupplierSummaryResponse(supplier)))
    };
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, summaryResult, 180); // 3 minutes TTL
    }

    return summaryResult;
  }

  /**
   * Get supplier performance tracking and analytics
   */
  async getSupplierPerformance(id: string): Promise<SupplierPerformanceResponse> {
    this.log('debug', `Generating performance analytics for supplier ID: ${id}`);

    const cacheKey = this.getCacheKey('performance', id);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const supplier = await this.findById(id);
    if (!supplier) {
      throw new NotFoundError('Supplier', id);
    }

    const performance = await this.generateSupplierPerformanceAnalytics(supplier);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, performance, 600); // 10 minutes TTL
    }

    return performance;
  }

  /**
   * Get all supplier performance analytics
   */
  async getAllSupplierPerformance(): Promise<SupplierPerformanceResponse[]> {
    this.log('debug', 'Generating performance analytics for all suppliers');

    const cacheKey = this.getCacheKey('allPerformance');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const suppliers = await this.querySuppliersByStatus(SupplierStatus.ACTIVE);
    const performances = await Promise.all(
      suppliers.map(supplier => this.generateSupplierPerformanceAnalytics(supplier))
    );
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, performances, 600);
    }

    return performances;
  }

  /**
   * Get suppliers with low performance
   */
  async getLowPerformanceSuppliers(): Promise<SupplierPerformanceResponse[]> {
    this.log('debug', 'Finding suppliers with low performance');

    const cacheKey = this.getCacheKey('lowPerformance');
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const allPerformances = await this.getAllSupplierPerformance();
    const lowPerformance = allPerformances.filter(performance => 
      performance.performanceRating === 'POOR' || performance.performanceRating === 'AVERAGE'
    );
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, lowPerformance, 600);
    }

    return lowPerformance;
  }

  /**
   * Add supplier-product relationship management
   */
  async addProductToSupplier(supplierId: string, productId: string): Promise<void> {
    this.log('info', `Adding product ${productId} to supplier ${supplierId}`);

    const supplier = await this.findById(supplierId);
    if (!supplier) {
      throw new NotFoundError('Supplier', supplierId);
    }

    if (!this.isActive(supplier)) {
      throw new ValidationError('Cannot add products to inactive supplier');
    }

    // Update product supplier relationship
    await this.updateProductSupplier(productId, supplierId);

    // Publish event
    await this.publishEvent('SUPPLIER_PRODUCT_ADDED', {
      supplierId,
      productId,
    });

    // Invalidate caches
    await this.invalidateSupplierCaches(supplierId);

    this.log('info', `Successfully added product ${productId} to supplier ${supplierId}`);
  }

  /**
   * Remove supplier-product relationship
   */
  async removeProductFromSupplier(supplierId: string, productId: string): Promise<void> {
    this.log('info', `Removing product ${productId} from supplier ${supplierId}`);

    // Check if product has pending orders
    const hasPendingOrders = await this.checkProductPendingOrders(productId);
    if (hasPendingOrders) {
      throw new ValidationError('Cannot remove product with pending orders from supplier');
    }

    // Remove product supplier relationship
    await this.updateProductSupplier(productId, null);

    // Publish event
    await this.publishEvent('SUPPLIER_PRODUCT_REMOVED', {
      supplierId,
      productId,
    });

    // Invalidate caches
    await this.invalidateSupplierCaches(supplierId);

    this.log('info', `Successfully removed product ${productId} from supplier ${supplierId}`);
  }

  /**
   * Get products by supplier
   */
  async getProductsBySupplier(supplierId: string, pagination: PaginationOptions): Promise<PagedResult<any>> {
    this.log('debug', `Fetching products for supplier ID: ${supplierId}`);

    const cacheKey = this.getCacheKey('products', supplierId, pagination.page, pagination.limit);
    
    // Try cache first
    if (this.context.cache) {
      const cached = await this.context.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Verify supplier exists
    await this.findById(supplierId);

    // Query database
    const result = await this.queryProductsBySupplier(supplierId, pagination);
    
    // Cache result
    if (this.context.cache) {
      await this.context.cache.set(cacheKey, result, 300);
    }

    return result;
  }

  /**
   * Get all suppliers with filtering
   */
  async getAllSuppliers(filters: SupplierFilters, pagination: PaginationOptions): Promise<PagedResult<SupplierResponse>> {
    this.log('debug', 'Fetching suppliers with filters', filters);
    
    const result = await this.querySuppliersWithFilters(filters, pagination);
    
    // Convert to full responses
    const fullResult = {
      ...result,
      data: await Promise.all(result.data.map(supplier => this.convertToSupplierResponse(supplier)))
    };

    return fullResult;
  }

  /**
   * Get all suppliers with pagination
   */
  async findAll(pagination: PaginationOptions): Promise<PagedResult<Supplier>> {
    const result = await this.queryAllSuppliers(pagination);
    return result;
  }

  /**
   * Delete supplier (soft delete)
   */
  async delete(id: string): Promise<void> {
    this.log('info', `Deleting supplier with ID: ${id}`);

    const supplier = await this.findById(id);
    if (!supplier) {
      throw new NotFoundError('Supplier', id);
    }

    // Check if supplier can be deleted
    const canDelete = await this.canDeleteSupplier(id);
    if (!canDelete) {
      throw new ValidationError('Supplier cannot be deleted due to existing dependencies');
    }

    // Soft delete
    await this.softDeleteSupplier(id);

    // Remove from cache
    await this.evictSupplierFromCache(id, supplier.name);

    // Publish event
    await this.publishEvent('SUPPLIER_DELETED', {
      supplierId: id,
      supplierName: supplier.name,
      deletedBy: this.getCurrentUserId(),
    });

    this.log('info', `Successfully deleted supplier with ID: ${id}`);
  }

  // Private helper methods

  private generateId(): string {
    return `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isActive(supplier: Supplier): boolean {
    return supplier.status === SupplierStatus.ACTIVE;
  }

  private validateStatusChange(supplier: Supplier, newStatus: SupplierStatus, reason?: string): void {
    if (supplier.status === newStatus) {
      throw new ValidationError(`Supplier is already in ${newStatus} status`);
    }

    // Business rule: Cannot activate supplier without complete contact info
    if (newStatus === SupplierStatus.ACTIVE && !this.hasCompleteContactInfo(supplier)) {
      throw new ValidationError('Cannot activate supplier without complete contact information');
    }

    // Business rule: Must provide reason for suspension
    if (newStatus === SupplierStatus.SUSPENDED && (!reason || reason.trim().length === 0)) {
      throw new ValidationError('Reason is required when suspending a supplier');
    }
  }

  private async handleStatusChange(supplier: Supplier, previousStatus: SupplierStatus, newStatus: SupplierStatus, reason?: string): Promise<void> {
    switch (newStatus) {
      case SupplierStatus.INACTIVE:
        this.log('info', `Supplier ${supplier.id} deactivated. Consider reviewing associated products.`);
        break;
      case SupplierStatus.SUSPENDED:
        this.log('info', `Supplier ${supplier.id} suspended. Reason: ${reason}`);
        break;
      case SupplierStatus.ACTIVE:
        this.log('info', `Supplier ${supplier.id} activated.`);
        break;
    }
  }

  private hasCompleteContactInfo(supplier: Supplier): boolean {
    return !!(supplier.email || supplier.phone) && !!supplier.contactPerson;
  }

  private async generateSupplierPerformanceAnalytics(supplier: Supplier): Promise<SupplierPerformanceResponse> {
    // Get product metrics
    const totalProducts = await this.getTotalProductCount(supplier.id);
    const activeProducts = await this.getActiveProductCount(supplier.id);
    const inactiveProducts = totalProducts - activeProducts;

    // Get order metrics (placeholder values - would require complex queries in real implementation)
    const totalOrders = 0;
    const completedOrders = 0;
    const cancelledOrders = 0;
    const totalOrderValue = 0;
    const averageOrderValue = 0;

    // Calculate performance metrics
    const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const orderCancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Quality metrics
    const totalReturns = 0; // Would be calculated from actual data
    const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
    const qualityScore = this.calculateQualityScore(orderCompletionRate, returnRate);

    // Performance rating
    const performanceRating = this.calculatePerformanceRating(qualityScore, orderCompletionRate, returnRate);
    const recommendations = this.generateRecommendations(supplier, performanceRating, orderCompletionRate, returnRate);

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalProducts,
      activeProducts,
      inactiveProducts,
      totalOrders,
      completedOrders,
      cancelledOrders,
      totalOrderValue,
      averageOrderValue,
      orderCompletionRate,
      orderCancellationRate,
      averageDeliveryDays: 0, // Would be calculated from actual data
      totalReturns,
      returnRate,
      qualityScore,
      totalPurchaseValue: 0, // Would be calculated from actual data
      averagePurchasePrice: 0, // Would be calculated from actual data
      totalSavings: 0, // Would be calculated from actual data
      firstOrderDate: undefined, // Would be calculated from actual data
      lastOrderDate: undefined, // Would be calculated from actual data
      daysSinceLastOrder: undefined,
      performanceRating,
      recommendations,
    };
  }

  private calculateQualityScore(completionRate: number, returnRate: number): number {
    // Simple scoring algorithm - can be made more sophisticated
    let score = 100.0;
    score -= (100.0 - completionRate) * 0.5; // Completion rate impact
    score -= returnRate * 2.0; // Return rate impact (higher penalty)
    return Math.max(0.0, Math.min(100.0, score));
  }

  private calculatePerformanceRating(qualityScore: number, completionRate: number, returnRate: number): string {
    if (qualityScore >= 90 && completionRate >= 95 && returnRate <= 2) {
      return 'EXCELLENT';
    } else if (qualityScore >= 75 && completionRate >= 85 && returnRate <= 5) {
      return 'GOOD';
    } else if (qualityScore >= 60 && completionRate >= 70 && returnRate <= 10) {
      return 'AVERAGE';
    } else {
      return 'POOR';
    }
  }

  private generateRecommendations(supplier: Supplier, rating: string, completionRate: number, returnRate: number): string {
    const recommendations: string[] = [];

    if (rating === 'POOR') {
      recommendations.push('Consider reviewing supplier contract and performance requirements.');
    }

    if (completionRate < 80) {
      recommendations.push('Improve order completion processes.');
    }

    if (returnRate > 5) {
      recommendations.push('Focus on quality improvement initiatives.');
    }

    if (!this.hasCompleteContactInfo(supplier)) {
      recommendations.push('Update contact information for better communication.');
    }

    const activeProducts = 0; // Would get from actual data
    if (activeProducts === 0) {
      recommendations.push('Consider adding products or reviewing supplier relationship.');
    }

    return recommendations.length > 0 ? recommendations.join(' ') : 'No specific recommendations at this time.';
  }

  private async warmSupplierCache(response: SupplierResponse): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.set(this.getCacheKey('findById', response.id), response, 300);
      await this.context.cache.set(this.getCacheKey('findByName', response.name), response, 300);
    }
  }

  private async evictSupplierFromCache(id: string, name: string): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.del(this.getCacheKey('findById', id));
      await this.context.cache.del(this.getCacheKey('findByName', name));
    }
  }

  private async invalidateSupplierCaches(supplierId: string): Promise<void> {
    if (this.context.cache) {
      await this.context.cache.del(this.getCacheKey('findById', supplierId));
      await this.context.cache.del(this.getCacheKey('allPerformance'));
      await this.context.cache.del(this.getCacheKey('lowPerformance'));
      await this.context.cache.del(this.getCacheKey('performance', supplierId));
    }
  }

  private async convertToSupplierResponse(supplier: Supplier): Promise<SupplierResponse> {
    const totalProductCount = await this.getTotalProductCount(supplier.id);
    const activeProductCount = await this.getActiveProductCount(supplier.id);

    return {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms,
      status: supplier.status,
      statusDescription: this.getStatusDescription(supplier.status),
      totalProductCount,
      activeProductCount,
      isActive: this.isActive(supplier),
      canBeDeleted: await this.canDeleteSupplier(supplier.id),
      hasCompleteContactInfo: this.hasCompleteContactInfo(supplier),
      primaryContact: this.getPrimaryContact(supplier),
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  private async convertToSupplierSummaryResponse(supplier: Supplier): Promise<SupplierSummaryResponse> {
    const totalProductCount = await this.getTotalProductCount(supplier.id);
    const activeProductCount = await this.getActiveProductCount(supplier.id);

    return {
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      status: supplier.status,
      statusDescription: this.getStatusDescription(supplier.status),
      totalProductCount,
      activeProductCount,
      isActive: this.isActive(supplier),
      primaryContact: this.getPrimaryContact(supplier),
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  private getStatusDescription(status: SupplierStatus): string {
    const descriptions: Record<SupplierStatus, string> = {
      [SupplierStatus.ACTIVE]: 'Active',
      [SupplierStatus.INACTIVE]: 'Inactive',
      [SupplierStatus.SUSPENDED]: 'Suspended',
    };
    return descriptions[status] || status;
  }

  private getPrimaryContact(supplier: Supplier): string {
    if (supplier.contactPerson) {
      return supplier.contactPerson;
    }
    if (supplier.email) {
      return supplier.email;
    }
    if (supplier.phone) {
      return supplier.phone;
    }
    return 'No contact information';
  }

  // Database query method stubs (to be implemented with actual database layer)
  private async saveSupplier(supplierData: any): Promise<Supplier> { return supplierData as Supplier; }
  private async querySupplierById(id: string): Promise<Supplier | null> { return null; }
  private async querySupplierByName(name: string): Promise<Supplier | null> { return null; }
  private async querySuppliersByStatus(status: SupplierStatus, pagination?: PaginationOptions): Promise<any> { return { data: [], pagination: {} }; }
  private async querySearchSuppliers(searchTerm: string, pagination: PaginationOptions): Promise<PagedResult<Supplier>> { return { data: [], pagination: {} as any }; }
  private async querySuppliersWithFilters(filters: SupplierFilters, pagination: PaginationOptions): Promise<PagedResult<Supplier>> { return { data: [], pagination: {} as any }; }
  private async queryAllSuppliers(pagination: PaginationOptions): Promise<PagedResult<Supplier>> { return { data: [], pagination: {} as any }; }
  private async queryProductsBySupplier(supplierId: string, pagination: PaginationOptions): Promise<PagedResult<any>> { return { data: [], pagination: {} as any }; }
  private async softDeleteSupplier(id: string): Promise<void> { }
  
  // Helper method stubs
  private async getTotalProductCount(supplierId: string): Promise<number> { return 0; }
  private async getActiveProductCount(supplierId: string): Promise<number> { return 0; }
  private async canDeleteSupplier(supplierId: string): Promise<boolean> { return true; }
  private async updateProductSupplier(productId: string, supplierId: string | null): Promise<void> { }
  private async checkProductPendingOrders(productId: string): Promise<boolean> { return false; }
}