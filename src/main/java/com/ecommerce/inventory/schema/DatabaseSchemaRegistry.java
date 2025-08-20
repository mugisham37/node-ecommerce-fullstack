package com.ecommerce.inventory.schema;

import org.jooq.Index;
import org.jooq.UniqueKey;
import org.jooq.ForeignKey;
import org.jooq.impl.DSL;

import java.util.Arrays;
import java.util.List;

import static org.jooq.impl.DSL.*;

/**
 * Central registry for all database schemas, relationships, and indexes
 * This class defines the complete database structure for Drizzle ORM integration
 */
public class DatabaseSchemaRegistry {
    
    // ========== UNIQUE CONSTRAINTS ==========
    
    // Users table unique constraints
    public static final UniqueKey<org.jooq.Record> UK_USERS_EMAIL = 
        unique("uk_users_email", UserSchema.EMAIL);
    
    // Products table unique constraints
    public static final UniqueKey<org.jooq.Record> UK_PRODUCTS_SKU = 
        unique("uk_products_sku", ProductSchema.SKU);
    public static final UniqueKey<org.jooq.Record> UK_PRODUCTS_SLUG = 
        unique("uk_products_slug", ProductSchema.SLUG);
    
    // Categories table unique constraints
    public static final UniqueKey<org.jooq.Record> UK_CATEGORIES_SLUG = 
        unique("uk_categories_slug", CategorySchema.SLUG);
    
    // Orders table unique constraints
    public static final UniqueKey<org.jooq.Record> UK_ORDERS_ORDER_NUMBER = 
        unique("uk_orders_order_number", OrderSchema.ORDER_NUMBER);
    
    // ========== FOREIGN KEY RELATIONSHIPS ==========
    
    // Products foreign keys
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_PRODUCTS_CATEGORY = 
        foreignKey(ProductSchema.CATEGORY_ID).references(CategorySchema.CATEGORIES, CategorySchema.ID);
    
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_PRODUCTS_SUPPLIER = 
        foreignKey(ProductSchema.SUPPLIER_ID).references(SupplierSchema.SUPPLIERS, SupplierSchema.ID);
    
    // Categories foreign keys (self-referencing for hierarchy)
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_CATEGORIES_PARENT = 
        foreignKey(CategorySchema.PARENT_ID).references(CategorySchema.CATEGORIES, CategorySchema.ID);
    
    // Inventory foreign keys
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_INVENTORY_PRODUCT = 
        foreignKey(InventorySchema.PRODUCT_ID).references(ProductSchema.PRODUCTS, ProductSchema.ID);
    
    // Orders foreign keys
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_ORDERS_CREATED_BY = 
        foreignKey(OrderSchema.CREATED_BY).references(UserSchema.USERS, UserSchema.ID);
    
    // Order Items foreign keys
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_ORDER_ITEMS_ORDER = 
        foreignKey(OrderItemSchema.ORDER_ID).references(OrderSchema.ORDERS, OrderSchema.ID);
    
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_ORDER_ITEMS_PRODUCT = 
        foreignKey(OrderItemSchema.PRODUCT_ID).references(ProductSchema.PRODUCTS, ProductSchema.ID);
    
    // Stock Movements foreign keys
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_STOCK_MOVEMENTS_PRODUCT = 
        foreignKey(StockMovementSchema.PRODUCT_ID).references(ProductSchema.PRODUCTS, ProductSchema.ID);
    
    public static final ForeignKey<org.jooq.Record, org.jooq.Record> FK_STOCK_MOVEMENTS_USER = 
        foreignKey(StockMovementSchema.USER_ID).references(UserSchema.USERS, UserSchema.ID);
    
    // ========== PERFORMANCE INDEXES ==========
    
    // Users table indexes
    public static final Index IDX_USERS_EMAIL = index("idx_users_email", UserSchema.EMAIL);
    public static final Index IDX_USERS_ROLE = index("idx_users_role", UserSchema.ROLE);
    public static final Index IDX_USERS_ACTIVE = index("idx_users_active", UserSchema.ACTIVE);
    public static final Index IDX_USERS_CREATED_AT = index("idx_users_created_at", UserSchema.CREATED_AT);
    
    // Products table indexes
    public static final Index IDX_PRODUCTS_NAME = index("idx_products_name", ProductSchema.NAME);
    public static final Index IDX_PRODUCTS_SKU = index("idx_products_sku", ProductSchema.SKU);
    public static final Index IDX_PRODUCTS_SLUG = index("idx_products_slug", ProductSchema.SLUG);
    public static final Index IDX_PRODUCTS_CATEGORY_ID = index("idx_products_category_id", ProductSchema.CATEGORY_ID);
    public static final Index IDX_PRODUCTS_SUPPLIER_ID = index("idx_products_supplier_id", ProductSchema.SUPPLIER_ID);
    public static final Index IDX_PRODUCTS_ACTIVE = index("idx_products_active", ProductSchema.ACTIVE);
    public static final Index IDX_PRODUCTS_REORDER_LEVEL = index("idx_products_reorder_level", ProductSchema.REORDER_LEVEL);
    
