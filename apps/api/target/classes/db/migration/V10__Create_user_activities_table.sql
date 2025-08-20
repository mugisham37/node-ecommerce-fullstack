-- Create user_activities table for audit logging and user activity tracking
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_resource ON user_activities(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_ip_address ON user_activities(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_activities_status ON user_activities(status);

-- Add comment to table
COMMENT ON TABLE user_activities IS 'Tracks user activities and actions for audit logging';
COMMENT ON COLUMN user_activities.action IS 'Type of action performed (LOGIN_SUCCESS, USER_CREATED, etc.)';
COMMENT ON COLUMN user_activities.resource_type IS 'Type of resource affected (USER, PRODUCT, ORDER, etc.)';
COMMENT ON COLUMN user_activities.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN user_activities.status IS 'Status of the activity (SUCCESS, FAILED, WARNING)';