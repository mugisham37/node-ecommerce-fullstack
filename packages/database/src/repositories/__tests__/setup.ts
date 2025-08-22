import { vi } from 'vitest';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-01T00:00:00.000Z');
vi.setSystemTime(mockDate);

// Global test utilities
export const createMockPaginationResult = <T>(data: T[], page = 1, limit = 10) => ({
  data,
  pagination: {
    page,
    limit,
    total: data.length,
    totalPages: Math.ceil(data.length / limit),
    hasNext: page * limit < data.length,
    hasPrev: page > 1,
  },
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'customer',
  isActive: true,
  isEmailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockLoyaltyProgram = (overrides = {}) => ({
  id: 'program-1',
  name: 'Gold Program',
  description: 'Premium loyalty program',
  pointsPerDollar: '1.00',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockABTest = (overrides = {}) => ({
  id: 'test-1',
  name: 'Homepage Button Test',
  description: 'Testing different button colors',
  type: 'ui',
  status: 'RUNNING',
  primaryGoal: 'conversion',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: 'notification-1',
  userId: 'user-1',
  type: 'email',
  category: 'order',
  subject: 'Order Confirmation',
  title: 'Your order has been confirmed',
  body: 'Thank you for your order!',
  recipient: 'test@example.com',
  channel: 'email',
  status: 'PENDING',
  priority: 'normal',
  isRead: false,
  isClicked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSetting = (overrides = {}) => ({
  id: 'setting-1',
  key: 'app.name',
  value: 'My App',
  type: 'string',
  category: 'general',
  name: 'Application Name',
  description: 'The name of the application',
  isPublic: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Database connection mock factory
export const createMockDatabaseConnection = () => ({
  drizzle: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  },
  kysely: {
    selectFrom: vi.fn().mockReturnThis(),
    insertInto: vi.fn().mockReturnThis(),
    updateTable: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    rightJoin: vi.fn().mockReturnThis(),
    fullJoin: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    executeTakeFirst: vi.fn(),
    executeTakeFirstOrThrow: vi.fn(),
    transaction: vi.fn(),
    fn: {
      count: vi.fn(),
      sum: vi.fn(),
      avg: vi.fn(),
      min: vi.fn(),
      max: vi.fn(),
      countDistinct: vi.fn(),
    },
  },
});