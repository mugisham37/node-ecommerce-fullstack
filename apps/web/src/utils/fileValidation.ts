/**
 * File validation utilities for secure file upload
 * Implements comprehensive validation for file types, sizes, and security
 */

import { FileType } from '@ecommerce/shared';
import { FileValidationError } from '@ecommerce/shared';

export interface FileValidationConfig {
  maxSize: number; // in bytes
  allowedTypes: FileType[];
  maxWidth?: number; // for images
  maxHeight?: number; // for images
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  extension: string;
}

/**
 * Default validation configurations for different file categories
 */
export const FILE_VALIDATION_CONFIGS = {
  PRODUCT_IMAGE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as FileType[],
    maxWidth: 2048,
    maxHeight: 2048,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  DOCUMENT: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as FileType[],
    allowedExtensions: ['.pdf', '.csv', '.xls', '.xlsx'],
  },
  AVATAR: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as FileType[],
    maxWidth: 512,
    maxHeight: 512,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
} as const;

/**
 * Extract file metadata from File object
 */
export function extractFileMetadata(file: File): FileMetadata {
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    extension,
  };
}

/**
 * Validate file against configuration
 */
export function validateFile(file: File, config: FileValidationConfig): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const metadata = extractFileMetadata(file);

  // Validate file size
  if (metadata.size > config.maxSize) {
    errors.push(`File size (${formatFileSize(metadata.size)}) exceeds maximum allowed size (${formatFileSize(config.maxSize)})`);
  }

  // Validate file type
  if (!config.allowedTypes.includes(metadata.type as FileType)) {
    errors.push(`File type '${metadata.type}' is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`);
  }

  // Validate file extension
  if (config.allowedExtensions && !config.allowedExtensions.includes(metadata.extension)) {
    errors.push(`File extension '${metadata.extension}' is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`);
  }

  // Validate empty file
  if (metadata.size === 0) {
    errors.push('File is empty');
  }

  // Security checks
  const securityErrors = performSecurityChecks(metadata);
  errors.push(...securityErrors);

  // Performance warnings
  if (metadata.size > config.maxSize * 0.8) {
    warnings.push('File size is close to the maximum limit');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate image dimensions (requires loading the image)
 */
export function validateImageDimensions(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({
        isValid: true,
        errors: [],
      });
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const errors: string[] = [];

      if (img.width > maxWidth || img.height > maxHeight) {
        errors.push(`Image dimensions (${img.width}x${img.height}) exceed maximum allowed dimensions (${maxWidth}x${maxHeight})`);
      }

      resolve({
        isValid: errors.length === 0,
        errors,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        errors: ['Invalid image file or corrupted data'],
      });
    };

    img.src = url;
  });
}

/**
 * Validate multiple files
 */
export async function validateFiles(
  files: File[],
  config: FileValidationConfig
): Promise<{ file: File; result: FileValidationResult }[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      const basicValidation = validateFile(file, config);
      
      // If basic validation passes and it's an image, check dimensions
      if (basicValidation.isValid && file.type.startsWith('image/') && config.maxWidth && config.maxHeight) {
        const dimensionValidation = await validateImageDimensions(file, config.maxWidth, config.maxHeight);
        
        return {
          file,
          result: {
            isValid: dimensionValidation.isValid,
            errors: [...basicValidation.errors, ...dimensionValidation.errors],
            warnings: basicValidation.warnings,
          },
        };
      }

      return { file, result: basicValidation };
    })
  );

  return results;
}

/**
 * Perform security checks on file metadata
 */
function performSecurityChecks(metadata: FileMetadata): string[] {
  const errors: string[] = [];

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.(exe|bat|cmd|scr|pif|com|vbs|js|jar|app|deb|rpm)$/i,
    /\.(php|asp|aspx|jsp|cgi|pl|py|rb)$/i,
    /\.(htaccess|htpasswd|config|ini|conf)$/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(metadata.name)) {
      errors.push('File type is potentially dangerous and not allowed');
      break;
    }
  }

  // Check for double extensions
  const extensionCount = (metadata.name.match(/\./g) || []).length;
  if (extensionCount > 1) {
    errors.push('Files with multiple extensions are not allowed');
  }

  // Check for very long filenames
  if (metadata.name.length > 255) {
    errors.push('Filename is too long (maximum 255 characters)');
  }

  // Check for special characters that might cause issues
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(metadata.name)) {
    errors.push('Filename contains invalid characters');
  }

  return errors;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category
 */
export function getFileCategory(file: File): 'image' | 'document' | 'other' {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  
  if (
    file.type === 'application/pdf' ||
    file.type === 'text/csv' ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel')
  ) {
    return 'document';
  }

  return 'other';
}

/**
 * Create validation error from validation result
 */
export function createValidationError(filename: string, result: FileValidationResult): FileValidationError {
  return new FileValidationError(filename, result.errors);
}

/**
 * Check if file type is supported for preview
 */
export function isPreviewSupported(file: File): boolean {
  return file.type.startsWith('image/') || file.type === 'application/pdf';
}

/**
 * Generate unique filename to prevent conflicts
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
  
  return `${nameWithoutExt}_${timestamp}_${random}${extension}`;
}