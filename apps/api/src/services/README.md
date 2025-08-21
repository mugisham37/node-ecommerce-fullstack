# Business Services Layer

This directory contains the migrated business logic services from the Java Spring Boot application to TypeScript. The services maintain the same functionality while leveraging TypeScript's type safety and modern JavaScript patterns.

## Architecture Overview

The service layer follows a clean architecture pattern with:

- **Base Services**: Abstract base classes and interfaces for common functionality
- **Business Services**: Core business logic services for different domains
- **Analytics Services**: Reporting and analytics services
- **Service Container**: Dependency injection and service management

## Directory Structure

```
services/
├── base/                    # Base service classes and interfaces
│   ├── BaseService.ts      # Abstract base service with common CRUD operations
│   ├── types.ts            # Common types and DTOs
│   └── ServiceContainer.ts # Dependency injection container
├── business/               # Core business services
│   ├── UserService.ts      # User management and authentication
│   ├── ProductService.ts   # Product catalog management
│   ├── InventoryService.ts # Inventory tracking and allocation
│   ├── OrderService.ts     # Order processing and fulfillment
│   ├── SupplierService.ts  # Supplier relationship management
│   └── CategoryService.ts  # Category hierarchy management
├── analytics/              # Analytics and reporting services
│   └── ReportService.ts    # Business intelligence and reporting
└── index.ts               # Service exports and factory
```

## Service Features

### Common Features (All Services)
- **Type Safety**: Full TypeScript type definitions
- **Caching**: Redis-based caching with configurable TTL
- **Event Publishing**: Domain event publishing for loose coupling
- **Logging**: Structured logging with context
- **Error Handling**: Consistent error types and handling
- **Validation**: Input validation and business rule enforcement
- **Audit Trail**: User context and operation tracking

### UserService
- User CRUD operations with role-based access control
- Password management with secure hashing
- Account locking and unlock functionality
- User statistics and analytics
- Session management support

### ProductService
- Product catalog management with SKU validation
- Category and supplier relationship management
- Bulk operations for efficiency
- Low stock monitoring
- Product search and filtering
- Pricing management

### InventoryService
- Multi-warehouse inventory tracking
- Stock allocation and release for orders
- Smart allocation across warehouses
- Stock movement audit trail
- Low stock alerts and reorder recommendations
- Inventory valuation and reporting

### OrderService
- Complete order lifecycle management
- Automatic inventory allocation
- Order status transitions with business rules
- Fulfillment processing with partial shipment support
- Order cancellation with inventory release
- Customer order history

### SupplierService
- Supplier relationship management
- Performance tracking and analytics
- Product-supplier relationship management
- Supplier status management with business rules
- Performance ratings and recommendations

### CategoryService
- Hierarchical category management
- Parent-child relationships with circular reference prevention
- Category tree operations (ancestors, descendants)
- Bulk operations for category management
- Category statistics and product counts

### ReportService
- Real-time dashboard metrics
- Comprehensive business analytics
- Financial reporting and summaries
- Inventory analytics and valuation
- Customer analytics and insights
- Performance monitoring and system metrics
- Scheduled report generation
- Export functionality in multiple formats

## Usage Examples

### Service Initialization

```typescript
import { initializeServices, ServiceFactory } from './services';

// Initialize services with context
const context = {
  db: databaseConnection,
  cache: redisClient,
  eventPublisher: eventBus,
  logger: logger,
  currentUser: { id: 'user123', email: 'user@example.com', role: 'ADMIN' }
};

initializeServices(context);

// Use services
const userService = ServiceFactory.getUserService();
const productService = ServiceFactory.getProductService();
```

### Creating a User

```typescript
const userService = ServiceFactory.getUserService();

const newUser = await userService.create({
  email: 'john.doe@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.EMPLOYEE
});
```

### Managing Inventory

```typescript
const inventoryService = ServiceFactory.getInventoryService();

// Adjust inventory
await inventoryService.adjustInventory('product123', {
  newQuantity: 100,
  reason: 'Stock replenishment'
});

// Allocate inventory for order
await inventoryService.allocateInventory('product123', 5, 'order456');
```

### Processing Orders

```typescript
const orderService = ServiceFactory.getOrderService();

const newOrder = await orderService.create({
  customerName: 'Jane Smith',
  customerEmail: 'jane@example.com',
  shippingAddress: '123 Main St, City, State 12345',
  taxAmount: 8.50,
  shippingCost: 15.00,
  items: [
    {
      productId: 'product123',
      quantity: 2,
      unitPrice: 29.99
    }
  ]
});
```

### Generating Reports

```typescript
const reportService = ServiceFactory.getReportService();

// Get dashboard metrics
const metrics = await reportService.getDashboardMetrics();

// Generate inventory analytics
const analytics = await reportService.getInventoryAnalytics(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

## Migration Notes

### From Java Spring Boot

The services have been migrated from Java Spring Boot with the following considerations:

1. **Annotations to Decorators**: Spring annotations converted to TypeScript patterns
2. **Dependency Injection**: Spring DI replaced with custom service container
3. **JPA to Database Layer**: JPA repositories replaced with database abstraction
4. **Caching**: Spring Cache replaced with Redis-based caching
5. **Events**: Spring Events replaced with custom event publishing
6. **Security**: Spring Security patterns adapted to TypeScript context
7. **Transactions**: Spring @Transactional replaced with database transaction management

### Database Integration

The services are designed to work with a database abstraction layer that will be implemented separately. Key integration points:

- Repository pattern for data access
- Transaction management
- Connection pooling
- Query optimization
- Migration support

### Cache Integration

Services use a cache abstraction that supports:

- Key-value operations
- TTL (Time To Live) configuration
- Cache invalidation patterns
- Cache warming strategies
- Performance monitoring

### Event System

Services publish domain events for:

- Entity lifecycle events (created, updated, deleted)
- Business process events (order confirmed, inventory allocated)
- System events (low stock alerts, performance metrics)
- Audit events (user actions, system changes)

## Testing

Each service should be tested with:

- **Unit Tests**: Business logic and validation
- **Integration Tests**: Database and cache interactions
- **Performance Tests**: Load and stress testing
- **Security Tests**: Authorization and input validation

## Performance Considerations

- **Caching Strategy**: Aggressive caching with intelligent invalidation
- **Bulk Operations**: Batch processing for efficiency
- **Lazy Loading**: Load related data only when needed
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized database queries
- **Event Batching**: Batch event publishing for performance

## Security Considerations

- **Input Validation**: All inputs validated against schemas
- **Authorization**: Role-based access control on all operations
- **Audit Logging**: All operations logged with user context
- **Data Sanitization**: Sensitive data removed from responses
- **Rate Limiting**: Protection against abuse
- **SQL Injection Prevention**: Parameterized queries only

## Future Enhancements

- **Microservice Split**: Services can be split into separate microservices
- **GraphQL Support**: Add GraphQL resolvers for services
- **Real-time Updates**: WebSocket support for real-time data
- **Advanced Analytics**: Machine learning integration
- **Multi-tenancy**: Support for multiple tenants
- **API Versioning**: Support for multiple API versions