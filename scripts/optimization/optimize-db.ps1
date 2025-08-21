# Database Optimization Script
# Optimizes PostgreSQL database performance for production

param(
    [string]$DatabaseHost = "localhost",
    [string]$DatabasePort = "5432",
    [string]$DatabaseName = "inventory_db",
    [string]$DatabaseUser = "postgres",
    [string]$Environment = "production"
)

Write-Host "Starting database optimization for $Environment environment..." -ForegroundColor Green

# Function to execute SQL commands
function Execute-SQL {
    param([string]$Query)
    
    try {
        $env:PGPASSWORD = $env:DB_PASSWORD
        $result = psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c $Query
        return $result
    }
    catch {
        Write-Error "Failed to execute SQL: $Query. Error: $_"
        return $null
    }
}

# Function to analyze table statistics
function Analyze-Tables {
    Write-Host "Analyzing table statistics..." -ForegroundColor Yellow
    
    $tables = @(
        "users", "products", "inventory", "orders", "order_items", 
        "suppliers", "categories", "inventory_adjustments", "audit_logs"
    )
    
    foreach ($table in $tables) {
        Write-Host "Analyzing table: $table"
        Execute-SQL "ANALYZE $table;"
    }
}

# Function to update table statistics
function Update-Statistics {
    Write-Host "Updating database statistics..." -ForegroundColor Yellow
    Execute-SQL "ANALYZE;"
}

# Function to reindex tables
function Reindex-Tables {
    Write-Host "Reindexing tables for optimal performance..." -ForegroundColor Yellow
    
    $tables = @(
        "users", "products", "inventory", "orders", "order_items", 
        "suppliers", "categories", "inventory_adjustments"
    )
    
    foreach ($table in $tables) {
        Write-Host "Reindexing table: $table"
        Execute-SQL "REINDEX TABLE $table;"
    }
}

# Function to optimize indexes
function Optimize-Indexes {
    Write-Host "Creating and optimizing indexes..." -ForegroundColor Yellow
    
    # Performance-critical indexes
    $indexes = @(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_status ON products(category_id, status) WHERE status = 'active';",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_location ON inventory(product_id, location_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status_date ON orders(user_id, status, created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_date ON audit_logs(table_name, created_at);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_status ON users(email, status) WHERE status = 'active';",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_unique ON products(sku) WHERE status = 'active';",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity) WHERE quantity <= reorder_level;"
    )
    
    foreach ($index in $indexes) {
        Write-Host "Creating index..."
        Execute-SQL $index
    }
}

# Function to vacuum and analyze
function Vacuum-Database {
    Write-Host "Performing database vacuum and analyze..." -ForegroundColor Yellow
    
    if ($Environment -eq "production") {
        # Use VACUUM ANALYZE for production (less disruptive)
        Execute-SQL "VACUUM ANALYZE;"
    } else {
        # Use VACUUM FULL for non-production (more thorough but locks tables)
        Execute-SQL "VACUUM FULL ANALYZE;"
    }
}

# Function to optimize PostgreSQL configuration
function Optimize-Configuration {
    Write-Host "Applying PostgreSQL configuration optimizations..." -ForegroundColor Yellow
    
    # Get current settings
    $shared_buffers = Execute-SQL "SHOW shared_buffers;"
    $effective_cache_size = Execute-SQL "SHOW effective_cache_size;"
    $work_mem = Execute-SQL "SHOW work_mem;"
    
    Write-Host "Current shared_buffers: $shared_buffers"
    Write-Host "Current effective_cache_size: $effective_cache_size"
    Write-Host "Current work_mem: $work_mem"
    
    # Recommendations for production
    Write-Host "Recommended PostgreSQL settings for production:" -ForegroundColor Cyan
    Write-Host "shared_buffers = 256MB (25% of RAM)"
    Write-Host "effective_cache_size = 768MB (75% of RAM)"
    Write-Host "work_mem = 4MB"
    Write-Host "maintenance_work_mem = 64MB"
    Write-Host "checkpoint_completion_target = 0.9"
    Write-Host "wal_buffers = 16MB"
    Write-Host "default_statistics_target = 100"
    Write-Host "random_page_cost = 1.1"
    Write-Host "effective_io_concurrency = 200"
}

# Function to identify slow queries
function Identify-Slow-Queries {
    Write-Host "Identifying slow queries..." -ForegroundColor Yellow
    
    # Enable pg_stat_statements if not already enabled
    Execute-SQL "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
    
    # Get top 10 slowest queries
    $slowQueries = Execute-SQL "
        SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT 10;"
    
    Write-Host "Top 10 slowest queries:"
    Write-Host $slowQueries
}

# Function to check database size and growth
function Check-Database-Size {
    Write-Host "Checking database size and table sizes..." -ForegroundColor Yellow
    
    $dbSize = Execute-SQL "
        SELECT 
            pg_size_pretty(pg_database_size('$DatabaseName')) as database_size;"
    
    $tableSizes = Execute-SQL "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
    
    Write-Host "Database size: $dbSize"
    Write-Host "Table sizes:"
    Write-Host $tableSizes
}

# Function to optimize connection pooling
function Optimize-Connections {
    Write-Host "Connection optimization recommendations:" -ForegroundColor Cyan
    
    $connections = Execute-SQL "
        SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = '$DatabaseName';"
    
    Write-Host "Current connections: $connections"
    Write-Host "Recommended connection pool settings:"
    Write-Host "- Max connections: 100"
    Write-Host "- Pool size per app instance: 10-20"
    Write-Host "- Connection timeout: 30s"
    Write-Host "- Idle timeout: 300s"
}

# Main execution
try {
    Write-Host "=== Database Optimization Started ===" -ForegroundColor Green
    
    # Check database connectivity
    $version = Execute-SQL "SELECT version();"
    if ($version) {
        Write-Host "Connected to PostgreSQL: $version" -ForegroundColor Green
    } else {
        throw "Failed to connect to database"
    }
    
    # Run optimization steps
    Check-Database-Size
    Analyze-Tables
    Update-Statistics
    Optimize-Indexes
    
    if ($Environment -ne "production") {
        Reindex-Tables
    }
    
    Vacuum-Database
    Identify-Slow-Queries
    Optimize-Configuration
    Optimize-Connections
    
    Write-Host "=== Database Optimization Completed Successfully ===" -ForegroundColor Green
    
    # Generate optimization report
    $reportPath = "optimization-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $report = @"
Database Optimization Report
Generated: $(Get-Date)
Environment: $Environment
Database: $DatabaseName
Host: $DatabaseHost:$DatabasePort

Optimization Steps Completed:
✓ Table analysis and statistics update
✓ Index optimization and creation
✓ Database vacuum and analyze
✓ Performance monitoring setup
✓ Configuration recommendations provided

Next Steps:
1. Monitor query performance over the next 24-48 hours
2. Review slow query log for additional optimization opportunities
3. Consider implementing connection pooling if not already in place
4. Schedule regular maintenance tasks (weekly VACUUM, monthly REINDEX)
5. Monitor disk space usage and plan for growth

"@
    
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "Optimization report saved to: $reportPath" -ForegroundColor Green
    
} catch {
    Write-Error "Database optimization failed: $_"
    exit 1
}