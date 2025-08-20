# E-Commerce Inventory Management System - Project Structure Analysis

## Project Overview

This is a comprehensive **Spring Boot 3.2.1** based E-Commerce Inventory Management System built with **Java 17**. The project follows enterprise-grade architecture patterns with extensive use of modern technologies including JOOQ, Redis caching, JWT authentication, event-driven architecture, and comprehensive monitoring capabilities.

### Key Technologies & Frameworks

- **Spring Boot 3.2.1** with Spring Security, Spring Data JPA, Spring Cache
- **Java 17** with Lombok for cleaner code
- **PostgreSQL** as primary database with **HikariCP** connection pooling
- **JOOQ** for type-safe SQL queries alongside JPA
- **Redis** for caching and session management
- **Flyway** for database migrations
- **JWT** for authentication and authorization
- **MapStruct** for DTO mapping
- **Caffeine** for local caching
- **OpenAPI/Swagger** for API documentation
- **Testcontainers** for integration testing
- **Docker** with multi-stage builds for containerization
- **AWS S3** integration for cloud storage
- **Apache Tika** for file processing
- **Logstash** for structured logging

### Architecture Patterns

- **Event-Driven Architecture** with comprehensive event handling
- **Layered Architecture** (Controller → Service → Repository)
- **Domain-Driven Design** principles
- **CQRS** patterns with JOOQ for complex queries
- **Microservice-ready** with health checks and monitoring
- **Security-first** approach with comprehensive validation

## Complete Project Structure

