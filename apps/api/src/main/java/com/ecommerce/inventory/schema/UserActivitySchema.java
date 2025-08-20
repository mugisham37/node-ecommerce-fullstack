package com.ecommerce.inventory.schema;

import org.jooq.DataType;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;

/**
 * Database schema definition for user_activities table
 */
public class UserActivitySchema {

    public static final Table<org.jooq.Record> USER_ACTIVITIES = DSL.table("user_activities");

    // Column definitions
    public static final Field<Long> ID = DSL.field("id", SQLDataType.BIGINT.identity(true));
    public static final Field<Long> USER_ID = DSL.field("user_id", SQLDataType.BIGINT.nullable(false));
    public static final Field<String> ACTION = DSL.field("action", SQLDataType.VARCHAR(100).nullable(false));
    public static final Field<String> RESOURCE_TYPE = DSL.field("resource_type", SQLDataType.VARCHAR(50));
    public static final Field<String> RESOURCE_ID = DSL.field("resource_id", SQLDataType.VARCHAR(100));
    public static final Field<String> IP_ADDRESS = DSL.field("ip_address", SQLDataType.VARCHAR(45));
    public static final Field<String> USER_AGENT = DSL.field("user_agent", SQLDataType.CLOB);
    public static final Field<String> DETAILS = DSL.field("details", SQLDataType.CLOB);
    public static final Field<java.time.LocalDateTime> CREATED_AT = DSL.field("created_at", SQLDataType.LOCALDATETIME.nullable(false));
    public static final Field<String> SESSION_ID = DSL.field("session_id", SQLDataType.VARCHAR(255));
    public static final Field<String> STATUS = DSL.field("status", SQLDataType.VARCHAR(20).nullable(false).defaultValue("SUCCESS"));
    public static final Field<String> ERROR_MESSAGE = DSL.field("error_message", SQLDataType.CLOB);

    // Table creation SQL
    public static final String CREATE_TABLE_SQL = """
        CREATE TABLE IF NOT EXISTS user_activities (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(50),
            resource_id VARCHAR(100),
            ip_address VARCHAR(45),
            user_agent TEXT,
            details TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            session_id VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
            error_message TEXT
        );
        """;

    // Index creation SQL
    public static final String CREATE_INDEXES_SQL = """
        CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action);
        CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
        CREATE INDEX IF NOT EXISTS idx_user_activities_resource ON user_activities(resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_user_activities_ip_address ON user_activities(ip_address);
        CREATE INDEX IF NOT EXISTS idx_user_activities_status ON user_activities(status);
        """;
}