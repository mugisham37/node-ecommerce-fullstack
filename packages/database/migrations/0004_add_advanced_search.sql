-- Migration: Add Advanced Search Tables
-- Description: Creates tables for search indexing, queries, suggestions, filters, and analytics

-- Enable full-text search extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Search Indexes (for full-text search optimization)
CREATE TABLE search_indexes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL CHECK (entity_type IN ('product', 'vendor', 'category', 'user')),
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT, -- Comma-separated keywords
    tags JSONB, -- Array of tags
    metadata JSONB, -- Additional searchable metadata
    search_vector TSVECTOR, -- PostgreSQL tsvector for full-text search
    language VARCHAR(10) DEFAULT 'english',
    is_active BOOLEAN DEFAULT TRUE,
    last_indexed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

-- Search Queries (for analytics and suggestions)
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Will reference users table when migrated to UUID
    session_id VARCHAR(255),
    query TEXT NOT NULL,
    normalized_query TEXT NOT NULL, -- Cleaned and normalized version
    filters JSONB, -- Applied filters
    sort_by VARCHAR(100),
    sort_order VARCHAR(10) CHECK (sort_order IN ('asc', 'desc')),
    
    -- Results Information
    result_count INTEGER DEFAULT 0,
    clicked_results JSONB, -- Array of clicked result IDs
    first_result_clicked BOOLEAN DEFAULT FALSE,
    
    -- Performance Metrics
    search_time INTEGER, -- Time in milliseconds
    
    -- Context Information
    source VARCHAR(100) CHECK (source IN ('web', 'mobile', 'api')),
    user_agent TEXT,
    ip_address VARCHAR(45),
    referrer TEXT,
    
    -- Search Success Metrics
    has_results BOOLEAN DEFAULT FALSE,
    has_clicks BOOLEAN DEFAULT FALSE,
    has_conversion BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(15,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search Suggestions (autocomplete and query suggestions)
CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('query', 'product', 'category', 'brand', 'vendor')),
    entity_id UUID, -- ID of the entity if type is not 'query'
    popularity INTEGER DEFAULT 0, -- How often this suggestion is used
    search_count INTEGER DEFAULT 0, -- How many times this was searched
    click_count INTEGER DEFAULT 0, -- How many times this was clicked
    conversion_count INTEGER DEFAULT 0, -- How many conversions this led to
    language VARCHAR(10) DEFAULT 'english',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(suggestion, type)
);

-- Search Filters (dynamic filter definitions)
CREATE TABLE search_filters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('range', 'checkbox', 'radio', 'select', 'text')),
    entity_type VARCHAR(100) NOT NULL CHECK (entity_type IN ('product', 'vendor', 'category')),
    field_path VARCHAR(255) NOT NULL, -- JSON path or field name
    options JSONB, -- Available options for select/checkbox filters
    min_value DECIMAL(15,2), -- For range filters
    max_value DECIMAL(15,2), -- For range filters
    default_value TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, entity_type)
);

-- Search Analytics (aggregated search data)
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL,
    query TEXT,
    normalized_query TEXT,
    
    -- Aggregated Metrics
    search_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    total_results INTEGER DEFAULT 0,
    average_results DECIMAL(10,2) DEFAULT 0.00,
    
    -- Performance Metrics
    average_search_time INTEGER DEFAULT 0, -- milliseconds
    zero_results_count INTEGER DEFAULT 0,
    
    -- Engagement Metrics
    click_through_rate DECIMAL(5,4) DEFAULT 0.0000,
    total_clicks INTEGER DEFAULT 0,
    average_click_position DECIMAL(5,2) DEFAULT 0.00,
    
    -- Conversion Metrics
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    total_conversions INTEGER DEFAULT 0,
    total_conversion_value DECIMAL(15,2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, normalized_query)
);

-- Search Result Clicks (for tracking which results are clicked)
CREATE TABLE search_result_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
    user_id UUID, -- Will reference users table when migrated to UUID
    session_id VARCHAR(255),
    
    -- Result Information
    result_type VARCHAR(100) NOT NULL CHECK (result_type IN ('product', 'vendor', 'category')),
    result_id UUID NOT NULL,
    result_position INTEGER NOT NULL CHECK (result_position > 0), -- Position in search results (1-based)
    result_score DECIMAL(10,6), -- Search relevance score
    
    -- Click Information
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    time_on_page INTEGER, -- Time spent on the clicked page (seconds)
    bounced BOOLEAN DEFAULT FALSE, -- Whether user bounced from the page
    converted BOOLEAN DEFAULT FALSE, -- Whether this click led to a conversion
    conversion_value DECIMAL(15,2)
);

