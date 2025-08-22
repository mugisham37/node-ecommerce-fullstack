import swaggerJsdoc from "swagger-jsdoc";

// Get version from package.json
const getVersion = (): string => {
  try {
    const packageJson = require("../../../../package.json");
    return packageJson.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
};

// Swagger definition for tRPC API
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "E-Commerce Platform API",
    version: getVersion(),
    description: "Comprehensive API documentation for the E-Commerce Platform built with tRPC",
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
    contact: {
      name: "API Support",
      url: "https://example.com/support",
      email: "support@example.com",
    },
  },
  servers: [
    {
      url: "/api/trpc",
      description: "tRPC API endpoint",
    },
    {
      url: "/api/v1",
      description: "REST API v1 (legacy endpoints)",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "auth-token",
      },
    },
    schemas: {
      // User schemas
      User: {
        type: "object",
        required: ["email", "firstName", "lastName"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "User ID",
            example: "550e8400-e29b-41d4-a716-446655440000",
          },
          email: {
            type: "string",
            format: "email",
            description: "User email",
            example: "user@example.com",
          },
          firstName: {
            type: "string",
            description: "User first name",
            example: "John",
          },
          lastName: {
            type: "string",
            description: "User last name",
            example: "Doe",
          },
          role: {
            type: "string",
            enum: ["customer", "vendor", "admin", "superadmin"],
            description: "User role",
            example: "customer",
          },
          isActive: {
            type: "boolean",
            description: "User active status",
            example: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
            description: "User creation date",
            example: "2021-06-23T10:00:00.000Z",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
            description: "User last update date",
            example: "2021-06-23T10:00:00.000Z",
          },
        },
      },

      // Product schemas
      Product: {
        type: "object",
        required: ["name", "description", "price", "categoryId"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Product ID",
          },
          name: {
            type: "string",
            description: "Product name",
            example: "Smartphone",
          },
          description: {
            type: "string",
            description: "Product description",
            example: "A high-end smartphone with great features",
          },
          price: {
            type: "number",
            format: "decimal",
            description: "Product price",
            example: 999.99,
          },
          compareAtPrice: {
            type: "number",
            format: "decimal",
            description: "Product compare at price",
            example: 1099.99,
          },
          stock: {
            type: "integer",
            description: "Product stock quantity",
            example: 100,
          },
          categoryId: {
            type: "string",
            format: "uuid",
            description: "Product category ID",
          },
          vendorId: {
            type: "string",
            format: "uuid",
            description: "Product vendor ID",
          },
          images: {
            type: "array",
            items: {
              type: "string",
              format: "uri",
            },
            description: "Product images",
            example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
          },
          isFeatured: {
            type: "boolean",
            description: "Product featured status",
            example: true,
          },
          isActive: {
            type: "boolean",
            description: "Product active status",
            example: true,
          },
          ratings: {
            type: "object",
            properties: {
              average: {
                type: "number",
                description: "Average rating",
                example: 4.5,
              },
              count: {
                type: "integer",
                description: "Number of ratings",
                example: 10,
              },
            },
          },
        },
      },

      // Order schemas
      Order: {
        type: "object",
        required: ["userId", "items", "shippingAddress", "paymentMethod"],
        properties: {
          id: {
            type: "string",
            format: "uuid",
            description: "Order ID",
          },
          userId: {
            type: "string",
            format: "uuid",
            description: "User ID",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: {
                  type: "string",
                  format: "uuid",
                },
                quantity: {
                  type: "integer",
                  minimum: 1,
                },
                price: {
                  type: "number",
                  format: "decimal",
                },
              },
            },
          },
          status: {
            type: "string",
            enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
            description: "Order status",
            example: "processing",
          },
          totalAmount: {
            type: "number",
            format: "decimal",
            description: "Total order amount",
            example: 1109.99,
          },
          shippingAddress: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              postalCode: { type: "string" },
              country: { type: "string" },
            },
          },
          paymentMethod: {
            type: "string",
            enum: ["stripe", "paypal", "bank_transfer"],
            description: "Payment method",
            example: "stripe",
          },
        },
      },

      // Loyalty Program schemas
      LoyaltyProgram: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "VIP Program" },
          description: { type: "string" },
          pointsPerDollar: { type: "number", format: "decimal", example: 1.5 },
          isActive: { type: "boolean", example: true },
        },
      },

      // A/B Test schemas
      ABTest: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Homepage Banner Test" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: ["draft", "running", "paused", "completed"],
            example: "running",
          },
          variants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                weight: { type: "number" },
                config: { type: "object" },
              },
            },
          },
        },
      },

      // Analytics schemas
      AnalyticsDashboard: {
        type: "object",
        properties: {
          salesSummary: {
            type: "object",
            properties: {
              totalSales: { type: "number", format: "decimal" },
              orderCount: { type: "integer" },
              averageOrderValue: { type: "number", format: "decimal" },
            },
          },
          topProducts: {
            type: "array",
            items: { $ref: "#/components/schemas/Product" },
          },
          salesTrend: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", format: "date" },
                sales: { type: "number", format: "decimal" },
                orders: { type: "integer" },
              },
            },
          },
        },
      },

      // Error schemas
      Error: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Error code",
            example: "VALIDATION_ERROR",
          },
          message: {
            type: "string",
            description: "Error message",
            example: "Validation failed",
          },
          details: {
            type: "object",
            description: "Error details",
          },
          requestId: {
            type: "string",
            description: "Request ID for tracking",
            example: "req_123456789",
          },
        },
      },

      // Pagination schema
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 100 },
          totalPages: { type: "integer", example: 5 },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Access token is missing or invalid",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      ServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
  security: [
    { bearerAuth: [] },
    { cookieAuth: [] },
  ],
  tags: [
    { name: "Authentication", description: "Authentication and authorization endpoints" },
    { name: "Users", description: "User management endpoints" },
    { name: "Products", description: "Product management endpoints" },
    { name: "Categories", description: "Category management endpoints" },
    { name: "Orders", description: "Order management endpoints" },
    { name: "Reviews", description: "Review management endpoints" },
    { name: "Cart", description: "Shopping cart endpoints" },
    { name: "Analytics", description: "Analytics and reporting endpoints" },
    { name: "Loyalty", description: "Loyalty program endpoints" },
    { name: "A/B Testing", description: "A/B testing endpoints" },
    { name: "Search", description: "Search and recommendation endpoints" },
    { name: "Vendors", description: "Vendor management endpoints" },
    { name: "Export", description: "Data export endpoints" },
    { name: "Admin", description: "Administrative endpoints" },
    { name: "Webhooks", description: "Webhook endpoints" },
    { name: "Settings", description: "Application settings endpoints" },
  ],
};

// Options for swagger-jsdoc
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    "./src/trpc/routers/*.ts",
    "./src/controllers/*.ts",
    "./src/routes/*.ts",
    "./src/types/*.ts",
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;