-- Create inventory table
CREATE TABLE inventory (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(50) DEFAULT 'MAIN',
    quantity_on_hand INTEGER DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_allocated INTEGER DEFAULT 0 CHECK (quantity_allocated >= 0),
    last_counted_at TIMESTAMP,
    version BIGINT DEFAULT 0, -- For optimistic locking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_location)
);

-- Create indexes for performance
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_location ON inventory(warehouse_location);
CREATE INDEX idx_inventory_quantity_on_hand ON inventory(quantity_on_hand);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();