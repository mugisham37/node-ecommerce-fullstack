import { router } from '../trpc';
import { authRouter } from './auth.router';
import { userRouter } from './user.router';
import { productRouter } from './product.router';
import { inventoryRouter } from './inventory.router';
import { orderRouter } from './order.router';
import { supplierRouter } from './supplier.router';
import { categoryRouter } from './category.router';
import { analyticsRouter } from './analytics.router';

/**
 * Main Application Router
 * Combines all feature routers into a single tRPC app router
 * 
 * This router provides the complete API surface for the e-commerce inventory management system,
 * including authentication, user management, product catalog, inventory tracking, order processing,
 * supplier management, category hierarchy, and business analytics.
 */
export const appRouter = router({
  /**
   * Authentication & Authorization
   * Handles user login, logout, token refresh, and session management
   */
  auth: authRouter,

  /**
   * User Management
   * Handles user CRUD operations, role management, and user activities
   */
  users: userRouter,

  /**
   * Product Catalog Management
   * Handles product creation, updates, categorization, and lifecycle management
   */
  products: productRouter,

  /**
   * Inventory Management
   * Handles real-time inventory tracking, stock adjustments, and warehouse operations
   */
  inventory: inventoryRouter,

  /**
   * Order Processing
   * Handles order creation, fulfillment, tracking, and lifecycle management
   */
  orders: orderRouter,

  /**
   * Supplier Management
   * Handles supplier onboarding, performance tracking, and relationship management
   */
  suppliers: supplierRouter,

  /**
   * Category Management
   * Handles hierarchical category structure and product organization
   */
  categories: categoryRouter,

  /**
   * Analytics & Reporting
   * Handles business intelligence, performance metrics, and reporting
   */
  analytics: analyticsRouter,
});

/**
 * Export the router type for client-side type inference
 * This enables full type safety between the client and server
 */
export type AppRouter = typeof appRouter;

/**
 * Router feature summary:
 * 
 * 🔐 Authentication (auth)
 * - User login/logout with JWT tokens
 * - Token refresh and validation
 * - Session management and security
 * 
 * 👥 User Management (users)
 * - User CRUD operations
 * - Role-based access control
 * - Activity logging and audit trails
 * 
 * 📦 Product Management (products)
 * - Product catalog with full CRUD
 * - SKU management and validation
 * - Pricing and profit margin tracking
 * - Bulk operations and search
 * 
 * 📊 Inventory Management (inventory)
 * - Real-time stock tracking
 * - Stock adjustments and movements
 * - Low stock alerts and reorder management
 * - Multi-warehouse support
 * 
 * 🛒 Order Management (orders)
 * - Order creation and processing
 * - Fulfillment and shipping tracking
 * - Order status management
 * - Customer order history
 * 
 * 🏢 Supplier Management (suppliers)
 * - Supplier onboarding and profiles
 * - Performance tracking and analytics
 * - Contact and relationship management
 * - Product sourcing tracking
 * 
 * 🏷️ Category Management (categories)
 * - Hierarchical category structure
 * - Category-based product organization
 * - Breadcrumb navigation support
 * - Category performance analytics
 * 
 * 📈 Analytics & Reporting (analytics)
 * - Sales performance metrics
 * - Inventory analytics and insights
 * - Customer behavior analysis
 * - Business intelligence dashboards
 * - Profit & loss reporting
 */