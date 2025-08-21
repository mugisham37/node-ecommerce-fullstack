import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';
import { BackgroundWorker, JobTask, WorkerStats } from './BackgroundWorker';
import { EventEmitter } from 'events';

/**
 * Manager for coordinating multiple background workers.
 * Handles worker lifecycle, job distribution, and load balancing.
 */
export class WorkerManager extends EventEmitter {
  private readonly logger: Logger;
  private readonly workers = new Map<string, BackgroundWorker>();
  private isStarted = false;

  constructor(
    private readonly config: {
      defaultWorkerCount?: number;
      workerConfig?: {
        maxConcurrentJobs?: number;
        processingInterval?: number;
        retryAttempts?: number;
        retryDelay?: number;
      };
    } = {}
  ) {
    super();
    this.logger = createLogger('WorkerManager');
  }

  /**
   * Start the worker manager and create default workers.
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('Worker manager is already started');
      return;
    }

    this.logger.info('Starting worker manager');
    this.isStarted = true;

    // Create default workers
    const workerCount = this.config.defaultWorkerCount || 3;
    for (let i = 0; i < workerCount; i++) {
      await this.createWorker(`worker-${i + 1}`);
    }

    this.logger.info(`Worker manager started with ${this.workers.size} workers`);
    this.emit('started');
  }

  /**
   * Stop the worker manager and all workers.
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn('Worker manager is not started');
      return;
    }

    this.logger.info('Stopping worker manager');

    // Stop all workers
    const stopPromises = Array.from(this.workers.values()).map(worker => worker.stop());
    await Promise.all(stopPromises);

    this.workers.clear();
    this.isStarted = false;

    this.logger.info('Worker manager stopped');
    this.emit('stopped');
  }

  /**
   * Create a new worker.
   */
  async createWorker(workerId: string): Promise<BackgroundWorker> {
    if (this.workers.has(workerId)) {
      throw new Error(`Worker with ID ${workerId} already exists`);
    }

    const worker = new BackgroundWorker(workerId, this.config.workerConfig);

    // Set up event listeners
    this.setupWorkerEventListeners(worker);

    this.workers.set(workerId, worker);
    worker.start();

    this.logger.info(`Created and started worker: ${workerId}`);
    this.emit('workerCreated', workerId);

    return worker;
  }

