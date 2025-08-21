import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';
import { ScheduledTaskRegistry, TaskExecutionInfo, TaskMetrics } from '../schedulers/ScheduledTaskRegistry';
import { NotificationService } from '../../services/NotificationService';

/**
 * Service for monitoring scheduled task execution and handling failures.
 * Provides capabilities for task health monitoring, failure detection, and alerting.
 */
export class ScheduledTaskMonitoringService {
  private readonly logger: Logger;

  constructor(
    private readonly taskRegistry: ScheduledTaskRegistry,
    private readonly notificationService: NotificationService
  ) {
    this.logger = createLogger('ScheduledTaskMonitoringService');
  }

  /**
   * Execute a scheduled task with monitoring and error handling.
   */
  async executeWithMonitoring(taskName: string, task: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    this.taskRegistry.recordTaskStart(taskName);

    try {
      await task();
      
      const executionTime = Date.now() - startTime;
      this.taskRegistry.recordTaskSuccess(taskName, executionTime);
      
      // Check for performance issues
      this.checkTaskPerformance(taskName, executionTime);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.taskRegistry.recordTaskFailure(taskName, executionTime, errorMessage);
      
      // Handle task failure
      await this.handleTaskFailure(taskName, error as Error);
      
      this.logger.error(`Scheduled task failed: ${taskName}`, error);
      throw error;
    }
  }

  /**
   * Check for tasks that haven't executed recently (potential stuck or failed tasks).
   */
  checkStuckTasks(maxHoursSinceLastExecution: number): string[] {
    const threshold = new Date(Date.now() - maxHoursSinceLastExecution * 60 * 60 * 1000);
    
    return Array.from(this.taskRegistry.getAllTasks().entries())
      .filter(([, info]) => {
        const lastStart = info.getLastExecutionStart();
        return lastStart && 
               lastStart < threshold && 
               !info.isCurrentlyExecuting();
      })
      .map(([taskName]) => taskName);
  }

  /**
   * Check for tasks with high failure rates.
   */
  checkHighFailureRateTasks(maxFailureRatePercent: number): string[] {
    return Array.from(this.taskRegistry.getAllMetrics().entries())
      .filter(([, metrics]) => {
        return metrics.getExecutionCount() > 0 && 
               (100.0 - metrics.getSuccessRate()) > maxFailureRatePercent;
      })
      .map(([taskName]) => taskName);
  }

  /**
   * Check for tasks with unusually long execution times.
   */
  checkSlowTasks(maxExecutionTimeMs: number): string[] {
    return Array.from(this.taskRegistry.getAllMetrics().entries())
      .filter(([, metrics]) => {
        return metrics.getAverageExecutionTime() > maxExecutionTimeMs;
      })
      .map(([taskName]) => taskName);
  }

  /**
   * Get overall system health status for scheduled tasks.
   */
  getSystemHealth(): TaskSystemHealth {
    const allTasks = this.taskRegistry.getAllTasks();
    const allMetrics = this.taskRegistry.getAllMetrics();
    
    const totalTasks = allTasks.size;
    const runningTasks = this.taskRegistry.getRunningTaskCount();
    
    const healthyTasks = Array.from(allMetrics.values())
      .filter(metrics => metrics.getSuccessRate() >= 95.0).length;
    
    const stuckTasks = this.checkStuckTasks(24); // 24 hours
    const highFailureTasks = this.checkHighFailureRateTasks(10.0); // 10% failure rate
    const slowTasks = this.checkSlowTasks(300000); // 5 minutes
    
    return new TaskSystemHealth(
      totalTasks,
      runningTasks,
      healthyTasks,
      stuckTasks,
      highFailureTasks,
      slowTasks
    );
  }

