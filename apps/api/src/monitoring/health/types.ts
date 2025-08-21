/**
 * Health check types and interfaces
 */

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'WARNING';
  timestamp: Date;
  details: Record<string, any>;
  error?: string;
}

export interface HealthIndicator {
  name: string;
  check(): Promise<HealthStatus>;
}

export interface HealthCheckResult {
  status: 'UP' | 'DOWN' | 'WARNING';
  timestamp: Date;
  checks: Record<string, HealthStatus>;
  overall: {
    status: string;
    uptime: number;
    version: string;
  };
}

export interface DatabaseHealthDetails {
  version?: string;
  name?: string;
  user?: string;
  pool?: {
    active_connections: number;
    idle_connections: number;
    total_connections: number;
    max_pool_size: number;
    min_idle: number;
  };
  business?: {
    active_products: number;
    pending_orders: number;
    low_stock_items: number;
  };
}

export interface RedisHealthDetails {
  version?: string;
  mode?: string;
  os?: string;
  uptime_in_seconds?: string;
  connected_clients?: string;
  used_memory_human?: string;
  used_memory_peak_human?: string;
  total_commands_processed?: string;
  keyspace_hits?: string;
  keyspace_misses?: string;
  hit_ratio_percent?: string;
  cache?: {
    set_operation_ms: number;
    get_operation_ms: number;
    delete_operation_ms: number;
    operations_status: string;
  };
}

export interface BusinessHealthDetails {
  inventory?: {
    low_stock_count: number;
    active_products: number;
    low_stock_percentage: string;
    status: string;
  };
  orders?: {
    pending_count: number;
    old_pending_count: number;
    status: string;
  };
  cache?: {
    hit_ratio: number;
    miss_ratio: number;
    eviction_count: number;
    status: string;
  };
  system?: {
    memory_usage_percentage: string;
    memory_status: string;
  };
  overall_status: string;
}