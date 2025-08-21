import * as cron from 'node-cron';
import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';
import { ScheduledTaskRegistry } from './ScheduledTaskRegistry';
import { ScheduledTaskMonitoringService } from '../monitoring/ScheduledTaskMonitoringService';
import { ScheduledTaskPerformanceService } from '../monitoring/ScheduledTaskPerformanceService';
import { LowStockAlertTask } from '../tasks/LowStockAlertTask';
import { InventoryReportTask } from '../tasks/InventoryReportTask';
import { DataCleanupTask } from '../tasks/DataCleanupTask';
import { CacheOptimizationTask } from '../tasks/CacheOptimizationTask';

/**
 * Main job scheduler that manages all scheduled tasks.
 * Handles task registration, scheduling, and lifecycle management.
 */
export class JobScheduler {
  private readonly logger: Logger;
  private readonly scheduledJobs = new Map<string, cron.ScheduledTask>();
  private isStarted = false;

  constructor(
    private readonly taskRegistry: ScheduledTaskRegistry,
    private readonly monitoringService: ScheduledTaskMonitoringService,
    private readonly performanceService: ScheduledTaskPerformanceService,
    private readonly tasks: {
      lowStockAlertTask: LowStockAlertTask;
      inventoryReportTask: InventoryReportTask;
      dataCleanupTask: DataCleanupTask;
      cacheOptimizationTask: CacheOptimizationTask;
    }
  ) {
    this.logger = createLogger('JobScheduler');
  }

