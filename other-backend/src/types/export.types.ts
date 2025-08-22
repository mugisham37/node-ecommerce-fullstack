import { Prisma } from '@prisma/client';

// Shipping address interface
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Billing address interface
export interface BillingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Order with all required relations
export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
        phone: true;
      };
    };
    vendor: {
      select: {
        id: true;
        businessName: true;
      };
    };
    items: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            sku: true;
          };
        };
      };
    };
  };
}>;

// Product with relations
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    vendor: {
      select: {
        businessName: true;
      };
    };
    category: {
      select: {
        name: true;
      };
    };
    reviews: {
      select: {
        rating: true;
      };
    };
  };
}>;

// User with relations
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    orders: {
      select: {
        id: true;
        total: true;
        status: true;
      };
    };
    addresses: true;
    country: {
      select: {
        name: true;
        code: true;
      };
    };
  };
}>;

// Vendor with relations
export type VendorWithRelations = Prisma.VendorGetPayload<{
  include: {
    products: {
      select: {
        id: true;
        price: true;
      };
    };
  };
}>;

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
