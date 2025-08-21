/**
 * File storage and validation related errors
 * Converted from FileStorageException.java and FileValidationException.java
 */

import { AppError } from './index';

export class FileStorageError extends AppError {
  constructor(message: string, operation: string, cause?: Error) {
    super(message, 'FILE_STORAGE_ERROR', 'FILE_STORAGE', 500, cause);
    this.addContext('operation', operation);
  }
}

/**
 * Exception thrown when file upload fails
 */
export class FileUploadError extends FileStorageError {
  constructor(filename: string, reason: string, cause?: Error) {
    super(`Failed to upload file '${filename}': ${reason}`, 'UPLOAD', cause);
    this.errorCode = 'FILE_UPLOAD_ERROR';
    this.addContext('filename', filename);
    this.addContext('reason', reason);
  }
}

/**
 * Exception thrown when file download fails
 */
export class FileDownloadError extends FileStorageError {
  constructor(filename: string, reason: string, cause?: Error) {
    super(`Failed to download file '${filename}': ${reason}`, 'DOWNLOAD', cause);
    this.errorCode = 'FILE_DOWNLOAD_ERROR';
    this.addContext('filename', filename);
    this.addContext('reason', reason);
  }
}

/**
 * Exception thrown when file deletion fails
 */
export class FileDeletionError extends FileStorageError {
  constructor(filename: string, reason: string, cause?: Error) {
    super(`Failed to delete file '${filename}': ${reason}`, 'DELETE', cause);
    this.errorCode = 'FILE_DELETION_ERROR';
    this.addContext('filename', filename);
    this.addContext('reason', reason);
  }
}

/**
 * Exception thrown when file validation fails
 */
export class FileValidationError extends AppError {
  constructor(filename: string, validationErrors: string[], cause?: Error) {
    super(
      `File validation failed for '${filename}': ${validationErrors.join(', ')}`,
      'FILE_VALIDATION_ERROR',
      'FILE_VALIDATION',
      400,
      cause
    );
    this.addContext('filename', filename);
    this.addContext('validationErrors', validationErrors);
    this.addContext('errorCount', validationErrors.length);
  }

  static forInvalidType(filename: string, actualType: string, allowedTypes: string[]): FileValidationError {
    return new FileValidationError(
      filename,
      [`Invalid file type '${actualType}'. Allowed types: ${allowedTypes.join(', ')}`]
    );
  }

  static forInvalidSize(filename: string, actualSize: number, maxSize: number): FileValidationError {
    return new FileValidationError(
      filename,
      [`File size ${actualSize} bytes exceeds maximum allowed size of ${maxSize} bytes`]
    );
  }

  static forInvalidDimensions(
    filename: string,
    actualWidth: number,
    actualHeight: number,
    maxWidth: number,
    maxHeight: number
  ): FileValidationError {
    return new FileValidationError(
      filename,
      [`Image dimensions ${actualWidth}x${actualHeight} exceed maximum allowed dimensions of ${maxWidth}x${maxHeight}`]
    );
  }
}