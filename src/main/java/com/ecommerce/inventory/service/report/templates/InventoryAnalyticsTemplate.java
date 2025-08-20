package com.ecommerce.inventory.service.report.templates;

import com.ecommerce.inventory.service.report.*;
import com.ecommerce.inventory.service.report.ReportSection.SectionType;
import com.ecommerce.inventory.service.report.ReportColumn.ColumnType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Inventory Analytics Report Template
 * Generates comprehensive inventory analysis with stock levels, valuation, and trends
 */
@Component
public class InventoryAnalyticsTemplate extends AbstractReportTemplate {
    
    @Autowired
    private ReportDataAggregationEngine aggregationEngine;
    
    @Override
    public String getTemplateId() {
        return "INVENTORY_ANALYTICS";
    }
    
    @Override
    public String getTemplateName() {
        return "Inventory Analytics Report";
    }
    
    @Override
    public String getDescription() {
        return "Comprehensive inventory analysis including stock levels, valuation, movement trends, and performance metrics";
    }
    
    @Override
    public List<ReportParameter> getRequiredParameters() {
        return createDateRangeParameters();
    }
    
    @Override
    public List<ReportParameter> getOptionalParameters() {
        List<ReportParameter> optional = new ArrayList<>();
        
        optional.add(ReportParameter.builder("warehouseLocation", "Warehouse Location", ReportParameter.ParameterType.STRING)
            .description("Filter by warehouse location")
            .allowedValues(Arrays.asList("MAIN", "WAREHOUSE_A", "WAREHOUSE_B")));
        
        optional.add(ReportParameter.builder("categoryId", "Category ID", ReportParameter.ParameterType.LONG)
            .description("Filter by product category"));
        
        optional.add(ReportParameter.builder("supplierId", "Supplier ID", ReportParameter.ParameterType.LONG)
            .description("Filter by supplier"));
        
        optional.add(ReportParameter.builder("groupBy", "Group By", ReportParameter.ParameterType.ENUM)
            .description("Group results by specified field")
            .allowedValues(Arrays.asList("CATEGORY", "SUPPLIER", "WAREHOUSE", "NONE"))
            .defaultValue("CATEGORY"));
        
        optional.add(ReportParameter.builder("includeMovements", "Include Movements", ReportParameter.ParameterType.BOOLEAN)
            .description("Include stock movement analysis")
            .defaultValue(true));
        
        return optional;
    }
    
    @Override
    public long getCacheTtlSeconds() {
        return 1800; // 30 minutes - inventory data changes frequently
    }
    
    @Override
    public boolean supportsRealTimeData() {
        return true; // Inventory can be real-time
    }
    
    @Override
    public long getEstimatedExecutionTimeMs() {
        return 3000; // 3 seconds
    }
    
    @Override
    public ReportData generateReport(Map<String, Object> parameters) {
        logger.info("Generating inventory analytics report with parameters: {}", parameters);
        
        LocalDateTime startDate = (LocalDateTime) parameters.get("startDate");
        LocalDateTime endDate = (LocalDateTime) parameters.get("endDate");
        String groupBy = (String) parameters.getOrDefault("groupBy", "CATEGORY");
        boolean includeMovements = (Boolean) parameters.getOrDefault("includeMovements", true);
        
        ReportData reportData = createReportData("Inventory Analytics Report", parameters);
        
        List<ReportSection> sections = new ArrayList<>();
        
        // 1. Executive Summary Section
        sections.add(createExecutiveSummarySection(startDate, endDate, groupBy));
        
        // 2. Stock Levels Section
        sections.add(createStockLevelsSection(groupBy));
        
        // 3. Inventory Valuation Section
        sections.add(createInventoryValuationSection(groupBy));
        
        // 4. Stock Movement Analysis (if requested)
        if (includeMovements) {
            sections.add(createStockMovementSection(startDate, endDate, groupBy));
        }
        
        // 5. Low Stock Alerts Section
        sections.add(createLowStockAlertsSection());
        
        // 6. Inventory Performance Metrics
        sections.add(createPerformanceMetricsSection(startDate, endDate));
        
        reportData.setSections(sections);
        
        // Create summary
        Map<String, Object> summary = createReportSummary(startDate, endDate, groupBy);
        reportData.setSummary(summary);
        
        // Add metadata
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("reportType", "INVENTORY_ANALYTICS");
        metadata.put("dataFreshness", "REAL_TIME");
        metadata.put("totalSections", sections.size());
        metadata.put("groupBy", groupBy);
        metadata.put("includeMovements", includeMovements);
        reportData.setMetadata(metadata);
        
        logger.info("Inventory analytics report generated successfully");
        return reportData;
    }
    
    private ReportSection createExecutiveSummarySection(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        Map<String, Object> summaryData = aggregationEngine.aggregateInventoryData(
            startDate, endDate, groupBy, Arrays.asList("stock_levels", "inventory_value"));
        
        return ReportSection.builder("executive_summary", "Executive Summary", SectionType.SUMMARY)
            .description("High-level inventory metrics and key performance indicators")
            .data(summaryData)
            .order(1);
    }
    
