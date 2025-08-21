import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';
import { ScheduledTaskRegistry, TaskMetrics } from '../schedulers/ScheduledTaskRegistry';

/**
 * Service for tracking and analyzing scheduled task performance.
 * Provides performance metrics, thresholds monitoring, and reporting capabilities.
 */
export class ScheduledTaskPerformanceService {
  private readonly logger: Logger;
  private readonly performanceLogger: Logger;
  private readonly taskThresholds = new Map<string, PerformanceThresholds>();

  constructor(private readonly taskRegistry: ScheduledTaskRegistry) {
    this.logger = createLogger('ScheduledTaskPerformanceService');
    this.performanceLogger = createLogger('SCHEDULED_TASK_PERFORMANCE');
    this.initializeDefaultThresholds();
  }

  /**
   * Log task performance metrics and check thresholds.
   */
  logTaskPerformance(taskName: string, executionTimeMs: number, success: boolean): void {
    const metrics = this.taskRegistry.getTaskMetrics(taskName);
    
    if (metrics) {
      // Log performance data
      this.performanceLogger.info('Task Performance', {
        taskName,
        executionTime: executionTimeMs,
        success,
        averageTime: metrics.getAverageExecutionTime(),
        successRate: metrics.getSuccessRate(),
        executionCount: metrics.getExecutionCount()
      });
      
      // Check performance thresholds
      this.checkPerformanceThresholds(taskName, executionTimeMs, metrics);
    }
  }

