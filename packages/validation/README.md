# @ecommerce/validation

Comprehensive validation schemas and utilities using Zod for the e-commerce monolith application.

## Features

- **Zod Schemas**: Type-safe validation schemas for all entities
- **Custom Validators**: Business-specific validation logic
- **Utility Functions**: Helper functions for validation workflows
- **TypeScript Support**: Full type inference and safety
- **Error Integration**: Seamless integration with shared error classes

## Installation

```bash
npm install @ecommerce/validation
```

## Usage

### Basic Validation

```typescript
import { 
  EmailSchema, 
  ProductCreateSchema, 
  OrderCreateSchema 
} from '@ecommerce/validation';

// Validate email
const email = EmailSchema.parse('user@example.com');

// Validate product creation
const productData = ProductCreateSchema.parse({
  name: 'My Product',
  sku: 'PROD-001',
  price: 99.99,
  categoryId: 'cat-123',
  supplierId: 'sup-456'
});

// Validate order creation
const orderData = OrderCreateSchema.parse({
  customerId: 'user-123',
  items: [
    {
      productId: 'prod-123',
      quantity: 2,
      unitPrice: 49.99
    }
  ],
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '12345',
    country: 'USA'
  }
});
```

### Validation Utilities

```typescript
import { 
  validateOrThrow, 
  validateSafely, 
  sanitizeInput 
} from '@ecommerce/validation/utils';

// Validate and throw on error
try {
  const validData = validateOrThrow(ProductCreateSchema, rawData);
} catch (error) {
  // Handle ValidationError
}

// Safe validation with result object
const result = validateSafely(ProductCreateSchema, rawData);
if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}

// Sanitize input data
const sanitized = sanitizeInput(userInput);
```

### Custom Validators

```typescript
import { 
  emailValidator, 
  phoneValidator, 
  priceValidator 
} from '@ecommerce/validation/validators';

// Email validation with options
const EmailWithEmpty = emailValidator(true); // Allow empty
const StrictEmail = emailValidator(false); // Required

// Phone validation
const PhoneSchema = phoneValidator(false);
const OptionalPhoneSchema = phoneValidator(true);

// Price validation with business rules
const ProductPriceSchema = priceValidator({
  min: 0.01,
  max: 99999.99,
  allowZero: false,
  maxDecimalPlaces: 2
});
```

## Available Schemas

### User Schemas
- `UserRegistrationSchema` - User registration validation
- `UserLoginSchema` - Login credentials validation
- `UserProfileUpdateSchema` - Profile update validation
- `PasswordChangeSchema` - Password change validation
- `AdminUserCreateSchema` - Admin user creation

### Product Schemas
- `ProductCreateSchema` - Product creation validation
- `ProductUpdateSchema` - Product update validation
- `ProductQuerySchema` - Product filtering/search
- `ProductCategorySchema` - Category validation
- `ProductVariantSchema` - Product variant validation

### Order Schemas
- `OrderCreateSchema` - Order creation validation
- `OrderUpdateSchema` - Order update validation
- `OrderItemSchema` - Order item validation
- `ShippingAddressSchema` - Shipping address validation
- `OrderCancellationSchema` - Order cancellation

### Common Schemas
- `EmailSchema` - Email validation
- `PhoneSchema` - Phone number validation
- `PriceSchema` - Price validation
- `UUIDSchema` - UUID validation
- `SKUSchema` - Stock keeping unit validation
- `SlugSchema` - URL slug validation

## Validation Rules

### Email Validation
- RFC compliant email format
- Maximum length: 255 characters
- Local part max: 64 characters
- Domain part max: 253 characters
- No consecutive dots
- No leading/trailing dots

### Phone Validation
- International format support
- US format support
- Length: 10-15 digits
- Common formatting characters allowed

### Price Validation
- Positive numbers only
- Configurable decimal places (default: 2)
- Configurable min/max values
- Zero value handling
- Currency support

### Password Validation
- Minimum 8 characters
- Maximum 128 characters
- Must contain: lowercase, uppercase, number, special character
- Common password patterns rejected

## Integration with Error Handling

```typescript
import { ValidationError } from '@ecommerce/shared/errors';
import { validateOrThrow } from '@ecommerce/validation/utils';

try {
  const validData = validateOrThrow(ProductCreateSchema, rawData);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle field-specific validation errors
    const fieldErrors = error.getValidationErrors();
    console.log('Field errors:', fieldErrors);
  }
}
```

## TypeScript Integration

All schemas provide full TypeScript type inference:

```typescript
import { ProductCreate, UserRegistration } from '@ecommerce/validation';

// Types are automatically inferred from schemas
const product: ProductCreate = {
  name: 'My Product',
  sku: 'PROD-001',
  price: 99.99,
  categoryId: 'cat-123',
  supplierId: 'sup-456'
};

const user: UserRegistration = {
  email: 'user@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  acceptTerms: true
};
```

## License

MIT