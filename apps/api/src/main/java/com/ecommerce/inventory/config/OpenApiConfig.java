package com.ecommerce.inventory.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.0 configuration for comprehensive API documentation
 */
@Configuration
public class OpenApiConfig {

    @Value("${app.version:1.0.0}")
    private String appVersion;

    @Value("${app.name:E-Commerce Inventory Management System}")
    private String appName;

    @Value("${app.description:Production-ready Spring Boot E-Commerce Inventory Management System}")
    private String appDescription;

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(apiInfo())
                .servers(List.of(
                    new Server().url("http://localhost:8080" + contextPath).description("Development server"),
                    new Server().url("https://api.inventory.example.com" + contextPath).description("Production server"),
                    new Server().url("https://staging-api.inventory.example.com" + contextPath).description("Staging server")
                ))
                .addSecurityItem(new SecurityRequirement().addList("Bearer Authentication"))
                .components(new Components()
                    .addSecuritySchemes("Bearer Authentication", createAPIKeyScheme()));
    }

    private Info apiInfo() {
        return new Info()
                .title(appName)
                .description(appDescription + "\n\n" +
                    "## Features\n" +
                    "- **User Authentication & Authorization**: JWT-based authentication with role-based access control\n" +
                    "- **Product Catalog Management**: Comprehensive product management with categories and suppliers\n" +
                    "- **Advanced Inventory Management**: Real-time inventory tracking with automated alerts\n" +
                    "- **Complex Order Processing**: Full order lifecycle management with inventory allocation\n" +
                    "- **Supplier Relationship Management**: Complete supplier management with performance tracking\n" +
                    "- **Multi-Level Caching**: Redis and Caffeine caching for optimal performance\n" +
                    "- **Scheduled Background Processing**: Automated tasks for inventory monitoring and reporting\n" +
                    "- **File Management**: Secure file upload and processing with image optimization\n" +
                    "- **Comprehensive Monitoring**: Health checks, metrics, and structured logging\n" +
                    "- **Advanced Reporting**: Business intelligence and analytics with scheduled reports\n" +
                    "- **Event-Driven Architecture**: Asynchronous processing with event publishing\n\n" +
                    "## Authentication\n" +
                    "This API uses JWT (JSON Web Token) for authentication. To access protected endpoints:\n" +
                    "1. Obtain a JWT token by calling the `/api/v1/auth/login` endpoint\n" +
                    "2. Include the token in the Authorization header: `Bearer <your-jwt-token>`\n" +
                    "3. Tokens expire after 30 minutes and can be refreshed using the refresh token\n\n" +
                    "## Rate Limiting\n" +
                    "API requests are rate-limited to prevent abuse:\n" +
                    "- Authenticated users: 1000 requests per hour\n" +
                    "- Unauthenticated users: 100 requests per hour\n\n" +
                    "## Error Handling\n" +
                    "The API uses standard HTTP status codes and returns detailed error information in JSON format.\n" +
                    "All error responses include a timestamp, status code, error message, and request path.\n\n" +
                    "## Pagination\n" +
                    "List endpoints support pagination using `page` and `size` parameters:\n" +
                    "- `page`: Zero-based page number (default: 0)\n" +
                    "- `size`: Number of items per page (default: 20, max: 100)\n\n" +
                    "## Versioning\n" +
                    "The API supports versioning through URL path (`/api/v1/`) and is backward compatible.\n" +
                    "Deprecated endpoints will include deprecation warnings in response headers.")
                .version(appVersion)
                .contact(new Contact()
                    .name("API Support Team")
                    .email("api-support@inventory.example.com")
                    .url("https://inventory.example.com/support"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT"));
    }

    private SecurityScheme createAPIKeyScheme() {
        return new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("JWT token obtained from the authentication endpoint. " +
                    "Format: Bearer <token>");
    }
}