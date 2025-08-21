/**
 * Example usage of the File Storage Services
 * This file demonstrates how to use the migrated storage functionality
 */

import { createFileStorageService, createCleanupService } from './index';
import { FileUploadRequest } from './types';

// Example configuration for local storage
const localStorageConfig = {
  storageType: 'local' as const,
  uploadDir: './uploads',
  validation: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    enableVirusScanning: false
  },
  imageProcessing: {
    quality: 85,
    format: 'jpeg' as const,
    sizes: {
      thumbnail: { width: 150, height: 150 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 }
    }
  }
};

// Example configuration for S3 storage
const s3StorageConfig = {
  storageType: 's3' as const,
  s3Config: {
    bucketName: process.env.S3_BUCKET_NAME || 'my-ecommerce-bucket',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
    endpoint: process.env.S3_ENDPOINT // Optional for custom S3-compatible services
  },
  validation: {
    maxFileSize: 50 * 1024 * 1024, // 50MB for cloud storage
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'],
    enableVirusScanning: true
  }
};

// Example: File upload
export async function exampleFileUpload() {
  // Create storage service (use local or S3 based on environment)
  const storageService = createFileStorageService(
    process.env.NODE_ENV === 'production' ? s3StorageConfig : localStorageConfig
  );

  // Example file data (in real usage, this would come from a multipart form)
  const fileBuffer = Buffer.from('example file content');
  const uploadRequest: FileUploadRequest = {
    file: fileBuffer,
    originalFileName: 'example-image.jpg',
    contentType: 'image/jpeg',
    size: fileBuffer.length,
    category: 'products',
    entityId: 'product-123'
  };

  try {
    const result = await storageService.uploadFile(uploadRequest);
    console.log('File uploaded successfully:', result);
    return result;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

// Example: File retrieval
export async function exampleFileRetrieval(fileName: string) {
  const storageService = createFileStorageService(localStorageConfig);

  try {
    const fileBuffer = await storageService.loadFileAsBuffer(fileName);
    console.log(`File loaded: ${fileName}, size: ${fileBuffer.length} bytes`);
    return fileBuffer;
  } catch (error) {
    console.error('File retrieval failed:', error);
    throw error;
  }
}

// Example: File deletion
export async function exampleFileDeletion(fileName: string) {
  const storageService = createFileStorageService(localStorageConfig);

  try {
    await storageService.deleteFile(fileName);
    console.log(`File deleted successfully: ${fileName}`);
  } catch (error) {
    console.error('File deletion failed:', error);
    throw error;
  }
}

// Example: Cleanup operations
export async function exampleCleanupOperations() {
  const cleanupService = createCleanupService('./uploads', {
    orphanedFileAgeDays: 30,
    enableScheduledCleanup: true
  });

  try {
    // Get storage statistics
    const stats = await cleanupService.getStorageStatistics();
    console.log('Storage statistics:', stats);

    // Find large files (> 5MB)
    const largeFiles = await cleanupService.findLargeFiles(5 * 1024 * 1024);
    console.log('Large files:', largeFiles);

    // Clean up old files (older than 90 days)
    const cleanupResult = await cleanupService.cleanupOldFiles(90);
    console.log('Cleanup result:', cleanupResult);

    // Clean up empty directories
    const removedDirs = await cleanupService.cleanupEmptyDirectories();
    console.log('Removed empty directories:', removedDirs);

  } catch (error) {
    console.error('Cleanup operations failed:', error);
    throw error;
  }
}

// Example: Image processing
export async function exampleImageProcessing() {
  const storageService = createFileStorageService(localStorageConfig);

  // This would typically be called internally by the storage service
  // but can also be used directly for custom image processing
  const imageBuffer = Buffer.from('fake image data'); // In real usage, load actual image

  try {
    // The image processing happens automatically during upload for image files
    const uploadRequest: FileUploadRequest = {
      file: imageBuffer,
      originalFileName: 'product-photo.jpg',
      contentType: 'image/jpeg',
      size: imageBuffer.length,
      category: 'products',
      entityId: 'product-456'
    };

    const result = await storageService.uploadFile(uploadRequest);
    console.log('Image uploaded and processed:', result);
    return result;
  } catch (error) {
    console.error('Image processing failed:', error);
    throw error;
  }
}

// Example: Validation
export async function exampleValidation() {
  const storageService = createFileStorageService(localStorageConfig);

  // Check allowed file types
  const allowedTypes = storageService.getAllowedFileTypes();
  console.log('Allowed file types:', allowedTypes);

  // Validate file size
  const isValidSize = await storageService.validateFileSize({
    size: 2 * 1024 * 1024, // 2MB
    contentType: 'image/jpeg',
    originalFileName: 'test.jpg'
  });
  console.log('File size is valid:', isValidSize);
}

// Example usage in an Express route or tRPC procedure
export function exampleIntegration() {
  return {
    // Express middleware example
    uploadMiddleware: async (req: any, res: any, next: any) => {
      try {
        const storageService = createFileStorageService(localStorageConfig);
        
        if (req.file) {
          const uploadRequest: FileUploadRequest = {
            file: req.file.buffer,
            originalFileName: req.file.originalname,
            contentType: req.file.mimetype,
            size: req.file.size,
            category: req.body.category || 'general',
            entityId: req.body.entityId
          };

          const result = await storageService.uploadFile(uploadRequest);
          req.uploadResult = result;
        }
        
        next();
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    },

    // tRPC procedure example
    uploadProcedure: async (input: { 
      fileData: string; // base64 encoded
      fileName: string;
      contentType: string;
      category: string;
    }) => {
      const storageService = createFileStorageService(localStorageConfig);
      
      const fileBuffer = Buffer.from(input.fileData, 'base64');
      const uploadRequest: FileUploadRequest = {
        file: fileBuffer,
        originalFileName: input.fileName,
        contentType: input.contentType,
        size: fileBuffer.length,
        category: input.category
      };

      return await storageService.uploadFile(uploadRequest);
    }
  };
}