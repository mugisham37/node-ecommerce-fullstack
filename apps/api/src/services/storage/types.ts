export interface StorageBackend {
  /**
   * Store a file and return the stored file path
   */
  store(file: Buffer, fileName: string, directory: string): Promise<string>;
  
  /**
   * Load a file as a Buffer
   */
  loadAsBuffer(fileName: string): Promise<Buffer>;
  
  /**
   * Delete a file
   */
  delete(fileName: string): Promise<void>;
  
  /**
   * Check if a file exists
   */
  exists(fileName: string): Promise<boolean>;
  
  /**
   * Get the full URL for accessing the file
   */
  getFileUrl(fileName: string): string;
  
  /**
   * Get the storage type identifier
   */
  getStorageType(): string;
}

export interface FileUploadRequest {
  file: Buffer;
  originalFileName: string;
  contentType: string;
  size: number;
  category: string;
  entityId?: string;
}

export interface FileUploadResponse {
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  contentType: string;
  fileSize: number;
  fileHash: string;
  uploadedAt: Date;
  metadata: FileMetadata;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  format: string;
  isImage: boolean;
}

export interface UploadProgress {
  uploadId: string;
  percentage: number;
  message: string;
  timestamp: Date;
}

export interface CleanupResult {
  filesRemoved: number;
  spaceFreed: number;
  removedFiles: string[];
}

export interface FileInfo {
  path: string;
  size: number;
  lastModified: Date;
  isRegularFile: boolean;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  imageFiles: number;
  documentFiles: number;
  storagePath: string;
}

export interface ImageProcessingOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  sizes?: Record<string, { width: number; height: number }>;
}

export interface ValidationOptions {
  maxFileSize: number;
  allowedTypes: string[];
  enableVirusScanning: boolean;
}