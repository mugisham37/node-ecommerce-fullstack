# Authentication and Security Layer

This directory contains the complete authentication and security implementation for the Node.js API, converted from the original Spring Boot security configuration.

## Overview

The authentication system provides:
- JWT-based authentication with access and refresh tokens
- Role-based access control (RBAC)
- Password hashing and validation
- Session management
- Request authentication middleware
- Permission-based authorization

## Components

### JwtService
Handles JWT token generation, validation, and parsing. Supports both access and refresh tokens with different expiration times.

```typescript
const jwtService = new JwtService({
  secret: 'your-secret-key',
  accessTokenExpiration: 3600, // 1 hour
  refreshTokenExpiration: 604800, // 7 days
});

const accessToken = jwtService.generateAccessToken(userPrincipal);
const isValid = jwtService.validateToken(token);
```

### UserDetailsService
Loads user information from the database for authentication and authorization.

```typescript
const userDetailsService = new UserDetailsService(userRepository);
const user = await userDetailsService.loadUserByUsername('user@example.com');
```

### PasswordService
Handles password hashing, verification, and strength validation using bcrypt.

```typescript
const passwordService = new PasswordService(12); // 12 salt rounds
const hashedPassword = await passwordService.hashPassword('plainPassword');
const isValid = await passwordService.verifyPassword('plainPassword', hashedPassword);
```

### AuthMiddleware
Express middleware for JWT authentication and authorization.

```typescript
const authMiddleware = new AuthMiddleware({
  jwtService,
  userDetailsService,
  publicPaths: ['/api/v1/auth', '/api/v1/health'],
  skipAuthPaths: ['/api/v1/auth/'],
});

// Use in Express app
app.use(authMiddleware.authenticate);

// Require authentication
app.get('/protected', authMiddleware.requireAuth, handler);

// Require specific role
app.get('/admin', authMiddleware.requireRole('ADMIN'), handler);
```

### PermissionService
Manages role-based permissions and authorization logic.

```typescript
const permissionService = new PermissionService();
const canRead = permissionService.hasPermission(user, Resource.PRODUCT, Action.READ);
const isAdmin = permissionService.isAdmin(user);
```

### SessionService
Manages user sessions with support for different storage backends.

```typescript
const sessionService = new SessionService(new MemorySessionStorage());
const sessionId = await sessionService.createSession(user, ipAddress, userAgent);
const session = await sessionService.getSession(sessionId);
```

### SecurityConfig
Configuration factory for setting up all security services.

```typescript
const config = SecurityConfigFactory.createProductionConfig();
const services = SecurityConfigFactory.createSecurityServices(config, userRepository);
```

## Role-Based Access Control

The system supports four user roles with different permission levels:

### ADMIN
- Full access to all resources and actions
- Can manage users, view actuator endpoints
- Complete system administration

### MANAGER
- User management (read/list)
- Full product, category, supplier management
- Full inventory and order management
- Report access
- File management

### EMPLOYEE
- Limited user access (own profile only)
- Product management (create, read, update, list)
- Category access (read, list)
- Full inventory and order management
- Limited file access

### USER
- Own profile management only
- Read-only access to products and categories

## Security Features

### JWT Tokens
- Separate access and refresh tokens
- Configurable expiration times
- Token type validation
- Secure token generation and validation

### Password Security
- bcrypt hashing with configurable salt rounds
- Password strength validation
- Secure password generation
- Hash upgrade detection

### Session Management
- Multiple storage backends (memory, Redis)
- Session expiration and cleanup
- Activity tracking
- Secure session ID generation

### CORS Configuration
- Configurable allowed origins, methods, headers
- Credential support
- Preflight caching

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# Password Configuration
BCRYPT_SALT_ROUNDS=12

# Session Configuration
SESSION_TTL_MS=3600000
SESSION_STORAGE=memory

# Redis Configuration (if using Redis sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Usage Example

```typescript
import express from 'express';
import { SecurityConfigFactory, defaultSecurityConfig } from './auth';

const app = express();

// Create security services
const config = process.env.NODE_ENV === 'production' 
  ? SecurityConfigFactory.createProductionConfig()
  : SecurityConfigFactory.createDevelopmentConfig();

const services = SecurityConfigFactory.createSecurityServices(config, userRepository);

// Apply CORS
app.use(cors(SecurityConfigFactory.createCorsConfig(config)));

// Apply authentication middleware
app.use(services.authMiddleware.authenticate);

// Protected routes
app.get('/api/v1/products', 
  services.authMiddleware.requireAnyRole(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  productController.getProducts
);

app.post('/api/v1/products',
  services.authMiddleware.requireAnyRole(['ADMIN', 'MANAGER']),
  productController.createProduct
);
```

## Migration from Spring Boot

This implementation maintains compatibility with the original Spring Boot security configuration:

- Same role hierarchy (ADMIN > MANAGER > EMPLOYEE > USER)
- Same endpoint protection patterns
- Same JWT token structure and validation
- Same password hashing (bcrypt with 12 rounds)
- Same CORS configuration options

## Testing

The authentication system includes comprehensive test coverage:

```typescript
// Example test
describe('JwtService', () => {
  it('should generate and validate access tokens', async () => {
    const token = jwtService.generateAccessToken(userPrincipal);
    expect(jwtService.validateToken(token)).toBe(true);
    expect(jwtService.isAccessToken(token)).toBe(true);
  });
});
```

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret in production
2. **Token Expiration**: Set appropriate expiration times for your use case
3. **Password Hashing**: Use at least 12 salt rounds for bcrypt
4. **CORS**: Configure specific allowed origins in production
5. **Session Storage**: Use Redis for production session storage
6. **HTTPS**: Always use HTTPS in production
7. **Rate Limiting**: Implement rate limiting for authentication endpoints