    // Categories table indexes
    public static final Index IDX_CATEGORIES_NAME = index("idx_categories_name", CategorySchema.NAME);
    public static final Index IDX_CATEGORIES_SLUG = index("idx_categories_slug", CategorySchema.SLUG);
    public static final Index IDX_CATEGORIES_PARENT_ID = index("idx_categories_parent_id", CategorySchema.PARENT_ID);
    public static final Index IDX_CATEGORIES_SORT_ORDER = index("idx_categories_sort_order", CategorySchema.SORT_ORDER);
    public static final Index IDX_CATEGORIES_ACTIVE = index("idx_categories_active", CategorySchema.ACTIVE);
    
    // Suppliers table indexes
    public static final Index IDX_SUPPLIERS_NAME = index("idx_suppliers_name", SupplierSchema.NAME);
    public static final Index IDX_SUPPLIERS_EMAIL = index("idx_suppliers_email", SupplierSchema.EMAIL);
    public static final Index IDX_SUPPLIERS_STATUS = index("idx_suppliers_status", SupplierSchema.STATUS);
    
    // Inventory table indexes
    public static final Index IDX_INVENTORY_PRODUCT_ID = index("idx_inventory_product_id", InventorySchema.PRODUCT_ID);
    public static final Index IDX_INVENTORY_WAREHOUSE_LOCATION = index("idx_inventory_warehouse_location", InventorySchema.WAREHOUSE_LOCATION);
    public static final Index IDX_INVENTORY_QUANTITY_ON_HAND = index("idx_inventory_quantity_on_hand", InventorySchema.QUANTITY_ON_HAND);
    public static final Index IDX_INVENTORY_LAST_COUNTED_AT = index("idx_inventory_last_counted_at", InventorySchema.LAST_COUNTED_AT);
    
    // Orders table indexes
    public static final Index IDX_ORDERS_ORDER_NUMBER = index("idx_orders_order_number", OrderSchema.ORDER_NUMBER);
    public static final Index IDX_ORDERS_CUSTOMER_EMAIL = index("idx_orders_customer_email", OrderSchema.CUSTOMER_EMAIL);
    public static final Index IDX_ORDERS_STATUS = index("idx_orders_status", OrderSchema.STATUS);
    public static final Index IDX_ORDERS_CREATED_BY = index("idx_orders_created_by", OrderSchema.CREATED_BY);
    public static final Index IDX_ORDERS_CREATED_AT = index("idx_orders_created_at", OrderSchema.CREATED_AT);
    
    // Order Items table indexes
    public static final Index IDX_ORDER_ITEMS_ORDER_ID = index("idx_order_items_order_id", OrderItemSchema.ORDER_ID);
    public static final Index IDX_ORDER_ITEMS_PRODUCT_ID = index("idx_order_items_product_id", OrderItemSchema.PRODUCT_ID);
    
    // Stock Movements table indexes
    public static final Index IDX_STOCK_MOVEMENTS_PRODUCT_ID = index("idx_stock_movements_product_id", StockMovementSchema.PRODUCT_ID);
    public static final Index IDX_STOCK_MOVEMENTS_MOVEMENT_TYPE = index("idx_stock_movements_movement_type", StockMovementSchema.MOVEMENT_TYPE);
    public static final Index IDX_STOCK_MOVEMENTS_REFERENCE_ID = index("idx_stock_movements_reference_id", StockMovementSchema.REFERENCE_ID);
    public static final Index IDX_STOCK_MOVEMENTS_REFERENCE_TYPE = index("idx_stock_movements_reference_type", StockMovementSchema.REFERENCE_TYPE);
    public static final Index IDX_STOCK_MOVEMENTS_USER_ID = index("idx_stock_movements_user_id", StockMovementSchema.USER_ID);
    public static final Index IDX_STOCK_MOVEMENTS_CREATED_AT = index("idx_stock_movements_created_at", StockMovementSchema.CREATED_AT);
    
    // ========== COMPOSITE INDEXES FOR COMPLEX QUERIES ==========
    
    // Composite index for product search by category and status
    public static final Index IDX_PRODUCTS_CATEGORY_ACTIVE = 
        index("idx_products_category_active", ProductSchema.CATEGORY_ID, ProductSchema.ACTIVE);
    
