# File Storage Services

This directory contains the migrated file storage services from the Java Spring Boot implementation to TypeScript/Node.js. The services provide comprehensive file upload, processing, validation, and cleanup functionality.

## Architecture Overview

The storage system is built with a modular architecture that supports multiple storage backends and provides comprehensive file processing capabilities:

```
FileStorageService (Main orchestrator)
├── StorageBackend (Interface)
│   ├── LocalStorageService (Local filesystem)
│   └── S3StorageService (AWS S3 compatible)
├── ImageProcessingService (Sharp-based image processing)
├── ValidationService (File validation and security)
└── CleanupService (File cleanup and maintenance)
```

## Services

### FileStorageService
Main orchestrator service that coordinates file upload, processing, and storage operations.

**Features:**
- Upload progress tracking
- Automatic file validation
- Secure filename generation
- Metadata extraction
- Storage backend abstraction

### StorageBackend Implementations

#### LocalStorageService
Handles file storage on the local filesystem with security checks.

**Features:**
- Directory traversal protection
- Automatic directory creation
- Relative path management
- File existence checking

#### S3StorageService
Handles file storage on AWS S3 or S3-compatible services.

**Features:**
- AWS SDK v3 integration
- Configurable endpoints (for S3-compatible services)
- Streaming uploads and downloads
- Proper error handling

### ImageProcessingService
Handles image processing using Sharp library (replacement for Java's ImageIO + Scalr).

**Features:**
- Multiple size variant generation
- Format conversion (JPEG, PNG, WebP)
- Image optimization and compression
- Metadata extraction
- High-quality resizing with aspect ratio preservation

### ValidationService
Provides comprehensive file validation and security checks.

**Features:**
- File type validation (MIME type + extension matching)
- File size limits
- Filename security checks
- Executable content detection
- SHA-256 hash generation
- Virus scanning integration (placeholder)

### CleanupService
Handles file cleanup and maintenance operations.

**Features:**
- Orphaned file detection and removal
- Old file cleanup based on age
- Large file identification
- Storage statistics
- Empty directory cleanup
- Scheduled cleanup support

## Migration from Java

This TypeScript implementation maintains feature parity with the original Java services:

| Java Service | TypeScript Equivalent | Status |
|--------------|----------------------|---------|
| `FileStorageService.java` | `FileStorageService.ts` | ✅ Complete |
| `StorageBackend.java` | `types.ts` (interface) | ✅ Complete |
| `S3StorageBackend.java` | `S3StorageService.ts` | ✅ Complete |
| `LocalStorageBackend.java` | `LocalStorageService.ts` | ✅ Complete |
| `ImageProcessingService.java` | `ImageProcessingService.ts` | ✅ Complete |
| `FileValidationService.java` | `ValidationService.ts` | ✅ Complete |
| `FileCleanupService.java` | `CleanupService.ts` | ✅ Complete |

## Usage Examples

### Basic File Upload

```typescript
import { createFileStorageService } from './storage';

const storageService = createFileStorageService({
  storageType: 'local',
  uploadDir: './uploads',
  validation: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['jpg', 'jpeg', 'png', 'pdf'],
    enableVirusScanning: false
  }
});

const result = await storageService.uploadFile({
  file: fileBuffer,
  originalFileName: 'document.pdf',
  contentType: 'application/pdf',
  size: fileBuffer.length,
  category: 'documents'
});
```

### S3 Configuration

```typescript
const s3StorageService = createFileStorageService({
  storageType: 's3',
  s3Config: {
    bucketName: 'my-bucket',
    region: 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY
  }
});
```

### Image Processing

```typescript
// Image processing happens automatically for image files
const result = await storageService.uploadFile({
  file: imageBuffer,
  originalFileName: 'product.jpg',
  contentType: 'image/jpeg',
  size: imageBuffer.length,
  category: 'products'
});

// Multiple size variants are generated automatically
// thumbnail, small, medium, large, original
```

### File Cleanup

```typescript
import { createCleanupService } from './storage';

const cleanupService = createCleanupService('./uploads');

// Clean up files older than 30 days
const result = await cleanupService.cleanupOldFiles(30);

// Get storage statistics
const stats = await cleanupService.getStorageStatistics();
```

## Configuration

### Environment Variables

```bash
# Storage configuration
STORAGE_TYPE=local|s3
UPLOAD_DIR=./uploads

# S3 configuration (if using S3)
S3_BUCKET_NAME=my-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_ENDPOINT=https://custom-s3-endpoint.com  # Optional

# Validation settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx
ENABLE_VIRUS_SCANNING=false

# Cleanup settings
ORPHANED_FILE_AGE_DAYS=30
ENABLE_SCHEDULED_CLEANUP=true
```

## Dependencies

The storage services require the following npm packages:

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.490.0",
    "sharp": "^0.33.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.6"
  }
}
```

## Security Considerations

1. **Path Traversal Protection**: All file operations include checks to prevent directory traversal attacks
2. **File Type Validation**: MIME type validation combined with extension checking
3. **Executable Detection**: Scans for common executable file signatures
4. **Filename Sanitization**: Removes dangerous characters from filenames
5. **Size Limits**: Configurable file size limits to prevent DoS attacks
6. **Virus Scanning**: Integration point for virus scanning services (implementation required)

## Performance Optimizations

1. **Streaming**: Large files are processed using streams to minimize memory usage
2. **Image Processing**: Sharp library provides high-performance image processing
3. **Async Operations**: All file operations are asynchronous and non-blocking
4. **Progress Tracking**: Upload progress tracking for better user experience
5. **Cleanup Scheduling**: Background cleanup operations to maintain storage efficiency

## Testing

The services include comprehensive error handling and logging. For testing:

1. Unit tests should mock the storage backends
2. Integration tests should use temporary directories
3. Load tests should verify performance under concurrent uploads
4. Security tests should verify validation and sanitization

## Future Enhancements

1. **CDN Integration**: Add support for CDN distribution
2. **Virus Scanning**: Implement actual virus scanning service integration
3. **Thumbnail Generation**: Add automatic thumbnail generation for videos
4. **Compression**: Add automatic file compression for documents
5. **Encryption**: Add at-rest encryption for sensitive files
6. **Audit Logging**: Add comprehensive audit logging for compliance