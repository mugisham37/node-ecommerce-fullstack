/**
 * File service for handling file upload, download, and management operations
 * Provides a centralized interface for all file-related operations
 */

import { 
  FileValidationConfig, 
  validateFiles, 
  generateUniqueFilename,
  formatFileSize,
  getFileCategory,
  FILE_VALIDATION_CONFIGS 
} from '../utils/fileValidation';
import { FileStorageError, FileUploadError, FileValidationError } from '@ecommerce/shared';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadOptions {
  validationConfig?: FileValidationConfig;
  generateUniqueNames?: boolean;
  onProgress?: (progress: UploadProgress) => void;
  folder?: string;
  metadata?: Record<string, any>;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  folder?: string;
  metadata?: Record<string, any>;
  uploadedAt: Date;
}

export interface FileListOptions {
  folder?: string;
  type?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface FileListResponse {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * File service class for managing file operations
 */
export class FileService {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/files', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Upload single file
   */
  async uploadFile(
    file: File,
    options: FileUploadOptions = {}
  ): Promise<UploadedFile> {
    const {
      validationConfig = FILE_VALIDATION_CONFIGS.DOCUMENT,
      generateUniqueNames = true,
      onProgress,
      folder,
      metadata,
    } = options;

    // Validate file
    const validationResults = await validateFiles([file], validationConfig);
    const result = validationResults[0];

    if (!result.result.isValid) {
      throw new FileValidationError(file.name, result.result.errors);
    }

    // Prepare form data
    const formData = new FormData();
    const filename = generateUniqueNames ? generateUniqueFilename(file.name) : file.name;
    
    formData.append('file', file, filename);
    
    if (folder) {
      formData.append('folder', folder);
    }
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    // Upload with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response.data);
          } catch (error) {
            reject(new FileUploadError(file.name, 'Invalid response format'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new FileUploadError(file.name, errorResponse.message || 'Upload failed'));
          } catch {
            reject(new FileUploadError(file.name, `HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new FileUploadError(file.name, 'Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new FileUploadError(file.name, 'Upload was aborted'));
      });

      // Set headers
      if (this.apiKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
      }

      // Start upload
      xhr.open('POST', `${this.baseUrl}/upload`);
      xhr.send(formData);
    });
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    options: FileUploadOptions = {}
  ): Promise<UploadedFile[]> {
    const results: UploadedFile[] = [];
    const errors: Error[] = [];

    // Upload files sequentially to avoid overwhelming the server
    for (const file of files) {
      try {
        const result = await this.uploadFile(file, options);
        results.push(result);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    // If there were any errors, throw them
    if (errors.length > 0) {
      throw new FileStorageError(
        `Failed to upload ${errors.length} out of ${files.length} files`,
        'BATCH_UPLOAD'
      );
    }

    return results;
  }

  /**
   * Get file list
   */
  async getFiles(options: FileListOptions = {}): Promise<FileListResponse> {
    const params = new URLSearchParams();
    
    if (options.folder) params.append('folder', options.folder);
    if (options.type) params.append('type', options.type);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new FileStorageError(
        `Failed to fetch files: ${response.statusText}`,
        'LIST_FILES'
      );
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new FileStorageError(
        `Failed to delete file: ${response.statusText}`,
        'DELETE_FILE'
      );
    }
  }

  /**
   * Get file details
   */
  async getFileDetails(fileId: string): Promise<UploadedFile> {
    const response = await fetch(`${this.baseUrl}/${fileId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new FileStorageError(
        `Failed to get file details: ${response.statusText}`,
        'GET_FILE_DETAILS'
      );
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Generate download URL
   */
  getDownloadUrl(fileId: string): string {
    return `${this.baseUrl}/${fileId}/download`;
  }

  /**
   * Generate preview URL
   */
  getPreviewUrl(fileId: string): string {
    return `${this.baseUrl}/${fileId}/preview`;
  }

  /**
   * Get thumbnail URL for images
   */
  getThumbnailUrl(fileId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    return `${this.baseUrl}/${fileId}/thumbnail?size=${size}`;
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    metadata: Record<string, any>
  ): Promise<UploadedFile> {
    const response = await fetch(`${this.baseUrl}/${fileId}/metadata`, {
      method: 'PATCH',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      throw new FileStorageError(
        `Failed to update file metadata: ${response.statusText}`,
        'UPDATE_METADATA'
      );
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Search files
   */
  async searchFiles(query: string, options: Omit<FileListOptions, 'search'> = {}): Promise<FileListResponse> {
    return this.getFiles({ ...options, search: query });
  }

  /**
   * Get files by folder
   */
  async getFilesByFolder(folder: string, options: Omit<FileListOptions, 'folder'> = {}): Promise<FileListResponse> {
    return this.getFiles({ ...options, folder });
  }

  /**
   * Get files by type
   */
  async getFilesByType(type: string, options: Omit<FileListOptions, 'type'> = {}): Promise<FileListResponse> {
    return this.getFiles({ ...options, type });
  }

  /**
   * Create folder
   */
  async createFolder(name: string, parentFolder?: string): Promise<{ name: string; path: string }> {
    const response = await fetch(`${this.baseUrl}/folders`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, parentFolder }),
    });

    if (!response.ok) {
      throw new FileStorageError(
        `Failed to create folder: ${response.statusText}`,
        'CREATE_FOLDER'
      );
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get folders
   */
  async getFolders(parentFolder?: string): Promise<{ name: string; path: string; fileCount: number }[]> {
    const params = new URLSearchParams();
    if (parentFolder) params.append('parent', parentFolder);

    const response = await fetch(`${this.baseUrl}/folders?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new FileStorageError(
        `Failed to get folders: ${response.statusText}`,
        'GET_FOLDERS'
      );
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

/**
 * Default file service instance
 */
export const fileService = new FileService();

/**
 * Utility functions for file operations
 */
export const FileUtils = {
  /**
   * Format file size
   */
  formatSize: formatFileSize,

  /**
   * Get file category
   */
  getCategory: getFileCategory,

  /**
   * Check if file is an image
   */
  isImage: (file: File | UploadedFile): boolean => {
    const type = 'type' in file ? file.type : file.type;
    return type.startsWith('image/');
  },

  /**
   * Check if file is a document
   */
  isDocument: (file: File | UploadedFile): boolean => {
    const type = 'type' in file ? file.type : file.type;
    return type === 'application/pdf' || 
           type === 'text/csv' || 
           type.includes('spreadsheet') || 
           type.includes('excel');
  },

  /**
   * Get file extension
   */
  getExtension: (filename: string): string => {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  },

  /**
   * Get file name without extension
   */
  getNameWithoutExtension: (filename: string): string => {
    return filename.substring(0, filename.lastIndexOf('.'));
  },
};