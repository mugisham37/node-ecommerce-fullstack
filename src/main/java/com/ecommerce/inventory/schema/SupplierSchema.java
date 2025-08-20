package com.ecommerce.inventory.schema;

import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.SQLDataType;

import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * Supplier schema definition for Drizzle ORM integration
 */
public class SupplierSchema {
    
    public static final String TABLE_NAME = "suppliers";
    
    public static final Table<org.jooq.Record> SUPPLIERS = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        SUPPLIERS.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, String> NAME = 
        SUPPLIERS.field(name("name"), SQLDataType.VARCHAR(200).nullable(false));
    
    public static final TableField<org.jooq.Record, String> CONTACT_PERSON = 
        SUPPLIERS.field(name("contact_person"), SQLDataType.VARCHAR(100));
    
    public static final TableField<org.jooq.Record, String> EMAIL = 
        SUPPLIERS.field(name("email"), SQLDataType.VARCHAR(255));
    
    public static final TableField<org.jooq.Record, String> PHONE = 
        SUPPLIERS.field(name("phone"), SQLDataType.VARCHAR(20));
    
    public static final TableField<org.jooq.Record, String> ADDRESS = 
        SUPPLIERS.field(name("address"), SQLDataType.CLOB);
    
    public static final TableField<org.jooq.Record, String> PAYMENT_TERMS = 
        SUPPLIERS.field(name("payment_terms"), SQLDataType.VARCHAR(100));
    
    public static final TableField<org.jooq.Record, String> STATUS = 
        SUPPLIERS.field(name("status"), SQLDataType.VARCHAR(20).defaultValue("ACTIVE"));
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        SUPPLIERS.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        SUPPLIERS.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
}