  /**
   * Remove a worker.
   */
  async removeWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker with ID ${workerId} not found`);
    }

    await worker.stop();
    this.workers.delete(workerId);

    this.logger.info(`Removed worker: ${workerId}`);
    this.emit('workerRemoved', workerId);
  }

  /**
   * Add a job to the least busy worker.
   */
  addJob(job: JobTask): void {
    const worker = this.selectWorkerForJob(job);
    if (!worker) {
      throw new Error('No available workers to handle the job');
    }

    worker.addJob(job);
    this.logger.debug(`Assigned job ${job.id} to worker ${worker.getStats().workerId}`);
  }

  /**
   * Add a job to a specific worker.
   */
  addJobToWorker(workerId: string, job: JobTask): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker with ID ${workerId} not found`);
    }

    worker.addJob(job);
    this.logger.debug(`Assigned job ${job.id} to specific worker ${workerId}`);
  }

  /**
   * Get job status from all workers.
   */
  getJobStatus(jobId: string): { workerId: string; status: any } | null {
    for (const [workerId, worker] of this.workers.entries()) {
      const status = worker.getJobStatus(jobId);
      if (status) {
        return { workerId, status };
      }
    }
    return null;
  }

  /**
   * Get statistics for all workers.
   */
  getAllWorkerStats(): Map<string, WorkerStats> {
    const stats = new Map<string, WorkerStats>();
    
    for (const [workerId, worker] of this.workers.entries()) {
      stats.set(workerId, worker.getStats());
    }

    return stats;
  }

  /**
   * Get aggregated statistics.
   */
  getAggregatedStats(): AggregatedWorkerStats {
    const workerStats = Array.from(this.workers.values()).map(worker => worker.getStats());

    const totalWorkers = workerStats.length;
    const runningWorkers = workerStats.filter(stats => stats.isRunning).length;
    const totalQueuedJobs = workerStats.reduce((sum, stats) => sum + stats.queuedJobs, 0);
    const totalProcessingJobs = workerStats.reduce((sum, stats) => sum + stats.processingJobs, 0);
    const totalCompletedJobs = workerStats.reduce((sum, stats) => sum + stats.completedJobs, 0);
    
    const avgSuccessRate = workerStats.length > 0 
      ? workerStats.reduce((sum, stats) => sum + stats.successRate, 0) / workerStats.length
      : 0;
    
    const avgProcessingTime = workerStats.length > 0
      ? workerStats.reduce((sum, stats) => sum + stats.averageProcessingTime, 0) / workerStats.length
      : 0;

    return new AggregatedWorkerStats(
      totalWorkers,
      runningWorkers,
      totalQueuedJobs,
      totalProcessingJobs,
      totalCompletedJobs,
      avgSuccessRate,
      avgProcessingTime
    );
  }

  /**
   * Scale workers up or down based on load.
   */
  async scaleWorkers(targetCount: number): Promise<void> {
    const currentCount = this.workers.size;

    if (targetCount === currentCount) {
      this.logger.debug(`Worker count already at target: ${targetCount}`);
      return;
    }

    if (targetCount > currentCount) {
      // Scale up
      const workersToAdd = targetCount - currentCount;
      this.logger.info(`Scaling up: adding ${workersToAdd} workers`);

      for (let i = 0; i < workersToAdd; i++) {
        const workerId = `worker-${Date.now()}-${i}`;
        await this.createWorker(workerId);
      }
    } else {
      // Scale down
      const workersToRemove = currentCount - targetCount;
      this.logger.info(`Scaling down: removing ${workersToRemove} workers`);

      const workerIds = Array.from(this.workers.keys()).slice(-workersToRemove);
      
      for (const workerId of workerIds) {
        await this.removeWorker(workerId);
      }
    }

    this.emit('scaled', { from: currentCount, to: targetCount });
  }

  /**
   * Auto-scale workers based on queue load.
   */
  async autoScale(): Promise<void> {
    const stats = this.getAggregatedStats();
    const avgQueueSize = stats.totalQueuedJobs / Math.max(stats.totalWorkers, 1);

    let targetWorkerCount = stats.totalWorkers;

    // Scale up if average queue size is high
    if (avgQueueSize > 10 && stats.totalWorkers < 10) {
      targetWorkerCount = Math.min(stats.totalWorkers + 1, 10);
    }
    // Scale down if queues are empty and we have more than minimum workers
    else if (stats.totalQueuedJobs === 0 && stats.totalProcessingJobs === 0 && stats.totalWorkers > 2) {
      targetWorkerCount = Math.max(stats.totalWorkers - 1, 2);
    }

    if (targetWorkerCount !== stats.totalWorkers) {
      await this.scaleWorkers(targetWorkerCount);
    }
  }

  /**
   * Clear completed jobs from all workers.
   */
  clearAllCompletedJobs(): number {
    let totalCleared = 0;
    
    for (const worker of this.workers.values()) {
      totalCleared += worker.clearCompletedJobs();
    }

    this.logger.info(`Cleared ${totalCleared} completed jobs from all workers`);
    return totalCleared;
  }

  /**
   * Generate worker manager status report.
   */
  generateStatusReport(): string {
    const report: string[] = [];
    const aggregatedStats = this.getAggregatedStats();
    const workerStats = this.getAllWorkerStats();

    report.push('=== WORKER MANAGER STATUS REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');

    report.push('AGGREGATED STATISTICS:');
    report.push(`- Total Workers: ${aggregatedStats.totalWorkers}`);
    report.push(`- Running Workers: ${aggregatedStats.runningWorkers}`);
    report.push(`- Queued Jobs: ${aggregatedStats.totalQueuedJobs}`);
    report.push(`- Processing Jobs: ${aggregatedStats.totalProcessingJobs}`);
    report.push(`- Completed Jobs: ${aggregatedStats.totalCompletedJobs}`);
    report.push(`- Average Success Rate: ${aggregatedStats.avgSuccessRate.toFixed(1)}%`);
    report.push(`- Average Processing Time: ${Math.round(aggregatedStats.avgProcessingTime)}ms`);
    report.push('');

    report.push('INDIVIDUAL WORKER STATUS:');
    workerStats.forEach((stats, workerId) => {
      report.push(`- ${workerId}:`);
      report.push(`  Status: ${stats.isRunning ? 'RUNNING' : 'STOPPED'}`);
      report.push(`  Queued: ${stats.queuedJobs}`);
      report.push(`  Processing: ${stats.processingJobs}`);
      report.push(`  Completed: ${stats.completedJobs}`);
      report.push(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
      report.push(`  Avg Processing Time: ${Math.round(stats.averageProcessingTime)}ms`);
      report.push('');
    });

    return report.join('\n');
  }

  /**
   * Select the best worker for a job based on load balancing.
   */
  private selectWorkerForJob(job: JobTask): BackgroundWorker | null {
    if (this.workers.size === 0) {
      return null;
    }

    // Find worker with least queued jobs
    let selectedWorker: BackgroundWorker | null = null;
    let minQueueSize = Infinity;

    for (const worker of this.workers.values()) {
      const stats = worker.getStats();
      if (stats.isRunning && stats.queuedJobs < minQueueSize) {
        minQueueSize = stats.queuedJobs;
        selectedWorker = worker;
      }
    }

    return selectedWorker;
  }

  /**
   * Set up event listeners for a worker.
   */
  private setupWorkerEventListeners(worker: BackgroundWorker): void {
    const workerId = worker.getStats().workerId;

    worker.on('jobQueued', (job) => {
      this.emit('jobQueued', { workerId, job });
    });

    worker.on('jobStarted', (job) => {
      this.emit('jobStarted', { workerId, job });
    });

    worker.on('jobCompleted', (result) => {
      this.emit('jobCompleted', { workerId, result });
    });

    worker.on('jobFailed', (result) => {
      this.emit('jobFailed', { workerId, result });
    });

    worker.on('jobRetry', (job, error) => {
      this.emit('jobRetry', { workerId, job, error });
    });
  }
}

/**
 * Aggregated statistics for all workers.
 */
export class AggregatedWorkerStats {
  constructor(
    public readonly totalWorkers: number,
    public readonly runningWorkers: number,
    public readonly totalQueuedJobs: number,
    public readonly totalProcessingJobs: number,
    public readonly totalCompletedJobs: number,
    public readonly avgSuccessRate: number,
    public readonly avgProcessingTime: number
  ) {}
}