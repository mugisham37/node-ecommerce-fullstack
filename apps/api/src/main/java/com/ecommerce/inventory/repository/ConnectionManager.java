package com.ecommerce.inventory.repository;

import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Connection management utility for repository operations
 * Provides connection pooling, transaction handling, and resource management
 */
@Component
public class ConnectionManager {
    
    private static final Logger logger = LoggerFactory.getLogger(ConnectionManager.class);
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private DSLContext dslContext;
    
    @Autowired
    private TransactionTemplate transactionTemplate;
    
    /**
     * Execute operation within a transaction
     * @param operation Operation to execute
     * @return Result of operation
     */
    public <T> T executeInTransaction(Supplier<T> operation) {
        logger.debug("Executing operation in transaction");
        
        return transactionTemplate.execute(status -> {
            try {
                T result = operation.get();
                logger.debug("Transaction operation completed successfully");
                return result;
            } catch (Exception e) {
                logger.error("Transaction operation failed, marking for rollback", e);
                status.setRollbackOnly();
                throw new RuntimeException("Transaction failed", e);
            }
        });
    }
    
    /**
     * Execute operation within a read-only transaction
     * @param operation Operation to execute
     * @return Result of operation
     */
    public <T> T executeInReadOnlyTransaction(Supplier<T> operation) {
        logger.debug("Executing operation in read-only transaction");
        
        TransactionTemplate readOnlyTemplate = new TransactionTemplate(transactionTemplate.getTransactionManager());
        readOnlyTemplate.setReadOnly(true);
        readOnlyTemplate.setTimeout(transactionTemplate.getTimeout());
        
        return readOnlyTemplate.execute(status -> {
            try {
                T result = operation.get();
                logger.debug("Read-only transaction operation completed successfully");
                return result;
            } catch (Exception e) {
                logger.error("Read-only transaction operation failed", e);
                throw new RuntimeException("Read-only transaction failed", e);
            }
        });
    }
    
    /**
     * Execute operation with manual connection management
     * @param operation Operation that takes a connection
     * @return Result of operation
     */
    public <T> T executeWithConnection(Function<Connection, T> operation) {
        logger.debug("Executing operation with manual connection management");
        
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            
            try {
                T result = operation.apply(connection);
                connection.commit();
                logger.debug("Manual connection operation completed successfully");
                return result;
            } catch (Exception e) {
                connection.rollback();
                logger.error("Manual connection operation failed, rolled back", e);
                throw new RuntimeException("Connection operation failed", e);
            }
        } catch (SQLException e) {
            logger.error("Failed to obtain database connection", e);
            throw new RuntimeException("Database connection error", e);
        }
    }
    
    /**
     * Get current DSL context
     * @return DSL context
     */
    public DSLContext getDslContext() {
        return dslContext;
    }
    
    /**
     * Check if connection is healthy
     * @return true if connection is healthy
     */
    public boolean isConnectionHealthy() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(5); // 5 second timeout
        } catch (SQLException e) {
            logger.warn("Connection health check failed", e);
            return false;
        }
    }
    
    /**
     * Get connection pool statistics (if available)
     * @return Connection pool info as string
     */
    public String getConnectionPoolInfo() {
        try {
            if (dataSource instanceof com.zaxxer.hikari.HikariDataSource) {
                com.zaxxer.hikari.HikariDataSource hikariDS = (com.zaxxer.hikari.HikariDataSource) dataSource;
                com.zaxxer.hikari.HikariPoolMXBean poolBean = hikariDS.getHikariPoolMXBean();
                
                return String.format("Pool[active=%d, idle=%d, waiting=%d, total=%d]",
                    poolBean.getActiveConnections(),
                    poolBean.getIdleConnections(),
                    poolBean.getThreadsAwaitingConnection(),
                    poolBean.getTotalConnections());
            }
        } catch (Exception e) {
            logger.debug("Could not retrieve connection pool info", e);
        }
        
        return "Connection pool info not available";
    }
}