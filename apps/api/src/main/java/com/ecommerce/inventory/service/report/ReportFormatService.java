package com.ecommerce.inventory.service.report;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Report Format Service for converting reports to different output formats
 * Supports PDF, Excel, CSV, and JSON formats
 */
@Service
public class ReportFormatService {
    
    private static final Logger logger = LoggerFactory.getLogger(ReportFormatService.class);
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Format report data to specified output format
     */
    public byte[] formatReport(ReportData reportData, String outputFormat) {
        logger.debug("Formatting report {} to {} format", reportData.getReportId(), outputFormat);
        
        try {
            switch (outputFormat.toUpperCase()) {
                case "PDF":
                    return formatToPdf(reportData);
                case "EXCEL":
                    return formatToExcel(reportData);
                case "CSV":
                    return formatToCsv(reportData);
                case "JSON":
                    return formatToJson(reportData);
                default:
                    throw new IllegalArgumentException("Unsupported output format: " + outputFormat);
            }
        } catch (Exception e) {
            logger.error("Error formatting report to {}", outputFormat, e);
            throw new RuntimeException("Failed to format report: " + e.getMessage(), e);
        }
    }
    
    /**
     * Format report to PDF
     */
    private byte[] formatToPdf(ReportData reportData) {
        logger.debug("Formatting report to PDF");
        
        // In a real implementation, this would use a PDF library like iText or Apache PDFBox
        // For now, returning a simple text representation
        StringBuilder pdfContent = new StringBuilder();
        
        pdfContent.append("REPORT: ").append(reportData.getReportName()).append("\\n");
        pdfContent.append("Generated: ").append(reportData.getGeneratedAt()).append("\\n");
        pdfContent.append("Report ID: ").append(reportData.getReportId()).append("\\n\\n");
        
        // Add summary
        if (reportData.getSummary() != null) {
            pdfContent.append("SUMMARY:\\n");
            reportData.getSummary().forEach((key, value) -> 
                pdfContent.append("- ").append(key).append(": ").append(value).append("\\n"));
            pdfContent.append("\\n");
        }
        
        // Add sections
        if (reportData.getSections() != null) {
            for (ReportSection section : reportData.getSections()) {
                pdfContent.append("SECTION: ").append(section.getTitle()).append("\\n");
                if (section.getDescription() != null) {
                    pdfContent.append("Description: ").append(section.getDescription()).append("\\n");
                }
                
                // Add section data
                if (section.getData() != null) {
                    section.getData().forEach((key, value) -> 
                        pdfContent.append("  ").append(key).append(": ").append(value).append("\\n"));
                }
                pdfContent.append("\\n");
            }
        }
        
        return pdfContent.toString().getBytes(StandardCharsets.UTF_8);
    }
    
    /**
     * Format report to Excel
     */
    private byte[] formatToExcel(ReportData reportData) {
        logger.debug("Formatting report to Excel");
        
        // In a real implementation, this would use Apache POI to create Excel files
        // For now, returning a CSV-like format
        StringBuilder excelContent = new StringBuilder();
        
        // Header
        excelContent.append("Report Name,").append(reportData.getReportName()).append("\\n");
        excelContent.append("Generated,").append(reportData.getGeneratedAt()).append("\\n");
        excelContent.append("Report ID,").append(reportData.getReportId()).append("\\n\\n");
        
        // Summary sheet
        if (reportData.getSummary() != null) {
            excelContent.append("SUMMARY\\n");
            excelContent.append("Metric,Value\\n");
            reportData.getSummary().forEach((key, value) -> 
                excelContent.append(escapeCSV(key)).append(",").append(escapeCSV(String.valueOf(value))).append("\\n"));
            excelContent.append("\\n");
        }
        
        // Data sheets
        if (reportData.getSections() != null) {
            for (ReportSection section : reportData.getSections()) {
                excelContent.append(section.getTitle().toUpperCase()).append("\\n");
                
                if (section.getType() == ReportSection.SectionType.TABLE && section.getColumns() != null) {
                    // Add column headers
                    section.getColumns().forEach(column -> 
                        excelContent.append(escapeCSV(column.getHeader())).append(","));
                    excelContent.append("\\n");
                    
                    // Add data rows (simplified)
                    excelContent.append("Sample data would go here\\n");
                }
                excelContent.append("\\n");
            }
        }
        
        return excelContent.toString().getBytes(StandardCharsets.UTF_8);
    }
    