  /**
   * Generate comprehensive performance report for all tasks.
   */
  generatePerformanceReport(): string {
    const report: string[] = [];
    
    report.push('=== SCHEDULED TASK PERFORMANCE REPORT ===');
    report.push(`Generated at: ${new Date().toISOString()}`);
    report.push('');
    
    const allTasks = this.taskRegistry.getAllTasks();
    const allMetrics = this.taskRegistry.getAllMetrics();
    
    // Overall statistics
    const totalExecutions = Array.from(allMetrics.values())
      .reduce((sum, metrics) => sum + metrics.getExecutionCount(), 0);
    
    const totalSuccesses = Array.from(allMetrics.values())
      .reduce((sum, metrics) => sum + metrics.getSuccessCount(), 0);
    
    const overallSuccessRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;
    
    report.push('OVERALL STATISTICS:');
    report.push(`- Total Task Executions: ${totalExecutions}`);
    report.push(`- Total Successful Executions: ${totalSuccesses}`);
    report.push(`- Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    report.push(`- Active Tasks: ${allTasks.size}`);
    report.push('');
    
    // Individual task performance
    report.push('TASK PERFORMANCE DETAILS:');
    report.push('========================');
    
    allTasks.forEach((info, taskName) => {
      const metrics = allMetrics.get(taskName);
      const thresholds = this.taskThresholds.get(taskName);
      
      if (metrics) {
        report.push(`\nTask: ${taskName}`);
        report.push(`Description: ${info.getDescription()}`);
        report.push(`Status: ${info.getLastExecutionStatus()}`);
        report.push(`Executions: ${metrics.getExecutionCount()}`);
        report.push(`Success Rate: ${metrics.getSuccessRate().toFixed(1)}%`);
        report.push(`Average Execution Time: ${Math.round(metrics.getAverageExecutionTime())}ms`);
        report.push(`Max Execution Time: ${metrics.getMaxExecutionTime()}ms`);
        
        if (info.getLastExecutionStart()) {
          report.push(`Last Execution: ${info.getLastExecutionStart()?.toISOString()}`);
        }
        
        // Performance assessment
        const performance = this.assessTaskPerformance(metrics, thresholds);
        const health = this.assessTaskHealth(metrics);
        
        report.push(`Performance: ${performance}`);
        report.push(`Health: ${health}`);
        
        if (info.getLastErrorMessage()) {
          report.push(`Last Error: ${info.getLastErrorMessage()}`);
        }
      }
    });
    
    // Performance recommendations
    report.push('\n\nPERFORMANCE RECOMMENDATIONS:');
    report.push('============================');
    this.generatePerformanceRecommendations(report, allMetrics);
    
    return report.join('\n');
  }

  /**
   * Get performance trend for a specific task.
   */
  getTaskPerformanceTrend(taskName: string): TaskPerformanceTrend | null {
    const info = this.taskRegistry.getTaskInfo(taskName);
    const metrics = this.taskRegistry.getTaskMetrics(taskName);
    
    if (!info || !metrics) {
      return null;
    }
    
    const trend = this.calculateTrend(metrics);
    const recommendation = this.generateTaskRecommendation(taskName, metrics);
    
    return new TaskPerformanceTrend(
      taskName,
      metrics.getSuccessRate(),
      metrics.getAverageExecutionTime(),
      metrics.getExecutionCount(),
      trend,
      recommendation
    );
  }

  /**
   * Set performance thresholds for a specific task.
   */
  setTaskThresholds(taskName: string, thresholds: PerformanceThresholds): void {
    this.taskThresholds.set(taskName, thresholds);
    this.logger.info(`Updated performance thresholds for task: ${taskName}`, thresholds);
  }

  /**
   * Get performance metrics for all tasks.
   */
  getTaskPerformanceMetrics(): Map<string, TaskPerformanceMetrics> {
    const performanceMetrics = new Map<string, TaskPerformanceMetrics>();
    
    this.taskRegistry.getAllMetrics().forEach((metrics, taskName) => {
      const info = this.taskRegistry.getTaskInfo(taskName);
      if (info) {
        performanceMetrics.set(taskName, new TaskPerformanceMetrics(
          taskName,
          metrics.getExecutionCount(),
          metrics.getSuccessRate(),
          metrics.getAverageExecutionTime(),
          metrics.getMaxExecutionTime(),
          info.getLastExecutionStatus(),
          info.getLastExecutionStart()
        ));
      }
    });
    
    return performanceMetrics;
  }

  /**
   * Get error metrics for failed tasks.
   */
  getErrorMetrics(): Map<string, ErrorMetrics> {
    const errorMetrics = new Map<string, ErrorMetrics>();
    
    this.taskRegistry.getAllMetrics().forEach((metrics, taskName) => {
      if (metrics.getFailureCount() > 0) {
        const info = this.taskRegistry.getTaskInfo(taskName);
        errorMetrics.set(taskName, new ErrorMetrics(
          taskName,
          metrics.getFailureCount(),
          100 - metrics.getSuccessRate(),
          info?.getLastErrorMessage()
        ));
      }
    });
    
    return errorMetrics;
  }

  /**
   * Initialize default performance thresholds.
   */
  private initializeDefaultThresholds(): void {
    const defaultThresholds = new PerformanceThresholds(
      300000, // 5 minutes max execution time
      95.0,   // 95% min success rate
      10      // 10 min executions before alerting
    );
    
    // Set default thresholds for common tasks
    this.taskThresholds.set('low-stock-alert-processing', defaultThresholds);
    this.taskThresholds.set('inventory-analytics-processing', new PerformanceThresholds(600000, 90.0, 5));
    this.taskThresholds.set('reorder-recommendation-generation', new PerformanceThresholds(180000, 95.0, 10));
    this.taskThresholds.set('data-cleanup-task', new PerformanceThresholds(900000, 98.0, 3));
    this.taskThresholds.set('cache-optimization-task', new PerformanceThresholds(120000, 99.0, 20));
  }

  /**
   * Check performance thresholds and alert if exceeded.
   */
  private checkPerformanceThresholds(taskName: string, executionTimeMs: number, metrics: TaskMetrics): void {
    const thresholds = this.taskThresholds.get(taskName);
    
    if (!thresholds || metrics.getExecutionCount() < thresholds.minExecutionsForAlert) {
      return;
    }
    
    // Check execution time threshold
    if (executionTimeMs > thresholds.maxExecutionTime) {
      this.logger.warn(`Task ${taskName} exceeded execution time threshold: ${executionTimeMs}ms > ${thresholds.maxExecutionTime}ms`);
    }
    
    // Check success rate threshold
    if (metrics.getSuccessRate() < thresholds.minSuccessRate) {
      this.logger.warn(`Task ${taskName} below success rate threshold: ${metrics.getSuccessRate().toFixed(1)}% < ${thresholds.minSuccessRate}%`);
    }
  }

  /**
   * Assess task performance based on metrics and thresholds.
   */
  private assessTaskPerformance(metrics: TaskMetrics, thresholds?: PerformanceThresholds): string {
    if (metrics.getExecutionCount() === 0) {
      return 'NO_DATA';
    }
    
    if (!thresholds) {
      return 'UNKNOWN';
    }
    
    const successRate = metrics.getSuccessRate();
    const avgTime = metrics.getAverageExecutionTime();
    
    if (successRate >= thresholds.minSuccessRate && avgTime <= thresholds.maxExecutionTime) {
      return 'EXCELLENT';
    } else if (successRate >= thresholds.minSuccessRate * 0.9) {
      return 'GOOD';
    } else if (successRate >= thresholds.minSuccessRate * 0.8) {
      return 'FAIR';
    } else {
      return 'POOR';
    }
  }

  /**
   * Assess overall task health.
   */
  private assessTaskHealth(metrics: TaskMetrics): string {
    if (metrics.getExecutionCount() === 0) {
      return 'UNKNOWN';
    }
    
    const successRate = metrics.getSuccessRate();
    const recentFailures = metrics.getFailureCount();
    
    if (successRate >= 98.0 && recentFailures === 0) {
      return 'HEALTHY';
    } else if (successRate >= 95.0) {
      return 'STABLE';
    } else if (successRate >= 85.0) {
      return 'DEGRADED';
    } else {
      return 'UNHEALTHY';
    }
  }

  /**
   * Calculate performance trend.
   */
  private calculateTrend(metrics: TaskMetrics): string {
    // Simplified trend calculation - in a real system, you'd track historical data
    const successRate = metrics.getSuccessRate();
    
    if (successRate >= 98.0) {
      return 'IMPROVING';
    } else if (successRate >= 90.0) {
      return 'STABLE';
    } else {
      return 'DECLINING';
    }
  }

  /**
   * Generate task-specific recommendation.
   */
  private generateTaskRecommendation(taskName: string, metrics: TaskMetrics): string {
    const recommendations: string[] = [];
    
    if (metrics.getSuccessRate() < 95.0) {
      recommendations.push('Investigate frequent failures');
    }
    
    if (metrics.getAverageExecutionTime() > 300000) {
      recommendations.push('Optimize execution time');
    }
    
    if (metrics.getExecutionCount() < 10) {
      recommendations.push('Monitor for sufficient execution history');
    }
    
    return recommendations.length > 0 ? recommendations.join('; ') : 'Performance is within acceptable ranges';
  }

  /**
   * Generate performance recommendations.
   */
  private generatePerformanceRecommendations(report: string[], allMetrics: Map<string, TaskMetrics>): void {
    const recommendations: string[] = [];
    
    // Check for tasks with low success rates
    const lowSuccessTasks = Array.from(allMetrics.entries())
      .filter(([, metrics]) => metrics.getSuccessRate() < 90.0 && metrics.getExecutionCount() > 5)
      .map(([taskName]) => taskName);
    
    if (lowSuccessTasks.length > 0) {
      recommendations.push(`1. Investigate and fix issues with low success rate tasks: ${lowSuccessTasks.join(', ')}`);
    }
    
    // Check for slow tasks
    const slowTasks = Array.from(allMetrics.entries())
      .filter(([, metrics]) => metrics.getAverageExecutionTime() > 300000)
      .map(([taskName]) => taskName);
    
    if (slowTasks.length > 0) {
      recommendations.push(`2. Optimize performance for slow tasks: ${slowTasks.join(', ')}`);
    }
    
    // General recommendations
    recommendations.push('3. Regular monitoring of task performance metrics');
    recommendations.push('4. Set up automated alerts for performance degradation');
    recommendations.push('5. Consider implementing retry mechanisms for failed tasks');
    
    recommendations.forEach(rec => report.push(rec));
  }
}

/**
 * Performance thresholds for task monitoring.
 */
export class PerformanceThresholds {
  constructor(
    public readonly maxExecutionTime: number,
    public readonly minSuccessRate: number,
    public readonly minExecutionsForAlert: number
  ) {}
}

/**
 * Task performance trend information.
 */
export class TaskPerformanceTrend {
  constructor(
    public readonly taskName: string,
    public readonly successRate: number,
    public readonly averageExecutionTime: number,
    public readonly executionCount: number,
    public readonly trend: string,
    public readonly recommendation: string
  ) {}
}

/**
 * Task performance metrics.
 */
export class TaskPerformanceMetrics {
  constructor(
    public readonly taskName: string,
    public readonly executionCount: number,
    public readonly successRate: number,
    public readonly averageExecutionTime: number,
    public readonly maxExecutionTime: number,
    public readonly lastStatus: string,
    public readonly lastExecution?: Date
  ) {}
}

/**
 * Error metrics for failed tasks.
 */
export class ErrorMetrics {
  constructor(
    public readonly taskName: string,
    public readonly failureCount: number,
    public readonly failureRate: number,
    public readonly lastError?: string
  ) {}
}