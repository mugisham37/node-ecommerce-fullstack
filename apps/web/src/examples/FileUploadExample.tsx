/**
 * Example usage of FileUpload and FileManager components
 * This file demonstrates how to integrate file upload and management features
 */

'use client';

import React, { useState } from 'react';
import { FileUpload } from '../components/forms/FileUpload';
import { FileManager } from '../components/modals/FileManager';
import { UploadedFile } from '../services/FileService';
import { FILE_VALIDATION_CONFIGS } from '../utils/fileValidation';

export function FileUploadExample() {
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);

  const handleUploadSuccess = (files: UploadedFile[]) => {
    console.log('Files uploaded successfully:', files);
  };

  const handleFileSelect = (files: UploadedFile[]) => {
    setSelectedFiles(files);
    console.log('Files selected:', files);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">File Upload & Management Examples</h1>

      {/* Basic File Upload */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Basic File Upload</h2>
        <FileUpload
          validationConfig={FILE_VALIDATION_CONFIGS.DOCUMENT}
          onSuccess={handleUploadSuccess}
          autoUpload={true}
          folder="documents"
          placeholder="Upload documents (PDF, CSV, Excel)"
        />
      </section>

      {/* Image Upload with Preview */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Image Upload with Preview</h2>
        <FileUpload
          variant="image"
          validationConfig={FILE_VALIDATION_CONFIGS.PRODUCT_IMAGE}
          onSuccess={handleUploadSuccess}
          autoUpload={true}
          folder="images/products"
          showPreview={true}
          placeholder="Upload product images"
        />
      </section>

      {/* Compact File Upload */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Compact File Upload</h2>
        <FileUpload
          variant="compact"
          validationConfig={FILE_VALIDATION_CONFIGS.AVATAR}
          onSuccess={handleUploadSuccess}
          autoUpload={true}
          folder="avatars"
          multiple={false}
        >
          Choose Avatar
        </FileUpload>
      </section>

      {/* File Manager */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">File Manager</h2>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowFileManager(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Open File Manager
          </button>

          {selectedFiles.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Files:</h3>
              <ul className="space-y-1">
                {selectedFiles.map((file) => (
                  <li key={file.id} className="text-sm text-gray-600">
                    {file.originalName} ({file.size} bytes)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <FileManager
          isOpen={showFileManager}
          onClose={() => setShowFileManager(false)}
          onSelect={handleFileSelect}
          multiSelect={true}
          title="Select Files"
        />
      </section>

      {/* Manual Upload Control */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Manual Upload Control</h2>
        <FileUpload
          validationConfig={FILE_VALIDATION_CONFIGS.DOCUMENT}
          onSuccess={handleUploadSuccess}
          autoUpload={false} // Manual upload
          folder="manual-uploads"
          showProgress={true}
          placeholder="Select files and click upload manually"
        />
      </section>
    </div>
  );
}

export default FileUploadExample;