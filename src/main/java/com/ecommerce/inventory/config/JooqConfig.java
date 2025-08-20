package com.ecommerce.inventory.config;

import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.conf.RenderNameCase;
import org.jooq.conf.Settings;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;

/**
 * JOOQ configuration for database operations
 * Provides DSLContext with optimized settings for PostgreSQL
 */
@Configuration
@EnableTransactionManagement
public class JooqConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(JooqConfig.class);
    
    @Autowired
    private DataSource dataSource;
    
    @Value("${spring.jooq.sql-dialect:POSTGRES}")
    private String sqlDialect;
    
    @Value("${logging.level.org.jooq:INFO}")
    private String jooqLogLevel;
    
    @Autowired(required = false)
    private org.jooq.ExecuteListener queryPerformanceListener;
    
    @Bean
    public DSLContext dslContext() {
        logger.info("Configuring JOOQ DSLContext with dialect: {}", sqlDialect);
        
        Settings settings = new Settings()
            .withRenderNameCase(RenderNameCase.LOWER)
            .withRenderSchema(false)
            .withRenderCatalog(false)
            .withExecuteLogging("DEBUG".equalsIgnoreCase(jooqLogLevel))
            .withExecuteWithOptimisticLocking(true)
            .withExecuteWithOptimisticLockingExcludeUnversioned(true)
            .withFetchWarnings(false)
            .withReturnIdentityOnUpdatableRecord(true)
            .withReturnAllOnUpdatableRecord(false)
            .withReturnRecordToPojo(true)
            .withMapJPAAnnotations(false)
            .withMapConstructorParameterNames(true)
            .withReflectionCaching(true);
        
        org.jooq.Configuration configuration = new org.jooq.impl.DefaultConfiguration()
            .set(dataSource)
            .set(SQLDialect.valueOf(sqlDialect.toUpperCase()))
            .set(settings);
        
        if (queryPerformanceListener != null) {
            configuration.set(queryPerformanceListener);
        }
        
        DSLContext context = DSL.using(configuration);
        
        logger.info("JOOQ DSLContext configured successfully");
        return context;
    }
}