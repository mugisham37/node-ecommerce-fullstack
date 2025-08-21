# @ecommerce/shared

Shared utilities, error classes, components, and services for the e-commerce monolith application.

## Features

- **Error Handling**: Comprehensive error classes with context and categorization
- **React Components**: Error boundaries and error display components
- **Services**: Error reporting and tracking service
- **Utilities**: Common utility functions for dates, strings, numbers, and objects
- **Types**: Shared TypeScript types and interfaces

## Installation

```bash
npm install @ecommerce/shared
```

## Usage

### Error Handling

```typescript
import { ValidationError, NotFoundError, BusinessError } from '@ecommerce/shared/errors';

// Validation error with field-specific messages
const validationError = ValidationError.forFields({
  email: 'Invalid email format',
  password: 'Password too weak'
});

// Not found error
const notFoundError = new NotFoundError('Product', 'product-123');

// Business logic error
const businessError = new InsufficientStockError('product-123', 10, 5);
```

### React Components

```typescript
import { ErrorBoundary, ErrorDisplay } from '@ecommerce/shared/components';

// Wrap your app with error boundary
function App() {
  return (
    <ErrorBoundary>
      <YourAppContent />
    </ErrorBoundary>
  );
}

// Display specific errors
function MyComponent() {
  const [error, setError] = useState(null);
  
  return (
    <div>
      <ErrorDisplay 
        error={error} 
        onRetry={() => setError(null)}
        onDismiss={() => setError(null)}
      />
    </div>
  );
}
```

### Error Reporting Service

```typescript
import { initializeErrorReporting } from '@ecommerce/shared/services';

// Initialize the service
const errorReporter = initializeErrorReporting({
  apiEndpoint: 'https://api.example.com/errors',
  environment: 'production',
  enableConsoleLogging: true,
  enableRemoteReporting: true,
  maxReportsPerSession: 50,
  reportingThrottle: 1000,
});

// Report errors
errorReporter.reportError(new Error('Something went wrong'));
errorReporter.reportApiError(error, request, response);
```

### Utilities

```typescript
import { 
  formatDate, 
  formatCurrency, 
  slugify, 
  deepClone 
} from '@ecommerce/shared/utils';

// Date formatting
const formatted = formatDate(new Date(), 'long');

// Currency formatting
const price = formatCurrency(99.99, 'USD');

// String utilities
const slug = slugify('My Product Name'); // 'my-product-name'

// Object utilities
const cloned = deepClone(originalObject);
```

## API Reference

### Error Classes

- `AppError` - Base error class with context and categorization
- `ValidationError` - For validation failures with field-specific errors
- `NotFoundError` - For resource not found errors
- `BusinessError` - For business logic violations
- `AuthenticationError` - For authentication failures
- `AuthorizationError` - For authorization failures
- `FileStorageError` - For file storage operations
- `InventoryError` - For inventory-specific operations

### Components

- `ErrorBoundary` - React error boundary component
- `ErrorDisplay` - Generic error display component
- `ValidationErrorList` - Display validation errors
- `InlineError` - Inline error messages for forms
- `ErrorToast` - Toast notification for errors
- `LoadingError` - Error display for failed data loading

### Services

- `ErrorReportingService` - Centralized error reporting and tracking

### Utilities

- **Date Utils**: `formatDate`, `getRelativeTime`, `isToday`, `addDays`
- **String Utils**: `capitalize`, `slugify`, `truncate`, `maskString`
- **Number Utils**: `formatCurrency`, `formatPercentage`, `roundTo`
- **Object Utils**: `deepClone`, `deepMerge`, `pick`, `omit`, `flatten`

## License

MIT