    /**
     * Format report to CSV
     */
    private byte[] formatToCsv(ReportData reportData) {
        logger.debug("Formatting report to CSV");
        
        StringBuilder csvContent = new StringBuilder();
        
        // Header information
        csvContent.append("Report Information\\n");
        csvContent.append("Field,Value\\n");
        csvContent.append("Report Name,").append(escapeCSV(reportData.getReportName())).append("\\n");
        csvContent.append("Generated,").append(reportData.getGeneratedAt()).append("\\n");
        csvContent.append("Report ID,").append(reportData.getReportId()).append("\\n\\n");
        
        // Summary data
        if (reportData.getSummary() != null) {
            csvContent.append("Summary\\n");
            csvContent.append("Metric,Value\\n");
            reportData.getSummary().forEach((key, value) -> 
                csvContent.append(escapeCSV(key)).append(",").append(escapeCSV(String.valueOf(value))).append("\\n"));
            csvContent.append("\\n");
        }
        
        // Section data
        if (reportData.getSections() != null) {
            for (ReportSection section : reportData.getSections()) {
                csvContent.append(section.getTitle()).append("\\n");
                
                if (section.getType() == ReportSection.SectionType.TABLE && section.getColumns() != null) {
                    // Column headers
                    section.getColumns().forEach(column -> 
                        csvContent.append(escapeCSV(column.getHeader())).append(","));
                    csvContent.append("\\n");
                    
                    // Sample data row
                    csvContent.append("Sample data would be extracted from section data\\n");
                }
                csvContent.append("\\n");
            }
        }
        
        return csvContent.toString().getBytes(StandardCharsets.UTF_8);
    }
    
    /**
     * Format report to JSON
     */
    private byte[] formatToJson(ReportData reportData) {
        logger.debug("Formatting report to JSON");
        
        try {
            // Create a simplified JSON structure
            Map<String, Object> jsonReport = Map.of(
                "reportId", reportData.getReportId(),
                "reportName", reportData.getReportName(),
                "templateId", reportData.getTemplateId(),
                "generatedAt", reportData.getGeneratedAt(),
                "dataAsOf", reportData.getDataAsOf(),
                "executionTimeMs", reportData.getExecutionTimeMs(),
                "fromCache", reportData.isFromCache(),
                "parameters", reportData.getParameters() != null ? reportData.getParameters() : Map.of(),
                "summary", reportData.getSummary() != null ? reportData.getSummary() : Map.of(),
                "sections", reportData.getSections() != null ? formatSectionsForJson(reportData.getSections()) : List.of(),
                "metadata", reportData.getMetadata() != null ? reportData.getMetadata() : Map.of()
            );
            
            return objectMapper.writeValueAsBytes(jsonReport);
            
        } catch (Exception e) {
            logger.error("Error formatting report to JSON", e);
            throw new RuntimeException("Failed to format report to JSON", e);
        }
    }
    
    /**
     * Format sections for JSON output
     */
    private List<Map<String, Object>> formatSectionsForJson(List<ReportSection> sections) {
        return sections.stream()
            .map(section -> Map.of(
                "sectionId", section.getSectionId(),
                "title", section.getTitle(),
                "description", section.getDescription() != null ? section.getDescription() : "",
                "type", section.getType().toString(),
                "order", section.getOrder(),
                "data", section.getData() != null ? section.getData() : Map.of(),
                "columns", section.getColumns() != null ? formatColumnsForJson(section.getColumns()) : List.of(),
                "chartConfig", section.getChartConfig() != null ? section.getChartConfig() : Map.of()
            ))
            .toList();
    }
    
    /**
     * Format columns for JSON output
     */
    private List<Map<String, Object>> formatColumnsForJson(List<ReportColumn> columns) {
        return columns.stream()
            .map(column -> Map.of(
                "columnId", column.getColumnId(),
                "header", column.getHeader(),
                "dataField", column.getDataField(),
                "type", column.getType().toString(),
                "alignment", column.getAlignment().toString(),
                "sortable", column.isSortable(),
                "filterable", column.isFilterable(),
                "visible", column.isVisible(),
                "width", column.getWidth(),
                "format", column.getFormat() != null ? column.getFormat() : ""
            ))
            .toList();
    }
    
    /**
     * Escape CSV values
     */
    private String escapeCSV(String value) {
        if (value == null) return "";
        
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.contains(",") || value.contains("\\"") || value.contains("\\n")) {
            return "\\"" + value.replace("\\"", "\\"\\"") + "\\"";
        }
        
        return value;
    }
    
    /**
     * Get supported formats
     */
    public List<String> getSupportedFormats() {
        return List.of("PDF", "EXCEL", "CSV", "JSON");
    }
    
    /**
     * Validate format
     */
    public boolean isFormatSupported(String format) {
        return getSupportedFormats().contains(format.toUpperCase());
    }
}