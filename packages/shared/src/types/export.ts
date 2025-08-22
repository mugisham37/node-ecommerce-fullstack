// Export types for tRPC compatibility
// Migrated from other-backend/src/types/export.types.ts

// Address interfaces
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Order with relations (adapted for tRPC)
export interface OrderWithRelations {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  shippingAddress: ShippingAddress | null;
  billingAddress: BillingAddress | null;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  vendor: {
    id: string;
    businessName: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    total: number;
    product: {
      id: string;
      name: string;
      sku: string | null;
    };
  }>;
}

// Product with relations (adapted for tRPC)
export interface ProductWithRelations {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  featured: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  vendor: {
    businessName: string;
  } | null;
  category: {
    name: string;
  } | null;
  reviews: Array<{
    rating: number;
  }>;
}

// User with relations (adapted for tRPC)
export interface UserWithRelations {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  orders: Array<{
    id: string;
    total: number;
    status: string;
  }>;
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
  }>;
  country: {
    name: string;
    code: string;
  } | null;
}

// Vendor with relations (adapted for tRPC)
export interface VendorWithRelations {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  commissionRate: number;
  createdAt: Date;
  updatedAt: Date;
  products: Array<{
    id: string;
    price: number;
  }>;
}

// Export utility types
export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

export interface ExportFilters {
  vendorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  featured?: boolean;
  active?: boolean;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  isActive?: boolean;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  minQuantity?: number;
  maxQuantity?: number;
}

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filters?: ExportFilters;
  columns?: string[];
  limit?: number;
}

// Formatted data interfaces for exports
export interface FormattedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  subtotalAmount: string;
  taxAmount: string;
  shippingAmount: string;
  discountAmount: string;
  shippingAddress: string;
  paymentMethod: string;
  createdAt: string;
  itemCount: number;
  items: string;
}

export interface FormattedProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  vendor: string;
  price: string;
  compareAtPrice: string;
  quantity: number;
  inStock: string;
  featured: string;
  active: string;
  averageRating: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormattedCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  country: string;
  isActive: string;
  orderCount: number;
  totalSpent: string;
  averageOrderValue: string;
  loyaltyPoints: number;
  createdAt: string;
  lastLoginAt: string;
  addressCount: number;
}

export interface FormattedSales {
  date: string;
  sales: string;
  orders: number;
  avgOrderValue: string;
  itemsSold: number;
}

export interface FormattedInventory {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  vendor: string;
  quantity: number;
  price: string;
  totalValue: string;
  status: string;
  lastUpdated: string;
}

export interface FormattedVendor {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  commissionRate: string;
  totalProducts: number;
  totalValue: string;
  createdAt: string;
  updatedAt: string;
}