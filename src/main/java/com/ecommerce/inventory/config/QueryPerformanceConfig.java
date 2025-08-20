package com.ecommerce.inventory.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.jooq.ExecuteContext;
import org.jooq.ExecuteListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Query performance monitoring and logging configuration
 * Provides metrics collection and slow query detection
 */
@Configuration
public class QueryPerformanceConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(QueryPerformanceConfig.class);
    
    @Autowired(required = false)
    private MeterRegistry meterRegistry;
    
    @Value("${app.database.slow-query-threshold-ms:1000}")
    private long slowQueryThresholdMs;
    
    @Value("${app.database.enable-query-logging:true}")
    private boolean enableQueryLogging;
    
    @Bean
    public ExecuteListener queryPerformanceListener() {
        return new ExecuteListener() {
            private Timer.Sample sample;
            
            @Override
            public void executeStart(ExecuteContext ctx) {
                if (meterRegistry != null) {
                    sample = Timer.start(meterRegistry);
                }
                
                if (enableQueryLogging && logger.isDebugEnabled()) {
                    logger.debug("Executing query: {}", ctx.sql());
                }
            }
            
            @Override
            public void executeEnd(ExecuteContext ctx) {
                if (sample != null && meterRegistry != null) {
                    Timer timer = Timer.builder("database.query.duration")
                        .description("Database query execution time")
                        .tag("query_type", getQueryType(ctx.sql()))
                        .register(meterRegistry);
                    
                    Duration duration = sample.stop(timer);
                    
                    // Log slow queries
                    if (duration.toMillis() > slowQueryThresholdMs) {
                        logger.warn("Slow query detected ({}ms): {}", 
                                   duration.toMillis(), ctx.sql());
                    }
                }
                
                if (enableQueryLogging && logger.isDebugEnabled()) {
                    logger.debug("Query completed: {} rows affected", ctx.rows());
                }
            }
            
            @Override
            public void exception(ExecuteContext ctx) {
                if (meterRegistry != null) {
                    meterRegistry.counter("database.query.errors",
                        "query_type", getQueryType(ctx.sql()),
                        "error_type", ctx.exception().getClass().getSimpleName())
                        .increment();
                }
                
                logger.error("Query execution failed: {}", ctx.sql(), ctx.exception());
            }
            
            private String getQueryType(String sql) {
                if (sql == null) return "unknown";
                
                String upperSql = sql.trim().toUpperCase();
                if (upperSql.startsWith("SELECT")) return "select";
                if (upperSql.startsWith("INSERT")) return "insert";
                if (upperSql.startsWith("UPDATE")) return "update";
                if (upperSql.startsWith("DELETE")) return "delete";
                return "other";
            }
        };
    }
}