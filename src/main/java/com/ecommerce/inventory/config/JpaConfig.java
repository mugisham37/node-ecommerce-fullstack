package com.ecommerce.inventory.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * JPA Configuration
 * Enables JPA auditing, repositories, and transaction management
 */
@Configuration
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.ecommerce.inventory.repository")
@EnableTransactionManagement
public class JpaConfig {
}