package com.ecommerce.inventory.schema;

import org.jooq.DataType;
import org.jooq.Table;
import org.jooq.TableField;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

import java.time.LocalDateTime;

import static org.jooq.impl.DSL.*;

/**
 * User schema definition for Drizzle ORM integration
 */
public class UserSchema {
    
    public static final String TABLE_NAME = "users";
    
    public static final Table<org.jooq.Record> USERS = table(name(TABLE_NAME));
    
    // Column definitions
    public static final TableField<org.jooq.Record, Long> ID = 
        USERS.field(name("id"), SQLDataType.BIGINT.identity(true));
    
    public static final TableField<org.jooq.Record, String> EMAIL = 
        USERS.field(name("email"), SQLDataType.VARCHAR(255).nullable(false));
    
    public static final TableField<org.jooq.Record, String> PASSWORD_HASH = 
        USERS.field(name("password_hash"), SQLDataType.VARCHAR(255).nullable(false));
    
    public static final TableField<org.jooq.Record, String> FIRST_NAME = 
        USERS.field(name("first_name"), SQLDataType.VARCHAR(100).nullable(false));
    
    public static final TableField<org.jooq.Record, String> LAST_NAME = 
        USERS.field(name("last_name"), SQLDataType.VARCHAR(100).nullable(false));
    
    public static final TableField<org.jooq.Record, String> ROLE = 
        USERS.field(name("role"), SQLDataType.VARCHAR(20).nullable(false));
    
    public static final TableField<org.jooq.Record, Boolean> ACTIVE = 
        USERS.field(name("active"), SQLDataType.BOOLEAN.defaultValue(true));
    
    public static final TableField<org.jooq.Record, LocalDateTime> LAST_LOGIN = 
        USERS.field(name("last_login"), SQLDataType.LOCALDATETIME);
    
    public static final TableField<org.jooq.Record, LocalDateTime> CREATED_AT = 
        USERS.field(name("created_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
    
    public static final TableField<org.jooq.Record, LocalDateTime> UPDATED_AT = 
        USERS.field(name("updated_at"), SQLDataType.LOCALDATETIME.defaultValue(currentLocalDateTime()));
}