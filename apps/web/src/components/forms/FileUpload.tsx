/**
 * FileUpload component for handling file uploads with drag & drop
 * Supports multiple files, validation, progress tracking, and previews
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useFileUpload, useImageUpload, UseFileUploadOptions } from '../../hooks/useFileUpload';
import { formatFileSize, getFileCategory, FILE_VALIDATION_CONFIGS } from '../../utils/fileValidation';
import { FileUtils } from '../../services/FileService';

export interface FileUploadProps extends UseFileUploadOptions {
  className?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'image';
  showPreview?: boolean;
  showProgress?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}

/**
 * Main FileUpload component
 */
export function FileUpload({
  className = '',
  accept,
  multiple = true,
  disabled = false,
  variant = 'default',
  showPreview = true,
  showProgress = true,
  placeholder,
  children,
  ...uploadOptions
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Use appropriate hook based on variant
  const uploadHook = variant === 'image' 
    ? useImageUpload(uploadOptions)
    : useFileUpload(uploadOptions);

  const {
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
  } = uploadHook;

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  }, [addFiles]);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  }, [disabled, addFiles]);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, fileInputRef]);

  // Render based on variant
  if (variant === 'compact') {
    return (
      <div className={`file-upload-compact ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={`
            inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium
            ${disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }
          `}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {children || 'Choose Files'}
        </button>

        {hasFiles && (
          <span className="ml-2 text-sm text-gray-500">
            {state.files.length} file{state.files.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`file-upload ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {placeholder || (
                <>
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>
                  {' or drag and drop'}
                </>
              )}
            </p>
            
            {uploadOptions.validationConfig && (
              <p className="text-xs text-gray-500 mt-1">
                Max {formatFileSize(uploadOptions.validationConfig.maxSize)} per file
                {uploadOptions.validationConfig.allowedExtensions && (
                  <>, {uploadOptions.validationConfig.allowedExtensions.join(', ')}</>
                )}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>

      {/* File list */}
      {hasFiles && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">
              Selected Files ({state.files.length})
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                Total: {formatFileSize(totalSize)}
              </span>
              <button
                type="button"
                onClick={clearFiles}
                className="text-xs text-red-600 hover:text-red-800"
                disabled={state.isUploading}
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {state.files.map((file, index) => (
              <FileItem
                key={`${file.name}-${index}`}
                file={file}
                index={index}
                onRemove={removeFile}
                showPreview={showPreview && variant === 'image'}
                preview={variant === 'image' ? (uploadHook as any).previews?.[index] : undefined}
                validationErrors={state.validationErrors[index.toString()]}
                disabled={state.isUploading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {state.isUploading && showProgress && state.progress && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{state.progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload controls */}
      {hasFiles && !uploadOptions.autoUpload && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isValid && (
              <span className="text-sm text-red-600">
                Please fix validation errors before uploading
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {state.errors.upload && (
              <button
                type="button"
                onClick={retryUpload}
                className="text-sm text-blue-600 hover:text-blue-800"
                disabled={state.isUploading}
              >
                Retry
              </button>
            )}
            
            <button
              type="button"
              onClick={uploadFiles}
              disabled={!canUpload}
              className={`
                px-4 py-2 text-sm font-medium rounded-md
                ${canUpload
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {state.isUploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>
      )}

      {/* Error messages */}
      {state.errors.upload && (
        <div className="mt-2 text-sm text-red-600">
          {state.errors.upload}
        </div>
      )}

      {/* Uploaded files */}
      {state.uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Uploaded Files ({state.uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {state.uploadedFiles.map((file) => (
              <UploadedFileItem key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual file item component
 */
interface FileItemProps {
  file: File;
  index: number;
  onRemove: (index: number) => void;
  showPreview?: boolean;
  preview?: string;
  validationErrors?: string[];
  disabled?: boolean;
}

function FileItem({
  file,
  index,
  onRemove,
  showPreview = false,
  preview,
  validationErrors,
  disabled = false,
}: FileItemProps) {
  const category = getFileCategory(file);
  const hasErrors = validationErrors && validationErrors.length > 0;

  return (
    <div className={`
      flex items-center p-3 border rounded-lg
      ${hasErrors ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}
    `}>
      {/* Preview or icon */}
      <div className="flex-shrink-0 mr-3">
        {showPreview && preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
            {category === 'image' ? (
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)} • {file.type}
        </p>
        
        {hasErrors && (
          <div className="mt-1">
            {validationErrors!.map((error, errorIndex) => (
              <p key={errorIndex} className="text-xs text-red-600">
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={disabled}
        className={`
          ml-2 p-1 rounded-full
          ${disabled 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-500 hover:text-red-600 hover:bg-red-100'
          }
        `}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Uploaded file item component
 */
interface UploadedFileItemProps {
  file: {
    id: string;
    originalName: string;
    filename: string;
    url: string;
    size: number;
    type: string;
    uploadedAt: Date;
  };
}

function UploadedFileItem({ file }: UploadedFileItemProps) {
  const isImage = FileUtils.isImage(file);

  return (
    <div className="flex items-center p-3 border border-green-200 bg-green-50 rounded-lg">
      {/* Icon */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.originalName}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)} • Uploaded successfully
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 ml-2">
        {isImage && (
          <button
            type="button"
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={() => window.open(file.url, '_blank')}
          >
            Preview
          </button>
        )}
        <a
          href={file.url}
          download={file.originalName}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Download
        </a>
      </div>
    </div>
  );
}