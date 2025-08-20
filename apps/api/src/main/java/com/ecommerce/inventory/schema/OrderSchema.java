package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Order schema definition for Drizzle ORM integration
 */
public class OrderSchema {
    
    public static final String TABLE_NAME = "orders";
    
    public static final Table<org.jooq.Record> ORDERS = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        ORDERS.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, String> ORDER_NUMBER = 
        ORDERS.field(name("order_number"), SQLDataType.VARCHAR(50).nullable(false));
    
    public static final TableField<org.jooq.Record, String> CUSTOMER_NAME = 
        ORDERS.field(name("customer_name"), SQLDataType.VARCHAR(200).nullable(false));
    
    public static final TableField<org.jooq.Record, String> CUSTOMER_EMAIL = 
        ORDERS.field(name("customer_email"), SQLDataType.VARCHAR(255));
    
    public static final TableField<org.jooq.Record, String> CUSTOMER_PHONE = 
        ORDERS.field(name("customer_phone"), SQLDataType.VARCHAR(20));
    
    public static final TableField<org.jooq.Record, String> SHIPPING_ADDRESS = 
        ORDERS.field(name("shipping_address"), SQLDataType.CLOB.nullable(false));
    
    public static final TableField<org.jooq.Record, String> BILLING_ADDRESS = 
        ORDERS.field(name("billing_address"), SQLDataType.CLOB);
    
    public static final TableField<org.jooq.Record, String> STATUS = 
        ORDERS.field(name("status"), SQLDataType.VARCHAR(20).defaultValue("PENDING"));
    
    public static final TableField<org.jooq.Record, BigDecimal> SUBTOTAL = 
        ORDERS.field(name("subtotal"), SQLDataType.DECIMAL(12, 2).nullable(false));
    
    public static final TableField<org.jooq.Record, BigDecimal> TAX_AMOUNT = 
        ORDERS.field(name("tax_amount"), SQLDataType.DECIMAL(10, 2).defaultValue(BigDecimal.ZERO));
    
    public static final TableField<org.jooq.Record, BigDecimal> SHIPPING_COST = 
        ORDERS.field(name("shipping_cost"), SQLDataType.DECIMAL(10, 2).defaultValue(BigDecimal.ZERO));
    
    public static final TableField<org.jooq.Record, BigDecimal> TOTAL_AMOUNT = 
        ORDERS.field(name("total_amount"), SQLDataType.DECIMAL(12, 2).nullable(false));
    
    public static final TableField<org.jooq.Record, Long> CREATED_BY = 
        ORDERS.field(name("created_by"), SQLDataType.BIGINT);
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        ORDERS.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        ORDERS.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    // Foreign key references
    public static final String FK_ORDERS_CREATED_BY = "fk_orders_created_by";
}