// Main storage services
export { FileStorageService } from './FileStorageService';
export { S3StorageService } from './S3StorageService';
export { LocalStorageService } from './LocalStorageService';
export { ImageProcessingService } from './ImageProcessingService';
export { ValidationService } from './ValidationService';
export { CleanupService } from './CleanupService';

// Types and interfaces
export * from './types';

// Factory function for creating storage service with dependencies
export function createFileStorageService(config: {
  storageType: 'local' | 's3';
  uploadDir?: string;
  s3Config?: {
    bucketName: string;
    region: string;
    accessKey: string;
    secretKey: string;
    endpoint?: string;
  };
  validation?: {
    maxFileSize: number;
    allowedTypes: string[];
    enableVirusScanning: boolean;
  };
  imageProcessing?: {
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    sizes?: Record<string, { width: number; height: number }>;
  };
}) {
  const imageProcessingService = new ImageProcessingService();
  const validationService = new ValidationService(config.validation);
  
  return new FileStorageService(
    {
      storageType: config.storageType,
      uploadDir: config.uploadDir,
      s3Config: config.s3Config
    },
    imageProcessingService,
    validationService
  );
}

// Factory function for creating cleanup service
export function createCleanupService(uploadPath: string, options?: {
  orphanedFileAgeDays?: number;
  enableScheduledCleanup?: boolean;
}) {
  return new CleanupService(uploadPath, {
    orphanedFileAgeDays: options?.orphanedFileAgeDays || 30,
    enableScheduledCleanup: options?.enableScheduledCleanup ?? true
  });
}