package com.ecommerce.inventory.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;

@Configuration
public class FlywayConfig {

    @Autowired
    private DataSource dataSource;

    /**
     * Custom Flyway migration strategy for development environment
     * This allows for clean database recreation during development
     */
    @Bean
    @Profile("dev")
    public FlywayMigrationStrategy cleanMigrateStrategy() {
        return flyway -> {
            // Clean and migrate for development
            flyway.clean();
            flyway.migrate();
        };
    }

    /**
     * Production-safe migration strategy
     * Only performs migration without cleaning
     */
    @Bean
    @Profile({"prod", "test"})
    public FlywayMigrationStrategy safeMigrateStrategy() {
        return Flyway::migrate;
    }

    /**
     * Custom Flyway configuration for advanced settings
     */
    @Bean
    public Flyway flyway() {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .validateOnMigrate(true)
                .outOfOrder(false)
                .ignoreMissingMigrations(false)
                .load();
    }
}