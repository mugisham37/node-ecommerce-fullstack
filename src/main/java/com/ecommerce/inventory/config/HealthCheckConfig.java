package com.ecommerce.inventory.config;

import org.springframework.boot.actuator.health.Health;
import org.springframework.boot.actuator.health.HealthIndicator;
import org.springframework.boot.actuator.info.InfoContributor;
import org.springframework.boot.actuator.info.Info;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom health checks for the inventory management system
 */
@Component
public class HealthCheckConfig implements HealthIndicator, InfoContributor {

    @Autowired
    private DataSource dataSource;

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
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                        .withDetail("database", "PostgreSQL")
                        .withDetail("status", "Connected")
                        .withDetail("timestamp", LocalDateTime.now())
                        .build();
            } else {
                return Health.down()
                        .withDetail("database", "PostgreSQL")
                        .withDetail("status", "Connection invalid")
                        .withDetail("timestamp", LocalDateTime.now())
                        .build();
            }
        } catch (SQLException e) {
            return Health.down()
                    .withDetail("database", "PostgreSQL")
                    .withDetail("error", e.getMessage())
                    .withDetail("timestamp", LocalDateTime.now())
                    .build();
        }
    }

    @Override
    public void contribute(Info.Builder builder) {
        Map<String, Object> details = new HashMap<>();
        details.put("name", "Spring Boot E-Commerce Inventory Management System");
        details.put("version", "1.0.0");
        details.put("description", "Enterprise-grade inventory management system");
        details.put("java.version", System.getProperty("java.version"));
        details.put("spring.profiles.active", System.getProperty("spring.profiles.active", "default"));
        
        builder.withDetail("application", details);
    }
}