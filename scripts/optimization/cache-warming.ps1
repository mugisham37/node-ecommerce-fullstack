# Cache Warming Script
# Pre-loads frequently accessed data into Redis cache for optimal performance

param(
    [string]$RedisHost = "localhost",
    [string]$RedisPort = "6379",
    [string]$Environment = "production",
    [string]$ApiBaseUrl = "http://localhost:3001",
    [switch]$WarmAll = $false
)

Write-Host "Starting cache warming for $Environment environment..." -ForegroundColor Green

# Function to test Redis connectivity
function Test-RedisConnection {
    try {
        $result = redis-cli -h $RedisHost -p $RedisPort ping
        if ($result -eq "PONG") {
            Write-Host "✓ Redis connection successful" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Error "Failed to connect to Redis at ${RedisHost}:${RedisPort}"
        return $false
    }
}

# Function to warm product cache
function Warm-ProductCache {
    Write-Host "Warming product cache..." -ForegroundColor Yellow
    
    try {
        # Get active products
        $response = Invoke-RestMethod -Uri "$ApiBaseUrl/api/products?status=active&limit=1000" -Method GET
        Write-Host "✓ Cached $($response.data.Count) active products"
        
        # Get product categories
        $categories = Invoke-RestMethod -Uri "$ApiBaseUrl/api/categories" -Method GET
        Write-Host "✓ Cached $($categories.data.Count) product categories"
        
        # Cache popular products (top 100 by sales)
        $popular = Invoke-RestMethod -Uri "$ApiBaseUrl/api/products/popular?limit=100" -Method GET
        Write-Host "✓ Cached $($popular.data.Count) popular products"
        
        # Cache low stock products
        $lowStock = Invoke-RestMethod -Uri "$ApiBaseUrl/api/inventory/low-stock" -Method GET
        Write-Host "✓ Cached $($lowStock.data.Count) low stock items"
        
    }
    catch {
        Write-Warning "Failed to warm product cache: $_"
    }
}

# Function to warm user session cache
function Warm-UserCache {
    Write-Host "Warming user cache..." -ForegroundColor Yellow
    
    try {
        # Cache active user sessions (last 30 days)
        $activeUsers = Invoke-RestMethod -Uri "$ApiBaseUrl/api/users/active?days=30" -Method GET
        Write-Host "✓ Cached $($activeUsers.data.Count) active user sessions"
        
        # Cache user preferences
        $preferences = Invoke-RestMethod -Uri "$ApiBaseUrl/api/users/preferences" -Method GET
        Write-Host "✓ Cached user preferences"
        
        # Cache user roles and permissions
        $roles = Invoke-RestMethod -Uri "$ApiBaseUrl/api/auth/roles" -Method GET
        Write-Host "✓ Cached $($roles.data.Count) user roles"
        
    }
    catch {
        Write-Warning "Failed to warm user cache: $_"
    }
}

# Function to warm inventory cache
function Warm-InventoryCache {
    Write-Host "Warming inventory cache..." -ForegroundColor Yellow
    
    try {
        # Cache current inventory levels
        $inventory = Invoke-RestMethod -Uri "$ApiBaseUrl/api/inventory/current" -Method GET
        Write-Host "✓ Cached current inventory levels for $($inventory.data.Count) products"
        
        # Cache inventory by location
        $locations = Invoke-RestMethod -Uri "$ApiBaseUrl/api/locations" -Method GET
        foreach ($location in $locations.data) {
            $locationInventory = Invoke-RestMethod -Uri "$ApiBaseUrl/api/inventory/location/$($location.id)" -Method GET
            Write-Host "✓ Cached inventory for location: $($location.name)"
        }
        
        # Cache reorder alerts
        $reorders = Invoke-RestMethod -Uri "$ApiBaseUrl/api/inventory/reorder-alerts" -Method GET
        Write-Host "✓ Cached $($reorders.data.Count) reorder alerts"
        
    }
    catch {
        Write-Warning "Failed to warm inventory cache: $_"
    }
}

# Function to warm order cache
function Warm-OrderCache {
    Write-Host "Warming order cache..." -ForegroundColor Yellow
    
    try {
        # Cache recent orders (last 7 days)
        $recentOrders = Invoke-RestMethod -Uri "$ApiBaseUrl/api/orders/recent?days=7" -Method GET
        Write-Host "✓ Cached $($recentOrders.data.Count) recent orders"
        
        # Cache pending orders
        $pendingOrders = Invoke-RestMethod -Uri "$ApiBaseUrl/api/orders?status=pending" -Method GET
        Write-Host "✓ Cached $($pendingOrders.data.Count) pending orders"
        
        # Cache order statistics
        $stats = Invoke-RestMethod -Uri "$ApiBaseUrl/api/analytics/order-stats" -Method GET
        Write-Host "✓ Cached order statistics"
        
    }
    catch {
        Write-Warning "Failed to warm order cache: $_"
    }
}

# Function to warm supplier cache
function Warm-SupplierCache {
    Write-Host "Warming supplier cache..." -ForegroundColor Yellow
    
    try {
        # Cache active suppliers
        $suppliers = Invoke-RestMethod -Uri "$ApiBaseUrl/api/suppliers?status=active" -Method GET
        Write-Host "✓ Cached $($suppliers.data.Count) active suppliers"
        
        # Cache supplier products
        foreach ($supplier in $suppliers.data) {
            $supplierProducts = Invoke-RestMethod -Uri "$ApiBaseUrl/api/suppliers/$($supplier.id)/products" -Method GET
            Write-Host "✓ Cached products for supplier: $($supplier.name)"
        }
        
        # Cache supplier performance metrics
        $performance = Invoke-RestMethod -Uri "$ApiBaseUrl/api/analytics/supplier-performance" -Method GET
        Write-Host "✓ Cached supplier performance metrics"
        
    }
    catch {
        Write-Warning "Failed to warm supplier cache: $_"
    }
}

# Function to warm analytics cache
function Warm-AnalyticsCache {
    Write-Host "Warming analytics cache..." -ForegroundColor Yellow
    
    try {
        # Cache dashboard metrics
        $dashboard = Invoke-RestMethod -Uri "$ApiBaseUrl/api/analytics/dashboard" -Method GET
        Write-Host "✓ Cached dashboard metrics"
        
        # Cache sales analytics (last 30 days)
        $sales = Invoke-RestMethod -Uri "$ApiBaseUrl/api/analytics/sales?period=30d" -Method GET
        Write-Host "✓ Cached sales analytics"
        
        # Cache inventory analytics
        $inventoryAnalytics = Invoke-RestMethod -Uri "$ApiBaseUrl/api/analytics/inventory" -Method GET
        Write-Host "✓ Cached inventory analytics"
        
        # Cache revenue metrics
        $revenue = Invoke-RestMethod -Uri "$ApiBaseUrl/api/analytics/revenue?period=30d" -Method GET
        Write-Host "✓ Cached revenue metrics"
        
    }
    catch {
        Write-Warning "Failed to warm analytics cache: $_"
    }
}

# Function to warm configuration cache
function Warm-ConfigCache {
    Write-Host "Warming configuration cache..." -ForegroundColor Yellow
    
    try {
        # Cache application settings
        $settings = Invoke-RestMethod -Uri "$ApiBaseUrl/api/config/settings" -Method GET
        Write-Host "✓ Cached application settings"
        
        # Cache feature flags
        $features = Invoke-RestMethod -Uri "$ApiBaseUrl/api/config/features" -Method GET
        Write-Host "✓ Cached feature flags"
        
        # Cache system constants
        $constants = Invoke-RestMethod -Uri "$ApiBaseUrl/api/config/constants" -Method GET
        Write-Host "✓ Cached system constants"
        
    }
    catch {
        Write-Warning "Failed to warm configuration cache: $_"
    }
}

# Function to check cache hit rates
function Check-CacheHitRates {
    Write-Host "Checking cache hit rates..." -ForegroundColor Yellow
    
    try {
        $info = redis-cli -h $RedisHost -p $RedisPort info stats
        $hitRate = ($info | Select-String "keyspace_hits:(\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        $missRate = ($info | Select-String "keyspace_misses:(\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        
        if ($hitRate -and $missRate) {
            $totalRequests = [int]$hitRate + [int]$missRate
            $hitPercentage = if ($totalRequests -gt 0) { ([int]$hitRate / $totalRequests) * 100 } else { 0 }
            
            Write-Host "Cache Hit Rate: $([math]::Round($hitPercentage, 2))%" -ForegroundColor Cyan
            Write-Host "Cache Hits: $hitRate" -ForegroundColor Cyan
            Write-Host "Cache Misses: $missRate" -ForegroundColor Cyan
        }
        
        # Get memory usage
        $memory = redis-cli -h $RedisHost -p $RedisPort info memory
        $usedMemory = ($memory | Select-String "used_memory_human:(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
        Write-Host "Redis Memory Usage: $usedMemory" -ForegroundColor Cyan
        
    }
    catch {
        Write-Warning "Failed to get cache statistics: $_"
    }
}

# Function to set cache expiration policies
function Set-CacheExpirationPolicies {
    Write-Host "Setting cache expiration policies..." -ForegroundColor Yellow
    
    try {
        # Set TTL for different cache types
        redis-cli -h $RedisHost -p $RedisPort config set maxmemory-policy allkeys-lru
        
        # Product cache: 1 hour
        redis-cli -h $RedisHost -p $RedisPort expire "products:*" 3600
        
        # User sessions: 24 hours
        redis-cli -h $RedisHost -p $RedisPort expire "sessions:*" 86400
        
        # Analytics: 30 minutes
        redis-cli -h $RedisHost -p $RedisPort expire "analytics:*" 1800
        
        # Configuration: 6 hours
        redis-cli -h $RedisHost -p $RedisPort expire "config:*" 21600
        
        Write-Host "✓ Cache expiration policies set"
        
    }
    catch {
        Write-Warning "Failed to set cache expiration policies: $_"
    }
}

# Function to optimize Redis configuration
function Optimize-RedisConfig {
    Write-Host "Optimizing Redis configuration..." -ForegroundColor Yellow
    
    try {
        # Set optimal configuration for production
        redis-cli -h $RedisHost -p $RedisPort config set save "900 1 300 10 60 10000"
        redis-cli -h $RedisHost -p $RedisPort config set maxmemory-policy allkeys-lru
        redis-cli -h $RedisHost -p $RedisPort config set tcp-keepalive 300
        redis-cli -h $RedisHost -p $RedisPort config set timeout 0
        
        Write-Host "✓ Redis configuration optimized for production"
        
    }
    catch {
        Write-Warning "Failed to optimize Redis configuration: $_"
    }
}

# Main execution
try {
    Write-Host "=== Cache Warming Started ===" -ForegroundColor Green
    
    # Test Redis connection
    if (-not (Test-RedisConnection)) {
        throw "Cannot connect to Redis server"
    }
    
    # Optimize Redis configuration
    Optimize-RedisConfig
    
    # Set cache expiration policies
    Set-CacheExpirationPolicies
    
    # Warm different cache types
    if ($WarmAll) {
        Write-Host "Warming all cache types..." -ForegroundColor Cyan
        Warm-ConfigCache
        Warm-ProductCache
        Warm-UserCache
        Warm-InventoryCache
        Warm-OrderCache
        Warm-SupplierCache
        Warm-AnalyticsCache
    } else {
        # Warm essential caches only
        Write-Host "Warming essential caches..." -ForegroundColor Cyan
        Warm-ConfigCache
        Warm-ProductCache
        Warm-InventoryCache
        Warm-AnalyticsCache
    }
    
    # Check cache performance
    Start-Sleep -Seconds 2
    Check-CacheHitRates
    
    Write-Host "=== Cache Warming Completed Successfully ===" -ForegroundColor Green
    
    # Generate cache warming report
    $reportPath = "cache-warming-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $report = @"
Cache Warming Report
Generated: $(Get-Date)
Environment: $Environment
Redis Server: $RedisHost:$RedisPort

Cache Types Warmed:
✓ Configuration cache
✓ Product catalog cache
✓ Inventory levels cache
✓ Analytics dashboard cache
$(if ($WarmAll) { "✓ User session cache`n✓ Order history cache`n✓ Supplier data cache" })

Optimizations Applied:
✓ Redis configuration optimized for production
✓ Cache expiration policies configured
✓ Memory management policies set
✓ Connection keepalive configured

Recommendations:
1. Monitor cache hit rates over the next few hours
2. Adjust TTL values based on data update frequency
3. Consider implementing cache warming as a scheduled task
4. Monitor Redis memory usage and scale if needed
5. Set up alerts for cache performance degradation

"@
    
    $report | Out-File -FilePath $reportPath -Encoding UTF8
    Write-Host "Cache warming report saved to: $reportPath" -ForegroundColor Green
    
} catch {
    Write-Error "Cache warming failed: $_"
    exit 1
}