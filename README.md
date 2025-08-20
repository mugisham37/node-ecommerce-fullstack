# Full-Stack E-Commerce Monolith

A modern, production-ready full-stack e-commerce inventory management system built with TypeScript, featuring a unified monorepo architecture with type-safe communication between frontend and backend.

## 🏗️ Architecture

This project follows a monolith architecture with the following structure:

```
fullstack-ecommerce-monolith/
├── apps/                    # Applications
│   ├── web/                # Next.js 14 Web Application
│   ├── mobile/             # React Native Mobile App
│   ├── api/                # Node.js tRPC API Server
│   └── admin/              # Admin Dashboard
├── packages/               # Shared Packages
│   ├── shared/             # Shared types and utilities
│   ├── ui/                 # UI Component Library
│   ├── api-client/         # API Client Library
│   ├── database/           # Database Layer (Drizzle ORM)
│   ├── cache/              # Cache Layer (Redis)
│   ├── config/             # Configuration Management
│   └── validation/         # Validation Schemas (Zod)
├── infrastructure/         # Infrastructure as Code
├── tools/                  # Development tools
├── docs/                   # Documentation
└── scripts/                # Build and deployment scripts
```

## 🚀 Tech Stack

### Frontend
- **Web**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Mobile**: React Native with TypeScript
- **UI**: Shared component library with consistent design system

### Backend
- **API**: Node.js with tRPC for type-safe APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for caching and session management
- **Authentication**: JWT with secure session management

### DevOps & Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana, and custom health checks

### Development Experience
- **Monorepo**: Turborepo for build orchestration
- **Type Safety**: End-to-end TypeScript with shared types
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
- **Testing**: Jest, Playwright for E2E testing

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, for containerized development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fullstack-ecommerce-monolith
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development environment**
   ```bash
   # Start all services
   npm run dev:all
   
   # Or start individual services
   npm run dev --workspace=apps/web    # Web app on :3000
   npm run dev --workspace=apps/api    # API server on :3001
   npm run dev --workspace=apps/mobile # Mobile app on :8081
   ```

### Using PowerShell Scripts

For Windows users, we provide PowerShell scripts for enhanced development experience:

```powershell
# Build all applications and packages
./scripts/build-all.ps1

# Start all development servers
./scripts/dev-all.ps1

# Run all tests
./scripts/test-all.ps1

# Run specific tests
./scripts/test-all.ps1 -Type unit
./scripts/test-all.ps1 -Type integration
./scripts/test-all.ps1 -Type e2e
```

## 📦 Package Scripts

### Root Level Commands

```bash
# Development
npm run dev              # Start all apps in development mode
npm run build            # Build all apps and packages
npm run test             # Run all tests
npm run lint             # Lint all code
npm run format           # Format all code with Prettier

# Type checking
npm run type-check       # Run TypeScript type checking

# Cleaning
npm run clean            # Clean all build artifacts
```

### Workspace Commands

```bash
# Work with specific packages
npm run build --workspace=packages/shared
npm run test --workspace=apps/api
npm run dev --workspace=apps/web
```

## 🧪 Testing

The project includes comprehensive testing at multiple levels:

- **Unit Tests**: Jest for individual components and functions
- **Integration Tests**: API and database integration testing
- **E2E Tests**: Playwright for full user journey testing

```bash
# Run all tests
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Development

### Code Quality

The project enforces code quality through:

- **ESLint**: Linting with TypeScript, React, and accessibility rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks
- **TypeScript**: Strict type checking across all packages

### Database Management

```bash
# Generate database schema
npm run db:generate --workspace=packages/database

# Run migrations
npm run db:migrate --workspace=packages/database

# Seed development data
npm run db:seed --workspace=packages/database
```

### Adding New Packages

1. Create the package directory in `packages/`
2. Add `package.json` with proper workspace configuration
3. Update root `tsconfig.json` paths
4. Add to Turborepo pipeline if needed

## 🚢 Deployment

### Docker

```bash
# Build all Docker images
docker-compose build

# Start production environment
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Key environment variables to configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# AWS (for file storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Application
NODE_ENV=production
API_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

## 📚 Documentation

- [API Documentation](./docs/api/README.md)
- [Database Schema](./docs/database/README.md)
- [Deployment Guide](./docs/deployment/README.md)
- [Contributing Guide](./docs/contributing/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [documentation](./docs/)
2. Search existing [issues](https://github.com/your-org/repo/issues)
3. Create a new issue with detailed information

## 🎯 Roadmap

- [ ] Complete API transformation from Spring Boot
- [ ] Implement comprehensive test coverage
- [ ] Add real-time features with WebSockets
- [ ] Implement advanced caching strategies
- [ ] Add comprehensive monitoring and alerting
- [ ] Mobile app development
- [ ] Performance optimization
- [ ] Security enhancements