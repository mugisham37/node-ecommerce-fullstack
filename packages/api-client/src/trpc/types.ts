import type { AppRouter } from '@ecommerce/api';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

/**
 * Infer input types from the router
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Infer output types from the router
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Helper type to get input type for a specific procedure
 */
export type ProcedureInput<T extends keyof RouterInputs> = RouterInputs[T];

/**
 * Helper type to get output type for a specific procedure
 */
export type ProcedureOutput<T extends keyof RouterOutputs> = RouterOutputs[T];

/**
 * Common API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
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

/**
 * Common filter and sorting types
 */
export interface BaseFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Authentication context type
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * WebSocket event types
 */
export interface WebSocketEvent<T = any> {
  type: string;
  data: T;
  timestamp: number;
  userId?: string;
}

/**
 * Real-time subscription types
 */
export type SubscriptionEvent = 
  | { type: 'inventory.updated'; data: { productId: string; quantity: number } }
  | { type: 'order.created'; data: { orderId: string; userId: string } }
  | { type: 'order.updated'; data: { orderId: string; status: string } }
  | { type: 'notification.new'; data: { id: string; message: string; type: string } };

/**
 * Error types
 */
export interface TRPCErrorData {
  code: string;
  message: string;
  details?: any;
  path?: string;
  httpStatus?: number;
}