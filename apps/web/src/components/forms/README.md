# File Upload and Management Components

This directory contains comprehensive file upload and management components for the web application.

## Components

### FileUpload

A versatile file upload component with drag & drop support, validation, progress tracking, and previews.

**Features:**
- Drag and drop file upload
- Multiple file selection
- File validation (size, type, dimensions)
- Upload progress tracking
- Image previews
- Auto-upload or manual upload modes
- Compact and full variants
- Comprehensive error handling

**Usage:**
```tsx
import { FileUpload } from './FileUpload';
import { FILE_VALIDATION_CONFIGS } from '../../utils/fileValidation';

<FileUpload
  validationConfig={FILE_VALIDATION_CONFIGS.PRODUCT_IMAGE}
  onSuccess={(files) => console.log('Uploaded:', files)}
  autoUpload={true}
  folder="products"
  showPreview={true}
/>
```

**Props:**
- `validationConfig`: File validation rules
- `maxFiles`: Maximum number of files (default: 10)
- `autoUpload`: Upload files immediately after selection
- `folder`: Target folder for uploads
- `variant`: 'default' | 'compact' | 'image'
- `showPreview`: Show image previews
- `showProgress`: Show upload progress
- `onSuccess`: Callback for successful uploads
- `onError`: Callback for upload errors

### FileManager

A comprehensive file management modal for browsing, selecting, and managing files.

**Features:**
- File and folder browsing
- Search functionality
- Grid and list view modes
- File selection (single/multiple)
- File upload integration
- File deletion
- Pagination
- Sorting options
- Folder navigation

**Usage:**
```tsx
import { FileManager } from '../modals/FileManager';

<FileManager
  isOpen={showManager}
  onClose={() => setShowManager(false)}
  onSelect={(files) => handleFileSelection(files)}
  multiSelect={true}
  fileTypes={['image/jpeg', 'image/png']}
/>
```

**Props:**
- `isOpen`: Modal visibility state
- `onClose`: Close callback
- `onSelect`: File selection callback
- `multiSelect`: Allow multiple file selection
- `fileTypes`: Filter by file types
- `folder`: Initial folder to browse

## Hooks

### useFileUpload

Custom hook for file upload state management and operations.

**Features:**
- File queue management
- Upload progress tracking
- Validation handling
- Error management
- Auto-upload support

**Usage:**
```tsx
import { useFileUpload } from '../../hooks/useFileUpload';

const {
  state,
  addFiles,
  removeFile,
  uploadFiles,
  isValid,
  canUpload
} = useFileUpload({
  validationConfig: FILE_VALIDATION_CONFIGS.DOCUMENT,
  onSuccess: handleSuccess
});
```

### useImageUpload

Specialized hook for image uploads with preview generation.

**Usage:**
```tsx
import { useImageUpload } from '../../hooks/useFileUpload';

const {
  state,
  previews,
  addFiles,
  removeFile
} = useImageUpload({
  validationConfig: FILE_VALIDATION_CONFIGS.PRODUCT_IMAGE
});
```

## Services

### FileService

Centralized service for all file operations including upload, download, and management.

**Features:**
- Single and batch file uploads
- File listing and search
- File deletion and metadata updates
- Folder management
- Progress tracking
- Error handling

**Usage:**
```tsx
import { fileService } from '../../services/FileService';

// Upload files
const uploadedFiles = await fileService.uploadFiles(files, {
  folder: 'products',
  onProgress: (progress) => console.log(progress)
});

// Get files
const fileList = await fileService.getFiles({
  folder: 'products',
  page: 1,
  limit: 20
});
```

## Utilities

### fileValidation

Comprehensive file validation utilities with security checks.

**Features:**
- File size validation
- File type validation
- Image dimension validation
- Security checks (malicious files, double extensions)
- Predefined validation configs

**Usage:**
```tsx
import { validateFiles, FILE_VALIDATION_CONFIGS } from '../../utils/fileValidation';

const results = await validateFiles(files, FILE_VALIDATION_CONFIGS.PRODUCT_IMAGE);
```

## Validation Configs

Predefined validation configurations for common use cases:

- `PRODUCT_IMAGE`: 5MB max, JPEG/PNG/WebP, 2048x2048 max dimensions
- `DOCUMENT`: 10MB max, PDF/CSV/Excel files
- `AVATAR`: 2MB max, JPEG/PNG/WebP, 512x512 max dimensions

## Security Features

- File type validation
- Extension validation
- Size limits
- Malicious file detection
- Double extension prevention
- Filename sanitization
- Content type verification

## Error Handling

Comprehensive error handling with specific error types:
- `FileValidationError`: Validation failures
- `FileUploadError`: Upload failures
- `FileStorageError`: Storage operation failures

## Accessibility

- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA labels and descriptions
- High contrast support

## Performance

- Lazy loading of file previews
- Efficient file validation
- Progress tracking
- Memory management for large files
- Optimized rendering for file lists