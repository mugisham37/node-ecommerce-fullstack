-- Development Environment Data Seeding
-- This migration adds sample data for development and testing

-- Only run in development environment
-- This can be controlled by Spring profiles or environment variables

-- Insert sample categories
INSERT INTO categories (name, slug, parent_id, sort_order, created_at, updated_at) VALUES
('Electronics', 'electronics', NULL, 1, NOW(), NOW()),
('Computers', 'computers', 1, 1, NOW(), NOW()),
('Laptops', 'laptops', 2, 1, NOW(), NOW()),
('Desktops', 'desktops', 2, 2, NOW(), NOW()),
('Mobile Devices', 'mobile-devices', 1, 2, NOW(), NOW()),
('Smartphones', 'smartphones', 5, 1, NOW(), NOW()),
('Tablets', 'tablets', 5, 2, NOW(), NOW()),
('Home & Garden', 'home-garden', NULL, 2, NOW(), NOW()),
('Furniture', 'furniture', 8, 1, NOW(), NOW()),
('Kitchen', 'kitchen', 8, 2, NOW(), NOW()),
('Clothing', 'clothing', NULL, 3, NOW(), NOW()),
('Men''s Clothing', 'mens-clothing', 11, 1, NOW(), NOW()),
('Women''s Clothing', 'womens-clothing', 11, 2, NOW(), NOW()),
('Books', 'books', NULL, 4, NOW(), NOW()),
('Fiction', 'fiction', 14, 1, NOW(), NOW()),
('Non-Fiction', 'non-fiction', 14, 2, NOW(), NOW()),
('Sports & Outdoors', 'sports-outdoors', NULL, 5, NOW(), NOW()),
('Fitness', 'fitness', 17, 1, NOW(), NOW()),
('Outdoor Recreation', 'outdoor-recreation', 17, 2, NOW(), NOW()),
('Automotive', 'automotive', NULL, 6, NOW(), NOW());

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address, payment_terms, status, created_at, updated_at) VALUES
('TechCorp Solutions', 'John Smith', 'john.smith@techcorp.com', '+1-555-0101', '123 Tech Street, Silicon Valley, CA 94000', 'NET_30', 'ACTIVE', NOW(), NOW()),
('Global Electronics Ltd', 'Sarah Johnson', 'sarah.j@globalelec.com', '+1-555-0102', '456 Electronics Ave, Austin, TX 78701', 'NET_45', 'ACTIVE', NOW(), NOW()),
('MegaSupply Inc', 'Mike Wilson', 'mike.wilson@megasupply.com', '+1-555-0103', '789 Supply Chain Blvd, Chicago, IL 60601', 'NET_30', 'ACTIVE', NOW(), NOW()),
('Premium Parts Co', 'Lisa Chen', 'lisa.chen@premiumparts.com', '+1-555-0104', '321 Parts Lane, Seattle, WA 98101', 'NET_60', 'ACTIVE', NOW(), NOW()),
('Budget Components', 'David Brown', 'david.b@budgetcomp.com', '+1-555-0105', '654 Budget St, Phoenix, AZ 85001', 'NET_15', 'ACTIVE', NOW(), NOW()),
('Luxury Goods Ltd', 'Emma Davis', 'emma.davis@luxurygoods.com', '+1-555-0106', '987 Luxury Ave, Miami, FL 33101', 'NET_30', 'ACTIVE', NOW(), NOW()),
('Wholesale Direct', 'Tom Anderson', 'tom.a@wholesaledirect.com', '+1-555-0107', '147 Wholesale Way, Denver, CO 80201', 'NET_30', 'ACTIVE', NOW(), NOW()),
('International Imports', 'Maria Garcia', 'maria.g@intlimports.com', '+1-555-0108', '258 Import Plaza, New York, NY 10001', 'NET_45', 'ACTIVE', NOW(), NOW()),
('Local Distributors', 'James Miller', 'james.m@localdist.com', '+1-555-0109', '369 Distribution Dr, Atlanta, GA 30301', 'NET_30', 'ACTIVE', NOW(), NOW()),
('Specialty Suppliers', 'Jennifer Taylor', 'jen.taylor@specialtysup.com', '+1-555-0110', '741 Specialty Rd, Portland, OR 97201', 'NET_30', 'SUSPENDED', NOW(), NOW());

