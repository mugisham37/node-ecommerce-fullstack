/**
 * Common types and interfaces for services
 */

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  USER = 'USER'
}

export interface UserCreateDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UserUpdateDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
}

// Product types
export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  categoryId: string;
  supplierId: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  reorderQuantity: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateDTO {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  supplierId: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  reorderQuantity: number;
}

export interface ProductUpdateDTO {
  name?: string;
  description?: string;
  categoryId?: string;
  supplierId?: string;
  costPrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

// Inventory types
export interface Inventory {
  id: string;
  productId: string;
  warehouseLocation: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  reorderLevel: number;
  reorderQuantity: number;
  lastCountedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAdjustmentDTO {
  newQuantity: number;
  reason: string;
  warehouseLocation?: string;
}

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  billingAddress?: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  items: OrderItem[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderCreateDTO {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  billingAddress?: string;
  taxAmount: number;
  shippingCost: number;
  items: OrderItemCreateDTO[];
}

export interface OrderItemCreateDTO {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderUpdateDTO {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  billingAddress?: string;
  taxAmount?: number;
  shippingCost?: number;
}

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export interface SupplierCreateDTO {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
}

export interface SupplierUpdateDTO {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreateDTO {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface CategoryUpdateDTO {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

// Common error types
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string = 'SERVICE_ERROR',
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      'NOT_FOUND',
      404
    );
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT_ERROR', 409, details);
    this.name = 'ConflictError';
  }
}

export class InsufficientStockError extends ServiceError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`,
      'INSUFFICIENT_STOCK',
      400,
      { productId, requested, available }
    );
    this.name = 'InsufficientStockError';
  }
}

// Event types
export interface DomainEvent {
  type: string;
  entityType: string;
  data: any;
  timestamp: Date;
  userId: string;
}

// Stock movement types
export enum StockMovementType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  ADJUSTMENT = 'ADJUSTMENT',
  ALLOCATION = 'ALLOCATION',
  RELEASE = 'RELEASE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  SALE = 'SALE'
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseLocation: string;
  movementType: StockMovementType;
  quantity: number;
  reason: string;
  referenceId?: string;
  userId: string;
  createdAt: Date;
}