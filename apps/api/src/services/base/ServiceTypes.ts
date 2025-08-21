/**
 * Common types and interfaces for services
 */

// User related types
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
  GUEST = 'GUEST'
}

export interface UserCreateRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  active: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Product related types
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

export interface ProductCreateRequest {
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

export interface ProductUpdateRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  supplierId?: string;
  costPrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
}

export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  costPrice: number;
  sellingPrice: number;
  profitMargin: number;
  reorderLevel: number;
  reorderQuantity: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory related types
export interface Inventory {
  id: string;
  productId: string;
  warehouseLocation: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  lastCountedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAdjustmentRequest {
  newQuantity: number;
  reason: string;
}

export interface InventoryResponse {
  productId: string;
  productName: string;
  sku: string;
  warehouseLocation: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  reorderLevel: number;
  reorderQuantity: number;
  isLowStock: boolean;
  lastCountedAt: Date;
}

// Order related types
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

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
  orderItems: OrderItem[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount?: number;
}

export interface OrderCreateRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  billingAddress?: string;
  taxAmount: number;
  shippingCost: number;
  orderItems: OrderItemCreateRequest[];
}

export interface OrderItemCreateRequest {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  billingAddress?: string;
  status: OrderStatus;
  statusDescription: string;
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  totalQuantity: number;
  itemCount: number;
  orderItems: OrderItemResponse[];
  createdById: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  canBeCancelled: boolean;
  canBeModified: boolean;
}

export interface OrderItemResponse {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount?: number;
}

// Supplier related types
export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

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

export interface SupplierCreateRequest {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
}

export interface SupplierUpdateRequest {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
}

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
  createdAt: Date;
  updatedAt: Date;
}

// Category related types
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

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  sortOrder: number;
  productCount: number;
  children?: CategoryResponse[];
  createdAt: Date;
  updatedAt: Date;
}

// Stock Movement types
export enum StockMovementType {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  ADJUSTMENT = 'ADJUSTMENT',
  ALLOCATION = 'ALLOCATION',
  RELEASE = 'RELEASE',
  SALE = 'SALE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT'
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseLocation: string;
  movementType: StockMovementType;
  quantity: number;
  reason?: string;
  referenceId?: string;
  userId: string;
  createdAt: Date;
}

// Error types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

export class InsufficientStockError extends AppError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`,
      400,
      'INSUFFICIENT_STOCK',
      { productId, requested, available }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}