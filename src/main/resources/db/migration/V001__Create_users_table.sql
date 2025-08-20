-- Create users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE')),
    active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_active ON users(active);
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_user_created_at ON users(created_at);

-- Insert default admin user (password: Admin123!)
-- Password hash for 'Admin123!' using BCrypt with strength 12
INSERT INTO users (email, password_hash, first_name, last_name, role, active) 
VALUES (
    'admin@inventory.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfBPd92.ChOxyCy',
    'System',
    'Administrator',
    'ADMIN',
    true
);

-- Insert default manager user (password: Manager123!)
-- Password hash for 'Manager123!' using BCrypt with strength 12
INSERT INTO users (email, password_hash, first_name, last_name, role, active) 
VALUES (
    'manager@inventory.com',
    '$2a$12$8Ry7d4VQzqVQzqVQzqVQzOYz6TtxMQJqhN8/LewfBPd92.ChOxyCy',
    'Inventory',
    'Manager',
    'MANAGER',
    true
);

-- Insert default employee user (password: Employee123!)
-- Password hash for 'Employee123!' using BCrypt with strength 12
INSERT INTO users (email, password_hash, first_name, last_name, role, active) 
VALUES (
    'employee@inventory.com',
    '$2a$12$9Sz8e5WRarWRarWRarWRaOYz6TtxMQJqhN8/LewfBPd92.ChOxyCy',
    'Store',
    'Employee',
    'EMPLOYEE',
    true
);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();