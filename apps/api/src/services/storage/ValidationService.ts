import { createHash } from 'crypto';
import { ValidationOptions } from './types';

export class ValidationService {
  private static readonly DEFAULT_ALLOWED_TYPES = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'
  ];

  private static readonly DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  private static readonly MIME_TYPE_MAP: Record<string, string[]> = {
    'jpg': ['image/jpeg'],
    'jpeg': ['image/jpeg'],
    'png': ['image/png'],
    'gif': ['image/gif'],
    'webp': ['image/webp'],
    'bmp': ['image/bmp'],
    'pdf': ['application/pdf'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'xls': ['application/vnd.ms-excel'],
    'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'txt': ['text/plain'],
    'csv': ['text/csv', 'application/csv']
  };

  private static readonly EXECUTABLE_SIGNATURES = [
    [0x4D, 0x5A], // PE executable (MZ)
    [0x7F, 0x45, 0x4C, 0x46], // ELF executable
    [0xCA, 0xFE, 0xBA, 0xBE], // Java class file
    [0x50, 0x4B, 0x03, 0x04], // ZIP (could contain executables)
  ];

  constructor(
    private options: ValidationOptions = {
      maxFileSize: ValidationService.DEFAULT_MAX_FILE_SIZE,
      allowedTypes: ValidationService.DEFAULT_ALLOWED_TYPES,
      enableVirusScanning: false
    }
  ) {}

  async validateFile(file: {
    buffer: Buffer;
    originalFileName: string;
    contentType: string;
    size: number;
  }): Promise<void> {
    if (!file.buffer && file.size > 0) {
      throw new Error('File buffer cannot be empty');
    }

    this.validateFileName(file.originalFileName);
    this.validateFileSize(file.size);
    this.validateFileType(file.originalFileName, file.contentType);
    
    if (file.buffer && file.buffer.length > 0) {
      this.validateFileContent(file.buffer);
    }
    
    // Virus scanning would be implemented here if enabled
    if (this.options.enableVirusScanning) {
      await this.scanForViruses(file.buffer);
    }
  }

  private validateFileName(fileName: string): void {
    if (!fileName?.trim()) {
      throw new Error('File name cannot be empty');
    }

    // Check for dangerous characters
    const dangerousChars = ['../', '..\\', '<', '>', ':', '"', '|', '?', '*'];
    for (const dangerousChar of dangerousChars) {
      if (fileName.includes(dangerousChar)) {
        throw new Error('File name contains invalid characters');
      }
    }

    // Check file extension
    const extension = this.getFileExtension(fileName);
    if (!this.options.allowedTypes.includes(extension.toLowerCase())) {
      throw new Error(
        `File type not allowed. Allowed types: ${this.options.allowedTypes.join(', ')}`
      );
    }
  }

  private validateFileSize(size: number): void {
    if (size > this.options.maxFileSize) {
      const maxSizeMB = Math.round(this.options.maxFileSize / (1024 * 1024));
      throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
  }

  private validateFileType(fileName: string, contentType: string): void {
    const extension = this.getFileExtension(fileName);
    const allowedMimeTypes = ValidationService.MIME_TYPE_MAP[extension.toLowerCase()];

    if (allowedMimeTypes && !allowedMimeTypes.includes(contentType)) {
      throw new Error(
        `File content type does not match file extension. Expected: ${allowedMimeTypes.join(' or ')}, Got: ${contentType}`
      );
    }
  }

  private validateFileContent(buffer: Buffer): void {
    // Check for executable signatures
    if (this.containsExecutableSignature(buffer)) {
      throw new Error('File contains executable content');
    }

    // Additional content validation can be added here
    // For example, checking for malicious patterns, etc.
  }

  private containsExecutableSignature(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    for (const signature of ValidationService.EXECUTABLE_SIGNATURES) {
      if (buffer.length >= signature.length) {
        let matches = true;
        for (let i = 0; i < signature.length; i++) {
          if (buffer[i] !== signature[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return true;
        }
      }
    }
    return false;
  }

  private async scanForViruses(buffer: Buffer): Promise<void> {
    // Placeholder for virus scanning implementation
    // In a real implementation, you would integrate with a virus scanning service
    // like ClamAV, VirusTotal API, or similar
    
    console.log('Virus scanning is enabled but not implemented in this example');
    
    // Example implementation would look like:
    // const scanResult = await virusScanningService.scan(buffer);
    // if (scanResult.isInfected) {
    //   throw new Error(`File is infected with: ${scanResult.virusName}`);
    // }
  }

  generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  getFileExtension(fileName: string): string {
    if (!fileName?.trim()) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
  }

  getAllowedFileTypes(): string[] {
    return [...this.options.allowedTypes];
  }

  getMaxFileSize(): number {
    return this.options.maxFileSize;
  }

  isImageFile(contentType: string): boolean {
    return contentType?.startsWith('image/') || false;
  }

  isDocumentFile(contentType: string): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
    return documentTypes.includes(contentType);
  }

  private parseSize(size: string): number {
    const sizeStr = size.toUpperCase();
    if (sizeStr.endsWith('KB')) {
      return parseInt(sizeStr.substring(0, sizeStr.length - 2)) * 1024;
    } else if (sizeStr.endsWith('MB')) {
      return parseInt(sizeStr.substring(0, sizeStr.length - 2)) * 1024 * 1024;
    } else if (sizeStr.endsWith('GB')) {
      return parseInt(sizeStr.substring(0, sizeStr.length - 2)) * 1024 * 1024 * 1024;
    }
    return parseInt(size);
  }
}