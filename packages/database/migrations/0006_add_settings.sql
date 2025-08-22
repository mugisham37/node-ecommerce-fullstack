-- Migration: Add Settings Management Tables
-- Description: Creates tables for application settings, user settings, feature flags, and configuration templates

-- Application Settings
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'object', 'array')),
    category VARCHAR(100) NOT NULL CHECK (category IN ('general', 'email', 'payment', 'shipping', 'tax', 'loyalty', 'vendor', 'security', 'analytics', 'notifications')),
    
    -- Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_value JSONB,
    
    -- Validation and Constraints
    validation JSONB, -- Validation rules (min, max, pattern, etc.)
    options JSONB, -- Available options for select/radio settings
    
    -- Access Control
    is_public BOOLEAN DEFAULT FALSE, -- Whether setting can be accessed by non-admin users
    is_readonly BOOLEAN DEFAULT FALSE, -- Whether setting can be modified
    requires_restart BOOLEAN DEFAULT FALSE, -- Whether changing this setting requires app restart
    
    -- Environment and Deployment
    environment VARCHAR(50) CHECK (environment IN ('development', 'staging', 'production')), -- null for all environments
    version VARCHAR(50), -- Setting version for migration purposes
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deprecated BOOLEAN DEFAULT FALSE,
    deprecation_message TEXT,
    
    -- Audit Trail
    last_modified_by UUID, -- Will reference users table when migrated to UUID
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setting History (for audit trail and rollback)
CREATE TABLE setting_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_id UUID NOT NULL REFERENCES settings(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL, -- Denormalized for easier querying
    
    -- Previous Values
    previous_value JSONB,
    new_value JSONB NOT NULL,
    
    -- Change Information
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE')),
    change_reason TEXT,
    
    -- User and Context
    changed_by UUID, -- Will reference users table when migrated to UUID
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB, -- Additional context about the change
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings (user-specific preferences)
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadata
    category VARCHAR(100) NOT NULL CHECK (category IN ('general', 'notifications', 'privacy', 'display', 'language', 'accessibility')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'object', 'array')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Feature Flags
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    key VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    
    -- Flag Configuration
    is_enabled BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL DEFAULT 'boolean' CHECK (type IN ('boolean', 'string', 'number', 'json')),
    value JSONB, -- For non-boolean flags
    
    -- Targeting and Rollout
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_users JSONB, -- Array of user IDs
    target_roles JSONB, -- Array of user roles
    target_segments JSONB, -- Array of user segments
    
    -- Environment and Conditions
    environment VARCHAR(50) CHECK (environment IN ('development', 'staging', 'production')), -- null for all environments
    conditions JSONB, -- Additional conditions for flag evaluation
    
    -- Lifecycle
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    -- Metadata
    tags JSONB, -- Array of tags for organization
    owner UUID, -- Will reference users table when migrated to UUID
    
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Templates (for multi-tenant or environment-specific configs)
CREATE TABLE configuration_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL CHECK (type IN ('environment', 'tenant', 'feature')),
    
    -- Template Configuration
    configuration JSONB NOT NULL, -- The template configuration
    schema JSONB, -- JSON schema for validation
    
    -- Metadata
    version VARCHAR(50) DEFAULT '1.0.0',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Access Control
    allowed_roles JSONB, -- Array of roles that can use this template
    
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_type ON settings(type);
CREATE INDEX idx_settings_is_public ON settings(is_public);
CREATE INDEX idx_settings_is_active ON settings(is_active);
CREATE INDEX idx_settings_environment ON settings(environment);
CREATE INDEX idx_settings_last_modified_by ON settings(last_modified_by);
CREATE INDEX idx_settings_created_by ON settings(created_by);

CREATE INDEX idx_setting_history_setting_id ON setting_history(setting_id);
CREATE INDEX idx_setting_history_setting_key ON setting_history(setting_key);
CREATE INDEX idx_setting_history_change_type ON setting_history(change_type);
CREATE INDEX idx_setting_history_changed_by ON setting_history(changed_by);
CREATE INDEX idx_setting_history_timestamp ON setting_history(timestamp);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(key);
CREATE INDEX idx_user_settings_category ON user_settings(category);

CREATE INDEX idx_feature_flags_name ON feature_flags(name);
CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_is_enabled ON feature_flags(is_enabled);
CREATE INDEX idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX idx_feature_flags_owner ON feature_flags(owner);
CREATE INDEX idx_feature_flags_created_by ON feature_flags(created_by);

CREATE INDEX idx_configuration_templates_name ON configuration_templates(name);
CREATE INDEX idx_configuration_templates_type ON configuration_templates(type);
CREATE INDEX idx_configuration_templates_is_default ON configuration_templates(is_default);
CREATE INDEX idx_configuration_templates_is_active ON configuration_templates(is_active);
CREATE INDEX idx_configuration_templates_created_by ON configuration_templates(created_by);

-- Create triggers for updated_at columns
CREATE TRIGGER update_settings_updated_at 
    BEFORE UPDATE ON settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at 
    BEFORE UPDATE ON feature_flags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_templates_updated_at 
    BEFORE UPDATE ON configuration_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some default settings
INSERT INTO settings (key, value, type, category, name, description, is_public, created_by) VALUES
('app.name', '"E-Commerce Platform"', 'string', 'general', 'Application Name', 'The name of the application', true, NULL),
('app.version', '"1.0.0"', 'string', 'general', 'Application Version', 'Current version of the application', true, NULL),
('app.maintenance_mode', 'false', 'boolean', 'general', 'Maintenance Mode', 'Enable maintenance mode to prevent user access', false, NULL),
('email.from_address', '"noreply@example.com"', 'string', 'email', 'From Email Address', 'Default email address for outgoing emails', false, NULL),
('email.from_name', '"E-Commerce Platform"', 'string', 'email', 'From Name', 'Default name for outgoing emails', false, NULL),
('loyalty.default_points_per_dollar', '1.00', 'number', 'loyalty', 'Default Points Per Dollar', 'Default points earned per dollar spent', false, NULL),
('loyalty.points_expiry_months', '12', 'number', 'loyalty', 'Points Expiry (Months)', 'Number of months before loyalty points expire', false, NULL),
('vendor.default_commission_rate', '10.00', 'number', 'vendor', 'Default Commission Rate', 'Default commission rate for new vendors (percentage)', false, NULL),
('vendor.minimum_payout', '50.00', 'number', 'vendor', 'Minimum Payout Amount', 'Minimum amount required for vendor payouts', false, NULL),
('search.max_results_per_page', '20', 'number', 'general', 'Max Search Results Per Page', 'Maximum number of search results to display per page', true, NULL),
('notifications.email_enabled', 'true', 'boolean', 'notifications', 'Email Notifications Enabled', 'Enable email notifications globally', false, NULL),
('notifications.push_enabled', 'true', 'boolean', 'notifications', 'Push Notifications Enabled', 'Enable push notifications globally', false, NULL);

-- Insert some default feature flags
INSERT INTO feature_flags (name, key, description, is_enabled, type, created_by) VALUES
('Advanced Search', 'advanced_search', 'Enable advanced search functionality with filters and facets', false, 'boolean', NULL),
('A/B Testing', 'ab_testing', 'Enable A/B testing framework for experiments', false, 'boolean', NULL),
('Vendor Analytics', 'vendor_analytics', 'Enable detailed analytics for vendors', false, 'boolean', NULL),
('Loyalty Program', 'loyalty_program', 'Enable loyalty points and rewards system', false, 'boolean', NULL),
('Multi-language Support', 'multi_language', 'Enable multi-language support for the platform', false, 'boolean', NULL),
('Real-time Notifications', 'realtime_notifications', 'Enable real-time notifications using WebSockets', false, 'boolean', NULL),
('Dark Mode', 'dark_mode', 'Enable dark mode theme option', false, 'boolean', NULL),
('Beta Features', 'beta_features', 'Enable access to beta features for testing', false, 'boolean', NULL);