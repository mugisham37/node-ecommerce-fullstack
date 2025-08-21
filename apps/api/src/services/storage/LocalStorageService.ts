import { promises as fs } from 'fs';
import { join, resolve, relative, dirname } from 'path';
import { StorageBackend } from './types';

export class LocalStorageService implements StorageBackend {
  private uploadPath: string;

  constructor(uploadDir: string) {
    this.uploadPath = resolve(uploadDir);
  }

  async store(file: Buffer, fileName: string, directory: string): Promise<string> {
    if (!fileName?.trim()) {
      throw new Error('Filename cannot be empty');
    }

    try {
      const directoryPath = join(this.uploadPath, directory);
      
      // Create directory if it doesn't exist
      await fs.mkdir(directoryPath, { recursive: true });

      const targetLocation = join(directoryPath, fileName);
      
      // Security check: ensure the file is stored within the upload directory
      if (!targetLocation.startsWith(this.uploadPath)) {
        throw new Error('Cannot store file outside upload directory');
      }

      await fs.writeFile(targetLocation, file);
      
      // Return relative path from upload directory
      const relativePath = relative(this.uploadPath, targetLocation).replace(/\\/g, '/');
      console.log(`File stored successfully: ${relativePath}`);
      return relativePath;
      
    } catch (error) {
      throw new Error(`Could not store file ${fileName}: ${error.message}`);
    }
  }

  async loadAsBuffer(fileName: string): Promise<Buffer> {
    try {
      const filePath = join(this.uploadPath, fileName);
      
      // Security check
      if (!filePath.startsWith(this.uploadPath)) {
        throw new Error('Cannot access file outside upload directory');
      }
      
      const buffer = await fs.readFile(filePath);
      return buffer;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${fileName}`);
      }
      throw new Error(`Could not load file ${fileName}: ${error.message}`);
    }
  }

  async delete(fileName: string): Promise<void> {
    try {
      const filePath = join(this.uploadPath, fileName);
      
      // Security check
      if (!filePath.startsWith(this.uploadPath)) {
        throw new Error('Cannot delete file outside upload directory');
      }
      
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`File deleted successfully: ${fileName}`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(`Attempted to delete non-existent file: ${fileName}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new Error(`Could not delete file ${fileName}: ${error.message}`);
    }
  }

  async exists(fileName: string): Promise<boolean> {
    try {
      const filePath = join(this.uploadPath, fileName);
      
      // Security check
      if (!filePath.startsWith(this.uploadPath)) {
        return false;
      }
      
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(fileName: string): string {
    // For local storage, return a relative URL that will be handled by a controller
    return `/api/v1/files/${fileName}`;
  }

  getStorageType(): string {
    return 'local';
  }

  async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      throw new Error(`Could not create upload directory: ${error.message}`);
    }
  }
}