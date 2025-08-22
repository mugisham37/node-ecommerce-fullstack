-- Migration: Add Vendor Analytics Tables
-- Description: Creates tables for vendors, analytics, payouts, reviews, and performance metrics

-- Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    contact_person_name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    website VARCHAR(500),
    description TEXT,
    logo VARCHAR(500),
    banner VARCHAR(500),
    
    -- Business Information
    business_type VARCHAR(100) CHECK (business_type IN ('individual', 'company', 'partnership')),
    tax_id VARCHAR(100),
    business_registration_number VARCHAR(100),
    
    -- Address Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Financial Information
    commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    payment_method VARCHAR(100) CHECK (payment_method IN ('bank_transfer', 'paypal', 'stripe')),
    bank_account_details JSONB, -- Encrypted bank details
    payout_schedule VARCHAR(50) DEFAULT 'monthly' CHECK (payout_schedule IN ('weekly', 'monthly', 'quarterly')),
    minimum_payout DECIMAL(10,2) DEFAULT 50.00,
    
    -- Status and Verification
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_documents JSONB, -- Array of document URLs
    verified_at TIMESTAMPTZ,
    verified_by UUID, -- Will reference users table when migrated to UUID
    
    -- Performance Metrics (cached for quick access)
    rating_average DECIMAL(3,2) DEFAULT 0.00 CHECK (rating_average >= 0 AND rating_average <= 5),
    rating_count INTEGER DEFAULT 0,
    total_sales DECIMAL(15,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    total_products INTEGER DEFAULT 0,
    
    -- Settings
    settings JSONB, -- Vendor-specific settings
    preferences JSONB, -- Notification preferences, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Analytics (daily aggregated data)
CREATE TABLE vendor_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Sales Metrics
    total_sales DECIMAL(15,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Commission and Payouts
    total_commission DECIMAL(15,2) DEFAULT 0.00,
    net_revenue DECIMAL(15,2) DEFAULT 0.00,
    
    -- Customer Metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    
    -- Product Metrics
    products_viewed INTEGER DEFAULT 0,
    products_added_to_cart INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Traffic Metrics
    page_views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Additional Metrics
    refunds DECIMAL(15,2) DEFAULT 0.00,
    refund_count INTEGER DEFAULT 0,
    cancellations INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, date)
);

-- Vendor Product Analytics (daily aggregated data per product)
CREATE TABLE vendor_product_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    product_id UUID NOT NULL, -- Reference to products table
    date DATE NOT NULL,
    
    -- Sales Metrics
    sales DECIMAL(15,2) DEFAULT 0.00,
    orders INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 0,
    
    -- Traffic Metrics
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    add_to_cart INTEGER DEFAULT 0,
    
    -- Performance Metrics
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    cart_conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Inventory Metrics
    stock_level INTEGER DEFAULT 0,
    stock_outs INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, product_id, date)
);

-- Vendor Payouts
CREATE TABLE vendor_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    -- Payout Details
    payout_number VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    commission DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Period Information
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Payment Information
    payment_method VARCHAR(100) NOT NULL,
    payment_details JSONB, -- Payment-specific details
    transaction_id VARCHAR(255),
    
    -- Status and Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    processed_at TIMESTAMPTZ,
    processed_by UUID, -- Will reference users table when migrated to UUID
    
    -- Additional Information
    notes TEXT,
    failure_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Reviews
CREATE TABLE vendor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    order_id UUID, -- Reference to the order this review is based on
    
    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    
    -- Review Categories
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    shipping_rating INTEGER CHECK (shipping_rating >= 1 AND shipping_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    
    -- Status and Moderation
    status VARCHAR(50) DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'PENDING', 'REJECTED', 'HIDDEN')),
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    moderated_by UUID, -- Will reference users table when migrated to UUID
    moderated_at TIMESTAMPTZ,
    moderation_notes TEXT,
    
    -- Vendor Response
    vendor_response TEXT,
    vendor_response_at TIMESTAMPTZ,
    
    -- Helpful Votes
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, user_id, order_id)
);