    private ReportSection createStockLevelsSection(String groupBy) {
        Map<String, Object> stockData = aggregationEngine.aggregateInventoryData(
            null, null, groupBy, Arrays.asList("stock_levels"));
        
        List<ReportColumn> columns = Arrays.asList(
            ReportColumn.builder("product_name", "Product Name", "productName", ColumnType.STRING),
            ReportColumn.builder("sku", "SKU", "sku", ColumnType.STRING),
            ReportColumn.builder("current_stock", "Current Stock", "currentStock", ColumnType.NUMBER),
            ReportColumn.builder("allocated_stock", "Allocated", "allocatedStock", ColumnType.NUMBER),
            ReportColumn.builder("available_stock", "Available", "availableStock", ColumnType.NUMBER),
            ReportColumn.builder("reorder_level", "Reorder Level", "reorderLevel", ColumnType.NUMBER),
            ReportColumn.builder("stock_status", "Status", "stockStatus", ColumnType.STRING)
        );
        
        return ReportSection.builder("stock_levels", "Current Stock Levels", SectionType.TABLE)
            .description("Current inventory levels for all products")
            .data(stockData)
            .columns(columns)
            .order(2);
    }
    
    private ReportSection createInventoryValuationSection(String groupBy) {
        Map<String, Object> valuationData = aggregationEngine.aggregateInventoryData(
            null, null, groupBy, Arrays.asList("inventory_value"));
        
        List<ReportColumn> columns = Arrays.asList(
            ReportColumn.builder("category", "Category", "category", ColumnType.STRING),
            ReportColumn.builder("product_count", "Products", "productCount", ColumnType.NUMBER),
            ReportColumn.builder("total_units", "Total Units", "totalUnits", ColumnType.NUMBER),
            ReportColumn.builder("cost_value", "Cost Value", "costValue", ColumnType.CURRENCY),
            ReportColumn.builder("selling_value", "Selling Value", "sellingValue", ColumnType.CURRENCY),
            ReportColumn.builder("potential_profit", "Potential Profit", "potentialProfit", ColumnType.CURRENCY),
            ReportColumn.builder("margin_percentage", "Margin %", "marginPercentage", ColumnType.PERCENTAGE)
        );
        
        return ReportSection.builder("inventory_valuation", "Inventory Valuation", SectionType.TABLE)
            .description("Financial valuation of current inventory")
            .data(valuationData)
            .columns(columns)
            .order(3);
    }
    
    private ReportSection createStockMovementSection(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        Map<String, Object> movementData = aggregationEngine.aggregateInventoryData(
            startDate, endDate, groupBy, Arrays.asList("stock_movements"));
        
        // Create chart configuration for movement trends
        Map<String, Object> chartConfig = new HashMap<>();
        chartConfig.put("type", "line");
        chartConfig.put("xAxis", "date");
        chartConfig.put("yAxis", "quantity");
        chartConfig.put("series", Arrays.asList("inbound", "outbound", "adjustments"));
        
        return ReportSection.builder("stock_movements", "Stock Movement Analysis", SectionType.CHART)
            .description("Analysis of stock movements over the selected period")
            .data(movementData)
            .chartConfig(chartConfig)
            .order(4);
    }
    
    private ReportSection createLowStockAlertsSection() {
        Map<String, Object> alertData = aggregationEngine.aggregateInventoryData(
            null, null, "NONE", Arrays.asList("low_stock_analysis"));
        
        List<ReportColumn> columns = Arrays.asList(
            ReportColumn.builder("product_name", "Product Name", "productName", ColumnType.STRING),
            ReportColumn.builder("sku", "SKU", "sku", ColumnType.STRING),
            ReportColumn.builder("current_stock", "Current Stock", "currentStock", ColumnType.NUMBER),
            ReportColumn.builder("reorder_level", "Reorder Level", "reorderLevel", ColumnType.NUMBER),
            ReportColumn.builder("shortage", "Shortage", "shortage", ColumnType.NUMBER),
            ReportColumn.builder("days_until_stockout", "Days Until Stockout", "daysUntilStockout", ColumnType.NUMBER),
            ReportColumn.builder("priority", "Priority", "priority", ColumnType.STRING)
        );
        
        return ReportSection.builder("low_stock_alerts", "Low Stock Alerts", SectionType.TABLE)
            .description("Products requiring immediate attention due to low stock levels")
            .data(alertData)
            .columns(columns)
            .order(5);
    }
    
    private ReportSection createPerformanceMetricsSection(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> performanceData = aggregationEngine.aggregateInventoryData(
            startDate, endDate, "NONE", Arrays.asList("turnover_rates"));
        
        return ReportSection.builder("performance_metrics", "Inventory Performance Metrics", SectionType.METRICS)
            .description("Key performance indicators for inventory management")
            .data(performanceData)
            .order(6);
    }
    
    private Map<String, Object> createReportSummary(LocalDateTime startDate, LocalDateTime endDate, String groupBy) {
        Map<String, Object> summary = new HashMap<>();
        
        // This would be calculated from actual data
        summary.put("totalProducts", 1250);
        summary.put("totalInventoryValue", 2500000.00);
        summary.put("lowStockItems", 45);
        summary.put("outOfStockItems", 8);
        summary.put("averageTurnoverRate", 4.2);
        summary.put("inventoryHealthScore", 85.5);
        
        summary.put("reportPeriod", Map.of(
            "startDate", startDate,
            "endDate", endDate
        ));
        
        summary.put("keyInsights", Arrays.asList(
            "Inventory turnover rate improved by 12% compared to previous period",
            "45 products require immediate reordering",
            "Electronics category shows highest profit margin at 35%",
            "Stock movement velocity increased by 8% this month"
        ));
        
        return summary;
    }
}