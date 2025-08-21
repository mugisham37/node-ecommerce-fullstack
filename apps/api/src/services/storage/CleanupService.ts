import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { CleanupResult, FileInfo, StorageStats } from './types';

export class CleanupService {
  constructor(
    private uploadPath: string,
    private config: {
      orphanedFileAgeDays: number;
      enableScheduledCleanup: boolean;
    } = {
      orphanedFileAgeDays: 30,
      enableScheduledCleanup: true
    }
  ) {
    this.uploadPath = resolve(uploadPath);
  }

  /**
   * Perform daily cleanup of orphaned files
   * This would typically be called by a scheduled job
   */
  async performDailyCleanup(): Promise<CleanupResult> {
    console.log('Starting daily file cleanup process');
    
    try {
      const result = await this.cleanupOrphanedFiles();
      console.log(`Daily cleanup completed - Files removed: ${result.filesRemoved}, Space freed: ${result.spaceFreed} bytes`);
      return result;
    } catch (error) {
      console.error('Daily cleanup failed', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned files (files not referenced in database)
   */
  async cleanupOrphanedFiles(): Promise<CleanupResult> {
    if (!(await this.directoryExists(this.uploadPath))) {
      console.warn(`Upload directory does not exist: ${this.uploadPath}`);
      return { filesRemoved: 0, spaceFreed: 0, removedFiles: [] };
    }

    const removedFiles: string[] = [];
    let totalSpaceFreed = 0;
    let filesRemoved = 0;

    try {
      await this.walkDirectory(this.uploadPath, async (filePath, stats) => {
        if (await this.isOrphanedFile(filePath, stats)) {
          const fileSize = stats.size;
          const relativePath = this.getRelativePath(filePath);
          
          try {
            await fs.unlink(filePath);
            removedFiles.push(relativePath);
            totalSpaceFreed += fileSize;
            filesRemoved++;
            
            console.log(`Removed orphaned file: ${relativePath} (size: ${fileSize} bytes)`);
          } catch (error) {
            console.error(`Failed to delete orphaned file: ${relativePath}`, error);
          }
        }
      });
    } catch (error) {
      console.error('Error during file cleanup', error);
    }

    return { filesRemoved, spaceFreed: totalSpaceFreed, removedFiles };
  }

  /**
   * Clean up files older than specified number of days
   */
  async cleanupOldFiles(daysOld: number): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const removedFiles: string[] = [];
    let totalSpaceFreed = 0;
    let filesRemoved = 0;

    try {
      await this.walkDirectory(this.uploadPath, async (filePath, stats) => {
        if (stats.mtime < cutoffDate) {
          const fileSize = stats.size;
          const relativePath = this.getRelativePath(filePath);
          
          try {
            await fs.unlink(filePath);
            removedFiles.push(relativePath);
            totalSpaceFreed += fileSize;
            filesRemoved++;
            
            console.log(`Removed old file: ${relativePath} (modified: ${stats.mtime.toISOString()})`);
          } catch (error) {
            console.error(`Failed to delete old file: ${relativePath}`, error);
          }
        }
      });
    } catch (error) {
      console.error('Error during old file cleanup', error);
    }

    return { filesRemoved, spaceFreed: totalSpaceFreed, removedFiles };
  }

  /**
   * Find files larger than specified size
   */
  async findLargeFiles(minSizeBytes: number): Promise<FileInfo[]> {
    const largeFiles: FileInfo[] = [];

    try {
      await this.walkDirectory(this.uploadPath, async (filePath, stats) => {
        if (stats.size >= minSizeBytes) {
          const relativePath = this.getRelativePath(filePath);
          
          largeFiles.push({
            path: relativePath,
            size: stats.size,
            lastModified: stats.mtime,
            isRegularFile: stats.isFile()
          });
        }
      });
    } catch (error) {
      console.error('Error finding large files', error);
    }

    // Sort by size (largest first)
    return largeFiles.sort((a, b) => b.size - a.size);
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(): Promise<StorageStats> {
    let totalFiles = 0;
    let totalSize = 0;
    let imageFiles = 0;
    let documentFiles = 0;

    try {
      await this.walkDirectory(this.uploadPath, async (filePath, stats) => {
        if (stats.isFile()) {
          totalFiles++;
          totalSize += stats.size;
          
          const fileName = filePath.toLowerCase();
          if (this.isImageFile(fileName)) {
            imageFiles++;
          } else if (this.isDocumentFile(fileName)) {
            documentFiles++;
          }
        }
      });
    } catch (error) {
      console.error('Error calculating storage statistics', error);
    }

    return {
      totalFiles,
      totalSize,
      imageFiles,
      documentFiles,
      storagePath: this.uploadPath
    };
  }

  /**
   * Clean up empty directories
   */
  async cleanupEmptyDirectories(): Promise<string[]> {
    const removedDirectories: string[] = [];

    try {
      await this.walkDirectoryBottomUp(this.uploadPath, async (dirPath) => {
        try {
          const entries = await fs.readdir(dirPath);
          if (entries.length === 0 && dirPath !== this.uploadPath) {
            await fs.rmdir(dirPath);
            const relativePath = this.getRelativePath(dirPath);
            removedDirectories.push(relativePath);
            console.log(`Removed empty directory: ${relativePath}`);
          }
        } catch (error) {
          // Directory might not be empty or might have been removed already
          console.debug(`Could not remove directory: ${dirPath}`, error);
        }
      });
    } catch (error) {
      console.error('Error cleaning up empty directories', error);
    }

    return removedDirectories;
  }

  private async walkDirectory(
    dirPath: string, 
    fileCallback: (filePath: string, stats: fs.Stats) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, fileCallback);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          await fileCallback(fullPath, stats);
        }
      }
    } catch (error) {
      console.error(`Failed to walk directory: ${dirPath}`, error);
    }
  }

  private async walkDirectoryBottomUp(
    dirPath: string,
    dirCallback: (dirPath: string) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // First, recursively process subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = join(dirPath, entry.name);
          await this.walkDirectoryBottomUp(fullPath, dirCallback);
        }
      }
      
      // Then process the current directory
      await dirCallback(dirPath);
    } catch (error) {
      console.error(`Failed to walk directory bottom-up: ${dirPath}`, error);
    }
  }

  private async isOrphanedFile(filePath: string, stats: fs.Stats): Promise<boolean> {
    // Simple orphan detection - files older than configured days that are not referenced
    // In a real system, you would check database references
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.orphanedFileAgeDays);
    
    // For now, consider files older than configured days as potentially orphaned
    // You should implement proper reference checking here
    return stats.mtime < cutoffDate && !this.isSystemFile(filePath);
  }

  private isSystemFile(filePath: string): boolean {
    const fileName = filePath.toLowerCase();
    // Don't delete system files or hidden files
    return fileName.includes('/.') || fileName.includes('\\.') || 
           fileName.endsWith('readme.txt') || fileName.endsWith('.gitkeep');
  }

  private isImageFile(fileName: string): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
  }

  private isDocumentFile(fileName: string): boolean {
    return /\.(pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(fileName);
  }

  private async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private getRelativePath(fullPath: string): string {
    return fullPath.replace(this.uploadPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/');
  }
}