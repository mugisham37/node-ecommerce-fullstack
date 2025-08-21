# E-commerce Inventory Management API

A modern, type-safe REST API built with tRPC, TypeScript, and Node.js for comprehensive e-commerce inventory management.

## 🚀 Features

- **Type-Safe API**: Built with tRPC for end-to-end type safety
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Real-time Inventory**: Live inventory tracking and management
- **Order Management**: Complete order lifecycle management
- **Analytics & Reporting**: Business intelligence and performance metrics
- **Multi-tenant Support**: Supplier and category management
- **Caching**: Redis-based caching for optimal performance
- **Logging**: Structured logging with Winston
- **Security**: Helmet, CORS, rate limiting, and input validation

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **API Framework**: tRPC
- **Database**: PostgreSQL with Kysely query builder
- **Cache**: Redis
- **Authentication**: JWT
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, bcryptjs

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher
- npm or yarn

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**
   ```bash
   # Create database
   createdb ecommerce_inventory
   
   # Run migrations (when available)
   npm run migrate
   ```

4. **Start Redis**
   ```bash
   redis-server
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000`

## 📚 API Documentation

### Base URL
```
http://localhost:4000/api/trpc
```

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Available Routers

#### 🔐 Authentication (`auth`)
- `auth.login` - User login
- `auth.refresh` - Refresh access token
- `auth.logout` - User logout
- `auth.me` - Get current user info
- `auth.validate` - Validate token

#### 👥 Users (`users`)
- `users.create` - Create new user (Admin only)
- `users.getById` - Get user by ID
- `users.update` - Update user
- `users.getAll` - List users with pagination
- `users.search` - Search users
- `users.getByRole` - Get users by role
- `users.activate/deactivate` - Manage user status
- `users.changePassword` - Change password
- `users.getStatistics` - User statistics

#### 📦 Products (`products`)
- `products.create` - Create product
- `products.getById` - Get product by ID
- `products.update` - Update product
- `products.getAll` - List products with filters
- `products.search` - Search products
- `products.getLowStock` - Get low stock products
- `products.activate/deactivate` - Manage product status
- `products.updatePricing` - Update product pricing
- `products.bulkActivate/bulkDeactivate` - Bulk operations
- `products.getStatistics` - Product statistics

#### 📊 Inventory (`inventory`)
- `inventory.getByProduct` - Get inventory by product
- `inventory.getAll` - List inventory with filters
- `inventory.search` - Search inventory
- `inventory.getLowStock` - Get low stock alerts
- `inventory.getOutOfStock` - Get out of stock items
- `inventory.adjust` - Adjust inventory levels
- `inventory.allocate` - Allocate inventory
- `inventory.release` - Release allocated inventory
- `inventory.getMovements` - Get stock movements
- `inventory.checkAvailability` - Check stock availability
- `inventory.getStatistics` - Inventory statistics

#### 🛒 Orders (`orders`)
- `orders.create` - Create new order
- `orders.getById` - Get order by ID
- `orders.getByNumber` - Get order by number
- `orders.updateStatus` - Update order status
- `orders.getAll` - List orders with filters
- `orders.search` - Search orders
- `orders.getByStatus` - Get orders by status
- `orders.getPending` - Get pending orders
- `orders.cancel` - Cancel order
- `orders.getStatistics` - Order statistics

#### 🏢 Suppliers (`suppliers`)
- `suppliers.create` - Create supplier
- `suppliers.getById` - Get supplier by ID
- `suppliers.update` - Update supplier
- `suppliers.getAll` - List suppliers
- `suppliers.search` - Search suppliers
- `suppliers.activate/deactivate` - Manage supplier status
- `suppliers.getPerformance` - Get supplier performance
- `suppliers.getStatistics` - Supplier statistics
- `suppliers.getProducts` - Get products by supplier

#### 🏷️ Categories (`categories`)
- `categories.create` - Create category
- `categories.getById` - Get category by ID
- `categories.update` - Update category
- `categories.getAll` - List categories
- `categories.getRoot` - Get root categories
- `categories.getHierarchy` - Get category hierarchy
- `categories.getChildren` - Get child categories
- `categories.getAncestors` - Get category ancestors
- `categories.search` - Search categories
- `categories.move` - Move category
- `categories.updateSortOrder` - Update sort order
- `categories.delete` - Delete category
- `categories.getStatistics` - Category statistics

#### 📈 Analytics (`analytics`)
- `analytics.getDashboard` - Get dashboard metrics
- `analytics.getSalesAnalytics` - Get sales analytics
- `analytics.getInventoryAnalytics` - Get inventory analytics
- `analytics.getTopProducts` - Get top selling products
- `analytics.getTopCustomers` - Get top customers
- `analytics.getTopCategories` - Get top categories
- `analytics.generateBusinessReport` - Generate business report
- `analytics.getProfitLossAnalytics` - Get P&L analytics

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # Run TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Project Structure

```
apps/api/
├── src/
│   ├── database/           # Database connection and schema
│   ├── services/           # Business services
│   │   └── cache/         # Cache service
│   ├── trpc/              # tRPC configuration
│   │   ├── routers/       # API route handlers
│   │   ├── context.ts     # Request context
│   │   ├── middleware.ts  # tRPC middleware
│   │   ├── server.ts      # Server setup
│   │   └── trpc.ts        # tRPC base config
│   ├── utils/             # Utility functions
│   └── index.ts           # Application entry point
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🔒 Security

- **Authentication**: JWT tokens with configurable expiration
- **Authorization**: Role-based access control (ADMIN, MANAGER, EMPLOYEE, USER)
- **Input Validation**: Zod schema validation for all inputs
- **Rate Limiting**: Configurable rate limiting per endpoint
- **Security Headers**: Helmet.js for security headers
- **Password Hashing**: bcrypt with configurable rounds
- **CORS**: Configurable CORS policies

## 📊 Monitoring & Logging

- **Structured Logging**: Winston with multiple transports
- **Health Checks**: Built-in health check endpoints
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Monitoring**: Request timing and metrics

## 🚀 Deployment

### Environment Variables

Make sure to set all required environment variables in production:

- `NODE_ENV=production`
- `JWT_SECRET` - Strong secret key
- `DB_*` - Database connection details
- `REDIS_*` - Redis connection details
- `ALLOWED_ORIGINS` - Allowed CORS origins

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API examples

---

Built with ❤️ using tRPC, TypeScript, and Node.js