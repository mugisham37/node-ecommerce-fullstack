package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Order Item schema definition for Drizzle ORM integration
 */
public class OrderItemSchema {
    
    public static final String TABLE_NAME = "order_items";
    
    public static final Table<org.jooq.Record> ORDER_ITEMS = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        ORDER_ITEMS.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, Long> ORDER_ID = 
        ORDER_ITEMS.field(name("order_id"), SQLDataType.BIGINT.nullable(false));
    
    public static final TableField<org.jooq.Record, Long> PRODUCT_ID = 
        ORDER_ITEMS.field(name("product_id"), SQLDataType.BIGINT.nullable(false));
    
    public static final TableField<org.jooq.Record, Integer> QUANTITY = 
        ORDER_ITEMS.field(name("quantity"), SQLDataType.INTEGER.nullable(false));
    
    public static final TableField<org.jooq.Record, BigDecimal> UNIT_PRICE = 
        ORDER_ITEMS.field(name("unit_price"), SQLDataType.DECIMAL(10, 2).nullable(false));
    
    public static final TableField<org.jooq.Record, BigDecimal> TOTAL_PRICE = 
        ORDER_ITEMS.field(name("total_price"), SQLDataType.DECIMAL(12, 2).nullable(false));
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        ORDER_ITEMS.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        ORDER_ITEMS.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    // Foreign key references
    public static final String FK_ORDER_ITEMS_ORDER_ID = "fk_order_items_order_id";
    public static final String FK_ORDER_ITEMS_PRODUCT_ID = "fk_order_items_product_id";
}