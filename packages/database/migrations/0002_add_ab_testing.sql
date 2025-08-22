-- Migration: Add A/B Testing Infrastructure
-- Description: Creates tables for A/B tests, variants, assignments, events, and conversions

-- A/B Tests
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL CHECK (type IN ('feature', 'ui', 'pricing', 'content', 'email')),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    primary_goal VARCHAR(100) NOT NULL CHECK (primary_goal IN ('conversion', 'revenue', 'engagement', 'retention')),
    secondary_goals JSONB, -- Array of secondary goals
    target_audience_type VARCHAR(50) DEFAULT 'all' CHECK (target_audience_type IN ('all', 'segment', 'custom')),
    target_user_ids JSONB, -- Array of specific user IDs if custom targeting
    target_segment_criteria JSONB, -- Criteria for segment targeting
    traffic_allocation DECIMAL(5,2) DEFAULT 100.00 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
    confidence_level DECIMAL(5,2) DEFAULT 95.00 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    minimum_sample_size INTEGER DEFAULT 100,
    winner VARCHAR(100), -- Winning variant name
    results JSONB, -- Aggregated results data
    notes TEXT,
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Variants
CREATE TABLE ab_test_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_control BOOLEAN DEFAULT FALSE,
    traffic_allocation DECIMAL(5,2) NOT NULL CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
    configuration JSONB, -- Variant-specific configuration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(test_id, name)
);

-- User Test Assignments
CREATE TABLE user_test_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will reference users table when migrated to UUID
    session_id VARCHAR(255), -- For anonymous users
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    first_exposure TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    impressions INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(15,2) DEFAULT 0.00,
    engagements INTEGER DEFAULT 0,
    custom_metrics JSONB, -- Additional custom metrics
    UNIQUE(user_id, test_id),
    UNIQUE(session_id, test_id)
);

-- A/B Test Events
CREATE TABLE ab_test_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id UUID, -- Will reference users table when migrated to UUID
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN ('impression', 'conversion', 'revenue', 'engagement', 'custom')),
    event_name VARCHAR(255), -- Specific event name
    event_value DECIMAL(15,2), -- Numeric value for the event
    event_data JSONB, -- Additional event data
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- A/B Test Segments (for audience targeting)
CREATE TABLE ab_test_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- Segment criteria (user properties, behaviors, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID, -- Will reference users table when migrated to UUID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Conversions (for tracking specific conversion events)
CREATE TABLE ab_test_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id UUID, -- Will reference users table when migrated to UUID
    session_id VARCHAR(255),
    conversion_type VARCHAR(100) NOT NULL CHECK (conversion_type IN ('purchase', 'signup', 'click', 'form_submit')),
    conversion_value DECIMAL(15,2), -- Revenue or other numeric value
    order_id UUID, -- Reference to order if applicable
    conversion_data JSONB, -- Additional conversion data
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ab_tests_name ON ab_tests(name);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_type ON ab_tests(type);
CREATE INDEX idx_ab_tests_start_date ON ab_tests(start_date);
CREATE INDEX idx_ab_tests_end_date ON ab_tests(end_date);
CREATE INDEX idx_ab_tests_created_by ON ab_tests(created_by);

CREATE INDEX idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX idx_ab_test_variants_is_control ON ab_test_variants(is_control);

CREATE INDEX idx_user_test_assignments_user_id ON user_test_assignments(user_id);
CREATE INDEX idx_user_test_assignments_session_id ON user_test_assignments(session_id);
CREATE INDEX idx_user_test_assignments_test_id ON user_test_assignments(test_id);
CREATE INDEX idx_user_test_assignments_variant_id ON user_test_assignments(variant_id);
CREATE INDEX idx_user_test_assignments_assigned_at ON user_test_assignments(assigned_at);

CREATE INDEX idx_ab_test_events_test_id ON ab_test_events(test_id);
CREATE INDEX idx_ab_test_events_variant_id ON ab_test_events(variant_id);
CREATE INDEX idx_ab_test_events_user_id ON ab_test_events(user_id);
CREATE INDEX idx_ab_test_events_session_id ON ab_test_events(session_id);
CREATE INDEX idx_ab_test_events_event_type ON ab_test_events(event_type);
CREATE INDEX idx_ab_test_events_timestamp ON ab_test_events(timestamp);

CREATE INDEX idx_ab_test_segments_name ON ab_test_segments(name);
CREATE INDEX idx_ab_test_segments_is_active ON ab_test_segments(is_active);
CREATE INDEX idx_ab_test_segments_created_by ON ab_test_segments(created_by);

CREATE INDEX idx_ab_test_conversions_test_id ON ab_test_conversions(test_id);
CREATE INDEX idx_ab_test_conversions_variant_id ON ab_test_conversions(variant_id);
CREATE INDEX idx_ab_test_conversions_user_id ON ab_test_conversions(user_id);
CREATE INDEX idx_ab_test_conversions_session_id ON ab_test_conversions(session_id);
CREATE INDEX idx_ab_test_conversions_conversion_type ON ab_test_conversions(conversion_type);
CREATE INDEX idx_ab_test_conversions_timestamp ON ab_test_conversions(timestamp);
CREATE INDEX idx_ab_test_conversions_order_id ON ab_test_conversions(order_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_ab_tests_updated_at 
    BEFORE UPDATE ON ab_tests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_variants_updated_at 
    BEFORE UPDATE ON ab_test_variants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_segments_updated_at 
    BEFORE UPDATE ON ab_test_segments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();