-- Saved Searches (user-saved search queries)
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- Will reference users table when migrated to UUID
    name VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    filters JSONB,
    sort_by VARCHAR(100),
    sort_order VARCHAR(10) CHECK (sort_order IN ('asc', 'desc')),
    
    -- Notification Settings
    email_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT FALSE,
    notification_frequency VARCHAR(50) DEFAULT 'daily' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
    
    -- Usage Statistics
    last_used TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Create indexes for better performance
CREATE INDEX idx_search_indexes_entity_type ON search_indexes(entity_type);
CREATE INDEX idx_search_indexes_entity_id ON search_indexes(entity_id);
CREATE INDEX idx_search_indexes_is_active ON search_indexes(is_active);
CREATE INDEX idx_search_indexes_language ON search_indexes(language);
CREATE INDEX idx_search_indexes_last_indexed ON search_indexes(last_indexed);

-- Full-text search index
CREATE INDEX idx_search_indexes_search_vector ON search_indexes USING GIN(search_vector);
CREATE INDEX idx_search_indexes_title_trgm ON search_indexes USING GIN(title gin_trgm_ops);
CREATE INDEX idx_search_indexes_content_trgm ON search_indexes USING GIN(content gin_trgm_ops);

CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_session_id ON search_queries(session_id);
CREATE INDEX idx_search_queries_query ON search_queries(query);
CREATE INDEX idx_search_queries_normalized_query ON search_queries(normalized_query);
CREATE INDEX idx_search_queries_result_count ON search_queries(result_count);
CREATE INDEX idx_search_queries_has_results ON search_queries(has_results);
CREATE INDEX idx_search_queries_has_clicks ON search_queries(has_clicks);
CREATE INDEX idx_search_queries_has_conversion ON search_queries(has_conversion);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);

CREATE INDEX idx_search_suggestions_suggestion ON search_suggestions(suggestion);
CREATE INDEX idx_search_suggestions_type ON search_suggestions(type);
CREATE INDEX idx_search_suggestions_entity_id ON search_suggestions(entity_id);
CREATE INDEX idx_search_suggestions_popularity ON search_suggestions(popularity);
CREATE INDEX idx_search_suggestions_search_count ON search_suggestions(search_count);
CREATE INDEX idx_search_suggestions_click_count ON search_suggestions(click_count);
CREATE INDEX idx_search_suggestions_language ON search_suggestions(language);
CREATE INDEX idx_search_suggestions_is_active ON search_suggestions(is_active);

CREATE INDEX idx_search_filters_name ON search_filters(name);
CREATE INDEX idx_search_filters_type ON search_filters(type);
CREATE INDEX idx_search_filters_entity_type ON search_filters(entity_type);
CREATE INDEX idx_search_filters_is_active ON search_filters(is_active);
CREATE INDEX idx_search_filters_sort_order ON search_filters(sort_order);

CREATE INDEX idx_search_analytics_date ON search_analytics(date);
CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_normalized_query ON search_analytics(normalized_query);
CREATE INDEX idx_search_analytics_search_count ON search_analytics(search_count);
CREATE INDEX idx_search_analytics_click_through_rate ON search_analytics(click_through_rate);
CREATE INDEX idx_search_analytics_conversion_rate ON search_analytics(conversion_rate);

CREATE INDEX idx_search_result_clicks_search_query_id ON search_result_clicks(search_query_id);
CREATE INDEX idx_search_result_clicks_user_id ON search_result_clicks(user_id);
CREATE INDEX idx_search_result_clicks_session_id ON search_result_clicks(session_id);
CREATE INDEX idx_search_result_clicks_result_type ON search_result_clicks(result_type);
CREATE INDEX idx_search_result_clicks_result_id ON search_result_clicks(result_id);
CREATE INDEX idx_search_result_clicks_result_position ON search_result_clicks(result_position);
CREATE INDEX idx_search_result_clicks_clicked_at ON search_result_clicks(clicked_at);
CREATE INDEX idx_search_result_clicks_converted ON search_result_clicks(converted);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_name ON saved_searches(name);
CREATE INDEX idx_saved_searches_is_active ON saved_searches(is_active);
CREATE INDEX idx_saved_searches_last_used ON saved_searches(last_used);
CREATE INDEX idx_saved_searches_use_count ON saved_searches(use_count);

-- Create triggers for updated_at columns
CREATE TRIGGER update_search_indexes_updated_at 
    BEFORE UPDATE ON search_indexes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_suggestions_updated_at 
    BEFORE UPDATE ON search_suggestions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_search_filters_updated_at 
    BEFORE UPDATE ON search_filters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at 
    BEFORE UPDATE ON saved_searches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update search_vector when content changes
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector(NEW.language::regconfig, 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.content, '') || ' ' || 
        COALESCE(NEW.keywords, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
CREATE TRIGGER update_search_indexes_search_vector
    BEFORE INSERT OR UPDATE ON search_indexes
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();