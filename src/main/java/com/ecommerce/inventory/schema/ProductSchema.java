package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Product schema definition for Drizzle ORM integration
 */
public class ProductSchema {
    
    public static final String TABLE_NAME = "products";
    
    public static final Table<org.jooq.Record> PRODUCTS = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        PRODUCTS.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, String> NAME = 
        PRODUCTS.field(name("name"), SQLDataType.VARCHAR(200).nullable(false));
    
    public static final TableField<org.jooq.Record, String> SLUG = 
        PRODUCTS.field(name("slug"), SQLDataType.VARCHAR(200).nullable(false));
    
    public static final TableField<org.jooq.Record, String> SKU = 
        PRODUCTS.field(name("sku"), SQLDataType.VARCHAR(100).nullable(false));
    
    public static final TableField<org.jooq.Record, String> DESCRIPTION = 
        PRODUCTS.field(name("description"), SQLDataType.CLOB);
    
    public static final TableField<org.jooq.Record, Long> CATEGORY_ID = 
        PRODUCTS.field(name("category_id"), SQLDataType.BIGINT.nullable(false));
    
    public static final TableField<org.jooq.Record, Long> SUPPLIER_ID = 
        PRODUCTS.field(name("supplier_id"), SQLDataType.BIGINT.nullable(false));
    
    public static final TableField<org.jooq.Record, BigDecimal> COST_PRICE = 
        PRODUCTS.field(name("cost_price"), SQLDataType.DECIMAL(10, 2).nullable(false));
    
    public static final TableField<org.jooq.Record, BigDecimal> SELLING_PRICE = 
        PRODUCTS.field(name("selling_price"), SQLDataType.DECIMAL(10, 2).nullable(false));
    
    public static final TableField<org.jooq.Record, Integer> REORDER_LEVEL = 
        PRODUCTS.field(name("reorder_level"), SQLDataType.INTEGER.defaultValue(10));
    
    public static final TableField<org.jooq.Record, Integer> REORDER_QUANTITY = 
        PRODUCTS.field(name("reorder_quantity"), SQLDataType.INTEGER.defaultValue(50));
    
    public static final TableField<org.jooq.Record, Boolean> ACTIVE = 
        PRODUCTS.field(name("active"), SQLDataType.BOOLEAN.defaultValue(true));
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        PRODUCTS.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        PRODUCTS.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    // Foreign key references
    public static final String FK_PRODUCTS_CATEGORY_ID = "fk_products_category_id";
    public static final String FK_PRODUCTS_SUPPLIER_ID = "fk_products_supplier_id";
}