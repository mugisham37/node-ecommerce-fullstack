package com.ecommerce.inventory.health;

import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.ResultSet;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom health indicator for PostgreSQL database with connection pool monitoring
 */
@Component("database")
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    @Autowired
    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try {
            return checkDatabaseHealth();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
        }
    }

    private Health checkDatabaseHealth() {
        Map<String, Object> details = new HashMap<>();
        details.put("timestamp", LocalDateTime.now());

        try (Connection connection = dataSource.getConnection()) {
            // Test basic connectivity
            if (!connection.isValid(5)) {
                return Health.down()
                        .withDetails(details)
                        .withDetail("status", "Connection invalid")
                        .build();
            }

            // Test database operations
            try (Statement statement = connection.createStatement()) {
                ResultSet rs = statement.executeQuery("SELECT version(), current_database(), current_user");
                if (rs.next()) {
                    details.put("database.version", rs.getString(1));
                    details.put("database.name", rs.getString(2));
                    details.put("database.user", rs.getString(3));
                }
            }

            // Get connection pool metrics if using HikariCP
            if (dataSource instanceof HikariDataSource) {
                HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
                HikariPoolMXBean poolBean = hikariDataSource.getHikariPoolMXBean();
                
                if (poolBean != null) {
                    details.put("pool.active_connections", poolBean.getActiveConnections());
                    details.put("pool.idle_connections", poolBean.getIdleConnections());
                    details.put("pool.total_connections", poolBean.getTotalConnections());
                    details.put("pool.threads_awaiting_connection", poolBean.getThreadsAwaitingConnection());
                    details.put("pool.max_pool_size", hikariDataSource.getMaximumPoolSize());
                    details.put("pool.min_idle", hikariDataSource.getMinimumIdle());
                }
            }

            // Test a simple query on our main tables
            try (Statement statement = connection.createStatement()) {
                ResultSet rs = statement.executeQuery(
                    "SELECT " +
                    "(SELECT COUNT(*) FROM products WHERE active = true) as active_products, " +
                    "(SELECT COUNT(*) FROM orders WHERE status = 'PENDING') as pending_orders, " +
                    "(SELECT COUNT(*) FROM inventory WHERE quantity_on_hand < reorder_level) as low_stock_items"
                );
                
                if (rs.next()) {
                    details.put("business.active_products", rs.getInt("active_products"));
                    details.put("business.pending_orders", rs.getInt("pending_orders"));
                    details.put("business.low_stock_items", rs.getInt("low_stock_items"));
                }
            }

            return Health.up()
                    .withDetails(details)
                    .withDetail("status", "Connected and operational")
                    .build();

        } catch (SQLException e) {
            return Health.down()
                    .withDetails(details)
                    .withDetail("error", e.getMessage())
                    .withDetail("sql_state", e.getSQLState())
                    .withDetail("error_code", e.getErrorCode())
                    .build();
        }
    }
}