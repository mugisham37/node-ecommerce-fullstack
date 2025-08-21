// Schedulers
export { BaseScheduledTask } from './schedulers/BaseScheduledTask';
export { ScheduledTaskRegistry, TaskExecutionInfo, TaskMetrics } from './schedulers/ScheduledTaskRegistry';
export { JobScheduler, JobStatus, SchedulerStats } from './schedulers/JobScheduler';

// Monitoring
export { ScheduledTaskMonitoringService, TaskSystemHealth } from './monitoring/ScheduledTaskMonitoringService';
export { 
  ScheduledTaskPerformanceService, 
  PerformanceThresholds, 
  TaskPerformanceTrend, 
  TaskPerformanceMetrics, 
  ErrorMetrics 
} from './monitoring/ScheduledTaskPerformanceService';

// Tasks
export { LowStockAlertTask } from './tasks/LowStockAlertTask';
export { InventoryReportTask } from './tasks/InventoryReportTask';
export { DataCleanupTask, CleanupResult, FileInfo, StorageStats } from './tasks/DataCleanupTask';
export { 
  CacheOptimizationTask, 
  CacheMetrics, 
  CacheHealthStatus, 
  CachePerformanceMetrics, 
  CacheOptimizationResult, 
  CacheAlertThresholds 
} from './tasks/CacheOptimizationTask';

// Workers
export { BackgroundWorker, JobTask, JobResult, WorkerStats, JobStatus } from './workers/BackgroundWorker';
export { WorkerManager, AggregatedWorkerStats } from './workers/WorkerManager';

// Job factory for creating common job types
export class JobFactory {
  /**
   * Create a low stock alert job.
   */
  static createLowStockAlertJob(data: { productId: number; alertType: string }): JobTask {
    return new JobTask(
      `low-stock-${data.productId}-${Date.now()}`,
      'low-stock-alert',
      async (jobData) => {
        // Job handler would be implemented here
        console.log('Processing low stock alert:', jobData);
        return { success: true, processed: jobData };
      },
      data,
      30000, // 30 second timeout
      1 // High priority
    );
  }

  /**
   * Create an inventory report job.
   */
  static createInventoryReportJob(data: { reportType: 'weekly' | 'monthly'; userId: string }): JobTask {
    return new JobTask(
      `inventory-report-${data.reportType}-${Date.now()}`,
      'inventory-report',
      async (jobData) => {
        // Job handler would be implemented here
        console.log('Generating inventory report:', jobData);
        return { success: true, reportGenerated: true };
      },
      data,
      300000, // 5 minute timeout
      0 // Normal priority
    );
  }

  /**
   * Create a data cleanup job.
   */
  static createDataCleanupJob(data: { cleanupType: string; targetPath?: string }): JobTask {
    return new JobTask(
      `data-cleanup-${data.cleanupType}-${Date.now()}`,
      'data-cleanup',
      async (jobData) => {
        // Job handler would be implemented here
        console.log('Performing data cleanup:', jobData);
        return { success: true, filesRemoved: 0, spaceFreed: 0 };
      },
      data,
      600000, // 10 minute timeout
      -1 // Low priority
    );
  }

  /**
   * Create a cache optimization job.
   */
  static createCacheOptimizationJob(data: { optimizationType: string }): JobTask {
    return new JobTask(
      `cache-optimization-${data.optimizationType}-${Date.now()}`,
      'cache-optimization',
      async (jobData) => {
        // Job handler would be implemented here
        console.log('Optimizing cache:', jobData);
        return { success: true, keysOptimized: 0, memoryFreed: 0 };
      },
      data,
      120000, // 2 minute timeout
      0 // Normal priority
    );
  }

  /**
   * Create a notification job.
   */
  static createNotificationJob(data: { 
    type: 'email' | 'sms' | 'push'; 
    recipient: string; 
    message: string; 
    subject?: string 
  }): JobTask {
    return new JobTask(
      `notification-${data.type}-${Date.now()}`,
      'notification',
      async (jobData) => {
        // Job handler would be implemented here
        console.log('Sending notification:', jobData);
        return { success: true, sent: true };
      },
      data,
      60000, // 1 minute timeout
      1 // High priority
    );
  }

  /**
   * Create a file processing job.
   */
  static createFileProcessingJob(data: { 
    filePath: string; 
    operation: 'compress' | 'resize' | 'convert'; 
    options?: any 
  }): JobTask {
    return new JobTask(
      `file-processing-${data.operation}-${Date.now()}`,
      'file-processing',
      async (jobData) => {
        // Job handler would be implemented here
        console.log('Processing file:', jobData);
        return { success: true, outputPath: jobData.filePath };
      },
      data,
      180000, // 3 minute timeout
      0 // Normal priority
    );
  }
}

// Job types enum for type safety
export enum JobType {
  LOW_STOCK_ALERT = 'low-stock-alert',
  INVENTORY_REPORT = 'inventory-report',
  DATA_CLEANUP = 'data-cleanup',
  CACHE_OPTIMIZATION = 'cache-optimization',
  NOTIFICATION = 'notification',
  FILE_PROCESSING = 'file-processing',
  EMAIL_SENDING = 'email-sending',
  BACKUP_CREATION = 'backup-creation',
  LOG_ROTATION = 'log-rotation',
  METRICS_COLLECTION = 'metrics-collection'
}

// Priority levels for jobs
export enum JobPriority {
  LOW = -1,
  NORMAL = 0,
  HIGH = 1,
  CRITICAL = 2
}