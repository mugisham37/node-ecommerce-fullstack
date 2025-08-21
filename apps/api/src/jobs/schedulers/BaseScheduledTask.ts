import { Logger } from 'winston';
import { ScheduledTaskRegistry } from './ScheduledTaskRegistry';
import { ScheduledTaskMonitoringService } from '../monitoring/ScheduledTaskMonitoringService';
import { ScheduledTaskPerformanceService } from '../monitoring/ScheduledTaskPerformanceService';
import { createLogger } from '../../utils/logger';

/**
 * Base class for scheduled tasks that provides monitoring and performance tracking capabilities.
 * All scheduled tasks should extend this class to benefit from automatic monitoring.
 */
export abstract class BaseScheduledTask {
  protected readonly logger: Logger;
  
  constructor(
    protected readonly taskRegistry: ScheduledTaskRegistry,
    protected readonly monitoringService: ScheduledTaskMonitoringService,
    protected readonly performanceService: ScheduledTaskPerformanceService
  ) {
    this.logger = createLogger(this.constructor.name);
    this.registerTask();
  }

  /**
   * Register this task with the monitoring system after construction.
   */
  private registerTask(): void {
    const taskName = this.getTaskName();
    const description = this.getTaskDescription();
    
    this.taskRegistry.registerTask(taskName, description);
    this.logger.info(`Registered scheduled task: ${taskName} - ${description}`);
  }

  /**
   * Execute the scheduled task with full monitoring and error handling.
   */
  protected async executeTask(): Promise<void> {
    const taskName = this.getTaskName();
    
    await this.monitoringService.executeWithMonitoring(taskName, async () => {
      const startTime = Date.now();
      let success = false;
      
      try {
        this.logger.debug(`Starting scheduled task: ${taskName}`);
        
        // Execute the actual task logic
        await this.doExecute();
        
        success = true;
        this.logger.debug(`Completed scheduled task: ${taskName}`);
        
      } catch (error) {
        this.logger.error(`Error executing scheduled task: ${taskName}`, error);
        throw error;
      } finally {
        const executionTime = Date.now() - startTime;
        this.performanceService.logTaskPerformance(taskName, executionTime, success);
      }
    });
  }

  /**
   * Get the unique name for this scheduled task.
   * This name is used for monitoring and logging purposes.
   */
  protected abstract getTaskName(): string;

  /**
   * Get a human-readable description of what this task does.
   */
  protected abstract getTaskDescription(): string;

  /**
   * Execute the actual task logic.
   * Subclasses should implement this method with their specific task logic.
   */
  protected abstract doExecute(): Promise<void>;

  /**
   * Get the task registry for manual task management if needed.
   */
  protected getTaskRegistry(): ScheduledTaskRegistry {
    return this.taskRegistry;
  }

  /**
   * Get the monitoring service for custom monitoring if needed.
   */
  protected getMonitoringService(): ScheduledTaskMonitoringService {
    return this.monitoringService;
  }

  /**
   * Get the performance service for custom performance tracking if needed.
   */
  protected getPerformanceService(): ScheduledTaskPerformanceService {
    return this.performanceService;
  }
}