  /**
   * Start all scheduled jobs.
   */
  start(): void {
    if (this.isStarted) {
      this.logger.warn('Job scheduler is already started');
      return;
    }

    this.logger.info('Starting job scheduler');

    try {
      this.scheduleAllJobs();
      this.isStarted = true;
      this.logger.info(`Job scheduler started with ${this.scheduledJobs.size} scheduled jobs`);
    } catch (error) {
      this.logger.error('Failed to start job scheduler', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs.
   */
  stop(): void {
    if (!this.isStarted) {
      this.logger.warn('Job scheduler is not started');
      return;
    }

    this.logger.info('Stopping job scheduler');

    try {
      for (const [jobName, job] of this.scheduledJobs.entries()) {
        job.stop();
        this.logger.debug(`Stopped job: ${jobName}`);
      }

      this.scheduledJobs.clear();
      this.isStarted = false;
      this.logger.info('Job scheduler stopped');
    } catch (error) {
      this.logger.error('Failed to stop job scheduler', error);
      throw error;
    }
  }

  /**
   * Restart the job scheduler.
   */
  restart(): void {
    this.logger.info('Restarting job scheduler');
    this.stop();
    this.start();
  }

  /**
   * Get status of all scheduled jobs.
   */
  getJobStatus(): Map<string, JobStatus> {
    const status = new Map<string, JobStatus>();

    for (const [jobName, job] of this.scheduledJobs.entries()) {
      const taskInfo = this.taskRegistry.getTaskInfo(jobName);
      const taskMetrics = this.taskRegistry.getTaskMetrics(jobName);

      status.set(jobName, new JobStatus(
        jobName,
        job.getStatus() === 'scheduled',
        taskInfo?.isCurrentlyExecuting() || false,
        taskInfo?.getLastExecutionStart(),
        taskInfo?.getLastExecutionStatus() || 'NEVER_EXECUTED',
        taskMetrics?.getExecutionCount() || 0,
        taskMetrics?.getSuccessRate() || 0
      ));
    }

    return status;
  }

  /**
   * Manually trigger a specific job.
   */
  async triggerJob(jobName: string): Promise<void> {
    this.logger.info(`Manually triggering job: ${jobName}`);

    try {
      switch (jobName) {
        case 'low-stock-alerts':
          await this.tasks.lowStockAlertTask.processLowStockAlerts();
          break;
        case 'weekly-inventory-report':
          await this.tasks.inventoryReportTask.generateWeeklyAnalytics();
          break;
        case 'monthly-inventory-report':
          await this.tasks.inventoryReportTask.generateMonthlyAnalytics();
          break;
        case 'daily-cleanup':
          await this.tasks.dataCleanupTask.performDailyCleanup();
          break;
        case 'cache-optimization':
          await this.tasks.cacheOptimizationTask.performMaintenanceTasks();
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }

      this.logger.info(`Successfully triggered job: ${jobName}`);
    } catch (error) {
      this.logger.error(`Failed to trigger job: ${jobName}`, error);
      throw error;
    }
  }

  /**
   * Schedule all jobs with their respective cron expressions.
   */
  private scheduleAllJobs(): void {
    // Low Stock Alert Processing - Every 5 minutes during business hours
    this.scheduleJob(
      'low-stock-alerts',
      '*/5 8-18 * * 1-5', // Every 5 minutes, 8 AM to 6 PM, Monday to Friday
      () => this.tasks.lowStockAlertTask.processLowStockAlerts(),
      'Process low stock alerts during business hours'
    );

    // Reset hourly alert counters - Every hour
    this.scheduleJob(
      'reset-alert-counters',
      '0 * * * *', // Every hour
      () => this.tasks.lowStockAlertTask.resetHourlyCounters(),
      'Reset hourly alert counters'
    );

    // Clean up alert tracking - Daily at 2 AM
    this.scheduleJob(
      'cleanup-alert-tracking',
      '0 2 * * *', // Daily at 2 AM
      () => this.tasks.lowStockAlertTask.cleanupAlertTracking(),
      'Clean up old alert tracking data'
    );

    // Weekly Inventory Analytics - Every Monday at 8 AM
    this.scheduleJob(
      'weekly-inventory-report',
      '0 8 * * 1', // Every Monday at 8 AM
      () => this.tasks.inventoryReportTask.generateWeeklyAnalytics(),
      'Generate weekly inventory analytics report'
    );

    // Monthly Inventory Analytics - First day of month at 9 AM
    this.scheduleJob(
      'monthly-inventory-report',
      '0 9 1 * *', // First day of month at 9 AM
      () => this.tasks.inventoryReportTask.generateMonthlyAnalytics(),
      'Generate monthly inventory analytics report'
    );

    // Daily Data Cleanup - Daily at 2 AM
    this.scheduleJob(
      'daily-cleanup',
      '0 2 * * *', // Daily at 2 AM
      () => this.tasks.dataCleanupTask.performDailyCleanup(),
      'Perform daily data cleanup operations'
    );

    // Cache Metrics Collection - Every 30 seconds
    this.scheduleJob(
      'cache-metrics-collection',
      '*/30 * * * * *', // Every 30 seconds
      () => this.tasks.cacheOptimizationTask.collectCacheMetrics(),
      'Collect cache performance metrics'
    );

    // Cache Health Monitoring - Every minute
    this.scheduleJob(
      'cache-health-monitoring',
      '* * * * *', // Every minute
      () => this.tasks.cacheOptimizationTask.monitorConnectionHealth(),
      'Monitor cache connection health'
    );

    // Cache Optimization - Every 5 minutes
    this.scheduleJob(
      'cache-optimization',
      '*/5 * * * *', // Every 5 minutes
      () => this.tasks.cacheOptimizationTask.performMaintenanceTasks(),
      'Perform cache optimization and maintenance'
    );
  }

  /**
   * Schedule a single job with error handling.
   */
  private scheduleJob(
    jobName: string,
    cronExpression: string,
    taskFunction: () => Promise<void>,
    description: string
  ): void {
    try {
      const job = cron.schedule(cronExpression, async () => {
        try {
          this.logger.debug(`Starting scheduled job: ${jobName}`);
          await taskFunction();
          this.logger.debug(`Completed scheduled job: ${jobName}`);
        } catch (error) {
          this.logger.error(`Scheduled job failed: ${jobName}`, error);
        }
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC'
      });

      this.scheduledJobs.set(jobName, job);
      job.start();

      this.logger.info(`Scheduled job: ${jobName} with cron expression: ${cronExpression}`);
    } catch (error) {
      this.logger.error(`Failed to schedule job: ${jobName}`, error);
      throw error;
    }
  }

  /**
   * Get scheduler statistics.
   */
  getSchedulerStats(): SchedulerStats {
    const totalJobs = this.scheduledJobs.size;
    const runningJobs = this.taskRegistry.getRunningTaskCount();
    const systemHealth = this.monitoringService.getSystemHealth();

    return new SchedulerStats(
      totalJobs,
      runningJobs,
      systemHealth.getHealthyTasks(),
      systemHealth.isHealthy(),
      this.isStarted
    );
  }

  /**
   * Generate scheduler status report.
   */
  generateStatusReport(): string {
    const report: string[] = [];
    const stats = this.getSchedulerStats();
    const jobStatuses = this.getJobStatus();

    report.push('=== JOB SCHEDULER STATUS REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    report.push('SCHEDULER OVERVIEW:');
    report.push(`- Status: ${stats.isRunning ? 'RUNNING' : 'STOPPED'}`);
    report.push(`- Total Jobs: ${stats.totalJobs}`);
    report.push(`- Currently Running: ${stats.runningJobs}`);
    report.push(`- Healthy Jobs: ${stats.healthyJobs}`);
    report.push(`- System Health: ${stats.isHealthy ? 'HEALTHY' : 'DEGRADED'}`);
    report.push('');

    report.push('JOB STATUS:');
    jobStatuses.forEach((status, jobName) => {
      report.push(`- ${jobName}:`);
      report.push(`  Scheduled: ${status.isScheduled ? 'YES' : 'NO'}`);
      report.push(`  Running: ${status.isRunning ? 'YES' : 'NO'}`);
      report.push(`  Last Status: ${status.lastStatus}`);
      report.push(`  Executions: ${status.executionCount}`);
      report.push(`  Success Rate: ${status.successRate.toFixed(1)}%`);
      if (status.lastExecution) {
        report.push(`  Last Run: ${status.lastExecution.toISOString()}`);
      }
      report.push('');
    });

    return report.join('\n');
  }
}

/**
 * Job status information.
 */
export class JobStatus {
  constructor(
    public readonly jobName: string,
    public readonly isScheduled: boolean,
    public readonly isRunning: boolean,
    public readonly lastExecution?: Date,
    public readonly lastStatus: string = 'NEVER_EXECUTED',
    public readonly executionCount: number = 0,
    public readonly successRate: number = 0
  ) {}
}

/**
 * Scheduler statistics.
 */
export class SchedulerStats {
  constructor(
    public readonly totalJobs: number,
    public readonly runningJobs: number,
    public readonly healthyJobs: number,
    public readonly isHealthy: boolean,
    public readonly isRunning: boolean
  ) {}
}