```
inventory-management/
├── .git/                                    # Git version control
├── .mvn/                                    # Maven wrapper configuration
│   └── wrapper/
│       └── maven-wrapper.properties        # Maven wrapper properties
├── src/                                     # Source code root
│   ├── main/                               # Main application source
│   │   ├── java/                           # Java source files
│   │   │   └── com/
│   │   │       └── ecommerce/
│   │   │           └── inventory/
│   │   │               ├── InventoryManagementApplication.java  # Main Spring Boot application class
│   │   │               ├── config/                             # Configuration classes
│   │   │               │   ├── ActuatorConfig.java            # Spring Boot Actuator configuration
│   │   │               │   ├── ApiDocumentationSummary.java   # API documentation summary
│   │   │               │   ├── ApiIntegrationGuide.java       # API integration guide
│   │   │               │   ├── ApplicationProperties.java     # Application properties binding
│   │   │               │   ├── AsyncConfig.java               # Asynchronous processing configuration
│   │   │               │   ├── CacheAspectConfig.java         # Cache aspect configuration
│   │   │               │   ├── CacheWarmupConfig.java         # Cache warmup configuration
│   │   │               │   ├── CaffeineConfig.java            # Caffeine cache configuration
│   │   │               │   ├── ConfigurationValidator.java    # Configuration validation
│   │   │               │   ├── DatabaseConfig.java            # Database configuration
│   │   │               │   ├── EventDrivenAsyncConfig.java    # Event-driven async configuration
│   │   │               │   ├── FileStorageConfig.java         # File storage configuration
│   │   │               │   ├── FileStorageProperties.java     # File storage properties
│   │   │               │   ├── FlywayConfig.java              # Flyway migration configuration
│   │   │               │   ├── HealthCheckConfig.java         # Health check configuration
│   │   │               │   ├── JacksonConfig.java             # JSON serialization configuration
│   │   │               │   ├── JooqConfig.java                # JOOQ configuration
│   │   │               │   ├── JpaConfig.java                 # JPA configuration
│   │   │               │   ├── JwtConfig.java                 # JWT configuration
│   │   │               │   ├── LoggingConfig.java             # Logging configuration
│   │   │               │   ├── OpenApiConfig.java             # OpenAPI/Swagger configuration
│   │   │               │   ├── OpenApiExamples.java           # OpenAPI examples
│   │   │               │   ├── QueryPerformanceConfig.java    # Query performance configuration
│   │   │               │   ├── RedisConfig.java               # Redis configuration
│   │   │               │   ├── RedisHealthConfig.java         # Redis health check configuration
│   │   │               │   ├── ReportingConfig.java           # Reporting configuration
│   │   │               │   ├── SchedulingConfig.java          # Task scheduling configuration
│   │   │               │   ├── SecurityConfig.java            # Spring Security configuration
│   │   │               │   ├── SecurityHeadersConfig.java     # Security headers configuration
│   │   │               │   ├── TransactionConfig.java         # Transaction management configuration
│   │   │               │   └── ValidationConfig.java          # Validation configuration
│   │   │               ├── controller/                        # REST API controllers
│   │   │               │   ├── AuthController.java            # Authentication endpoints
│   │   │               │   ├── CategoryController.java        # Category management endpoints
│   │   │               │   ├── FileController.java            # File upload/download endpoints
│   │   │               │   ├── FileSecurityController.java    # File security endpoints
│   │   │               │   ├── HealthController.java          # Health check endpoints
│   │   │               │   ├── InventoryController.java       # Inventory management endpoints
│   │   │               │   ├── MonitoringController.java      # Monitoring endpoints
│   │   │               │   ├── OrderController.java           # Order management endpoints
│   │   │               │   ├── ProductController.java         # Product management endpoints
│   │   │               │   ├── ReportController.java          # Reporting endpoints
│   │   │               │   ├── SecurityTestController.java    # Security testing endpoints
│   │   │               │   ├── SupplierController.java        # Supplier management endpoints
│   │   │               │   └── UserController.java            # User management endpoints
│   │   │               ├── dto/                               # Data Transfer Objects
│   │   │               │   ├── mapper/                        # MapStruct mappers
│   │   │               │   │   ├── CategoryMapper.java        # Category entity-DTO mapper
│   │   │               │   │   ├── EntityMapper.java          # Base entity mapper
│   │   │               │   │   ├── InventoryMapper.java       # Inventory entity-DTO mapper
│   │   │               │   │   ├── MapperConfig.java          # MapStruct configuration
│   │   │               │   │   ├── OrderItemMapper.java       # Order item entity-DTO mapper
│   │   │               │   │   ├── OrderMapper.java           # Order entity-DTO mapper
│   │   │               │   │   ├── ProductMapper.java         # Product entity-DTO mapper
│   │   │               │   │   ├── ReportMapper.java          # Report entity-DTO mapper
│   │   │               │   │   ├── StockMovementMapper.java   # Stock movement entity-DTO mapper
│   │   │               │   │   ├── SupplierMapper.java        # Supplier entity-DTO mapper
│   │   │               │   │   └── UserMapper.java            # User entity-DTO mapper
│   │   │               │   ├── request/                       # Request DTOs
│   │   │               │   │   ├── AdvancedSearchFilter.java  # Advanced search filter DTO
│   │   │               │   │   ├── BulkProductUpdateRequest.java # Bulk product update request
│   │   │               │   │   ├── CategoryCreateRequest.java # Category creation request
│   │   │               │   │   ├── CategoryUpdateRequest.java # Category update request
│   │   │               │   │   ├── FileUploadRequest.java     # File upload request
│   │   │               │   │   ├── FulfillmentRequest.java    # Order fulfillment request
│   │   │               │   │   ├── InventoryAdjustmentRequest.java # Inventory adjustment request
│   │   │               │   │   ├── LoginRequest.java          # User login request
│   │   │               │   │   ├── OrderCancellationRequest.java # Order cancellation request
│   │   │               │   │   ├── OrderCreateRequest.java    # Order creation request
│   │   │               │   │   ├── OrderFulfillmentRequest.java # Order fulfillment request
│   │   │               │   │   ├── OrderItemCreateRequest.java # Order item creation request
│   │   │               │   │   ├── OrderSearchRequest.java    # Order search request
│   │   │               │   │   ├── OrderStatusUpdateRequest.java # Order status update request
│   │   │               │   │   ├── OrderUpdateRequest.java    # Order update request
│   │   │               │   │   ├── PaginationRequest.java     # Pagination request
│   │   │               │   │   ├── PartialFulfillmentRequest.java # Partial fulfillment request
│   │   │               │   │   ├── PricingUpdateRequest.java  # Pricing update request
│   │   │               │   │   ├── ProductCreateRequest.java  # Product creation request
│   │   │               │   │   ├── ProductSearchCriteria.java # Product search criteria
│   │   │               │   │   ├── ProductSearchRequest.java  # Product search request
│   │   │               │   │   ├── ProductUpdateRequest.java  # Product update request
│   │   │               │   │   ├── RefreshTokenRequest.java   # JWT refresh token request
│   │   │               │   │   ├── SupplierCreateRequest.java # Supplier creation request
│   │   │               │   │   ├── SupplierStatusUpdateRequest.java # Supplier status update request
│   │   │               │   │   ├── SupplierUpdateRequest.java # Supplier update request
│   │   │               │   │   ├── UserCreateRequest.java     # User creation request
│   │   │               │   │   └── UserUpdateRequest.java     # User update request
│   │   │               │   ├── response/                      # Response DTOs
│   │   │               │   │   ├── ApiResponse.java           # Generic API response wrapper
│   │   │               │   │   ├── CategoryResponse.java      # Category response DTO
│   │   │               │   │   ├── FileUploadResponse.java    # File upload response
│   │   │               │   │   ├── InventoryMovementReport.java # Inventory movement report
│   │   │               │   │   ├── InventoryResponse.java     # Inventory response DTO
│   │   │               │   │   ├── JwtAuthenticationResponse.java # JWT authentication response
│   │   │               │   │   ├── LowStockAlert.java         # Low stock alert response
│   │   │               │   │   ├── OrderAnalyticsReport.java  # Order analytics report
│   │   │               │   │   ├── OrderItemResponse.java     # Order item response DTO
│   │   │               │   │   ├── OrderResponse.java         # Order response DTO
│   │   │               │   │   ├── OrderSummaryResponse.java  # Order summary response
│   │   │               │   │   ├── PagedResponse.java         # Paginated response wrapper
│   │   │               │   │   ├── ProductResponse.java       # Product response DTO
│   │   │               │   │   ├── ProductSummaryResponse.java # Product summary response
│   │   │               │   │   ├── StockMovementResponse.java # Stock movement response DTO
│   │   │               │   │   ├── SupplierPerformanceResponse.java # Supplier performance response
│   │   │               │   │   ├── SupplierResponse.java      # Supplier response DTO
│   │   │               │   │   ├── SupplierSummaryResponse.java # Supplier summary response
│   │   │               │   │   ├── UserActivityResponse.java  # User activity response DTO
│   │   │               │   │   └── UserResponse.java          # User response DTO
│   │   │               │   ├── validation/                    # Custom validation
│   │   │               │   │   ├── DtoValidationTest.java     # DTO validation test
│   │   │               │   │   ├── InputSanitizer.java        # Input sanitization utility
│   │   │               │   │   ├── SafeInput.java             # Safe input annotation
│   │   │               │   │   ├── SafeInputValidator.java    # Safe input validator
│   │   │               │   │   ├── ValidationAspect.java      # Validation aspect
│   │   │               │   │   ├── ValidationErrorAggregator.java # Validation error aggregator
│   │   │               │   │   ├── ValidationGroups.java      # Validation groups
│   │   │               │   │   ├── ValidationService.java     # Validation service
│   │   │               │   │   ├── ValidEmail.java            # Email validation annotation
│   │   │               │   │   ├── ValidEmailValidator.java   # Email validator
│   │   │               │   │   ├── ValidOrderStatus.java      # Order status validation annotation
│   │   │               │   │   ├── ValidOrderStatusValidator.java # Order status validator
│   │   │               │   │   ├── ValidPassword.java         # Password validation annotation
│   │   │               │   │   ├── ValidPasswordValidator.java # Password validator
│   │   │               │   │   ├── ValidPhoneNumber.java      # Phone number validation annotation
│   │   │               │   │   ├── ValidPhoneNumberValidator.java # Phone number validator
│   │   │               │   │   ├── ValidPrice.java            # Price validation annotation
│   │   │               │   │   ├── ValidPriceValidator.java   # Price validator
│   │   │               │   │   ├── ValidProductName.java      # Product name validation annotation
│   │   │               │   │   ├── ValidProductNameValidator.java # Product name validator
│   │   │               │   │   ├── ValidQuantity.java         # Quantity validation annotation
│   │   │               │   │   ├── ValidQuantityValidator.java # Quantity validator
│   │   │               │   │   ├── ValidRole.java             # Role validation annotation
│   │   │               │   │   ├── ValidRoleValidator.java    # Role validator
│   │   │               │   │   ├── ValidSku.java              # SKU validation annotation
│   │   │               │   │   ├── ValidSkuValidator.java     # SKU validator
│   │   │               │   │   ├── ValidSlug.java             # Slug validation annotation
│   │   │               │   │   └── ValidSlugValidator.java    # Slug validator
│   │   │               │   └── versioning/                    # API versioning
│   │   │               │       ├── ApiVersion.java           # API version annotation
│   │   │               │       ├── ApiVersionCompatibility.java # API version compatibility
│   │   │               │       ├── ApiVersioningConfig.java  # API versioning configuration
│   │   │               │       ├── ApiVersionRequestMappingHandlerMapping.java # Version request mapping
│   │   │               │       └── VersionedResponse.java    # Versioned response wrapper
│   │   │               ├── entity/                            # JPA entities
│   │   │               │   ├── AuditableEntity.java          # Base auditable entity
│   │   │               │   ├── Category.java                 # Product category entity
│   │   │               │   ├── Inventory.java                # Inventory entity
│   │   │               │   ├── Order.java                    # Order entity
│   │   │               │   ├── OrderItem.java                # Order item entity
│   │   │               │   ├── OrderStatus.java              # Order status enum
│   │   │               │   ├── Product.java                  # Product entity
│   │   │               │   ├── Role.java                     # User role enum
│   │   │               │   ├── StockMovement.java            # Stock movement entity
│   │   │               │   ├── StockMovementType.java        # Stock movement type enum
│   │   │               │   ├── Supplier.java                 # Supplier entity
│   │   │               │   ├── SupplierStatus.java           # Supplier status enum
│   │   │               │   ├── User.java                     # User entity
│   │   │               │   └── UserActivity.java             # User activity entity
│   │   │               ├── event/                            # Event-driven architecture
│   │   │               │   ├── builder/                      # Event builders
│   │   │               │   │   ├── EventBuilderFactory.java # Event builder factory
│   │   │               │   │   ├── InventoryEventBuilder.java # Inventory event builder
│   │   │               │   │   ├── OrderEventBuilder.java   # Order event builder
│   │   │               │   │   └── SupplierEventBuilder.java # Supplier event builder
│   │   │               │   ├── inventory/                    # Inventory events
│   │   │               │   │   ├── InventoryAllocatedEvent.java # Inventory allocated event
│   │   │               │   │   ├── InventoryEvent.java       # Base inventory event
│   │   │               │   │   ├── InventoryReleasedEvent.java # Inventory released event
│   │   │               │   │   ├── LowStockEvent.java        # Low stock event
│   │   │               │   │   └── StockUpdatedEvent.java    # Stock updated event
│   │   │               │   ├── listener/                     # Event listeners
│   │   │               │   │   ├── EventProcessingMetrics.java # Event processing metrics
│   │   │               │   │   ├── InventoryEventListener.java # Inventory event listener
│   │   │               │   │   ├── NotificationEventListener.java # Notification event listener
│   │   │               │   │   ├── OrderEventListener.java   # Order event listener
│   │   │               │   │   └── SupplierEventListener.java # Supplier event listener
│   │   │               │   ├── monitoring/                   # Event monitoring
│   │   │               │   │   ├── EventProcessingHealthReport.java # Event processing health report
│   │   │               │   │   └── EventProcessingMonitoringService.java # Event processing monitoring
│   │   │               │   ├── order/                        # Order events
│   │   │               │   │   ├── OrderCancelledEvent.java  # Order cancelled event
│   │   │               │   │   ├── OrderCreatedEvent.java    # Order created event
│   │   │               │   │   ├── OrderEvent.java           # Base order event
│   │   │               │   │   └── OrderStatusChangedEvent.java # Order status changed event
│   │   │               │   ├── retry/                        # Event retry mechanism
│   │   │               │   │   ├── DeadLetterQueueEntry.java # Dead letter queue entry
│   │   │               │   │   ├── DeadLetterQueueService.java # Dead letter queue service
│   │   │               │   │   ├── DeadLetterQueueStatistics.java # Dead letter queue statistics
│   │   │               │   │   ├── EventRetryContext.java    # Event retry context
│   │   │               │   │   ├── EventRetryRecord.java     # Event retry record
│   │   │               │   │   ├── EventRetryRepository.java # Event retry repository
│   │   │               │   │   ├── EventRetryService.java    # Event retry service
│   │   │               │   │   ├── RetryPolicy.java          # Retry policy
│   │   │               │   │   └── RetryStatistics.java      # Retry statistics
│   │   │               │   ├── supplier/                     # Supplier events
│   │   │               │   │   ├── SupplierCreatedEvent.java # Supplier created event
│   │   │               │   │   ├── SupplierEvent.java        # Base supplier event
│   │   │               │   │   └── SupplierStatusChangedEvent.java # Supplier status changed event
│   │   │               │   ├── BaseEvent.java                # Base event class
│   │   │               │   ├── EventMetricsCollector.java    # Event metrics collector
│   │   │               │   ├── EventPublisher.java           # Event publisher
│   │   │               │   ├── EventPublishingException.java # Event publishing exception
│   │   │               │   ├── EventVersionRegistry.java     # Event version registry
│   │   │               │   └── UnsupportedEventVersionException.java # Unsupported event version exception
│   │   │               ├── exception/                        # Exception handling
│   │   │               │   ├── BusinessException.java        # Base business exception
│   │   │               │   ├── CategoryNotFoundException.java # Category not found exception
│   │   │               │   ├── ErrorResponse.java            # Error response DTO
│   │   │               │   ├── FileStorageException.java     # File storage exception
│   │   │               │   ├── FileValidationException.java  # File validation exception
│   │   │               │   ├── GlobalExceptionHandler.java   # Global exception handler
│   │   │               │   ├── InsufficientStockException.java # Insufficient stock exception
│   │   │               │   ├── InvalidOrderStatusTransitionException.java # Invalid order status transition exception
│   │   │               │   ├── InventoryOperationException.java # Inventory operation exception
│   │   │               │   ├── OrderNotFoundException.java   # Order not found exception
│   │   │               │   ├── ProductNotFoundException.java # Product not found exception
│   │   │               │   ├── ResourceNotFoundException.java # Resource not found exception
│   │   │               │   ├── SupplierNotFoundException.java # Supplier not found exception
│   │   │               │   ├── UserAlreadyExistsException.java # User already exists exception
│   │   │               │   └── ValidationException.java      # Validation exception
│   │   │               ├── health/                           # Health checks
│   │   │               │   ├── BusinessMetricsHealthIndicator.java # Business metrics health indicator
│   │   │               │   ├── DatabaseHealthIndicator.java  # Database health indicator
│   │   │               │   └── RedisHealthIndicator.java     # Redis health indicator
│   │   │               ├── logging/                          # Logging infrastructure
│   │   │               │   ├── CorrelationIdFilter.java      # Correlation ID filter
│   │   │               │   ├── LoggingContext.java           # Logging context
│   │   │               │   ├── PerformanceLoggingAspect.java # Performance logging aspect
│   │   │               │   └── StructuredLogger.java         # Structured logger
│   │   │               ├── metrics/                          # Metrics configuration
│   │   │               │   └── CustomMetricsConfig.java      # Custom metrics configuration
│   │   │               ├── monitoring/                       # Monitoring services
│   │   │               │   ├── AlertingService.java          # Alerting service
│   │   │               │   ├── BusinessMetricMonitoringService.java # Business metric monitoring
│   │   │               │   ├── PerformanceMonitoringService.java # Performance monitoring
│   │   │               │   └── SystemResourceMonitoringService.java # System resource monitoring
│   │   │               ├── repository/                       # Data access layer
│   │   │               │   ├── AbstractBaseRepository.java   # Abstract base repository
│   │   │               │   ├── BaseRepository.java           # Base repository interface
│   │   │               │   ├── CategoryRepository.java       # Category repository
│   │   │               │   ├── ConnectionManager.java        # Database connection manager
│   │   │               │   ├── FullTextSearchService.java    # Full-text search service
│   │   │               │   ├── InventoryRepository.java      # Inventory repository
│   │   │               │   ├── OrderRepository.java          # Order repository
│   │   │               │   ├── ProductRepository.java        # Product repository
│   │   │               │   ├── StockMovementRepository.java  # Stock movement repository
│   │   │               │   ├── SupplierRepository.java       # Supplier repository
│   │   │               │   ├── UserActivityRepository.java   # User activity repository
│   │   │               │   └── UserRepository.java           # User repository
│   │   │               ├── schema/                           # Database schema definitions
│   │   │               │   ├── CategorySchema.java           # Category schema
│   │   │               │   ├── DatabaseSchemaRegistry.java   # Database schema registry
│   │   │               │   ├── InventorySchema.java          # Inventory schema
│   │   │               │   ├── OrderItemSchema.java          # Order item schema
│   │   │               │   ├── OrderSchema.java              # Order schema
│   │   │               │   ├── ProductSchema.java            # Product schema
│   │   │               │   ├── StockMovementSchema.java      # Stock movement schema
│   │   │               │   ├── SupplierSchema.java           # Supplier schema
│   │   │               │   ├── UserActivitySchema.java       # User activity schema
│   │   │               │   └── UserSchema.java               # User schema
│   │   │               ├── security/                         # Security implementation
│   │   │               │   ├── CustomUserDetailsService.java # Custom user details service
│   │   │               │   ├── JwtAccessDeniedHandler.java   # JWT access denied handler
│   │   │               │   ├── JwtAuthenticationEntryPoint.java # JWT authentication entry point
│   │   │               │   ├── JwtAuthenticationFilter.java  # JWT authentication filter
│   │   │               │   ├── JwtTokenProvider.java         # JWT token provider
│   │   │               │   ├── SecurityExpressions.java      # Security expressions
│   │   │               │   └── UserPrincipal.java            # User principal
│   │   │               └── service/                          # Business logic layer
│   │   │                   ├── analytics/                    # Analytics services
│   │   │                   │   ├── BusinessIntelligenceService.java # Business intelligence service
│   │   │                   │   ├── CustomerBehaviorAnalyzer.java # Customer behavior analyzer
│   │   │                   │   ├── InventoryTrendAnalyzer.java # Inventory trend analyzer
│   │   │                   │   ├── SalesPerformanceAnalyzer.java # Sales performance analyzer
│   │   │                   │   └── SupplierPerformanceAnalyzer.java # Supplier performance analyzer
│   │   │                   ├── report/                       # Reporting services
│   │   │                   │   ├── templates/                # Report templates
│   │   │                   │   │   ├── AbstractReportTemplate.java # Abstract report template
│   │   │                   │   │   └── InventoryAnalyticsTemplate.java # Inventory analytics template
│   │   │                   │   ├── ReportArchiveService.java # Report archive service
│   │   │                   │   ├── ReportCacheService.java   # Report cache service
│   │   │                   │   ├── ReportColumn.java         # Report column definition
│   │   │                   │   ├── ReportData.java           # Report data container
│   │   │                   │   ├── ReportDataAggregationEngine.java # Report data aggregation engine
│   │   │                   │   ├── ReportDeliveryResult.java # Report delivery result
│   │   │                   │   ├── ReportDeliveryService.java # Report delivery service
│   │   │                   │   ├── ReportExecution.java      # Report execution
│   │   │                   │   ├── ReportFormatService.java  # Report format service
│   │   │                   │   ├── ReportGenerationException.java # Report generation exception
│   │   │                   │   ├── ReportGenerationService.java # Report generation service
│   │   │                   │   ├── ReportParameter.java      # Report parameter
│   │   │                   │   ├── ReportParameterValidationException.java # Report parameter validation exception
│   │   │                   │   ├── ReportParameterValidator.java # Report parameter validator
│   │   │                   │   ├── ReportSection.java        # Report section
│   │   │                   │   ├── ReportSubscription.java   # Report subscription
│   │   │                   │   ├── ReportSubscriptionRequest.java # Report subscription request
│   │   │                   │   ├── ReportTemplate.java       # Report template
│   │   │                   │   ├── ScheduledReport.java      # Scheduled report
│   │   │                   │   ├── ScheduledReportingService.java # Scheduled reporting service
│   │   │                   │   └── ScheduledReportRequest.java # Scheduled report request
│   │   │                   ├── storage/                      # Storage services
│   │   │                   │   ├── LocalStorageBackend.java  # Local storage backend
│   │   │                   │   ├── S3StorageBackend.java     # S3 storage backend
│   │   │                   │   └── StorageBackend.java       # Storage backend interface
│   │   │                   ├── BaseScheduledTask.java        # Base scheduled task
│   │   │                   ├── CacheAlertingService.java     # Cache alerting service
│   │   │                   ├── CacheEvictionService.java     # Cache eviction service
│   │   │                   ├── CacheMonitoringService.java   # Cache monitoring service
│   │   │                   ├── CacheOptimizationTask.java    # Cache optimization task
│   │   │                   ├── CachePerformanceService.java  # Cache performance service
│   │   │                   ├── CacheService.java             # Cache service
│   │   │                   ├── CacheWarmupService.java       # Cache warmup service
│   │   │                   ├── CategoryService.java          # Category service
│   │   │                   ├── DailyInventoryReportTask.java # Daily inventory report task
│   │   │                   ├── DatabaseOptimizationTask.java # Database optimization task
│   │   │                   ├── DataCleanupTask.java          # Data cleanup task
│   │   │                   ├── EnhancedFileStorageService.java # Enhanced file storage service
│   │   │                   ├── EventDrivenCacheService.java  # Event-driven cache service
│   │   │                   ├── EventDrivenWorkflowService.java # Event-driven workflow service
│   │   │                   ├── FileAccessControlService.java # File access control service
│   │   │                   ├── FileAccessLogService.java     # File access log service
│   │   │                   ├── FileCleanupService.java       # File cleanup service
│   │   │                   ├── FileNamingService.java        # File naming service
│   │   │                   ├── FileStorageService.java       # File storage service
│   │   │                   ├── FileValidationService.java    # File validation service
│   │   │                   ├── ImageProcessingService.java   # Image processing service
│   │   │                   ├── InventoryAnalyticsTask.java   # Inventory analytics task
│   │   │                   ├── InventoryService.java         # Inventory service
│   │   │                   ├── LowStockAlertTask.java        # Low stock alert task
│   │   │                   ├── MetricsService.java           # Metrics service
│   │   │                   ├── NotificationService.java      # Notification service
│   │   │                   ├── OrderService.java             # Order service
│   │   │                   ├── ProductService.java           # Product service
│   │   │                   ├── RedisMonitoringService.java   # Redis monitoring service
│   │   │                   ├── ReorderRecommendationTask.java # Reorder recommendation task
│   │   │                   ├── ReportService.java            # Report service
│   │   │                   ├── ScheduledTaskMonitoringService.java # Scheduled task monitoring service
│   │   │                   ├── ScheduledTaskPerformanceService.java # Scheduled task performance service
│   │   │                   ├── ScheduledTaskRegistry.java    # Scheduled task registry
│   │   │                   ├── SupplierService.java          # Supplier service
│   │   │                   ├── SystemHealthMonitoringTask.java # System health monitoring task
│   │   │                   ├── UserActivityService.java      # User activity service
│   │   │                   ├── UserService.java              # User service
│   │   │                   └── VirusScanningService.java     # Virus scanning service
│   │   └── resources/                                        # Application resources
│   │       ├── db/                                          # Database resources
│   │       │   └── migration/                               # Flyway migration scripts
│   │       │       ├── V001__Create_users_table.sql        # Create users table migration
│   │       │       ├── V1__Create_users_table.sql          # Create users table migration (duplicate)
│   │       │       ├── V2__Create_categories_table.sql     # Create categories table migration
│   │       │       ├── V3__Create_suppliers_table.sql      # Create suppliers table migration
│   │       │       ├── V4__Create_products_table.sql       # Create products table migration
│   │       │       ├── V5__Create_inventory_table.sql      # Create inventory table migration
│   │       │       ├── V6__Create_stock_movements_table.sql # Create stock movements table migration
│   │       │       ├── V7__Create_orders_table.sql         # Create orders table migration
│   │       │       ├── V8__Create_order_items_table.sql    # Create order items table migration
│   │       │       ├── V9__Insert_initial_data.sql         # Insert initial data migration
│   │       │       ├── V10__Create_user_activities_table.sql # Create user activities table migration
│   │       │       ├── V11__Add_production_indexes_and_optimizations.sql # Add production indexes migration
│   │       │       └── V12__Seed_development_data.sql      # Seed development data migration
│   │       ├── application.yml                             # Main application configuration
│   │       ├── application-staging.yml                     # Staging environment configuration
│   │       └── logback-spring.xml                          # Logback logging configuration
│   └── test/                                               # Test source code
│       ├── java/                                           # Java test files
│       │   └── com/
│       │       └── ecommerce/
│       │           └── inventory/
│       │               ├── config/                         # Configuration tests
│       │               │   └── SecurityConfigTest.java    # Security configuration test
│       │               ├── dto/                            # DTO tests
│       │               │   └── validation/                 # Validation tests
│       │               │       └── ValidationIntegrationTest.java # Validation integration test
│       │               ├── entity/                         # Entity tests
│       │               │   ├── AdvancedEntityRelationshipsTest.java # Advanced entity relationships test
│       │               │   └── EntityRelationshipIntegrationTest.java # Entity relationship integration test
│       │               ├── event/                          # Event tests
│       │               │   ├── listener/                   # Event listener tests
│       │               │   │   └── EventListenerIntegrationTest.java # Event listener integration test
│       │               │   └── retry/                      # Event retry tests
│       │               │       └── EventRetryServiceTest.java # Event retry service test
│       │               ├── integration/                    # Integration tests
│       │               │   ├── BaseIntegrationTest.java   # Base integration test
│       │               │   ├── EndToEndWorkflowValidationTest.java # End-to-end workflow validation test
│       │               │   ├── EventDrivenWorkflowIntegrationTest.java # Event-driven workflow integration test
│       │               │   ├── FinalSystemIntegrationTest.java # Final system integration test
│       │               │   └── SecurityAndPerformanceValidationTest.java # Security and performance validation test
│       │               ├── security/                       # Security tests
│       │               │   └── JwtTokenProviderTest.java  # JWT token provider test
│       │               └── service/                        # Service tests
│       │                   ├── CacheIntegrationTest.java  # Cache integration test
│       │                   ├── FileAccessControlServiceTest.java # File access control service test
│       │                   ├── FileStorageServiceTest.java # File storage service test
│       │                   ├── ImageProcessingServiceTest.java # Image processing service test
│       │                   └── UserServiceTest.java       # User service test
│       └── resources/                                      # Test resources
│           └── application-test.yml                        # Test environment configuration
├── target/                                                 # Maven build output (generated)
├── Dockerfile                                              # Docker container configuration
├── mvnw.cmd                                                # Maven wrapper script (Windows)
└── pom.xml                                                 # Maven project configuration
```

