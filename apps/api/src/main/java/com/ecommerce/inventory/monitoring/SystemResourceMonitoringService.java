package com.ecommerce.inventory.monitoring;

import com.ecommerce.inventory.logging.StructuredLogger;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.ThreadMXBean;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;

/**
 * Service for monitoring system resources including memory, CPU, and database connections
 */
@Service
public class SystemResourceMonitoringService {

    private static final StructuredLogger logger = StructuredLogger.getLogger(SystemResourceMonitoringService.class);

    private final DataSource dataSource;
    private final RedisConnectionFactory redisConnectionFactory;
    private final AlertingService alertingService;

    // Monitoring thresholds
    private static final double MEMORY_WARNING_THRESHOLD = 80.0;
    private static final double MEMORY_CRITICAL_THRESHOLD = 90.0;
    private static final double CPU_WARNING_THRESHOLD = 75.0;
    private static final double CPU_CRITICAL_THRESHOLD = 85.0;
    private static final double DB_CONNECTION_WARNING_THRESHOLD = 80.0;
    private static final double DB_CONNECTION_CRITICAL_THRESHOLD = 90.0;
    private static final int THREAD_WARNING_THRESHOLD = 200;
    private static final int THREAD_CRITICAL_THRESHOLD = 300;

    // System monitoring beans
    private final MemoryMXBean memoryMXBean;
    private final OperatingSystemMXBean osMXBean;
    private final ThreadMXBean threadMXBean;

    @Autowired
    public SystemResourceMonitoringService(DataSource dataSource,
                                         RedisConnectionFactory redisConnectionFactory,
                                         AlertingService alertingService) {
        this.dataSource = dataSource;
        this.redisConnectionFactory = redisConnectionFactory;
        this.alertingService = alertingService;
        
        this.memoryMXBean = ManagementFactory.getMemoryMXBean();
        this.osMXBean = ManagementFactory.getOperatingSystemMXBean();
        this.threadMXBean = ManagementFactory.getThreadMXBean();
    }

    /**
     * Get comprehensive system resource metrics
     */
    public SystemResourceMetrics getSystemResourceMetrics() {
        return SystemResourceMetrics.builder()
                .timestamp(LocalDateTime.now())
                .memoryMetrics(getMemoryMetrics())
                .cpuMetrics(getCpuMetrics())
                .threadMetrics(getThreadMetrics())
                .databaseMetrics(getDatabaseMetrics())
                .redisMetrics(getRedisMetrics())
                .build();
    }

    /**
     * Get memory usage metrics
     */
    public MemoryMetrics getMemoryMetrics() {
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = runtime.maxMemory();

        double usagePercentage = (double) usedMemory / maxMemory * 100.0;

        // Get heap memory details
        long heapUsed = memoryMXBean.getHeapMemoryUsage().getUsed();
        long heapMax = memoryMXBean.getHeapMemoryUsage().getMax();
        long nonHeapUsed = memoryMXBean.getNonHeapMemoryUsage().getUsed();
        long nonHeapMax = memoryMXBean.getNonHeapMemoryUsage().getMax();

        return MemoryMetrics.builder()
                .totalMemory(totalMemory)
                .freeMemory(freeMemory)
                .usedMemory(usedMemory)
                .maxMemory(maxMemory)
                .usagePercentage(usagePercentage)
                .heapUsed(heapUsed)
                .heapMax(heapMax)
                .nonHeapUsed(nonHeapUsed)
                .nonHeapMax(nonHeapMax)
                .build();
    }

    /**
     * Get CPU usage metrics
     */
    public CpuMetrics getCpuMetrics() {
        double systemLoadAverage = osMXBean.getSystemLoadAverage();
        int availableProcessors = osMXBean.getAvailableProcessors();
        
        // Calculate CPU usage percentage (approximation)
        double cpuUsage = systemLoadAverage > 0 ? 
            (systemLoadAverage / availableProcessors) * 100.0 : 0.0;

        return CpuMetrics.builder()
                .systemLoadAverage(systemLoadAverage)
                .availableProcessors(availableProcessors)
                .cpuUsagePercentage(Math.min(cpuUsage, 100.0))
                .build();
    }

    /**
     * Get thread metrics
     */
    public ThreadMetrics getThreadMetrics() {
        int threadCount = threadMXBean.getThreadCount();
        int peakThreadCount = threadMXBean.getPeakThreadCount();
        long totalStartedThreadCount = threadMXBean.getTotalStartedThreadCount();
        int daemonThreadCount = threadMXBean.getDaemonThreadCount();

        return ThreadMetrics.builder()
                .threadCount(threadCount)
                .peakThreadCount(peakThreadCount)
                .totalStartedThreadCount(totalStartedThreadCount)
                .daemonThreadCount(daemonThreadCount)
                .build();
    }

