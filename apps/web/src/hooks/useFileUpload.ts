/**
 * Custom hook for file upload functionality
 * Provides state management and utilities for file upload operations
 */

import { useState, useCallback, useRef } from 'react';
import { 
  FileService, 
  FileUploadOptions, 
  UploadedFile, 
  UploadProgress,
  fileService 
} from '../services/FileService';
import { 
  FileValidationConfig, 
  validateFiles, 
  FILE_VALIDATION_CONFIGS 
} from '../utils/fileValidation';
import { FileValidationError } from '@ecommerce/shared';

export interface UseFileUploadOptions {
  validationConfig?: FileValidationConfig;
  maxFiles?: number;
  autoUpload?: boolean;
  folder?: string;
  onSuccess?: (files: UploadedFile[]) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
}

export interface FileUploadState {
  files: File[];
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  progress: UploadProgress | null;
  errors: Record<string, string>;
  validationErrors: Record<string, string[]>;
}

export interface UseFileUploadReturn {
  // State
  state: FileUploadState;
  
  // Actions
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  uploadFiles: () => Promise<void>;
  retryUpload: () => Promise<void>;
  
  // Utilities
  isValid: boolean;
  canUpload: boolean;
  hasFiles: boolean;
  totalSize: number;
  
  // File input ref
  fileInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * Custom hook for file upload functionality
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    validationConfig = FILE_VALIDATION_CONFIGS.DOCUMENT,
    maxFiles = 10,
    autoUpload = false,
    folder,
    onSuccess,
    onError,
    onProgress,
  } = options;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FileUploadState>({
    files: [],
    uploadedFiles: [],
    isUploading: false,
    progress: null,
    errors: {},
    validationErrors: {},
  });

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback(async (newFiles: File[]) => {
    // Check max files limit
    const totalFiles = state.files.length + newFiles.length;
    if (totalFiles > maxFiles) {
      const error = new Error(`Cannot add more than ${maxFiles} files`);
      onError?.(error);
      return;
    }

    // Validate files
    const validationResults = await validateFiles(newFiles, validationConfig);
    const validFiles: File[] = [];
    const newValidationErrors: Record<string, string[]> = {};

    validationResults.forEach(({ file, result }, index) => {
      if (result.isValid) {
        validFiles.push(file);
      } else {
        newValidationErrors[`${state.files.length + index}`] = result.errors;
      }
    });

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      validationErrors: {
        ...prev.validationErrors,
        ...newValidationErrors,
      },
    }));

    // Auto upload if enabled
    if (autoUpload && validFiles.length > 0) {
      await uploadFiles();
    }
  }, [state.files.length, maxFiles, validationConfig, autoUpload, onError]);

  /**
   * Remove file from the queue
   */
  const removeFile = useCallback((index: number) => {
    setState(prev => {
      const newFiles = [...prev.files];
      newFiles.splice(index, 1);

      // Remove validation errors for this file and adjust indices
      const newValidationErrors: Record<string, string[]> = {};
      Object.entries(prev.validationErrors).forEach(([key, value]) => {
        const fileIndex = parseInt(key);
        if (fileIndex < index) {
          newValidationErrors[key] = value;
        } else if (fileIndex > index) {
          newValidationErrors[(fileIndex - 1).toString()] = value;
        }
        // Skip the removed file (fileIndex === index)
      });

      return {
        ...prev,
        files: newFiles,
        validationErrors: newValidationErrors,
        errors: {},
      };
    });
  }, []);

  /**
   * Clear all files
   */
  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      files: [],
      uploadedFiles: [],
      errors: {},
      validationErrors: {},
      progress: null,
    }));

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Upload all files
   */
  const uploadFiles = useCallback(async () => {
    if (state.files.length === 0 || state.isUploading) {
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      errors: {},
      progress: { loaded: 0, total: 0, percentage: 0 },
    }));

    try {
      const uploadOptions: FileUploadOptions = {
        validationConfig,
        folder,
        onProgress: (progress) => {
          setState(prev => ({ ...prev, progress }));
          onProgress?.(progress);
        },
      };

      const uploadedFiles = await fileService.uploadFiles(state.files, uploadOptions);

      setState(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, ...uploadedFiles],
        files: [], // Clear files after successful upload
        isUploading: false,
        progress: null,
        validationErrors: {},
      }));

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onSuccess?.(uploadedFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: null,
        errors: { upload: errorMessage },
      }));

      onError?.(error as Error);
    }
  }, [state.files, state.isUploading, validationConfig, folder, onProgress, onSuccess, onError]);

  /**
   * Retry upload
   */
  const retryUpload = useCallback(async () => {
    await uploadFiles();
  }, [uploadFiles]);

  // Computed values
  const isValid = Object.keys(state.validationErrors).length === 0;
  const canUpload = state.files.length > 0 && isValid && !state.isUploading;
  const hasFiles = state.files.length > 0;
  const totalSize = state.files.reduce((total, file) => total + file.size, 0);

  return {
    state,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    retryUpload,
    isValid,
    canUpload,
    hasFiles,
    totalSize,
    fileInputRef,
  };
}

/**
 * Hook for single file upload
 */
export function useSingleFileUpload(options: UseFileUploadOptions = {}) {
  const uploadHook = useFileUpload({ ...options, maxFiles: 1 });

  const addFile = useCallback(async (file: File) => {
    await uploadHook.addFiles([file]);
  }, [uploadHook.addFiles]);

  const currentFile = uploadHook.state.files[0] || null;
  const uploadedFile = uploadHook.state.uploadedFiles[0] || null;

  return {
    ...uploadHook,
    addFile,
    currentFile,
    uploadedFile,
  };
}

/**
 * Hook for image upload with preview
 */
export function useImageUpload(options: UseFileUploadOptions = {}) {
  const [previews, setPreviews] = useState<string[]>([]);

  const imageOptions = {
    ...options,
    validationConfig: options.validationConfig || FILE_VALIDATION_CONFIGS.PRODUCT_IMAGE,
  };

  const uploadHook = useFileUpload(imageOptions);

  // Generate previews when files change
  const addFiles = useCallback(async (files: File[]) => {
    // Generate previews for image files
    const newPreviews = await Promise.all(
      files.map(file => {
        if (file.type.startsWith('image/')) {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }
        return Promise.resolve('');
      })
    );

    setPreviews(prev => [...prev, ...newPreviews]);
    await uploadHook.addFiles(files);
  }, [uploadHook.addFiles]);

  const removeFile = useCallback((index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    uploadHook.removeFile(index);
  }, [uploadHook.removeFile]);

  const clearFiles = useCallback(() => {
    setPreviews([]);
    uploadHook.clearFiles();
  }, [uploadHook.clearFiles]);

  return {
    ...uploadHook,
    addFiles,
    removeFile,
    clearFiles,
    previews,
  };
}