  /**
   * Generate a comprehensive task monitoring report.
   */
  generateMonitoringReport(): string {
    const health = this.getSystemHealth();
    const report: string[] = [];
    
    report.push('=== Scheduled Task Monitoring Report ===');
    report.push(`Generated at: ${new Date().toISOString()}`);
    report.push('');
    
    report.push('System Overview:');
    report.push(`- Total Tasks: ${health.getTotalTasks()}`);
    report.push(`- Currently Running: ${health.getRunningTasks()}`);
    report.push(`- Healthy Tasks: ${health.getHealthyTasks()}`);
    report.push('');
    
    if (health.getStuckTasks().length > 0) {
      report.push('Stuck Tasks (no execution in 24h):');
      health.getStuckTasks().forEach(task => report.push(`- ${task}`));
      report.push('');
    }
    
    if (health.getHighFailureTasks().length > 0) {
      report.push('High Failure Rate Tasks (>10%):');
      health.getHighFailureTasks().forEach(task => {
        const metrics = this.taskRegistry.getTaskMetrics(task);
        if (metrics) {
          const failureRate = 100.0 - metrics.getSuccessRate();
          report.push(`- ${task} (${failureRate.toFixed(1)}% failure rate)`);
        }
      });
      report.push('');
    }
    
    if (health.getSlowTasks().length > 0) {
      report.push('Slow Tasks (>5min average):');
      health.getSlowTasks().forEach(task => {
        const metrics = this.taskRegistry.getTaskMetrics(task);
        if (metrics) {
          const avgTime = Math.round(metrics.getAverageExecutionTime() / 1000);
          report.push(`- ${task} (${avgTime}s average)`);
        }
      });
      report.push('');
    }
    
    report.push('Task Details:');
    this.taskRegistry.getAllTasks().forEach((info, taskName) => {
      const metrics = this.taskRegistry.getTaskMetrics(taskName);
      report.push(`- ${taskName}:`);
      report.push(`  Status: ${info.getLastExecutionStatus()}`);
      if (metrics) {
        report.push(`  Executions: ${metrics.getExecutionCount()}`);
        report.push(`  Success Rate: ${metrics.getSuccessRate().toFixed(1)}%`);
      }
      if (info.getLastExecutionStart()) {
        report.push(`  Last Run: ${info.getLastExecutionStart()?.toISOString()}`);
      }
      report.push('');
    });
    
    return report.join('\n');
  }

  /**
   * Handle task failure with appropriate actions.
   */
  private async handleTaskFailure(taskName: string, error: Error): Promise<void> {
    const metrics = this.taskRegistry.getTaskMetrics(taskName);
    
    if (metrics) {
      const failureRate = 100.0 - metrics.getSuccessRate();
      
      // Send alert for high failure rates
      if (failureRate > 50.0 && metrics.getExecutionCount() >= 3) {
        const alertMessage = `Scheduled task '${taskName}' has high failure rate: ${failureRate.toFixed(1)}% (last error: ${error.message})`;
        
        try {
          await this.notificationService.sendSystemAlert('High Task Failure Rate', alertMessage);
        } catch (notificationError) {
          this.logger.error('Failed to send task failure alert', notificationError);
        }
      }
    }
  }

  /**
   * Check task performance and alert on issues.
   */
  private async checkTaskPerformance(taskName: string, executionTime: number): Promise<void> {
    // Alert on very long execution times (over 10 minutes)
    if (executionTime > 600000) {
      const alertMessage = `Scheduled task '${taskName}' took unusually long to execute: ${Math.round(executionTime / 1000)} seconds`;
      
      try {
        await this.notificationService.sendSystemAlert('Slow Task Execution', alertMessage);
      } catch (error) {
        this.logger.error('Failed to send slow task alert', error);
      }
    }
  }
}

/**
 * System health information for scheduled tasks.
 */
export class TaskSystemHealth {
  constructor(
    private readonly totalTasks: number,
    private readonly runningTasks: number,
    private readonly healthyTasks: number,
    private readonly stuckTasks: string[],
    private readonly highFailureTasks: string[],
    private readonly slowTasks: string[]
  ) {}

  getTotalTasks(): number { return this.totalTasks; }
  getRunningTasks(): number { return this.runningTasks; }
  getHealthyTasks(): number { return this.healthyTasks; }
  getStuckTasks(): string[] { return this.stuckTasks; }
  getHighFailureTasks(): string[] { return this.highFailureTasks; }
  getSlowTasks(): string[] { return this.slowTasks; }

  isHealthy(): boolean {
    return this.stuckTasks.length === 0 && 
           this.highFailureTasks.length === 0 && 
           this.slowTasks.length === 0;
  }
}