-- Migration: Add Notification System Tables
-- Description: Creates tables for notification templates, notifications, preferences, campaigns, and events

-- Notification Templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL CHECK (type IN ('email', 'push', 'sms', 'in_app')),
    category VARCHAR(100) NOT NULL CHECK (category IN ('order', 'marketing', 'system', 'loyalty', 'vendor')),
    subject VARCHAR(500),
    title VARCHAR(255),
    body TEXT NOT NULL,
    html_body TEXT, -- For email templates
    
    -- Template Variables
    variables JSONB, -- Array of variable names that can be used in the template
    default_data JSONB, -- Default values for variables
    
    -- Localization
    language VARCHAR(10) DEFAULT 'en',
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Delivery Settings
    delivery_settings JSONB, -- Channel-specific settings
    
    -- Metadata
    description TEXT,
    tags JSONB, -- Array of tags for organization
    
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will reference users table when migrated to UUID
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    
    -- Notification Content
    type VARCHAR(100) NOT NULL CHECK (type IN ('email', 'push', 'sms', 'in_app')),
    category VARCHAR(100) NOT NULL CHECK (category IN ('order', 'marketing', 'system', 'loyalty', 'vendor')),
    subject VARCHAR(500),
    title VARCHAR(255),
    body TEXT NOT NULL,
    html_body TEXT,
    
    -- Delivery Information
    recipient VARCHAR(255) NOT NULL, -- Email, phone, or user ID
    channel VARCHAR(100) NOT NULL CHECK (channel IN ('email', 'push', 'sms', 'in_app')),
    
    -- Status and Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Engagement Tracking
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE,
    is_clicked BOOLEAN DEFAULT FALSE,
    
    -- Error Handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Additional Data
    data JSONB, -- Additional data used for the notification
    metadata JSONB, -- Tracking and analytics data
    
    -- External References
    external_id VARCHAR(255), -- ID from external service (e.g., SendGrid)
    reference_type VARCHAR(100) CHECK (reference_type IN ('order', 'user', 'product', 'vendor', 'loyalty')),
    reference_id UUID, -- ID of the referenced entity
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notification Preferences
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    
    -- Channel Preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    
    -- Category Preferences
    order_notifications BOOLEAN DEFAULT TRUE,
    marketing_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    loyalty_notifications BOOLEAN DEFAULT TRUE,
    vendor_notifications BOOLEAN DEFAULT TRUE,
    
    -- Frequency Settings
    email_frequency VARCHAR(50) DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    push_frequency VARCHAR(50) DEFAULT 'immediate' CHECK (push_frequency IN ('immediate', 'daily', 'weekly', 'never')),
    sms_frequency VARCHAR(50) DEFAULT 'important_only' CHECK (sms_frequency IN ('immediate', 'daily', 'weekly', 'never', 'important_only')),
    
    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start VARCHAR(5), -- HH:MM format
    quiet_hours_end VARCHAR(5), -- HH:MM format
    quiet_hours_timezone VARCHAR(50),
    
    -- Advanced Settings
    group_similar_notifications BOOLEAN DEFAULT TRUE,
    custom_settings JSONB, -- Additional custom preferences
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Push Notification Devices
CREATE TABLE push_notification_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    
    -- Device Information
    device_token VARCHAR(500) NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    app_version VARCHAR(50),
    os_version VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB, -- Additional device metadata
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);

-- Notification Campaigns
CREATE TABLE notification_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL CHECK (type IN ('email', 'push', 'sms', 'multi_channel')),
    category VARCHAR(100) NOT NULL CHECK (category IN ('order', 'marketing', 'system', 'loyalty', 'vendor')),
    
    -- Campaign Content
    template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    title VARCHAR(255),
    body TEXT,
    html_body TEXT,
    
    -- Targeting
    target_audience JSONB, -- Audience criteria
    segment_ids JSONB, -- Array of segment IDs
    user_ids JSONB, -- Specific user IDs (for small campaigns)
    
    -- Scheduling
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED')),
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Performance Metrics
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    
    -- Settings
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    max_retries INTEGER DEFAULT 3,
    
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Events (for tracking notification lifecycle)
CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL,
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'read', 'clicked', 'bounced', 'unsubscribed')),
    event_data JSONB, -- Additional event data
    
    -- External Service Data
    external_event_id VARCHAR(255),
    service_provider VARCHAR(100) CHECK (service_provider IN ('sendgrid', 'firebase', 'twilio', 'ses')),
    
    -- Metadata
    user_agent TEXT,
    ip_address VARCHAR(45),
    location JSONB, -- Geographic location data
    
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notification_templates_name ON notification_templates(name);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_category ON notification_templates(category);
CREATE INDEX idx_notification_templates_language ON notification_templates(language);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX idx_notification_templates_priority ON notification_templates(priority);
CREATE INDEX idx_notification_templates_created_by ON notification_templates(created_by);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_template_id ON notifications(template_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_reference_type ON notifications(reference_type);
CREATE INDEX idx_notifications_reference_id ON notifications(reference_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_email_enabled ON user_notification_preferences(email_enabled);
CREATE INDEX idx_user_notification_preferences_push_enabled ON user_notification_preferences(push_enabled);
CREATE INDEX idx_user_notification_preferences_sms_enabled ON user_notification_preferences(sms_enabled);

CREATE INDEX idx_push_notification_devices_user_id ON push_notification_devices(user_id);
CREATE INDEX idx_push_notification_devices_device_token ON push_notification_devices(device_token);
CREATE INDEX idx_push_notification_devices_platform ON push_notification_devices(platform);
CREATE INDEX idx_push_notification_devices_is_active ON push_notification_devices(is_active);
CREATE INDEX idx_push_notification_devices_last_used ON push_notification_devices(last_used);

CREATE INDEX idx_notification_campaigns_name ON notification_campaigns(name);
CREATE INDEX idx_notification_campaigns_type ON notification_campaigns(type);
CREATE INDEX idx_notification_campaigns_category ON notification_campaigns(category);
CREATE INDEX idx_notification_campaigns_status ON notification_campaigns(status);
CREATE INDEX idx_notification_campaigns_scheduled_for ON notification_campaigns(scheduled_for);
CREATE INDEX idx_notification_campaigns_created_by ON notification_campaigns(created_by);
CREATE INDEX idx_notification_campaigns_created_at ON notification_campaigns(created_at);

CREATE INDEX idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX idx_notification_events_campaign_id ON notification_events(campaign_id);
CREATE INDEX idx_notification_events_event_type ON notification_events(event_type);
CREATE INDEX idx_notification_events_timestamp ON notification_events(timestamp);
CREATE INDEX idx_notification_events_service_provider ON notification_events(service_provider);

-- Create triggers for updated_at columns
CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_notification_devices_updated_at 
    BEFORE UPDATE ON push_notification_devices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_campaigns_updated_at 
    BEFORE UPDATE ON notification_campaigns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();