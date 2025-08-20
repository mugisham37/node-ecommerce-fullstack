// API Constants
export const API_ROUTES = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    PROFILE: '/auth/profile',
  },
  
  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },
  
  // Products
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string) => `/products/${id}`,
    BY_SKU: (sku: string) => `/products/sku/${sku}`,
    SEARCH: '/products/search',
    BULK: '/products/bulk',
    IMPORT: '/products/import',
    EXPORT: '/products/export',
  },
  
  // Categories
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id: string) => `/categories/${id}`,
    BY_SLUG: (slug: string) => `/categories/slug/${slug}`,
    TREE: '/categories/tree',
  },
  
  // Suppliers
  SUPPLIERS: {
    BASE: '/suppliers',
    BY_ID: (id: string) => `/suppliers/${id}`,
    PERFORMANCE: (id: string) => `/suppliers/${id}/performance`,
  },
  
  // Inventory
  INVENTORY: {
    BASE: '/inventory',
    BY_PRODUCT: (productId: string) => `/inventory/product/${productId}`,
    ADJUSTMENTS: '/inventory/adjustments',
    LOW_STOCK: '/inventory/low-stock',
    MOVEMENTS: '/inventory/movements',
    REPORTS: '/inventory/reports',
  },
  
  // Orders
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    BY_NUMBER: (orderNumber: string) => `/orders/number/${orderNumber}`,
    ITEMS: (orderId: string) => `/orders/${orderId}/items`,
    STATUS: (orderId: string) => `/orders/${orderId}/status`,
    ANALYTICS: '/orders/analytics',
  },
  
  // Files
  FILES: {
    UPLOAD: '/files/upload',
    BY_ID: (id: string) => `/files/${id}`,
    DELETE: (id: string) => `/files/${id}`,
  },
  
  // Health
  HEALTH: {
    CHECK: '/health',
    READY: '/health/ready',
    LIVE: '/health/live',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE: 'INVALID_VALUE',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Business Logic
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_OPERATION: 'INVALID_OPERATION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  PATHS: {
    PRODUCTS: 'products',
    USERS: 'users',
    DOCUMENTS: 'documents',
    TEMP: 'temp',
  },
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_BY_SKU: (sku: string) => `product:sku:${sku}`,
  CATEGORY: (id: string) => `category:${id}`,
  CATEGORY_TREE: 'category:tree',
  SUPPLIER: (id: string) => `supplier:${id}`,
  INVENTORY: (productId: string) => `inventory:${productId}`,
  ORDER: (id: string) => `order:${id}`,
  LOW_STOCK: 'inventory:low-stock',
  ANALYTICS: (key: string) => `analytics:${key}`,
} as const;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

// Event Types
export const EVENT_TYPES = {
  // User Events
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  
  // Product Events
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  
  // Inventory Events
  STOCK_UPDATED: 'STOCK_UPDATED',
  LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
  REORDER_TRIGGERED: 'REORDER_TRIGGERED',
  STOCK_MOVEMENT: 'STOCK_MOVEMENT',
  
  // Order Events
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_FULFILLED: 'ORDER_FULFILLED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  
  // System Events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  BACKUP_COMPLETED: 'BACKUP_COMPLETED',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Inventory
  INVENTORY_UPDATE: 'inventory:update',
  LOW_STOCK_ALERT: 'inventory:low-stock',
  
  // Orders
  ORDER_STATUS_UPDATE: 'order:status-update',
  NEW_ORDER: 'order:new',
  
  // Notifications
  NOTIFICATION: 'notification',
  SYSTEM_ALERT: 'system:alert',
} as const;

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  FILENAME: 'YYYY-MM-DD_HH-mm-ss',
} as const;

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  SKU: /^[A-Z0-9\-]{3,20}$/,
  SLUG: /^[a-z0-9\-]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

// Business Rules
export const BUSINESS_RULES = {
  // Inventory
  MIN_STOCK_LEVEL: 0,
  DEFAULT_REORDER_LEVEL: 10,
  DEFAULT_MAX_STOCK_LEVEL: 1000,
  
  // Orders
  MIN_ORDER_AMOUNT: 0.01,
  MAX_ORDER_ITEMS: 100,
  ORDER_EXPIRY_DAYS: 30,
  
  // Products
  MIN_PRODUCT_PRICE: 0.01,
  MAX_PRODUCT_PRICE: 999999.99,
  MAX_PRODUCT_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 2000,
  
  // Users
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  PASSWORD_RESET_EXPIRY_HOURS: 24,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// Notification Categories
export const NOTIFICATION_CATEGORIES = {
  SYSTEM: 'system',
  INVENTORY: 'inventory',
  ORDERS: 'orders',
  USERS: 'users',
  SECURITY: 'security',
} as const;

// Job Types
export const JOB_TYPES = {
  EMAIL: 'email',
  INVENTORY_REPORT: 'inventory-report',
  LOW_STOCK_ALERT: 'low-stock-alert',
  DATA_CLEANUP: 'data-cleanup',
  CACHE_OPTIMIZATION: 'cache-optimization',
  BACKUP: 'backup',
  ANALYTICS: 'analytics',
} as const;

// Job Priorities
export const JOB_PRIORITIES = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20,
} as const;

// Time Constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Export types for constants
export type ApiRoute = typeof API_ROUTES;
export type HttpStatus = typeof HTTP_STATUS;
export type ErrorCode = typeof ERROR_CODES;
export type EventType = typeof EVENT_TYPES;
export type WSEvent = typeof WS_EVENTS;
export type NotificationType = typeof NOTIFICATION_TYPES;
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES;
export type JobType = typeof JOB_TYPES;