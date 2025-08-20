package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Inventory schema definition for Drizzle ORM integration
 */
public class InventorySchema {
    
    public static final String TABLE_NAME = "inventory";
    
    public static final Table<org.jooq.Record> INVENTORY = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        INVENTORY.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, Long> PRODUCT_ID = 
        INVENTORY.field(name("product_id"), SQLDataType.BIGINT.nullable(false));
    
    public static final TableField<org.jooq.Record, String> WAREHOUSE_LOCATION = 
        INVENTORY.field(name("warehouse_location"), SQLDataType.VARCHAR(50).defaultValue("MAIN"));
    
    public static final TableField<org.jooq.Record, Integer> QUANTITY_ON_HAND = 
        INVENTORY.field(name("quantity_on_hand"), SQLDataType.INTEGER.defaultValue(0));
    
    public static final TableField<org.jooq.Record, Integer> QUANTITY_ALLOCATED = 
        INVENTORY.field(name("quantity_allocated"), SQLDataType.INTEGER.defaultValue(0));
    
    public static final TableField<org.jooq.Record, LocalDateTime> LAST_COUNTED_AT = 
        INVENTORY.field(name("last_counted_at"), SQLDataType.LOCALDATETIME);
    
    public static final TableField<org.jooq.Record, Long> VERSION = 
        INVENTORY.field(name("version"), SQLDataType.BIGINT.defaultValue(0));
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        INVENTORY.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        INVENTORY.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    // Foreign key references
    public static final String FK_INVENTORY_PRODUCT_ID = "fk_inventory_product_id";
}