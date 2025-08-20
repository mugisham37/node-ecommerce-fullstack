-- Production Database Optimizations and Indexes
-- This migration adds performance optimizations for production deployment

-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Product indexes for search and filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_active ON products(name, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku_active ON products(sku, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active ON products(category_id, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_supplier_active ON products(supplier_id, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_range ON products(selling_price, cost_price) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_reorder_level ON products(reorder_level) WHERE active = true;

-- Full-text search index for products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, ''))) WHERE active = true;

-- Category hierarchy indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

-- Supplier indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Inventory indexes for real-time queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_quantity_available ON inventory((quantity_on_hand - quantity_allocated)) WHERE (quantity_on_hand - quantity_allocated) > 0;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON inventory(product_id) WHERE (quantity_on_hand - quantity_allocated) <= (SELECT reorder_level FROM products WHERE products.id = inventory.product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_last_counted ON inventory(last_counted_at);

-- Stock movement indexes for audit and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_product_created ON stock_movements(product_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_type_created ON stock_movements(movement_type, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_movements_user_created ON stock_movements(created_by, created_at);

-- Order indexes for processing and reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_total_amount ON orders(total_amount);

-- Order items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

-- User activities indexes for audit
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user_created ON user_activities(user_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_action_created ON user_activities(action, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_entity ON user_activities(entity_type, entity_id);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_supplier_active ON products(category_id, supplier_id, active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_quantities ON inventory(product_id, quantity_on_hand, quantity_allocated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_customer ON orders(status, customer_email, created_at);

-- Partial indexes for specific use cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_pending ON orders(created_at) WHERE status = 'PENDING';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_processing ON orders(created_at) WHERE status = 'PROCESSING';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_low_stock ON products(id, reorder_level) WHERE active = true;

-- Add database constraints for data integrity
ALTER TABLE products ADD CONSTRAINT chk_products_positive_prices CHECK (cost_price >= 0 AND selling_price >= 0);
ALTER TABLE products ADD CONSTRAINT chk_products_price_relationship CHECK (selling_price >= cost_price);
ALTER TABLE products ADD CONSTRAINT chk_products_positive_reorder CHECK (reorder_level >= 0 AND reorder_quantity >= 0);

ALTER TABLE inventory ADD CONSTRAINT chk_inventory_positive_quantities CHECK (quantity_on_hand >= 0 AND quantity_allocated >= 0);
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_allocation_limit CHECK (quantity_allocated <= quantity_on_hand);

ALTER TABLE orders ADD CONSTRAINT chk_orders_positive_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND shipping_cost >= 0 AND total_amount >= 0);
ALTER TABLE orders ADD CONSTRAINT chk_orders_total_calculation CHECK (total_amount = subtotal + tax_amount + shipping_cost);

ALTER TABLE order_items ADD CONSTRAINT chk_order_items_positive_values CHECK (quantity > 0 AND unit_price >= 0 AND total_price >= 0);
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_total_calculation CHECK (total_price = quantity * unit_price);

ALTER TABLE stock_movements ADD CONSTRAINT chk_stock_movements_quantity_not_zero CHECK (quantity != 0);

-- Add database functions for common calculations
CREATE OR REPLACE FUNCTION calculate_available_inventory(p_product_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COALESCE(quantity_on_hand - quantity_allocated, 0)
        FROM inventory
        WHERE product_id = p_product_id
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_low_stock(p_product_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT calculate_available_inventory(p_product_id) <= p.reorder_level
        FROM products p
        WHERE p.id = p_product_id AND p.active = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create materialized view for inventory reporting
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    c.name as category_name,
    s.name as supplier_name,
    i.quantity_on_hand,
    i.quantity_allocated,
    (i.quantity_on_hand - i.quantity_allocated) as quantity_available,
    p.reorder_level,
    p.reorder_quantity,
    CASE 
        WHEN (i.quantity_on_hand - i.quantity_allocated) <= p.reorder_level THEN true 
        ELSE false 
    END as is_low_stock,
    p.cost_price,
    p.selling_price,
    (i.quantity_on_hand * p.cost_price) as inventory_value,
    i.last_counted_at,
    p.updated_at as product_updated_at
FROM products p
JOIN inventory i ON p.id = i.product_id
JOIN categories c ON p.category_id = c.id
JOIN suppliers s ON p.supplier_id = s.id
WHERE p.active = true;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory_summary_product_id ON mv_inventory_summary(product_id);
CREATE INDEX IF NOT EXISTS idx_mv_inventory_summary_low_stock ON mv_inventory_summary(is_low_stock) WHERE is_low_stock = true;
CREATE INDEX IF NOT EXISTS idx_mv_inventory_summary_category ON mv_inventory_summary(category_name);
CREATE INDEX IF NOT EXISTS idx_mv_inventory_summary_supplier ON mv_inventory_summary(supplier_name);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_inventory_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_summary;
END;
$$ LANGUAGE plpgsql;

-- Add database statistics for query optimization
ANALYZE users;
ANALYZE products;
ANALYZE categories;
ANALYZE suppliers;
ANALYZE inventory;
ANALYZE stock_movements;
ANALYZE orders;
ANALYZE order_items;
ANALYZE user_activities;

-- Update table statistics targets for better query planning
ALTER TABLE products ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE products ALTER COLUMN sku SET STATISTICS 1000;
ALTER TABLE inventory ALTER COLUMN quantity_on_hand SET STATISTICS 1000;
ALTER TABLE inventory ALTER COLUMN quantity_allocated SET STATISTICS 1000;
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE stock_movements ALTER COLUMN movement_type SET STATISTICS 1000;