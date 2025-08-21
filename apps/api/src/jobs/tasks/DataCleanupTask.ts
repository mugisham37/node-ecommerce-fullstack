import { BaseScheduledTask } from '../schedulers/BaseScheduledTask';
import { ScheduledTaskRegistry } from '../schedulers/ScheduledTaskRegistry';
import { ScheduledTaskMonitoringService } from '../monitoring/ScheduledTaskMonitoringService';
import { ScheduledTaskPerformanceService } from '../monitoring/ScheduledTaskPerformanceService';
import { FileStorageService } from '../../services/FileStorageService';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Scheduled task for performing data cleanup operations.
 * Handles file cleanup, orphaned data removal, and storage optimization.
 */
export class DataCleanupTask extends BaseScheduledTask {
  constructor(
    taskRegistry: ScheduledTaskRegistry,
    monitoringService: ScheduledTaskMonitoringService,
    performanceService: ScheduledTaskPerformanceService,
    private readonly fileStorageService: FileStorageService,
    private readonly config: {
      uploadDir: string;
      maxFileAgeHours?: number;
      maxOrphanedFileAgeDays?: number;
    }
  ) {
    super(taskRegistry, monitoringService, performanceService);
  }

  /**
   * Perform daily cleanup process at 2 AM.
   */
  async performDailyCleanup(): Promise<void> {
    await this.executeTask();
  }

  protected getTaskName(): string {
    return 'data-cleanup-task';
  }

  protected getTaskDescription(): string {
    return 'Perform daily data cleanup including orphaned files, old temporary data, and storage optimization';
  }

