package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Stock Movement schema definition for Drizzle ORM integration
 */
public class StockMovementSchema {
    
    public static final String TABLE_NAME = "stock_movements";
    
    public static final Table<org.jooq.Record> STOCK_MOVEMENTS = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        STOCK_MOVEMENTS.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, Long> PRODUCT_ID = 
        STOCK_MOVEMENTS.field(name("product_id"), SQLDataType.BIGINT.nullable(false));
    
    public static final TableField<org.jooq.Record, String> MOVEMENT_TYPE = 
        STOCK_MOVEMENTS.field(name("movement_type"), SQLDataType.VARCHAR(20).nullable(false));
    
    public static final TableField<org.jooq.Record, Integer> QUANTITY = 
        STOCK_MOVEMENTS.field(name("quantity"), SQLDataType.INTEGER.nullable(false));
    
    public static final TableField<org.jooq.Record, String> REFERENCE_ID = 
        STOCK_MOVEMENTS.field(name("reference_id"), SQLDataType.VARCHAR(100));
    
    public static final TableField<org.jooq.Record, String> REFERENCE_TYPE = 
        STOCK_MOVEMENTS.field(name("reference_type"), SQLDataType.VARCHAR(50));
    
    public static final TableField<org.jooq.Record, String> REASON = 
        STOCK_MOVEMENTS.field(name("reason"), SQLDataType.VARCHAR(255));
    
    public static final TableField<org.jooq.Record, String> WAREHOUSE_LOCATION = 
        STOCK_MOVEMENTS.field(name("warehouse_location"), SQLDataType.VARCHAR(50).defaultValue("MAIN"));
    
    public static final TableField<org.jooq.Record, Long> USER_ID = 
        STOCK_MOVEMENTS.field(name("user_id"), SQLDataType.BIGINT);
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        STOCK_MOVEMENTS.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    // Foreign key references
    public static final String FK_STOCK_MOVEMENTS_PRODUCT_ID = "fk_stock_movements_product_id";
    public static final String FK_STOCK_MOVEMENTS_USER_ID = "fk_stock_movements_user_id";
}