package com.ecommerce.inventory.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.DistributionSummary;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

import javax.annotation.PostConstruct;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * Custom metrics configuration for inventory management system
 */
@Component
public class CustomMetricsConfig {

    private final MeterRegistry meterRegistry;
    
    // Counters for business events
    private Counter inventoryAdjustmentsCounter;
    private Counter lowStockAlertsCounter;
    private Counter stockAllocationCounter;
    private Counter stockReleaseCounter;
    private Counter ordersCreatedCounter;
    private Counter ordersCancelledCounter;
    private Counter ordersFulfilledCounter;
    private Counter cacheHitsCounter;
    private Counter cacheMissesCounter;
    private Counter databaseQueriesCounter;
    
    // Timers for performance monitoring
    private Timer inventoryOperationTimer;
    private Timer orderProcessingTimer;
    private Timer databaseQueryTimer;
    private Timer cacheOperationTimer;
    private Timer fileUploadTimer;
    
    // Gauges for real-time metrics
    private final AtomicInteger currentLowStockItems = new AtomicInteger(0);
    private final AtomicInteger pendingOrdersCount = new AtomicInteger(0);
    private final AtomicInteger activeUsersCount = new AtomicInteger(0);
    private final AtomicLong totalInventoryValue = new AtomicLong(0);
    
    // Distribution summaries for statistical analysis
    private DistributionSummary orderValueDistribution;
    private DistributionSummary inventoryLevelDistribution;
    
    // Thread-safe maps for tracking metrics
    private final Map<String, AtomicInteger> productStockLevels = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> categoryOrderCounts = new ConcurrentHashMap<>();