-- Insert sample products
INSERT INTO products (name, slug, sku, category_id, supplier_id, description, cost_price, selling_price, reorder_level, reorder_quantity, active, created_at, updated_at) VALUES
-- Electronics - Laptops
('MacBook Pro 16"', 'macbook-pro-16', 'LAPTOP-MBP16-001', 3, 1, 'Apple MacBook Pro 16-inch with M2 Pro chip, 16GB RAM, 512GB SSD', 2199.00, 2499.00, 5, 10, true, NOW(), NOW()),
('Dell XPS 13', 'dell-xps-13', 'LAPTOP-XPS13-001', 3, 2, 'Dell XPS 13 ultrabook with Intel i7, 16GB RAM, 512GB SSD', 1299.00, 1599.00, 8, 15, true, NOW(), NOW()),
('ThinkPad X1 Carbon', 'thinkpad-x1-carbon', 'LAPTOP-X1C-001', 3, 3, 'Lenovo ThinkPad X1 Carbon with Intel i7, 16GB RAM, 1TB SSD', 1599.00, 1899.00, 6, 12, true, NOW(), NOW()),
('HP Spectre x360', 'hp-spectre-x360', 'LAPTOP-SPX360-001', 3, 4, 'HP Spectre x360 convertible laptop with Intel i7, 16GB RAM, 512GB SSD', 1199.00, 1499.00, 7, 10, true, NOW(), NOW()),

-- Electronics - Desktops
('iMac 24"', 'imac-24', 'DESKTOP-IMAC24-001', 4, 1, 'Apple iMac 24-inch with M1 chip, 8GB RAM, 256GB SSD', 1199.00, 1399.00, 4, 8, true, NOW(), NOW()),
('Dell OptiPlex 7090', 'dell-optiplex-7090', 'DESKTOP-OPT7090-001', 4, 2, 'Dell OptiPlex 7090 desktop with Intel i7, 16GB RAM, 512GB SSD', 899.00, 1199.00, 6, 10, true, NOW(), NOW()),

-- Electronics - Smartphones
('iPhone 14 Pro', 'iphone-14-pro', 'PHONE-IP14P-001', 6, 1, 'Apple iPhone 14 Pro with 128GB storage, Pro camera system', 899.00, 999.00, 15, 25, true, NOW(), NOW()),
('Samsung Galaxy S23', 'samsung-galaxy-s23', 'PHONE-SGS23-001', 6, 2, 'Samsung Galaxy S23 with 128GB storage, triple camera', 699.00, 799.00, 20, 30, true, NOW(), NOW()),
('Google Pixel 7', 'google-pixel-7', 'PHONE-GP7-001', 6, 3, 'Google Pixel 7 with 128GB storage, advanced AI features', 499.00, 599.00, 12, 20, true, NOW(), NOW()),

-- Electronics - Tablets
('iPad Air', 'ipad-air', 'TABLET-IPAIR-001', 7, 1, 'Apple iPad Air with 64GB storage, 10.9-inch display', 499.00, 599.00, 10, 15, true, NOW(), NOW()),
('Samsung Galaxy Tab S8', 'samsung-galaxy-tab-s8', 'TABLET-SGT8-001', 7, 2, 'Samsung Galaxy Tab S8 with 128GB storage, S Pen included', 599.00, 699.00, 8, 12, true, NOW(), NOW()),

-- Home & Garden - Furniture
('Ergonomic Office Chair', 'ergonomic-office-chair', 'FURN-EOC-001', 9, 5, 'Ergonomic office chair with lumbar support and adjustable height', 199.00, 299.00, 5, 10, true, NOW(), NOW()),
('Standing Desk', 'standing-desk', 'FURN-SD-001', 9, 6, 'Height-adjustable standing desk with electric motor', 399.00, 599.00, 3, 8, true, NOW(), NOW()),
('Bookshelf Unit', 'bookshelf-unit', 'FURN-BSU-001', 9, 7, '5-tier wooden bookshelf unit with modern design', 149.00, 229.00, 8, 15, true, NOW(), NOW()),

-- Home & Garden - Kitchen
('Stainless Steel Cookware Set', 'stainless-steel-cookware-set', 'KITCHEN-SSCS-001', 10, 8, '12-piece stainless steel cookware set with non-stick coating', 199.00, 299.00, 6, 12, true, NOW(), NOW()),
('Coffee Maker', 'coffee-maker', 'KITCHEN-CM-001', 10, 9, 'Programmable drip coffee maker with thermal carafe', 79.00, 129.00, 10, 20, true, NOW(), NOW()),

