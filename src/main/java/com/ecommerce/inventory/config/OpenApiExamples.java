package com.ecommerce.inventory.config;

import io.swagger.v3.oas.models.examples.Example;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI examples for request and response documentation
 */
@Configuration
public class OpenApiExamples {

    @Bean
    public Example loginRequestExample() {
        return new Example()
                .summary("User Login Request")
                .description("Example request for user authentication")
                .value("""
                    {
                        "email": "admin@inventory.com",
                        "password": "SecurePass123!"
                    }
                    """);
    }

    @Bean
    public Example loginResponseExample() {
        return new Example()
                .summary("Successful Login Response")
                .description("JWT tokens returned after successful authentication")
                .value("""
                    {
                        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "tokenType": "Bearer",
                        "expiresIn": 1800,
                        "user": {
                            "id": 1,
                            "email": "admin@inventory.com",
                            "firstName": "Admin",
                            "lastName": "User",
                            "role": "ADMIN",
                            "active": true
                        }
                    }
                    """);
    }

    @Bean
    public Example productCreateRequestExample() {
        return new Example()
                .summary("Create Product Request")
                .description("Example request for creating a new product")
                .value("""
                    {
                        "name": "Wireless Bluetooth Headphones",
                        "sku": "ELEC-HEAD-WBH001",
                        "description": "High-quality wireless Bluetooth headphones with noise cancellation",
                        "categoryId": 1,
                        "supplierId": 1,
                        "costPrice": 45.99,
                        "sellingPrice": 89.99,
                        "reorderLevel": 10,
                        "reorderQuantity": 50
                    }
                    """);
    }

    @Bean
    public Example productResponseExample() {
        return new Example()
                .summary("Product Response")
                .description("Example product information response")
                .value("""
                    {
                        "id": 1,
                        "name": "Wireless Bluetooth Headphones",
                        "slug": "wireless-bluetooth-headphones",
                        "sku": "ELEC-HEAD-WBH001",
                        "description": "High-quality wireless Bluetooth headphones with noise cancellation",
                        "categoryId": 1,
                        "categoryName": "Electronics",
                        "supplierId": 1,
                        "supplierName": "TechSupply Co.",
                        "costPrice": 45.99,
                        "sellingPrice": 89.99,
                        "profitMargin": 48.89,
                        "reorderLevel": 10,
                        "reorderQuantity": 50,
                        "active": true,
                        "createdAt": "2024-01-15T10:30:00",
                        "updatedAt": "2024-01-15T10:30:00"
                    }
                    """);
    }

    @Bean
    public Example orderCreateRequestExample() {
        return new Example()
                .summary("Create Order Request")
                .description("Example request for creating a new order")
                .value("""
                    {
                        "customerName": "John Smith",
                        "customerEmail": "john.smith@example.com",
                        "customerPhone": "+1-555-123-4567",
                        "shippingAddress": "123 Main Street, Anytown, ST 12345, USA",
                        "billingAddress": "123 Main Street, Anytown, ST 12345, USA",
                        "taxAmount": 7.20,
                        "shippingCost": 9.99,
                        "orderItems": [
                            {
                                "productId": 1,
                                "quantity": 2,
                                "unitPrice": 89.99,
                                "notes": "Gift wrap requested"
                            },
                            {
                                "productId": 2,
                                "quantity": 1,
                                "unitPrice": 29.99
                            }
                        ],
                        "notes": "Customer requested expedited shipping"
                    }
                    """);
    }

    @Bean
    public Example orderResponseExample() {
        return new Example()
                .summary("Order Response")
                .description("Example order information response")
                .value("""
                    {
                        "id": 1,
                        "orderNumber": "ORD-20240115-ABC12345",
                        "customerName": "John Smith",
                        "customerEmail": "john.smith@example.com",
                        "customerPhone": "+1-555-123-4567",
                        "shippingAddress": "123 Main Street, Anytown, ST 12345, USA",
                        "billingAddress": "123 Main Street, Anytown, ST 12345, USA",
                        "status": "PENDING",
                        "subtotal": 209.97,
                        "taxAmount": 7.20,
                        "shippingCost": 9.99,
                        "totalAmount": 227.16,
                        "totalQuantity": 3,
                        "itemCount": 2,
                        "canBeCancelled": true,
                        "canBeModified": true,
                        "isActive": true,
                        "createdByName": "Admin User",
                        "createdById": 1,
                        "orderItems": [
                            {
                                "id": 1,
                                "productId": 1,
                                "productName": "Wireless Bluetooth Headphones",
                                "productSku": "ELEC-HEAD-WBH001",
                                "quantity": 2,
                                "unitPrice": 89.99,
                                "totalPrice": 179.98,
                                "notes": "Gift wrap requested"
                            },
                            {
                                "id": 2,
                                "productId": 2,
                                "productName": "USB-C Cable",
                                "productSku": "ELEC-CABL-USC001",
                                "quantity": 1,
                                "unitPrice": 29.99,
                                "totalPrice": 29.99
                            }
                        ],
                        "createdAt": "2024-01-15T14:30:00",
                        "updatedAt": "2024-01-15T14:30:00"
                    }
                    """);
    }

    @Bean
    public Example inventoryResponseExample() {
        return new Example()
                .summary("Inventory Response")
                .description("Example inventory information response")
                .value("""
                    {
                        "id": 1,
                        "productId": 1,
                        "productName": "Wireless Bluetooth Headphones",
                        "productSku": "ELEC-HEAD-WBH001",
                        "warehouseLocation": "MAIN",
                        "quantityOnHand": 45,
                        "quantityAllocated": 5,
                        "quantityAvailable": 40,
                        "reorderLevel": 10,
                        "lowStock": false,
                        "lastCountedAt": "2024-01-15T09:00:00",
                        "updatedAt": "2024-01-15T14:30:00"
                    }
                    """);
    }

    @Bean
    public Example errorResponseExample() {
        return new Example()
                .summary("Error Response")
                .description("Example error response format")
                .value("""
                    {
                        "timestamp": "2024-01-15T14:30:00",
                        "status": 400,
                        "error": "Bad Request",
                        "message": "Validation failed for request",
                        "path": "/api/v1/products",
                        "details": {
                            "name": "Product name is required",
                            "costPrice": "Cost price must be greater than 0"
                        }
                    }
                    """);
    }

    @Bean
    public Example pagedResponseExample() {
        return new Example()
                .summary("Paged Response")
                .description("Example paginated response format")
                .value("""
                    {
                        "content": [
                            {
                                "id": 1,
                                "name": "Wireless Bluetooth Headphones",
                                "sku": "ELEC-HEAD-WBH001",
                                "sellingPrice": 89.99,
                                "active": true
                            }
                        ],
                        "pageable": {
                            "sort": {
                                "sorted": true,
                                "unsorted": false
                            },
                            "pageNumber": 0,
                            "pageSize": 20,
                            "offset": 0,
                            "paged": true,
                            "unpaged": false
                        },
                        "totalElements": 1,
                        "totalPages": 1,
                        "last": true,
                        "first": true,
                        "numberOfElements": 1,
                        "size": 20,
                        "number": 0,
                        "sort": {
                            "sorted": true,
                            "unsorted": false
                        }
                    }
                    """);
    }
}