    @Autowired
    public CustomMetricsConfig(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void initializeMetrics() {
        // Initialize counters
        inventoryAdjustmentsCounter = Counter.builder("inventory.adjustments")
                .description("Number of inventory adjustments made")
                .tag("type", "adjustment")
                .register(meterRegistry);

        lowStockAlertsCounter = Counter.builder("inventory.low_stock_alerts")
                .description("Number of low stock alerts generated")
                .tag("type", "alert")
                .register(meterRegistry);

        stockAllocationCounter = Counter.builder("inventory.allocations")
                .description("Number of stock allocation requests")
                .tag("type", "allocation")
                .register(meterRegistry);

        stockReleaseCounter = Counter.builder("inventory.releases")
                .description("Number of stock release operations")
                .tag("type", "release")
                .register(meterRegistry);

        ordersCreatedCounter = Counter.builder("orders.created")
                .description("Number of orders created")
                .tag("type", "creation")
                .register(meterRegistry);

        ordersCancelledCounter = Counter.builder("orders.cancelled")
                .description("Number of orders cancelled")
                .tag("type", "cancellation")
                .register(meterRegistry);

        ordersFulfilledCounter = Counter.builder("orders.fulfilled")
                .description("Number of orders fulfilled")
                .tag("type", "fulfillment")
                .register(meterRegistry);

        cacheHitsCounter = Counter.builder("cache.hits")
                .description("Number of cache hits")
                .tag("type", "hit")
                .register(meterRegistry);

        cacheMissesCounter = Counter.builder("cache.misses")
                .description("Number of cache misses")
                .tag("type", "miss")
                .register(meterRegistry);

        databaseQueriesCounter = Counter.builder("database.queries")
                .description("Number of database queries executed")
                .tag("type", "query")
                .register(meterRegistry);

        // Initialize timers
        inventoryOperationTimer = Timer.builder("inventory.operation.duration")
                .description("Time taken for inventory operations")
                .register(meterRegistry);

        orderProcessingTimer = Timer.builder("orders.processing.duration")
                .description("Time taken for order processing")
                .register(meterRegistry);

        databaseQueryTimer = Timer.builder("database.query.duration")
                .description("Time taken for database queries")
                .register(meterRegistry);

        cacheOperationTimer = Timer.builder("cache.operation.duration")
                .description("Time taken for cache operations")
                .register(meterRegistry);

        fileUploadTimer = Timer.builder("file.upload.duration")
                .description("Time taken for file upload operations")
                .register(meterRegistry);

        // Initialize gauges
        Gauge.builder("inventory.low_stock_items")
                .description("Current number of low stock items")
                .register(meterRegistry, currentLowStockItems, AtomicInteger::get);

        Gauge.builder("orders.pending")
                .description("Current number of pending orders")
                .register(meterRegistry, pendingOrdersCount, AtomicInteger::get);

        Gauge.builder("users.active")
                .description("Current number of active users")
                .register(meterRegistry, activeUsersCount, AtomicInteger::get);

        Gauge.builder("inventory.total_value")
                .description("Total value of inventory")
                .register(meterRegistry, totalInventoryValue, AtomicLong::get);

        // JVM and system metrics
        Gauge.builder("jvm.memory.usage.percentage")
                .description("JVM memory usage percentage")
                .register(meterRegistry, this, this::getMemoryUsagePercentage);

        // Initialize distribution summaries
        orderValueDistribution = DistributionSummary.builder("orders.value")
                .description("Distribution of order values")
                .baseUnit("currency")
                .register(meterRegistry);

        inventoryLevelDistribution = DistributionSummary.builder("inventory.levels")
                .description("Distribution of inventory levels")
                .baseUnit("units")
                .register(meterRegistry);
    }

    // Counter increment methods
    public void incrementInventoryAdjustments() {
        inventoryAdjustmentsCounter.increment();
    }

    public void incrementLowStockAlerts() {
        lowStockAlertsCounter.increment();
    }

    public void incrementStockAllocations() {
        stockAllocationCounter.increment();
    }

    public void incrementStockReleases() {
        stockReleaseCounter.increment();
    }

    public void incrementOrdersCreated() {
        ordersCreatedCounter.increment();
    }

    public void incrementOrdersCancelled() {
        ordersCancelledCounter.increment();
    }

    public void incrementOrdersFulfilled() {
        ordersFulfilledCounter.increment();
    }

    public void incrementCacheHits() {
        cacheHitsCounter.increment();
    }

    public void incrementCacheMisses() {
        cacheMissesCounter.increment();
    }

    public void incrementDatabaseQueries() {
        databaseQueriesCounter.increment();
    }

    // Timer methods
    public Timer.Sample startInventoryOperationTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordInventoryOperation(Timer.Sample sample) {
        sample.stop(inventoryOperationTimer);
    }

    public Timer.Sample startOrderProcessingTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordOrderProcessing(Timer.Sample sample) {
        sample.stop(orderProcessingTimer);
    }

    public Timer.Sample startDatabaseQueryTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordDatabaseQuery(Timer.Sample sample) {
        sample.stop(databaseQueryTimer);
    }

    public Timer.Sample startCacheOperationTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordCacheOperation(Timer.Sample sample) {
        sample.stop(cacheOperationTimer);
    }

    public Timer.Sample startFileUploadTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordFileUpload(Timer.Sample sample) {
        sample.stop(fileUploadTimer);
    }

    // Gauge update methods
    public void updateLowStockItemsCount(int count) {
        currentLowStockItems.set(count);
    }

    public void updatePendingOrdersCount(int count) {
        pendingOrdersCount.set(count);
    }

    public void updateActiveUsersCount(int count) {
        activeUsersCount.set(count);
    }

    public void updateTotalInventoryValue(long value) {
        totalInventoryValue.set(value);
    }

    // Distribution summary methods
    public void recordOrderValue(double value) {
        orderValueDistribution.record(value);
    }

    public void recordInventoryLevel(double level) {
        inventoryLevelDistribution.record(level);
    }

    // Product-specific metrics
    public void updateProductStockLevel(String productSku, int stockLevel) {
        productStockLevels.computeIfAbsent(productSku, k -> 
            Gauge.builder("inventory.product.stock")
                    .description("Stock level for specific product")
                    .tag("sku", productSku)
                    .register(meterRegistry, new AtomicInteger(0), AtomicInteger::get)
        ).set(stockLevel);
    }

    // Category-specific metrics
    public void incrementCategoryOrderCount(String categoryName) {
        categoryOrderCounts.computeIfAbsent(categoryName, k -> {
            AtomicLong counter = new AtomicLong(0);
            Gauge.builder("orders.by_category")
                    .description("Order count by category")
                    .tag("category", categoryName)
                    .register(meterRegistry, counter, AtomicLong::get);
            return counter;
        }).incrementAndGet();
    }

    // Helper method for memory usage calculation
    private double getMemoryUsagePercentage() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        return (double) usedMemory / totalMemory * 100;
    }

    // Getters for accessing metrics externally
    public MeterRegistry getMeterRegistry() {
        return meterRegistry;
    }

    public Counter getInventoryAdjustmentsCounter() {
        return inventoryAdjustmentsCounter;
    }

    public Timer getInventoryOperationTimer() {
        return inventoryOperationTimer;
    }

    public AtomicInteger getCurrentLowStockItems() {
        return currentLowStockItems;
    }
}