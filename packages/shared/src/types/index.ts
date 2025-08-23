/**
 * Shared types export
 */

// Common types that will be used across the application
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PagedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SearchOptions {
  query?: string;
  filters?: FilterOptions;
  sort?: SortOptions;
  page?: number;
  limit?: number;
}

// Entity base interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User roles
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER'
}

// User interface
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// Order statuses
export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

// File types
export type FileType = 
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'text/csv'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Stock movement types
export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT_INCREASE = 'ADJUSTMENT_INCREASE',
  ADJUSTMENT_DECREASE = 'ADJUSTMENT_DECREASE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RETURN = 'RETURN',
  DAMAGE = 'DAMAGE',
  EXPIRED = 'EXPIRED',
  LOST = 'LOST'
}

// Product interface
export interface Product extends BaseEntity {
  name: string;
  description?: string;
  sku: string;
  price: number;
  categoryId: string;
  supplierId: string;
  category?: Category;
  supplier?: Supplier;
  inventory?: Inventory;
}

// Category interface
export interface Category extends BaseEntity {
  name: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
}

// Supplier interface
export interface Supplier extends BaseEntity {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

// Inventory interface
export interface Inventory extends BaseEntity {
  productId: string;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  maxStockLevel: number;
  lastRestocked?: Date;
  product?: Product;
}

// Stock movement interface
export interface StockMovement extends BaseEntity {
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  referenceId?: string;
  userId: string;
  product?: Product;
  user?: User;
}

// Order interface
export interface Order extends BaseEntity {
  orderNumber: string;
  customerId?: string;
  supplierId?: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  customer?: Customer;
  supplier?: Supplier;
}

// Order item interface
export interface OrderItem extends BaseEntity {
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: Product;
}

// Customer interface
export interface Customer extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}