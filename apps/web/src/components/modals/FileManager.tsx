/**
 * FileManager modal component for browsing, managing, and selecting files
 * Provides a comprehensive file management interface with folders, search, and file operations
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileService, 
  UploadedFile, 
  FileListOptions, 
  FileListResponse,
  fileService,
  FileUtils 
} from '../../services/FileService';
import { FileUpload } from '../forms/FileUpload';
import { formatFileSize } from '../../utils/fileValidation';

export interface FileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (files: UploadedFile[]) => void;
  multiSelect?: boolean;
  fileTypes?: string[];
  folder?: string;
  title?: string;
  className?: string;
}

export interface FileManagerState {
  files: UploadedFile[];
  folders: { name: string; path: string; fileCount: number }[];
  selectedFiles: Set<string>;
  currentFolder: string;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  view: 'grid' | 'list';
  sortBy: 'name' | 'size' | 'date';
  sortOrder: 'asc' | 'desc';
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * FileManager modal component
 */
export function FileManager({
  isOpen,
  onClose,
  onSelect,
  multiSelect = false,
  fileTypes,
  folder = '',
  title = 'File Manager',
  className = '',
}: FileManagerProps) {
  const [state, setState] = useState<FileManagerState>({
    files: [],
    folders: [],
    selectedFiles: new Set(),
    currentFolder: folder,
    searchQuery: '',
    isLoading: false,
    error: null,
    view: 'grid',
    sortBy: 'name',
    sortOrder: 'asc',
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  });

  const [showUpload, setShowUpload] = useState(false);

  // Load files and folders
  const loadFiles = useCallback(async (options: Partial<FileListOptions> = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const listOptions: FileListOptions = {
        folder: state.currentFolder,
        page: state.pagination.page,
        limit: state.pagination.limit,
        search: state.searchQuery || undefined,
        type: fileTypes?.join(','),
        ...options,
      };

      const [filesResponse, foldersResponse] = await Promise.all([
        fileService.getFiles(listOptions),
        fileService.getFolders(state.currentFolder || undefined),
      ]);

      setState(prev => ({
        ...prev,
        files: filesResponse.files,
        folders: foldersResponse,
        pagination: {
          page: filesResponse.page,
          limit: filesResponse.limit,
          total: filesResponse.total,
          totalPages: filesResponse.totalPages,
        },
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load files',
        isLoading: false,
      }));
    }
  }, [state.currentFolder, state.pagination.page, state.pagination.limit, state.searchQuery, fileTypes]);

  // Load files when component mounts or dependencies change
  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  // Handle folder navigation
  const navigateToFolder = useCallback((folderPath: string) => {
    setState(prev => ({
      ...prev,
      currentFolder: folderPath,
      selectedFiles: new Set(),
      pagination: { ...prev.pagination, page: 1 },
    }));
  }, []);

  // Handle file selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedFiles);
      
      if (multiSelect) {
        if (newSelected.has(fileId)) {
          newSelected.delete(fileId);
        } else {
          newSelected.add(fileId);
        }
      } else {
        newSelected.clear();
        newSelected.add(fileId);
      }

      return { ...prev, selectedFiles: newSelected };
    });
  }, [multiSelect]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      pagination: { ...prev.pagination, page: 1 },
    }));
  }, []);

  // Handle sort
  const handleSort = useCallback((sortBy: 'name' | 'size' | 'date') => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await fileService.deleteFile(fileId);
      await loadFiles();
      setState(prev => {
        const newSelected = new Set(prev.selectedFiles);
        newSelected.delete(fileId);
        return { ...prev, selectedFiles: newSelected };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      }));
    }
  }, [loadFiles]);

  // Handle file selection confirmation
  const handleSelectFiles = useCallback(() => {
    if (onSelect) {
      const selectedFileObjects = state.files.filter(file => 
        state.selectedFiles.has(file.id)
      );
      onSelect(selectedFileObjects);
    }
    onClose();
  }, [onSelect, onClose, state.files, state.selectedFiles]);

  // Handle upload success
  const handleUploadSuccess = useCallback(() => {
    setShowUpload(false);
    loadFiles();
  }, [loadFiles]);

  // Sort files
  const sortedFiles = [...state.files].sort((a, b) => {
    let comparison = 0;
    
    switch (state.sortBy) {
      case 'name':
        comparison = a.originalName.localeCompare(b.originalName);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        break;
    }

    return state.sortOrder === 'asc' ? comparison : -comparison;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`
          inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all
          sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full ${className}
        `}>
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              
              <div className="flex items-center space-x-2">
                {/* View toggle */}
                <div className="flex rounded-md shadow-sm">
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, view: 'grid' }))}
                    className={`
                      px-3 py-1 text-sm font-medium rounded-l-md border
                      ${state.view === 'grid'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, view: 'list' }))}
                    className={`
                      px-3 py-1 text-sm font-medium rounded-r-md border-t border-r border-b
                      ${state.view === 'list'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    List
                  </button>
                </div>

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => setShowUpload(!showUpload)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search and controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={state.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center space-x-4">
                {/* Sort controls */}
                <select
                  value={`${state.sortBy}-${state.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as ['name' | 'size' | 'date', 'asc' | 'desc'];
                    setState(prev => ({ ...prev, sortBy, sortOrder }));
                  }}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="size-asc">Size (Small)</option>
                  <option value="size-desc">Size (Large)</option>
                  <option value="date-asc">Date (Old)</option>
                  <option value="date-desc">Date (New)</option>
                </select>
              </div>
            </div>

            {/* Breadcrumb */}
            {state.currentFolder && (
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <button
                  type="button"
                  onClick={() => navigateToFolder('')}
                  className="hover:text-gray-700"
                >
                  Root
                </button>
                {state.currentFolder.split('/').filter(Boolean).map((folder, index, arr) => (
                  <React.Fragment key={index}>
                    <span className="mx-1">/</span>
                    <button
                      type="button"
                      onClick={() => navigateToFolder(arr.slice(0, index + 1).join('/'))}
                      className="hover:text-gray-700"
                    >
                      {folder}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Upload area */}
          {showUpload && (
            <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
              <FileUpload
                folder={state.currentFolder}
                onSuccess={handleUploadSuccess}
                autoUpload={true}
                className="max-w-none"
              />
            </div>
          )}

          {/* Content */}
          <div className="bg-white px-4 py-4" style={{ minHeight: '400px', maxHeight: '600px', overflowY: 'auto' }}>
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
            )}

            {state.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Folders */}
                {state.folders.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Folders</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {state.folders.map((folder) => (
                        <button
                          key={folder.path}
                          type="button"
                          onClick={() => navigateToFolder(folder.path)}
                          className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <svg className="w-8 h-8 text-blue-500 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                          <span className="text-xs text-gray-700 text-center truncate w-full">
                            {folder.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {folder.fileCount} files
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {sortedFiles.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Files ({state.pagination.total})
                    </h4>
                    
                    {state.view === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {sortedFiles.map((file) => (
                          <FileGridItem
                            key={file.id}
                            file={file}
                            isSelected={state.selectedFiles.has(file.id)}
                            onSelect={() => toggleFileSelection(file.id)}
                            onDelete={() => handleDeleteFile(file.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {sortedFiles.map((file) => (
                          <FileListItem
                            key={file.id}
                            file={file}
                            isSelected={state.selectedFiles.has(file.id)}
                            onSelect={() => toggleFileSelection(file.id)}
                            onDelete={() => handleDeleteFile(file.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Pagination */}
                    {state.pagination.totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {((state.pagination.page - 1) * state.pagination.limit) + 1} to{' '}
                          {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)} of{' '}
                          {state.pagination.total} files
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setState(prev => ({
                              ...prev,
                              pagination: { ...prev.pagination, page: prev.pagination.page - 1 }
                            }))}
                            disabled={state.pagination.page <= 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          
                          <span className="text-sm text-gray-700">
                            Page {state.pagination.page} of {state.pagination.totalPages}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => setState(prev => ({
                              ...prev,
                              pagination: { ...prev.pagination, page: prev.pagination.page + 1 }
                            }))}
                            disabled={state.pagination.page >= state.pagination.totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {state.searchQuery ? 'No files match your search.' : 'Get started by uploading a file.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {onSelect && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleSelectFiles}
                disabled={state.selectedFiles.size === 0}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select {state.selectedFiles.size > 0 && `(${state.selectedFiles.size})`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * File grid item component
 */
interface FileItemProps {
  file: UploadedFile;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function FileGridItem({ file, isSelected, onSelect, onDelete }: FileItemProps) {
  const isImage = FileUtils.isImage(file);

  return (
    <div
      className={`
        relative group border-2 rounded-lg p-2 cursor-pointer transition-colors
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      <div className={`
        absolute top-1 right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center
        ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
      `}>
        {isSelected && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* File preview/icon */}
      <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img
            src={file.url}
            alt={file.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* File info */}
      <div className="text-center">
        <p className="text-xs font-medium text-gray-900 truncate" title={file.originalName}>
          {file.originalName}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
}

/**
 * File list item component
 */
function FileListItem({ file, isSelected, onSelect, onDelete }: FileItemProps) {
  const isImage = FileUtils.isImage(file);

  return (
    <div
      className={`
        flex items-center p-3 border rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onSelect}
    >
      {/* Selection checkbox */}
      <div className={`
        w-4 h-4 rounded border-2 flex items-center justify-center mr-3
        ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
      `}>
        {isSelected && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* File icon/preview */}
      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3 overflow-hidden">
        {isImage ? (
          <img
            src={file.url}
            alt={file.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.originalName}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 ml-4">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          View
        </a>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}