    /**
     * Get database connection pool metrics
     */
    public DatabaseMetrics getDatabaseMetrics() {
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
            HikariPoolMXBean poolBean = hikariDataSource.getHikariPoolMXBean();
            
            if (poolBean != null) {
                int activeConnections = poolBean.getActiveConnections();
                int idleConnections = poolBean.getIdleConnections();
                int totalConnections = poolBean.getTotalConnections();
                int threadsAwaitingConnection = poolBean.getThreadsAwaitingConnection();
                int maxPoolSize = hikariDataSource.getMaximumPoolSize();
                
                double usagePercentage = (double) activeConnections / maxPoolSize * 100.0;

                return DatabaseMetrics.builder()
                        .activeConnections(activeConnections)
                        .idleConnections(idleConnections)
                        .totalConnections(totalConnections)
                        .threadsAwaitingConnection(threadsAwaitingConnection)
                        .maxPoolSize(maxPoolSize)
                        .usagePercentage(usagePercentage)
                        .build();
            }
        }

        return DatabaseMetrics.builder()
                .activeConnections(0)
                .idleConnections(0)
                .totalConnections(0)
                .threadsAwaitingConnection(0)
                .maxPoolSize(0)
                .usagePercentage(0.0)
                .build();
    }

    /**
     * Get Redis connection metrics
     */
    public RedisMetrics getRedisMetrics() {
        try {
            // Basic Redis connection test
            var connection = redisConnectionFactory.getConnection();
            boolean connected = connection.ping() != null;
            connection.close();

            return RedisMetrics.builder()
                    .connected(connected)
                    .connectionPoolSize(10) // Default assumption
                    .build();
        } catch (Exception e) {
            logger.error("Failed to get Redis metrics", e);
            return RedisMetrics.builder()
                    .connected(false)
                    .connectionPoolSize(0)
                    .build();
        }
    }

    /**
     * Scheduled monitoring task that runs every minute
     */
    @Scheduled(fixedRate = 60000) // Every minute
    public void monitorSystemResources() {
        try {
            SystemResourceMetrics metrics = getSystemResourceMetrics();
            
            // Check memory thresholds
            checkMemoryThresholds(metrics.getMemoryMetrics());
            
            // Check CPU thresholds
            checkCpuThresholds(metrics.getCpuMetrics());
            
            // Check database connection thresholds
            checkDatabaseThresholds(metrics.getDatabaseMetrics());
            
            // Check thread thresholds
            checkThreadThresholds(metrics.getThreadMetrics());
            
            // Log metrics for monitoring
            logSystemMetrics(metrics);
            
        } catch (Exception e) {
            logger.error("Error during system resource monitoring", e);
        }
    }

    /**
     * Scheduled task for detailed system reporting every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void generateDetailedSystemReport() {
        SystemResourceMetrics metrics = getSystemResourceMetrics();
        
        logger.info("System Resource Report - Memory: {:.2f}%, CPU: {:.2f}%, DB Connections: {:.2f}%, Threads: {}",
                   metrics.getMemoryMetrics().getUsagePercentage(),
                   metrics.getCpuMetrics().getCpuUsagePercentage(),
                   metrics.getDatabaseMetrics().getUsagePercentage(),
                   metrics.getThreadMetrics().getThreadCount());
    }

    private void checkMemoryThresholds(MemoryMetrics memoryMetrics) {
        double usage = memoryMetrics.getUsagePercentage();
        
        if (usage > MEMORY_CRITICAL_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_MEMORY_USAGE,
                String.format("Critical memory usage: %.2f%% (threshold: %.2f%%)", usage, MEMORY_CRITICAL_THRESHOLD),
                AlertSeverity.CRITICAL
            );
        } else if (usage > MEMORY_WARNING_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_MEMORY_USAGE,
                String.format("High memory usage: %.2f%% (threshold: %.2f%%)", usage, MEMORY_WARNING_THRESHOLD),
                AlertSeverity.WARNING
            );
        }
    }

    private void checkCpuThresholds(CpuMetrics cpuMetrics) {
        double usage = cpuMetrics.getCpuUsagePercentage();
        
        if (usage > CPU_CRITICAL_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_CPU_USAGE,
                String.format("Critical CPU usage: %.2f%% (threshold: %.2f%%)", usage, CPU_CRITICAL_THRESHOLD),
                AlertSeverity.CRITICAL
            );
        } else if (usage > CPU_WARNING_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_CPU_USAGE,
                String.format("High CPU usage: %.2f%% (threshold: %.2f%%)", usage, CPU_WARNING_THRESHOLD),
                AlertSeverity.WARNING
            );
        }
    }

    private void checkDatabaseThresholds(DatabaseMetrics dbMetrics) {
        double usage = dbMetrics.getUsagePercentage();
        
        if (usage > DB_CONNECTION_CRITICAL_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.DATABASE_CONNECTION_ERROR,
                String.format("Critical database connection usage: %.2f%% (threshold: %.2f%%)", usage, DB_CONNECTION_CRITICAL_THRESHOLD),
                AlertSeverity.CRITICAL
            );
        } else if (usage > DB_CONNECTION_WARNING_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.DATABASE_CONNECTION_ERROR,
                String.format("High database connection usage: %.2f%% (threshold: %.2f%%)", usage, DB_CONNECTION_WARNING_THRESHOLD),
                AlertSeverity.WARNING
            );
        }

        // Check for threads waiting for connections
        if (dbMetrics.getThreadsAwaitingConnection() > 0) {
            alertingService.sendAlert(
                AlertType.DATABASE_CONNECTION_ERROR,
                String.format("%d threads waiting for database connections", dbMetrics.getThreadsAwaitingConnection()),
                AlertSeverity.WARNING
            );
        }
    }

    private void checkThreadThresholds(ThreadMetrics threadMetrics) {
        int threadCount = threadMetrics.getThreadCount();
        
        if (threadCount > THREAD_CRITICAL_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_CPU_USAGE,
                String.format("Critical thread count: %d (threshold: %d)", threadCount, THREAD_CRITICAL_THRESHOLD),
                AlertSeverity.CRITICAL
            );
        } else if (threadCount > THREAD_WARNING_THRESHOLD) {
            alertingService.sendAlert(
                AlertType.HIGH_CPU_USAGE,
                String.format("High thread count: %d (threshold: %d)", threadCount, THREAD_WARNING_THRESHOLD),
                AlertSeverity.WARNING
            );
        }
    }

    private void logSystemMetrics(SystemResourceMetrics metrics) {
        Map<String, String> context = new HashMap<>();
        context.put("memoryUsage", String.format("%.2f", metrics.getMemoryMetrics().getUsagePercentage()));
        context.put("cpuUsage", String.format("%.2f", metrics.getCpuMetrics().getCpuUsagePercentage()));
        context.put("dbConnections", String.valueOf(metrics.getDatabaseMetrics().getActiveConnections()));
        context.put("threadCount", String.valueOf(metrics.getThreadMetrics().getThreadCount()));
        
        logger.debugWithContext("System resource metrics collected", context);
    }

    // ========== INNER CLASSES ==========

    public static class SystemResourceMetrics {
        private final LocalDateTime timestamp;
        private final MemoryMetrics memoryMetrics;
        private final CpuMetrics cpuMetrics;
        private final ThreadMetrics threadMetrics;
        private final DatabaseMetrics databaseMetrics;
        private final RedisMetrics redisMetrics;

        private SystemResourceMetrics(Builder builder) {
            this.timestamp = builder.timestamp;
            this.memoryMetrics = builder.memoryMetrics;
            this.cpuMetrics = builder.cpuMetrics;
            this.threadMetrics = builder.threadMetrics;
            this.databaseMetrics = builder.databaseMetrics;
            this.redisMetrics = builder.redisMetrics;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public LocalDateTime getTimestamp() { return timestamp; }
        public MemoryMetrics getMemoryMetrics() { return memoryMetrics; }
        public CpuMetrics getCpuMetrics() { return cpuMetrics; }
        public ThreadMetrics getThreadMetrics() { return threadMetrics; }
        public DatabaseMetrics getDatabaseMetrics() { return databaseMetrics; }
        public RedisMetrics getRedisMetrics() { return redisMetrics; }

        public static class Builder {
            private LocalDateTime timestamp;
            private MemoryMetrics memoryMetrics;
            private CpuMetrics cpuMetrics;
            private ThreadMetrics threadMetrics;
            private DatabaseMetrics databaseMetrics;
            private RedisMetrics redisMetrics;

            public Builder timestamp(LocalDateTime timestamp) {
                this.timestamp = timestamp;
                return this;
            }

            public Builder memoryMetrics(MemoryMetrics memoryMetrics) {
                this.memoryMetrics = memoryMetrics;
                return this;
            }

            public Builder cpuMetrics(CpuMetrics cpuMetrics) {
                this.cpuMetrics = cpuMetrics;
                return this;
            }

            public Builder threadMetrics(ThreadMetrics threadMetrics) {
                this.threadMetrics = threadMetrics;
                return this;
            }

            public Builder databaseMetrics(DatabaseMetrics databaseMetrics) {
                this.databaseMetrics = databaseMetrics;
                return this;
            }

            public Builder redisMetrics(RedisMetrics redisMetrics) {
                this.redisMetrics = redisMetrics;
                return this;
            }

            public SystemResourceMetrics build() {
                return new SystemResourceMetrics(this);
            }
        }
    }

    // Additional metric classes would be defined here (MemoryMetrics, CpuMetrics, etc.)
    // For brevity, I'll include just the essential structure
    
    public static class MemoryMetrics {
        private final long totalMemory;
        private final long freeMemory;
        private final long usedMemory;
        private final long maxMemory;
        private final double usagePercentage;
        private final long heapUsed;
        private final long heapMax;
        private final long nonHeapUsed;
        private final long nonHeapMax;

        private MemoryMetrics(Builder builder) {
            this.totalMemory = builder.totalMemory;
            this.freeMemory = builder.freeMemory;
            this.usedMemory = builder.usedMemory;
            this.maxMemory = builder.maxMemory;
            this.usagePercentage = builder.usagePercentage;
            this.heapUsed = builder.heapUsed;
            this.heapMax = builder.heapMax;
            this.nonHeapUsed = builder.nonHeapUsed;
            this.nonHeapMax = builder.nonHeapMax;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public long getTotalMemory() { return totalMemory; }
        public long getFreeMemory() { return freeMemory; }
        public long getUsedMemory() { return usedMemory; }
        public long getMaxMemory() { return maxMemory; }
        public double getUsagePercentage() { return usagePercentage; }
        public long getHeapUsed() { return heapUsed; }
        public long getHeapMax() { return heapMax; }
        public long getNonHeapUsed() { return nonHeapUsed; }
        public long getNonHeapMax() { return nonHeapMax; }

        public static class Builder {
            private long totalMemory;
            private long freeMemory;
            private long usedMemory;
            private long maxMemory;
            private double usagePercentage;
            private long heapUsed;
            private long heapMax;
            private long nonHeapUsed;
            private long nonHeapMax;

            public Builder totalMemory(long totalMemory) {
                this.totalMemory = totalMemory;
                return this;
            }

            public Builder freeMemory(long freeMemory) {
                this.freeMemory = freeMemory;
                return this;
            }

            public Builder usedMemory(long usedMemory) {
                this.usedMemory = usedMemory;
                return this;
            }

            public Builder maxMemory(long maxMemory) {
                this.maxMemory = maxMemory;
                return this;
            }

            public Builder usagePercentage(double usagePercentage) {
                this.usagePercentage = usagePercentage;
                return this;
            }

            public Builder heapUsed(long heapUsed) {
                this.heapUsed = heapUsed;
                return this;
            }

            public Builder heapMax(long heapMax) {
                this.heapMax = heapMax;
                return this;
            }

            public Builder nonHeapUsed(long nonHeapUsed) {
                this.nonHeapUsed = nonHeapUsed;
                return this;
            }

            public Builder nonHeapMax(long nonHeapMax) {
                this.nonHeapMax = nonHeapMax;
                return this;
            }

            public MemoryMetrics build() {
                return new MemoryMetrics(this);
            }
        }
    }

    // Similar builder pattern classes for CpuMetrics, ThreadMetrics, DatabaseMetrics, RedisMetrics
    // would be implemented here following the same pattern
}    p
ublic static class CpuMetrics {
        private final double systemLoadAverage;
        private final int availableProcessors;
        private final double cpuUsagePercentage;

        private CpuMetrics(Builder builder) {
            this.systemLoadAverage = builder.systemLoadAverage;
            this.availableProcessors = builder.availableProcessors;
            this.cpuUsagePercentage = builder.cpuUsagePercentage;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public double getSystemLoadAverage() { return systemLoadAverage; }
        public int getAvailableProcessors() { return availableProcessors; }
        public double getCpuUsagePercentage() { return cpuUsagePercentage; }

        public static class Builder {
            private double systemLoadAverage;
            private int availableProcessors;
            private double cpuUsagePercentage;

            public Builder systemLoadAverage(double systemLoadAverage) {
                this.systemLoadAverage = systemLoadAverage;
                return this;
            }

            public Builder availableProcessors(int availableProcessors) {
                this.availableProcessors = availableProcessors;
                return this;
            }

            public Builder cpuUsagePercentage(double cpuUsagePercentage) {
                this.cpuUsagePercentage = cpuUsagePercentage;
                return this;
            }

            public CpuMetrics build() {
                return new CpuMetrics(this);
            }
        }
    }

    public static class ThreadMetrics {
        private final int threadCount;
        private final int peakThreadCount;
        private final long totalStartedThreadCount;
        private final int daemonThreadCount;

        private ThreadMetrics(Builder builder) {
            this.threadCount = builder.threadCount;
            this.peakThreadCount = builder.peakThreadCount;
            this.totalStartedThreadCount = builder.totalStartedThreadCount;
            this.daemonThreadCount = builder.daemonThreadCount;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getThreadCount() { return threadCount; }
        public int getPeakThreadCount() { return peakThreadCount; }
        public long getTotalStartedThreadCount() { return totalStartedThreadCount; }
        public int getDaemonThreadCount() { return daemonThreadCount; }

        public static class Builder {
            private int threadCount;
            private int peakThreadCount;
            private long totalStartedThreadCount;
            private int daemonThreadCount;

            public Builder threadCount(int threadCount) {
                this.threadCount = threadCount;
                return this;
            }

            public Builder peakThreadCount(int peakThreadCount) {
                this.peakThreadCount = peakThreadCount;
                return this;
            }

            public Builder totalStartedThreadCount(long totalStartedThreadCount) {
                this.totalStartedThreadCount = totalStartedThreadCount;
                return this;
            }

            public Builder daemonThreadCount(int daemonThreadCount) {
                this.daemonThreadCount = daemonThreadCount;
                return this;
            }

            public ThreadMetrics build() {
                return new ThreadMetrics(this);
            }
        }
    }

    public static class DatabaseMetrics {
        private final int activeConnections;
        private final int idleConnections;
        private final int totalConnections;
        private final int threadsAwaitingConnection;
        private final int maxPoolSize;
        private final double usagePercentage;

        private DatabaseMetrics(Builder builder) {
            this.activeConnections = builder.activeConnections;
            this.idleConnections = builder.idleConnections;
            this.totalConnections = builder.totalConnections;
            this.threadsAwaitingConnection = builder.threadsAwaitingConnection;
            this.maxPoolSize = builder.maxPoolSize;
            this.usagePercentage = builder.usagePercentage;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public int getActiveConnections() { return activeConnections; }
        public int getIdleConnections() { return idleConnections; }
        public int getTotalConnections() { return totalConnections; }
        public int getThreadsAwaitingConnection() { return threadsAwaitingConnection; }
        public int getMaxPoolSize() { return maxPoolSize; }
        public double getUsagePercentage() { return usagePercentage; }

        public static class Builder {
            private int activeConnections;
            private int idleConnections;
            private int totalConnections;
            private int threadsAwaitingConnection;
            private int maxPoolSize;
            private double usagePercentage;

            public Builder activeConnections(int activeConnections) {
                this.activeConnections = activeConnections;
                return this;
            }

            public Builder idleConnections(int idleConnections) {
                this.idleConnections = idleConnections;
                return this;
            }

            public Builder totalConnections(int totalConnections) {
                this.totalConnections = totalConnections;
                return this;
            }

            public Builder threadsAwaitingConnection(int threadsAwaitingConnection) {
                this.threadsAwaitingConnection = threadsAwaitingConnection;
                return this;
            }

            public Builder maxPoolSize(int maxPoolSize) {
                this.maxPoolSize = maxPoolSize;
                return this;
            }

            public Builder usagePercentage(double usagePercentage) {
                this.usagePercentage = usagePercentage;
                return this;
            }

            public DatabaseMetrics build() {
                return new DatabaseMetrics(this);
            }
        }
    }

    public static class RedisMetrics {
        private final boolean connected;
        private final int connectionPoolSize;

        private RedisMetrics(Builder builder) {
            this.connected = builder.connected;
            this.connectionPoolSize = builder.connectionPoolSize;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public boolean isConnected() { return connected; }
        public int getConnectionPoolSize() { return connectionPoolSize; }

        public static class Builder {
            private boolean connected;
            private int connectionPoolSize;

            public Builder connected(boolean connected) {
                this.connected = connected;
                return this;
            }

            public Builder connectionPoolSize(int connectionPoolSize) {
                this.connectionPoolSize = connectionPoolSize;
                return this;
            }

            public RedisMetrics build() {
                return new RedisMetrics(this);
            }
        }
    }
}