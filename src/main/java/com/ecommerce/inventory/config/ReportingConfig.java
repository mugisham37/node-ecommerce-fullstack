package com.ecommerce.inventory.config;

import com.ecommerce.inventory.service.report.ReportGenerationService;
import com.ecommerce.inventory.service.report.templates.InventoryAnalyticsTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

/**
 * Reporting Configuration
 * Configures and registers all report templates in the system
 */
@Configuration
public class ReportingConfig implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportingConfig.class);
    
    @Autowired
    private ReportGenerationService reportGenerationService;
    
    @Autowired
    private InventoryAnalyticsTemplate inventoryAnalyticsTemplate;
    
    @Override
    public void run(String... args) throws Exception {
        logger.info("Registering report templates...");
        
        // Register all available report templates
        reportGenerationService.registerTemplate(inventoryAnalyticsTemplate);
        
        logger.info("Report templates registered successfully. Total templates: {}", 
            reportGenerationService.getRegisteredTemplates().size());
        
        // Warm up caches with common reports
        logger.info("Warming up report caches...");
        reportGenerationService.warmupCaches();
        
        logger.info("Reporting system initialized successfully");
    }
}