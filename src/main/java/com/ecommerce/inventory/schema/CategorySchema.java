package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Category schema definition for Drizzle ORM integration
 */
public class CategorySchema {
    
    public static final String TABLE_NAME = "categories";
    
    public static final Table<org.jooq.Record> CATEGORIES = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        CATEGORIES.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, String> NAME = 
        CATEGORIES.field(name("name"), SQLDataType.VARCHAR(100).nullable(false));
    
    public static final TableField<org.jooq.Record, String> SLUG = 
        CATEGORIES.field(name("slug"), SQLDataType.VARCHAR(100).nullable(false));
    
    public static final TableField<org.jooq.Record, String> DESCRIPTION = 
        CATEGORIES.field(name("description"), SQLDataType.CLOB);
    
    public static final TableField<org.jooq.Record, Long> PARENT_ID = 
        CATEGORIES.field(name("parent_id"), SQLDataType.BIGINT);
    
    public static final TableField<org.jooq.Record, Integer> SORT_ORDER = 
        CATEGORIES.field(name("sort_order"), SQLDataType.INTEGER.defaultValue(0));
    
    public static final TableField<org.jooq.Record, Boolean> ACTIVE = 
        CATEGORIES.field(name("active"), SQLDataType.BOOLEAN.defaultValue(true));
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        CATEGORIES.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        CATEGORIES.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    // Foreign key references
    public static final String FK_CATEGORIES_PARENT_ID = "fk_categories_parent_id";
}