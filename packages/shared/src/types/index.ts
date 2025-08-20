// Core entity types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  price: number;
  categoryId: string;
  supplierId: string;
  category?: Category;
  supplier?: Supplier;
  inventory?: Inventory;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  maxStockLevel: number;
  lastRestocked?: Date;
  product?: Product;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  user?: User;
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
  product?: Product;
  order?: Order;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  referenceId?: string;
  userId: string;
  product?: Product;
  user?: User;
  createdAt: Date;
}

// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER'
}

export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER'
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PagedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter types
export interface ProductFilters {
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  search?: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface InventoryFilters {
  lowStock?: boolean;
  categoryId?: string;
  supplierId?: string;
  search?: string;
}

// Event types
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ProductEvent extends BaseEvent {
  productId: string;
  type: 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED';
}

export interface InventoryEvent extends BaseEvent {
  productId: string;
  type: 'STOCK_UPDATED' | 'LOW_STOCK_ALERT' | 'REORDER_TRIGGERED';
  quantity?: number;
  previousQuantity?: number;
}

export interface OrderEvent extends BaseEvent {
  orderId: string;
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED' | 'ORDER_FULFILLED';
  status?: OrderStatus;
  previousStatus?: OrderStatus;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR';
  field?: string;
  value?: any;
}

export interface NotFoundError extends AppError {
  code: 'NOT_FOUND';
  resource: string;
  id?: string;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}