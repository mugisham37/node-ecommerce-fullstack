import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { 
  StorageBackend, 
  FileUploadRequest, 
  FileUploadResponse, 
  UploadProgress,
  FileMetadata 
} from './types';
import { LocalStorageService } from './LocalStorageService';
import { S3StorageService } from './S3StorageService';
import { ImageProcessingService } from './ImageProcessingService';
import { ValidationService } from './ValidationService';

export class FileStorageService {
  private uploadProgressMap = new Map<string, UploadProgress>();
  private storageBackend: StorageBackend;

  constructor(
    private config: {
      storageType: 'local' | 's3';
      uploadDir?: string;
      s3Config?: {
        bucketName: string;
        region: string;
        accessKey: string;
        secretKey: string;
        endpoint?: string;
      };
    },
    private imageProcessingService: ImageProcessingService,
    private validationService: ValidationService
  ) {
    this.initializeStorageBackend();
  }

  private initializeStorageBackend(): void {
    if (this.config.storageType === 's3' && this.config.s3Config) {
      this.storageBackend = new S3StorageService(this.config.s3Config);
    } else {
      this.storageBackend = new LocalStorageService(this.config.uploadDir || './uploads');
    }
  }

  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    const uploadId = this.generateUploadId();
    
    try {
      // Initialize progress tracking
      this.updateUploadProgress(uploadId, 0, 'Validating file...');
      
      // Validate file
      await this.validationService.validateFile({
        buffer: request.file,
        originalFileName: request.originalFileName,
        contentType: request.contentType,
        size: request.size
      });
      this.updateUploadProgress(uploadId, 30, 'File validation completed');
      
      // Generate secure filename and directory
      const fileName = this.generateSecureFileName(request.originalFileName);
      const directory = this.generateDirectoryPath(request.category, new Date());
      
      this.updateUploadProgress(uploadId, 40, 'Preparing file storage...');
      
      // Store file using appropriate backend
      const storedPath = await this.storageBackend.store(request.file, fileName, directory);
      
      this.updateUploadProgress(uploadId, 80, 'File stored successfully');
      
      // Generate file hash
      const fileHash = this.generateFileHash(request.file);
      
      // Extract metadata
      const metadata = await this.extractFileMetadata(request);
      
      this.updateUploadProgress(uploadId, 100, 'Upload completed');
      
      // Build response
      const response: FileUploadResponse = {
        fileName,
        originalFileName: request.originalFileName,
        fileUrl: this.storageBackend.getFileUrl(storedPath),
        contentType: request.contentType,
        fileSize: request.size,
        fileHash,
        uploadedAt: new Date(),
        metadata
      };
      
      console.log(`File uploaded successfully: ${request.originalFileName} -> ${fileName}`);
      return response;
      
    } catch (error) {
      this.updateUploadProgress(uploadId, -1, `Upload failed: ${error.message}`);
      console.error(`File upload failed for: ${request.originalFileName}`, error);
      throw new Error(`File upload failed: ${error.message}`);
    } finally {
      // Clean up progress tracking after a delay
      setTimeout(() => {
        this.uploadProgressMap.delete(uploadId);
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  async loadFileAsBuffer(fileName: string): Promise<Buffer> {
    try {
      return await this.storageBackend.loadAsBuffer(fileName);
    } catch (error) {
      throw new Error(`Could not load file: ${fileName} - ${error.message}`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.storageBackend.delete(fileName);
      console.log(`File deleted successfully: ${fileName}`);
    } catch (error) {
      throw new Error(`Could not delete file: ${fileName} - ${error.message}`);
    }
  }

  async fileExists(fileName: string): Promise<boolean> {
    return await this.storageBackend.exists(fileName);
  }

  getAllowedFileTypes(): string[] {
    return this.validationService.getAllowedFileTypes();
  }

  async validateFileSize(file: { size: number; contentType: string; originalFileName: string }): Promise<boolean> {
    try {
      await this.validationService.validateFile({
        buffer: Buffer.alloc(0), // We only need size validation here
        originalFileName: file.originalFileName,
        contentType: file.contentType,
        size: file.size
      });
      return true;
    } catch {
      return false;
    }
  }

  generateSecureFileName(originalFileName: string): string {
    const timestamp = Date.now();
    const random = randomUUID().substring(0, 8);
    const extension = this.getFileExtension(originalFileName);
    return `${timestamp}_${random}${extension ? '.' + extension : ''}`;
  }

  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.uploadProgressMap.get(uploadId);
  }

  private generateUploadId(): string {
    return randomUUID();
  }

  private updateUploadProgress(uploadId: string, percentage: number, message: string): void {
    const progress: UploadProgress = {
      uploadId,
      percentage,
      message,
      timestamp: new Date()
    };
    this.uploadProgressMap.set(uploadId, progress);
    console.log(`Upload progress [${uploadId}]: ${percentage}% - ${message}`);
  }

  private generateDirectoryPath(category: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${category}/${year}/${month}/${day}`;
  }

  private generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async extractFileMetadata(request: FileUploadRequest): Promise<FileMetadata> {
    try {
      if (this.isImageFile(request.contentType)) {
        return await this.imageProcessingService.extractImageMetadata(request.file);
      }
      
      // Fallback to basic metadata
      const extension = this.getFileExtension(request.originalFileName);
      return {
        format: extension,
        isImage: false
      };
    } catch (error) {
      console.warn(`Failed to extract file metadata for: ${request.originalFileName}`, error);
      
      // Fallback to basic metadata
      const extension = this.getFileExtension(request.originalFileName);
      return {
        format: extension,
        isImage: this.isImageFile(request.contentType)
      };
    }
  }

  private isImageFile(contentType: string): boolean {
    return contentType?.startsWith('image/') || false;
  }

  private getFileExtension(fileName: string): string {
    if (!fileName) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1) : '';
  }
}