    // Composite index for supplier products
    public static final Index IDX_PRODUCTS_SUPPLIER_ACTIVE = 
        index("idx_products_supplier_active", ProductSchema.SUPPLIER_ID, ProductSchema.ACTIVE);
    
    // Composite index for inventory by warehouse and product
    public static final Index IDX_INVENTORY_WAREHOUSE_PRODUCT = 
        index("idx_inventory_warehouse_product", InventorySchema.WAREHOUSE_LOCATION, InventorySchema.PRODUCT_ID);
    
    // Composite index for order items by order and product
    public static final Index IDX_ORDER_ITEMS_ORDER_PRODUCT = 
        index("idx_order_items_order_product", OrderItemSchema.ORDER_ID, OrderItemSchema.PRODUCT_ID);
    
    // Composite index for stock movements by product and date
    public static final Index IDX_STOCK_MOVEMENTS_PRODUCT_DATE = 
        index("idx_stock_movements_product_date", StockMovementSchema.PRODUCT_ID, StockMovementSchema.CREATED_AT);
    
    // ========== UTILITY METHODS ==========
    
    /**
     * Get all unique constraints for the database
     */
    public static List<UniqueKey<org.jooq.Record>> getAllUniqueKeys() {
        return Arrays.asList(
            UK_USERS_EMAIL,
            UK_PRODUCTS_SKU,
            UK_PRODUCTS_SLUG,
            UK_CATEGORIES_SLUG,
            UK_ORDERS_ORDER_NUMBER
        );
    }
    
    /**
     * Get all foreign key relationships for the database
     */
    public static List<ForeignKey<org.jooq.Record, org.jooq.Record>> getAllForeignKeys() {
        return Arrays.asList(
            FK_PRODUCTS_CATEGORY,
            FK_PRODUCTS_SUPPLIER,
            FK_CATEGORIES_PARENT,
            FK_INVENTORY_PRODUCT,
            FK_ORDERS_CREATED_BY,
            FK_ORDER_ITEMS_ORDER,
            FK_ORDER_ITEMS_PRODUCT,
            FK_STOCK_MOVEMENTS_PRODUCT,
            FK_STOCK_MOVEMENTS_USER
        );
    }
    
    /**
     * Get all performance indexes for the database
     */
    public static List<Index> getAllIndexes() {
        return Arrays.asList(
            // Single column indexes
            IDX_USERS_EMAIL, IDX_USERS_ROLE, IDX_USERS_ACTIVE, IDX_USERS_CREATED_AT,
            IDX_PRODUCTS_NAME, IDX_PRODUCTS_SKU, IDX_PRODUCTS_SLUG, IDX_PRODUCTS_CATEGORY_ID,
            IDX_PRODUCTS_SUPPLIER_ID, IDX_PRODUCTS_ACTIVE, IDX_PRODUCTS_REORDER_LEVEL,
            IDX_CATEGORIES_NAME, IDX_CATEGORIES_SLUG, IDX_CATEGORIES_PARENT_ID,
            IDX_CATEGORIES_SORT_ORDER, IDX_CATEGORIES_ACTIVE,
            IDX_SUPPLIERS_NAME, IDX_SUPPLIERS_EMAIL, IDX_SUPPLIERS_STATUS,
            IDX_INVENTORY_PRODUCT_ID, IDX_INVENTORY_WAREHOUSE_LOCATION,
            IDX_INVENTORY_QUANTITY_ON_HAND, IDX_INVENTORY_LAST_COUNTED_AT,
            IDX_ORDERS_ORDER_NUMBER, IDX_ORDERS_CUSTOMER_EMAIL, IDX_ORDERS_STATUS,
            IDX_ORDERS_CREATED_BY, IDX_ORDERS_CREATED_AT,
            IDX_ORDER_ITEMS_ORDER_ID, IDX_ORDER_ITEMS_PRODUCT_ID,
            IDX_STOCK_MOVEMENTS_PRODUCT_ID, IDX_STOCK_MOVEMENTS_MOVEMENT_TYPE,
            IDX_STOCK_MOVEMENTS_REFERENCE_ID, IDX_STOCK_MOVEMENTS_REFERENCE_TYPE,
            IDX_STOCK_MOVEMENTS_USER_ID, IDX_STOCK_MOVEMENTS_CREATED_AT,
            
            // Composite indexes
            IDX_PRODUCTS_CATEGORY_ACTIVE, IDX_PRODUCTS_SUPPLIER_ACTIVE,
            IDX_INVENTORY_WAREHOUSE_PRODUCT, IDX_ORDER_ITEMS_ORDER_PRODUCT,
            IDX_STOCK_MOVEMENTS_PRODUCT_DATE
        );
    }
}