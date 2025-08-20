package com.ecommerce.inventory.service.report;

/**
 * Report Column definition for table-based report sections
 */
public class ReportColumn {
    
    public enum ColumnType {
        STRING, NUMBER, DECIMAL, PERCENTAGE, CURRENCY, DATE, DATETIME, BOOLEAN
    }
    
    public enum Alignment {
        LEFT, CENTER, RIGHT
    }
    
    private String columnId;
    private String header;
    private String dataField;
    private ColumnType type;
    private Alignment alignment;
    private boolean sortable;
    private boolean filterable;
    private String format;
    private int width;
    private boolean visible;
    
    public ReportColumn() {
        this.visible = true;
        this.sortable = true;
        this.alignment = Alignment.LEFT;
    }
    
    public ReportColumn(String columnId, String header, String dataField, ColumnType type) {
        this();
        this.columnId = columnId;
        this.header = header;
        this.dataField = dataField;
        this.type = type;
    }
    
    // Builder pattern
    public static ReportColumn builder(String columnId, String header, String dataField, ColumnType type) {
        return new ReportColumn(columnId, header, dataField, type);
    }
    
    public ReportColumn alignment(Alignment alignment) {
        this.alignment = alignment;
        return this;
    }
    
    public ReportColumn sortable(boolean sortable) {
        this.sortable = sortable;
        return this;
    }
    
    public ReportColumn filterable(boolean filterable) {
        this.filterable = filterable;
        return this;
    }
    
    public ReportColumn format(String format) {
        this.format = format;
        return this;
    }
    
    public ReportColumn width(int width) {
        this.width = width;
        return this;
    }
    
    public ReportColumn visible(boolean visible) {
        this.visible = visible;
        return this;
    }
    
    // Getters and setters
    public String getColumnId() { return columnId; }
    public void setColumnId(String columnId) { this.columnId = columnId; }
    
    public String getHeader() { return header; }
    public void setHeader(String header) { this.header = header; }
    
    public String getDataField() { return dataField; }
    public void setDataField(String dataField) { this.dataField = dataField; }
    
    public ColumnType getType() { return type; }
    public void setType(ColumnType type) { this.type = type; }
    
    public Alignment getAlignment() { return alignment; }
    public void setAlignment(Alignment alignment) { this.alignment = alignment; }
    
    public boolean isSortable() { return sortable; }
    public void setSortable(boolean sortable) { this.sortable = sortable; }
    
    public boolean isFilterable() { return filterable; }
    public void setFilterable(boolean filterable) { this.filterable = filterable; }
    
    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }
    
    public int getWidth() { return width; }
    public void setWidth(int width) { this.width = width; }
    
    public boolean isVisible() { return visible; }
    public void setVisible(boolean visible) { this.visible = visible; }
}