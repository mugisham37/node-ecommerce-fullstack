-- Migration: Add Loyalty System Tables
-- Description: Creates tables for loyalty programs, tiers, points, rewards, and redemptions

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Loyalty Programs
CREATE TABLE loyalty_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_per_dollar DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    terms_and_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Tiers
CREATE TABLE loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    benefits JSONB,
    multiplier DECIMAL(5,2) DEFAULT 1.00,
    color VARCHAR(7), -- Hex color code
    icon VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(program_id, name)
);

-- User Loyalty Points
CREATE TABLE user_loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier_id UUID REFERENCES loyalty_tiers(id) ON DELETE SET NULL,
    lifetime_points INTEGER DEFAULT 0,
    last_earned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, program_id)
);

-- Loyalty History/Transactions
CREATE TABLE loyalty_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ORDER', 'REFERRAL', 'MANUAL', 'REDEMPTION', 'EXPIRE', 'OTHER')),
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    order_id UUID, -- Reference to order if applicable
    reference_id VARCHAR(255), -- Generic reference
    reference_type VARCHAR(100), -- Type of reference
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Rewards
CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('discount', 'gift_card', 'shipping', 'product')),
    points_cost INTEGER NOT NULL,
    value DECIMAL(10,2), -- Monetary value or percentage
    max_redemptions INTEGER, -- Null for unlimited
    current_redemptions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    terms_and_conditions TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Redemptions
CREATE TABLE loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
    reward_name VARCHAR(255) NOT NULL, -- Snapshot of reward name
    points_used INTEGER NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED')),
    order_id UUID, -- If used in an order
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Referrals
CREATE TABLE loyalty_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Will reference users table when migrated to UUID
    code VARCHAR(50) NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    referrer_points INTEGER DEFAULT 0,
    referred_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_loyalty_programs_name ON loyalty_programs(name);
CREATE INDEX idx_loyalty_programs_active ON loyalty_programs(is_active);

CREATE INDEX idx_loyalty_tiers_program_id ON loyalty_tiers(program_id);
CREATE INDEX idx_loyalty_tiers_min_points ON loyalty_tiers(min_points);

CREATE INDEX idx_user_loyalty_points_user_id ON user_loyalty_points(user_id);
CREATE INDEX idx_user_loyalty_points_program_id ON user_loyalty_points(program_id);
CREATE INDEX idx_user_loyalty_points_tier_id ON user_loyalty_points(tier_id);

CREATE INDEX idx_loyalty_history_user_id ON loyalty_history(user_id);
CREATE INDEX idx_loyalty_history_program_id ON loyalty_history(program_id);
CREATE INDEX idx_loyalty_history_type ON loyalty_history(type);
CREATE INDEX idx_loyalty_history_order_id ON loyalty_history(order_id);
CREATE INDEX idx_loyalty_history_created_at ON loyalty_history(created_at);

CREATE INDEX idx_loyalty_rewards_program_id ON loyalty_rewards(program_id);
CREATE INDEX idx_loyalty_rewards_type ON loyalty_rewards(type);
CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(is_active);
CREATE INDEX idx_loyalty_rewards_points_cost ON loyalty_rewards(points_cost);

CREATE INDEX idx_loyalty_redemptions_user_id ON loyalty_redemptions(user_id);
CREATE INDEX idx_loyalty_redemptions_program_id ON loyalty_redemptions(program_id);
CREATE INDEX idx_loyalty_redemptions_reward_id ON loyalty_redemptions(reward_id);
CREATE INDEX idx_loyalty_redemptions_code ON loyalty_redemptions(code);
CREATE INDEX idx_loyalty_redemptions_status ON loyalty_redemptions(status);
CREATE INDEX idx_loyalty_redemptions_order_id ON loyalty_redemptions(order_id);

CREATE INDEX idx_loyalty_referrals_referrer_id ON loyalty_referrals(referrer_id);
CREATE INDEX idx_loyalty_referrals_referred_user_id ON loyalty_referrals(referred_user_id);
CREATE INDEX idx_loyalty_referrals_code ON loyalty_referrals(code);
CREATE INDEX idx_loyalty_referrals_is_used ON loyalty_referrals(is_used);

-- Create trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_loyalty_programs_updated_at 
    BEFORE UPDATE ON loyalty_programs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_tiers_updated_at 
    BEFORE UPDATE ON loyalty_tiers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_loyalty_points_updated_at 
    BEFORE UPDATE ON user_loyalty_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at 
    BEFORE UPDATE ON loyalty_rewards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_redemptions_updated_at 
    BEFORE UPDATE ON loyalty_redemptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();