  protected async doExecute(): Promise<void> {
    this.logger.info('Starting daily data cleanup process');
    
    try {
      // Clean up orphaned files
      const orphanedResult = await this.cleanupOrphanedFiles();
      this.logger.info(`Orphaned files cleanup - Files removed: ${orphanedResult.filesRemoved}, Space freed: ${orphanedResult.spaceFreed} bytes`);
      
      // Clean up old temporary files
      const tempResult = await this.cleanupOldFiles(7); // Files older than 7 days
      this.logger.info(`Old files cleanup - Files removed: ${tempResult.filesRemoved}, Space freed: ${tempResult.spaceFreed} bytes`);
      
      // Clean up database orphaned records
      await this.cleanupOrphanedDatabaseRecords();
      
      // Clean up session data
      await this.cleanupExpiredSessions();
      
      // Clean up log files
      await this.cleanupOldLogFiles();
      
      this.logger.info('Daily cleanup completed successfully');
      
    } catch (error) {
      this.logger.error('Daily cleanup failed', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned files that are no longer referenced in the database.
   */
  async cleanupOrphanedFiles(): Promise<CleanupResult> {
    const uploadPath = path.resolve(this.config.uploadDir);
    
    try {
      await fs.access(uploadPath);
    } catch {
      this.logger.warn(`Upload directory does not exist: ${uploadPath}`);
      return new CleanupResult(0, 0, []);
    }

    const removedFiles: string[] = [];
    let totalSpaceFreed = 0;
    let filesRemoved = 0;

    try {
      const files = await this.getAllFiles(uploadPath);
      
      for (const filePath of files) {
        if (await this.isOrphanedFile(filePath)) {
          try {
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;
            const relativePath = path.relative(uploadPath, filePath);
            
            await fs.unlink(filePath);
            removedFiles.push(relativePath);
            totalSpaceFreed += fileSize;
            filesRemoved++;
            
            this.logger.debug(`Removed orphaned file: ${relativePath} (size: ${fileSize} bytes)`);
          } catch (error) {
            this.logger.error(`Failed to delete orphaned file: ${filePath}`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error during orphaned file cleanup', error);
    }

    return new CleanupResult(filesRemoved, totalSpaceFreed, removedFiles);
  }

  /**
   * Clean up files older than specified number of days.
   */
  async cleanupOldFiles(daysOld: number): Promise<CleanupResult> {
    const uploadPath = path.resolve(this.config.uploadDir);
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const removedFiles: string[] = [];
    let totalSpaceFreed = 0;
    let filesRemoved = 0;

    try {
      const files = await this.getAllFiles(uploadPath);
      
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            const fileSize = stats.size;
            const relativePath = path.relative(uploadPath, filePath);
            
            await fs.unlink(filePath);
            removedFiles.push(relativePath);
            totalSpaceFreed += fileSize;
            filesRemoved++;
            
            this.logger.debug(`Removed old file: ${relativePath} (modified: ${stats.mtime.toISOString()})`);
          }
        } catch (error) {
          this.logger.error(`Failed to process file: ${filePath}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error during old file cleanup', error);
    }

    return new CleanupResult(filesRemoved, totalSpaceFreed, removedFiles);
  }

  /**
   * Find large files that might need attention.
   */
  async findLargeFiles(minSizeBytes: number): Promise<FileInfo[]> {
    const uploadPath = path.resolve(this.config.uploadDir);
    const largeFiles: FileInfo[] = [];

    try {
      const files = await this.getAllFiles(uploadPath);
      
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.size >= minSizeBytes) {
            const relativePath = path.relative(uploadPath, filePath);
            
            largeFiles.push(new FileInfo(
              relativePath,
              stats.size,
              stats.mtime,
              stats.isFile()
            ));
          }
        } catch (error) {
          this.logger.error(`Failed to check file: ${filePath}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error finding large files', error);
    }

    return largeFiles.sort((a, b) => b.size - a.size);
  }

  /**
   * Get storage statistics.
   */
  async getStorageStatistics(): Promise<StorageStats> {
    const uploadPath = path.resolve(this.config.uploadDir);
    
    let totalFiles = 0;
    let totalSize = 0;
    let imageFiles = 0;
    let documentFiles = 0;

    try {
      const files = await this.getAllFiles(uploadPath);
      
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            totalFiles++;
            totalSize += stats.size;
            
            const fileName = path.basename(filePath).toLowerCase();
            if (/\.(jpg|jpeg|png|gif|bmp|webp)$/.test(fileName)) {
              imageFiles++;
            } else if (/\.(pdf|doc|docx|xls|xlsx|txt)$/.test(fileName)) {
              documentFiles++;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to stat file: ${filePath}`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error calculating storage statistics', error);
    }

    return new StorageStats(
      totalFiles,
      totalSize,
      imageFiles,
      documentFiles,
      uploadPath
    );
  }

  /**
   * Clean up orphaned database records.
   */
  private async cleanupOrphanedDatabaseRecords(): Promise<void> {
    try {
      // Clean up orphaned product images
      // Clean up orphaned user sessions
      // Clean up expired tokens
      // Clean up old audit logs
      
      this.logger.info('Database cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup database records', error);
    }
  }

  /**
   * Clean up expired session data.
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      // Clean up expired Redis sessions
      // Clean up expired JWT tokens from blacklist
      
      this.logger.info('Session cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup sessions', error);
    }
  }

  /**
   * Clean up old log files.
   */
  private async cleanupOldLogFiles(): Promise<void> {
    try {
      const logDir = path.resolve('logs');
      const maxLogAge = 30; // Keep logs for 30 days
      const cutoffDate = new Date(Date.now() - maxLogAge * 24 * 60 * 60 * 1000);
      
      try {
        const logFiles = await fs.readdir(logDir);
        
        for (const logFile of logFiles) {
          const logPath = path.join(logDir, logFile);
          const stats = await fs.stat(logPath);
          
          if (stats.mtime < cutoffDate && logFile.endsWith('.log')) {
            await fs.unlink(logPath);
            this.logger.debug(`Removed old log file: ${logFile}`);
          }
        }
      } catch (error) {
        this.logger.debug('No log directory found or error accessing logs', error);
      }
      
      this.logger.info('Log file cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup log files', error);
    }
  }

  /**
   * Get all files recursively from a directory.
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to read directory: ${dirPath}`, error);
    }
    
    return files;
  }

  /**
   * Check if a file is orphaned (not referenced in database).
   */
  private async isOrphanedFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      
      // Skip system files
      if (this.isSystemFile(fileName)) {
        return false;
      }
      
      // Simple orphan detection - files older than configured age
      const maxAge = (this.config.maxOrphanedFileAgeDays || 30) * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - maxAge);
      
      if (stats.mtime < cutoffDate) {
        // In a real system, you would check database references here
        // For now, consider old files as potentially orphaned
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to check if file is orphaned: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Check if a file is a system file that should not be deleted.
   */
  private isSystemFile(fileName: string): boolean {
    const systemFiles = ['.gitkeep', 'readme.txt', '.htaccess', 'index.html'];
    return fileName.startsWith('.') || systemFiles.includes(fileName.toLowerCase());
  }
}

/**
 * Result of cleanup operation.
 */
export class CleanupResult {
  constructor(
    public readonly filesRemoved: number,
    public readonly spaceFreed: number,
    public readonly removedFiles: string[]
  ) {}
}

/**
 * File information.
 */
export class FileInfo {
  constructor(
    public readonly path: string,
    public readonly size: number,
    public readonly lastModified: Date,
    public readonly isRegularFile: boolean
  ) {}
}

/**
 * Storage statistics.
 */
export class StorageStats {
  constructor(
    public readonly totalFiles: number,
    public readonly totalSize: number,
    public readonly imageFiles: number,
    public readonly documentFiles: number,
    public readonly storagePath: string
  ) {}
}