-- Clothing - Men's
('Men''s Casual Shirt', 'mens-casual-shirt', 'CLOTH-MCS-001', 12, 6, 'Cotton casual shirt in various colors and sizes', 19.99, 39.99, 25, 50, true, NOW(), NOW()),
('Men''s Jeans', 'mens-jeans', 'CLOTH-MJ-001', 12, 7, 'Classic fit denim jeans in multiple washes', 29.99, 59.99, 30, 60, true, NOW(), NOW()),

-- Clothing - Women's
('Women''s Blouse', 'womens-blouse', 'CLOTH-WB-001', 13, 6, 'Elegant silk blouse in various colors', 39.99, 79.99, 20, 40, true, NOW(), NOW()),
('Women''s Dress', 'womens-dress', 'CLOTH-WD-001', 13, 7, 'Casual summer dress in floral patterns', 49.99, 89.99, 15, 30, true, NOW(), NOW()),

-- Books
('The Great Gatsby', 'the-great-gatsby', 'BOOK-TGG-001', 15, 8, 'Classic American novel by F. Scott Fitzgerald', 8.99, 14.99, 20, 50, true, NOW(), NOW()),
('Sapiens', 'sapiens', 'BOOK-SAP-001', 16, 8, 'A Brief History of Humankind by Yuval Noah Harari', 12.99, 19.99, 15, 30, true, NOW(), NOW()),

-- Sports & Outdoors
('Yoga Mat', 'yoga-mat', 'SPORT-YM-001', 18, 9, 'Premium non-slip yoga mat with carrying strap', 24.99, 49.99, 25, 50, true, NOW(), NOW()),
('Camping Tent', 'camping-tent', 'SPORT-CT-001', 19, 10, '4-person waterproof camping tent with easy setup', 149.99, 249.99, 5, 10, true, NOW(), NOW()),

-- Automotive
('Car Phone Mount', 'car-phone-mount', 'AUTO-CPM-001', 20, 3, 'Universal car phone mount with 360-degree rotation', 14.99, 24.99, 30, 60, true, NOW(), NOW()),
('Bluetooth Car Adapter', 'bluetooth-car-adapter', 'AUTO-BCA-001', 20, 4, 'Bluetooth adapter for hands-free calling and music streaming', 29.99, 49.99, 20, 40, true, NOW(), NOW());

-- Insert inventory records for all products
INSERT INTO inventory (product_id, warehouse_location, quantity_on_hand, quantity_allocated, last_counted_at, created_at, updated_at)
SELECT 
    id,
    'MAIN',
    CASE 
        WHEN id % 5 = 0 THEN 5  -- Some products at reorder level
        WHEN id % 7 = 0 THEN 2  -- Some products below reorder level
        ELSE FLOOR(RANDOM() * 100) + 20  -- Most products with good stock
    END,
    CASE 
        WHEN id % 3 = 0 THEN FLOOR(RANDOM() * 5) + 1  -- Some allocated inventory
        ELSE 0
    END,
    NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 30),  -- Random last count date
    NOW(),
    NOW()
FROM products;

-- Insert sample stock movements
INSERT INTO stock_movements (product_id, movement_type, quantity, reason, reference_id, reference_type, created_by, created_at, updated_at)
SELECT 
    p.id,
    CASE (RANDOM() * 4)::INT
        WHEN 0 THEN 'INBOUND'
        WHEN 1 THEN 'OUTBOUND'
        WHEN 2 THEN 'ADJUSTMENT'
        ELSE 'TRANSFER'
    END,
    CASE 
        WHEN (RANDOM() * 4)::INT = 1 THEN -(FLOOR(RANDOM() * 10) + 1)  -- Negative for outbound
        ELSE FLOOR(RANDOM() * 20) + 1  -- Positive for inbound
    END,
    CASE (RANDOM() * 5)::INT
        WHEN 0 THEN 'Purchase Order'
        WHEN 1 THEN 'Sales Order'
        WHEN 2 THEN 'Inventory Count'
        WHEN 3 THEN 'Damage/Loss'
        ELSE 'Transfer'
    END,
    FLOOR(RANDOM() * 1000) + 1000,  -- Random reference ID
    'ORDER',
    1,  -- Created by admin user
    NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 90),  -- Random date in last 90 days
    NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 90)
FROM products p
CROSS JOIN generate_series(1, 3) -- 3 movements per product
ORDER BY RANDOM()
LIMIT 150;  -- Limit total movements

