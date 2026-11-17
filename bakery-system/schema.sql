
-- Multi-tenant Production Schema for BakerAdmin

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'superadmin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    plan VARCHAR(50) DEFAULT 'standard',
    paid_until TIMESTAMPTZ,
    grace_period_days INT DEFAULT 7,
    auto_suspend BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',
    currency VARCHAR(10) DEFAULT 'ETB',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);

CREATE TABLE IF NOT EXISTS licenses (
    id VARCHAR(50) PRIMARY KEY,
    license_key VARCHAR(100) UNIQUE NOT NULL,
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    max_devices INT DEFAULT 5,
    status VARCHAR(50) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_shop ON licenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);

CREATE TABLE IF NOT EXISTS terminals (
    device_id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    license_key VARCHAR(100) REFERENCES licenses(license_key) ON DELETE SET NULL,
    model VARCHAR(150),
    os_version VARCHAR(100),
    app_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    status_reason TEXT,
    status_updated_at TIMESTAMPTZ DEFAULT NOW(),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_ping TIMESTAMPTZ,
    last_ip VARCHAR(50),
    battery_level INT,
    offline_token TEXT,
    pending_command JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terminals_shop ON terminals(shop_id);
CREATE INDEX IF NOT EXISTS idx_terminals_status ON terminals(status);
CREATE INDEX IF NOT EXISTS idx_terminals_license ON terminals(license_key);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    available BOOLEAN DEFAULT TRUE,
    prepared_count INT DEFAULT 0,
    remaining_count INT DEFAULT 0,
    sold_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);

CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'kg',
    stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory(shop_id);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(100) PRIMARY KEY,
    client_order_id VARCHAR(100) UNIQUE,
    shop_id VARCHAR(50) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_id VARCHAR(100) REFERENCES terminals(device_id) ON DELETE SET NULL,
    order_number VARCHAR(100),
    customer VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    order_date TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status VARCHAR(50) DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_device ON orders(device_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_order_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    shop_id VARCHAR(50),
    terminal_id VARCHAR(100),
    admin_user VARCHAR(100) DEFAULT 'admin',
    action VARCHAR(100) NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_shop ON audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_terminal ON audit_logs(terminal_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

CREATE TABLE IF NOT EXISTS sync_logs (
    id VARCHAR(100) PRIMARY KEY,
    device_id VARCHAR(100),
    shop_id VARCHAR(50),
    orders_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'success',
    client_ip VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_synclogs_device ON sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_synclogs_timestamp ON sync_logs(timestamp);