## Key Architecture Features

### 1. **Layered Architecture**

- **Controller Layer**: REST API endpoints with comprehensive validation
- **Service Layer**: Business logic with transaction management
- **Repository Layer**: Data access with JPA and JOOQ integration
- **Entity Layer**: Domain models with audit capabilities

### 2. **Event-Driven Architecture**

- Comprehensive event system with builders, listeners, and retry mechanisms
- Dead letter queue for failed events
- Event versioning and compatibility management
- Monitoring and metrics for event processing

### 3. **Security Implementation**

- JWT-based authentication and authorization
- Custom security expressions and validation
- File access control and security scanning
- Comprehensive input validation and sanitization

### 4. **Caching Strategy**

- Multi-level caching with Redis and Caffeine
- Event-driven cache invalidation
- Cache performance monitoring and optimization
- Cache warmup strategies

### 5. **Monitoring & Observability**

- Custom health indicators for database, Redis, and business metrics
- Performance monitoring with structured logging
- Correlation ID tracking across requests
- Comprehensive metrics collection

### 6. **File Management**

- Secure file upload and storage with virus scanning
- Image processing capabilities
- Multiple storage backends (Local, S3)
- File access logging and control

### 7. **Reporting System**

- Template-based report generation
- Scheduled reporting with subscriptions
- Report caching and archiving
- Analytics and business intelligence services

### 8. **Database Management**

- Flyway migrations for schema versioning
- JOOQ for type-safe complex queries
- JPA for standard CRUD operations
- Connection pooling with HikariCP

### 9. **Testing Strategy**

- Comprehensive unit and integration tests
- Testcontainers for database testing
- Security and performance validation tests
- End-to-end workflow testing

### 10. **DevOps & Deployment**

- Multi-stage Docker builds with security best practices
- Production-ready configuration management
- Health checks and monitoring endpoints
- Structured logging with correlation IDs

This project represents a production-ready, enterprise-grade inventory management system with modern architectural patterns, comprehensive security, and extensive monitoring capabilities.
