-- Insert initial admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, active) VALUES
('admin@inventory.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'ADMIN', true);

-- Insert sample categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Electronics', 'electronics', 'Electronic devices and accessories', 1),
('Clothing', 'clothing', 'Apparel and fashion items', 2),
('Books', 'books', 'Books and publications', 3),
('Home & Garden', 'home-garden', 'Home improvement and garden supplies', 4);

-- Insert subcategories
INSERT INTO categories (name, slug, description, parent_id, sort_order) VALUES
('Smartphones', 'smartphones', 'Mobile phones and accessories', 1, 1),
('Laptops', 'laptops', 'Laptop computers and accessories', 1, 2),
('Men''s Clothing', 'mens-clothing', 'Clothing for men', 2, 1),
('Women''s Clothing', 'womens-clothing', 'Clothing for women', 2, 2);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address, payment_terms, status) VALUES
('TechSupply Co.', 'John Smith', 'john@techsupply.com', '+1-555-0101', '123 Tech Street, Silicon Valley, CA 94000', 'Net 30', 'ACTIVE'),
('Fashion Wholesale', 'Jane Doe', 'jane@fashionwholesale.com', '+1-555-0102', '456 Fashion Ave, New York, NY 10001', 'Net 15', 'ACTIVE'),
('Book Distributors Inc.', 'Bob Johnson', 'bob@bookdist.com', '+1-555-0103', '789 Book Lane, Chicago, IL 60601', 'Net 45', 'ACTIVE');

-- Insert sample products
INSERT INTO products (name, slug, sku, description, category_id, supplier_id, cost_price, selling_price, reorder_level, reorder_quantity) VALUES
('iPhone 15 Pro', 'iphone-15-pro', 'TECH-001', 'Latest iPhone with advanced features', 5, 1, 800.00, 1200.00, 5, 20),
('MacBook Pro 16"', 'macbook-pro-16', 'TECH-002', 'High-performance laptop for professionals', 6, 1, 2000.00, 2800.00, 3, 10),
('Men''s Cotton T-Shirt', 'mens-cotton-tshirt', 'CLOTH-001', 'Comfortable cotton t-shirt for men', 7, 2, 8.00, 25.00, 50, 100),
('Women''s Jeans', 'womens-jeans', 'CLOTH-002', 'Stylish denim jeans for women', 8, 2, 25.00, 65.00, 30, 50),
('Programming Book', 'programming-book', 'BOOK-001', 'Learn programming fundamentals', 3, 3, 15.00, 45.00, 20, 40);

-- Insert initial inventory
INSERT INTO inventory (product_id, warehouse_location, quantity_on_hand, quantity_allocated, last_counted_at) VALUES
(1, 'MAIN', 15, 0, CURRENT_TIMESTAMP),
(2, 'MAIN', 8, 0, CURRENT_TIMESTAMP),
(3, 'MAIN', 100, 0, CURRENT_TIMESTAMP),
(4, 'MAIN', 75, 0, CURRENT_TIMESTAMP),
(5, 'MAIN', 50, 0, CURRENT_TIMESTAMP);