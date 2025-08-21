import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';

/**
 * Registry service for managing and monitoring scheduled tasks.
 * Provides capabilities to track task execution, failures, and performance metrics.
 */
export class ScheduledTaskRegistry {
  private readonly logger: Logger;
  private readonly taskRegistry = new Map<string, TaskExecutionInfo>();
  private readonly taskMetrics = new Map<string, TaskMetrics>();

  constructor() {
    this.logger = createLogger('ScheduledTaskRegistry');
  }

  /**
   * Register a scheduled task for monitoring.
   */
  registerTask(taskName: string, description: string): void {
    const info = new TaskExecutionInfo(taskName, description);
    this.taskRegistry.set(taskName, info);
    this.taskMetrics.set(taskName, new TaskMetrics());
    
    this.logger.info(`Registered scheduled task: ${taskName} - ${description}`);
  }

  /**
   * Record the start of a task execution.
   */
  recordTaskStart(taskName: string): void {
    const info = this.taskRegistry.get(taskName);
    if (info) {
      info.setLastExecutionStart(new Date());
      info.setCurrentlyExecuting(true);
      
      const metrics = this.taskMetrics.get(taskName);
      if (metrics) {
        metrics.incrementExecutionCount();
      }
      
      this.logger.debug(`Task started: ${taskName}`);
    }
  }

  /**
   * Record the successful completion of a task execution.
   */
  recordTaskSuccess(taskName: string, executionTimeMs: number): void {
    const info = this.taskRegistry.get(taskName);
    if (info) {
      info.setLastExecutionEnd(new Date());
      info.setLastExecutionDuration(executionTimeMs);
      info.setCurrentlyExecuting(false);
      info.setLastExecutionStatus('SUCCESS');
      
      const metrics = this.taskMetrics.get(taskName);
      if (metrics) {
        metrics.incrementSuccessCount();
        metrics.updateAverageExecutionTime(executionTimeMs);
        metrics.updateMaxExecutionTime(executionTimeMs);
      }
      
      this.logger.debug(`Task completed successfully: ${taskName} (${executionTimeMs}ms)`);
    }
  }

  /**
   * Record a task execution failure.
   */
  recordTaskFailure(taskName: string, executionTimeMs: number, errorMessage: string): void {
    const info = this.taskRegistry.get(taskName);
    if (info) {
      info.setLastExecutionEnd(new Date());
      info.setLastExecutionDuration(executionTimeMs);
      info.setCurrentlyExecuting(false);
      info.setLastExecutionStatus('FAILED');
      info.setLastErrorMessage(errorMessage);
      
      const metrics = this.taskMetrics.get(taskName);
      if (metrics) {
        metrics.incrementFailureCount();
        metrics.updateAverageExecutionTime(executionTimeMs);
      }
      
      this.logger.warn(`Task failed: ${taskName} (${executionTimeMs}ms) - ${errorMessage}`);
    }
  }

  /**
   * Get execution information for a specific task.
   */
  getTaskInfo(taskName: string): TaskExecutionInfo | undefined {
    return this.taskRegistry.get(taskName);
  }

  /**
   * Get metrics for a specific task.
   */
  getTaskMetrics(taskName: string): TaskMetrics | undefined {
    return this.taskMetrics.get(taskName);
  }

  /**
   * Get all registered tasks.
   */
  getAllTasks(): Map<string, TaskExecutionInfo> {
    return new Map(this.taskRegistry);
  }

  /**
   * Get metrics for all tasks.
   */
  getAllMetrics(): Map<string, TaskMetrics> {
    return new Map(this.taskMetrics);
  }

  /**
   * Check if any tasks are currently executing.
   */
  hasRunningTasks(): boolean {
    return Array.from(this.taskRegistry.values()).some(info => info.isCurrentlyExecuting());
  }

  /**
   * Get count of currently executing tasks.
   */
  getRunningTaskCount(): number {
    return Array.from(this.taskRegistry.values()).filter(info => info.isCurrentlyExecuting()).length;
  }
}

/**
 * Information about a scheduled task execution.
 */
export class TaskExecutionInfo {
  private lastExecutionStart?: Date;
  private lastExecutionEnd?: Date;
  private lastExecutionDuration = 0;
  private currentlyExecuting = false;
  private lastExecutionStatus = 'NEVER_EXECUTED';
  private lastErrorMessage?: string;

  constructor(
    private readonly taskName: string,
    private readonly description: string,
    private readonly registeredAt = new Date()
  ) {}

  // Getters
  getTaskName(): string { return this.taskName; }
  getDescription(): string { return this.description; }
  getRegisteredAt(): Date { return this.registeredAt; }
  getLastExecutionStart(): Date | undefined { return this.lastExecutionStart; }
  getLastExecutionEnd(): Date | undefined { return this.lastExecutionEnd; }
  getLastExecutionDuration(): number { return this.lastExecutionDuration; }
  isCurrentlyExecuting(): boolean { return this.currentlyExecuting; }
  getLastExecutionStatus(): string { return this.lastExecutionStatus; }
  getLastErrorMessage(): string | undefined { return this.lastErrorMessage; }

  // Setters
  setLastExecutionStart(date: Date): void { this.lastExecutionStart = date; }
  setLastExecutionEnd(date: Date): void { this.lastExecutionEnd = date; }
  setLastExecutionDuration(duration: number): void { this.lastExecutionDuration = duration; }
  setCurrentlyExecuting(executing: boolean): void { this.currentlyExecuting = executing; }
  setLastExecutionStatus(status: string): void { this.lastExecutionStatus = status; }
  setLastErrorMessage(message: string): void { this.lastErrorMessage = message; }
}

/**
 * Metrics for a scheduled task.
 */
export class TaskMetrics {
  private executionCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private totalExecutionTime = 0;
  private maxExecutionTime = 0;

  incrementExecutionCount(): void {
    this.executionCount++;
  }

  incrementSuccessCount(): void {
    this.successCount++;
  }

  incrementFailureCount(): void {
    this.failureCount++;
  }

  updateAverageExecutionTime(executionTime: number): void {
    this.totalExecutionTime += executionTime;
  }

  updateMaxExecutionTime(executionTime: number): void {
    if (executionTime > this.maxExecutionTime) {
      this.maxExecutionTime = executionTime;
    }
  }

  getExecutionCount(): number { return this.executionCount; }
  getSuccessCount(): number { return this.successCount; }
  getFailureCount(): number { return this.failureCount; }
  
  getSuccessRate(): number {
    return this.executionCount > 0 ? (this.successCount / this.executionCount) * 100 : 0;
  }
  
  getAverageExecutionTime(): number {
    return this.executionCount > 0 ? this.totalExecutionTime / this.executionCount : 0;
  }
  
  getMaxExecutionTime(): number { return this.maxExecutionTime; }
}