-- Insert sample orders
INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, shipping_address, billing_address, status, subtotal, tax_amount, shipping_cost, total_amount, created_by, created_at, updated_at)
VALUES
('ORD-2024-001', 'John Doe', 'john.doe@email.com', '+1-555-1001', '123 Main St, Anytown, ST 12345', '123 Main St, Anytown, ST 12345', 'DELIVERED', 1299.00, 103.92, 15.00, 1417.92, 1, NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days'),
('ORD-2024-002', 'Jane Smith', 'jane.smith@email.com', '+1-555-1002', '456 Oak Ave, Another City, ST 67890', '456 Oak Ave, Another City, ST 67890', 'SHIPPED', 599.00, 47.92, 12.00, 658.92, 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
('ORD-2024-003', 'Bob Johnson', 'bob.johnson@email.com', '+1-555-1003', '789 Pine Rd, Third Town, ST 11111', '789 Pine Rd, Third Town, ST 11111', 'PROCESSING', 299.00, 23.92, 8.00, 330.92, 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
('ORD-2024-004', 'Alice Brown', 'alice.brown@email.com', '+1-555-1004', '321 Elm St, Fourth City, ST 22222', '321 Elm St, Fourth City, ST 22222', 'CONFIRMED', 799.00, 63.92, 10.00, 872.92, 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
('ORD-2024-005', 'Charlie Wilson', 'charlie.wilson@email.com', '+1-555-1005', '654 Maple Dr, Fifth Town, ST 33333', '654 Maple Dr, Fifth Town, ST 33333', 'PENDING', 149.99, 12.00, 5.00, 166.99, 1, NOW() - INTERVAL '1 day', NOW()),
('ORD-2024-006', 'Diana Davis', 'diana.davis@email.com', '+1-555-1006', '987 Cedar Ln, Sixth City, ST 44444', '987 Cedar Ln, Sixth City, ST 44444', 'CANCELLED', 399.00, 31.92, 0.00, 430.92, 1, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
('ORD-2024-007', 'Frank Miller', 'frank.miller@email.com', '+1-555-1007', '147 Birch St, Seventh Town, ST 55555', '147 Birch St, Seventh Town, ST 55555', 'DELIVERED', 89.99, 7.20, 5.00, 102.19, 1, NOW() - INTERVAL '45 days', NOW() - INTERVAL '40 days'),
('ORD-2024-008', 'Grace Taylor', 'grace.taylor@email.com', '+1-555-1008', '258 Spruce Ave, Eighth City, ST 66666', '258 Spruce Ave, Eighth City, ST 66666', 'SHIPPED', 249.99, 20.00, 8.00, 277.99, 1, NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at, updated_at)
VALUES
-- Order 1 items
(1, 2, 1, 1599.00, 1599.00, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
-- Order 2 items  
(2, 10, 1, 599.00, 599.00, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
-- Order 3 items
(3, 11, 1, 299.00, 299.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
-- Order 4 items
(4, 8, 1, 799.00, 799.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
-- Order 5 items
(5, 13, 1, 149.99, 149.99, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
-- Order 6 items (cancelled)
(6, 12, 1, 399.00, 399.00, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
-- Order 7 items
(7, 16, 2, 39.99, 79.98, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
(7, 22, 1, 49.99, 49.99, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
-- Order 8 items
(8, 21, 1, 249.99, 249.99, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days');

-- Insert sample user activities
INSERT INTO user_activities (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
SELECT 
    1,  -- Admin user
    CASE (RANDOM() * 6)::INT
        WHEN 0 THEN 'CREATE'
        WHEN 1 THEN 'UPDATE'
        WHEN 2 THEN 'DELETE'
        WHEN 3 THEN 'VIEW'
        WHEN 4 THEN 'LOGIN'
        ELSE 'LOGOUT'
    END,
    CASE (RANDOM() * 4)::INT
        WHEN 0 THEN 'PRODUCT'
        WHEN 1 THEN 'ORDER'
        WHEN 2 THEN 'INVENTORY'
        ELSE 'USER'
    END,
    FLOOR(RANDOM() * 100) + 1,
    '{"action": "sample_activity", "timestamp": "' || NOW() || '"}',
    '192.168.1.' || (FLOOR(RANDOM() * 254) + 1)::TEXT,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 30)
FROM generate_series(1, 100);

-- Refresh materialized view if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_inventory_summary') THEN
        REFRESH MATERIALIZED VIEW mv_inventory_summary;
    END IF;
END
$$;

-- Update statistics for better query performance
ANALYZE categories;
ANALYZE suppliers;
ANALYZE products;
ANALYZE inventory;
ANALYZE stock_movements;
ANALYZE orders;
ANALYZE order_items;
ANALYZE user_activities;