-- Vendor Performance Metrics (monthly aggregated)
CREATE TABLE vendor_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    
    -- Sales Performance
    total_sales DECIMAL(15,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Customer Satisfaction
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    
    -- Operational Metrics
    order_fulfillment_rate DECIMAL(5,2) DEFAULT 0.00,
    average_shipping_time DECIMAL(5,2) DEFAULT 0.00, -- in days
    return_rate DECIMAL(5,2) DEFAULT 0.00,
    cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Quality Metrics
    defect_rate DECIMAL(5,2) DEFAULT 0.00,
    customer_complaint_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Performance Score (calculated)
    performance_score DECIMAL(5,2) DEFAULT 0.00 CHECK (performance_score >= 0 AND performance_score <= 100),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, year, month)
);

-- Create indexes for better performance
CREATE INDEX idx_vendors_business_name ON vendors(business_name);
CREATE INDEX idx_vendors_slug ON vendors(slug);
CREATE INDEX idx_vendors_email ON vendors(email);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_is_verified ON vendors(is_verified);
CREATE INDEX idx_vendors_rating_average ON vendors(rating_average);
CREATE INDEX idx_vendors_total_sales ON vendors(total_sales);

CREATE INDEX idx_vendor_analytics_vendor_id ON vendor_analytics(vendor_id);
CREATE INDEX idx_vendor_analytics_date ON vendor_analytics(date);
CREATE INDEX idx_vendor_analytics_total_sales ON vendor_analytics(total_sales);

CREATE INDEX idx_vendor_product_analytics_vendor_id ON vendor_product_analytics(vendor_id);
CREATE INDEX idx_vendor_product_analytics_product_id ON vendor_product_analytics(product_id);
CREATE INDEX idx_vendor_product_analytics_date ON vendor_product_analytics(date);
CREATE INDEX idx_vendor_product_analytics_sales ON vendor_product_analytics(sales);

CREATE INDEX idx_vendor_payouts_vendor_id ON vendor_payouts(vendor_id);
CREATE INDEX idx_vendor_payouts_payout_number ON vendor_payouts(payout_number);
CREATE INDEX idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX idx_vendor_payouts_period_start ON vendor_payouts(period_start);
CREATE INDEX idx_vendor_payouts_period_end ON vendor_payouts(period_end);
CREATE INDEX idx_vendor_payouts_processed_at ON vendor_payouts(processed_at);

CREATE INDEX idx_vendor_reviews_vendor_id ON vendor_reviews(vendor_id);
CREATE INDEX idx_vendor_reviews_user_id ON vendor_reviews(user_id);
CREATE INDEX idx_vendor_reviews_order_id ON vendor_reviews(order_id);
CREATE INDEX idx_vendor_reviews_rating ON vendor_reviews(rating);
CREATE INDEX idx_vendor_reviews_status ON vendor_reviews(status);
CREATE INDEX idx_vendor_reviews_is_verified_purchase ON vendor_reviews(is_verified_purchase);
CREATE INDEX idx_vendor_reviews_created_at ON vendor_reviews(created_at);

CREATE INDEX idx_vendor_performance_metrics_vendor_id ON vendor_performance_metrics(vendor_id);
CREATE INDEX idx_vendor_performance_metrics_year ON vendor_performance_metrics(year);
CREATE INDEX idx_vendor_performance_metrics_month ON vendor_performance_metrics(month);
CREATE INDEX idx_vendor_performance_metrics_performance_score ON vendor_performance_metrics(performance_score);

-- Create triggers for updated_at columns
CREATE TRIGGER update_vendors_updated_at 
    BEFORE UPDATE ON vendors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_analytics_updated_at 
    BEFORE UPDATE ON vendor_analytics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_payouts_updated_at 
    BEFORE UPDATE ON vendor_payouts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_reviews_updated_at 
    BEFORE UPDATE ON vendor_reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_performance_metrics_updated_at 
    BEFORE UPDATE ON vendor_performance_metrics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();