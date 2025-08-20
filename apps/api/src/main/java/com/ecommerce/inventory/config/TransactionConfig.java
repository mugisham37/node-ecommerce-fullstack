package com.ecommerce.inventory.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;

/**
 * Transaction management configuration for repository operations
 * Provides optimized transaction handling for JOOQ operations
 */
@Configuration
@EnableTransactionManagement
public class TransactionConfig {
    
    @Autowired
    private DataSource dataSource;
    
    @Bean
    public PlatformTransactionManager transactionManager() {
        DataSourceTransactionManager transactionManager = new DataSourceTransactionManager();
        transactionManager.setDataSource(dataSource);
        transactionManager.setEnforceReadOnly(true);
        transactionManager.setRollbackOnCommitFailure(true);
        return transactionManager;
    }
    
    @Bean
    public TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setTimeout(30); // 30 seconds timeout
        template.setIsolationLevel(TransactionTemplate.ISOLATION_READ_COMMITTED);
        return template;
    }
}