-- Create stock_movements table for audit trail
CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'ALLOCATION', 'RELEASE', 'TRANSFER', 'DAMAGED', 'EXPIRED', 'RETURNED', 'CYCLE_COUNT')),
    quantity INTEGER NOT NULL,
    reference_id VARCHAR(100), -- Order ID, adjustment ID, etc.
    reference_type VARCHAR(50), -- ORDER, ADJUSTMENT, MANUAL, etc.
    reason VARCHAR(255),
    warehouse_location VARCHAR(50) DEFAULT 'MAIN',
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_reference_id ON stock_movements(reference_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_user_id ON stock_movements(user_id);