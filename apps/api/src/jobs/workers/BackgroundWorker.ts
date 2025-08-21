import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * Background worker for processing asynchronous tasks.
 * Handles job queuing, processing, and error recovery.
 */
export class BackgroundWorker extends EventEmitter {
  private readonly logger: Logger;
  private readonly jobQueue: JobTask[] = [];
  private readonly processingJobs = new Map<string, JobTask>();
  private readonly completedJobs: JobResult[] = [];
  private readonly maxCompletedJobs = 1000;
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    private readonly workerId: string,
    private readonly config: {
      maxConcurrentJobs?: number;
      processingInterval?: number;
      retryAttempts?: number;
      retryDelay?: number;
    } = {}
  ) {
    super();
    this.logger = createLogger(`BackgroundWorker-${workerId}`);
  }

  /**
   * Start the background worker.
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Background worker is already running');
      return;
    }

    this.logger.info(`Starting background worker: ${this.workerId}`);
    this.isRunning = true;

    const interval = this.config.processingInterval || 1000; // 1 second
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, interval);

    this.emit('started');
  }

  /**
   * Stop the background worker.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Background worker is not running');
      return;
    }

    this.logger.info(`Stopping background worker: ${this.workerId}`);
    this.isRunning = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Wait for current jobs to complete
    await this.waitForJobsToComplete();

    this.emit('stopped');
  }

  /**
   * Add a job to the queue.
   */
  addJob(job: JobTask): void {
    job.queuedAt = new Date();
    job.status = 'queued';
    
    this.jobQueue.push(job);
    this.logger.debug(`Added job to queue: ${job.id} (${job.type})`);
    
    this.emit('jobQueued', job);
  }

  /**
   * Get worker statistics.
   */
  getStats(): WorkerStats {
    return new WorkerStats(
      this.workerId,
      this.isRunning,
      this.jobQueue.length,
      this.processingJobs.size,
      this.completedJobs.length,
      this.calculateSuccessRate(),
      this.getAverageProcessingTime()
    );
  }

  /**
   * Get job status by ID.
   */
  getJobStatus(jobId: string): JobResult | JobTask | null {
    // Check completed jobs first
    const completed = this.completedJobs.find(job => job.jobId === jobId);
    if (completed) return completed;

    // Check processing jobs
    const processing = this.processingJobs.get(jobId);
    if (processing) return processing;

    // Check queued jobs
    const queued = this.jobQueue.find(job => job.id === jobId);
    if (queued) return queued;

    return null;
  }

  /**
   * Get all jobs with a specific status.
   */
  getJobsByStatus(status: JobStatus): (JobTask | JobResult)[] {
    const jobs: (JobTask | JobResult)[] = [];

    if (status === 'queued') {
      jobs.push(...this.jobQueue);
    } else if (status === 'processing') {
      jobs.push(...Array.from(this.processingJobs.values()));
    } else if (status === 'completed' || status === 'failed') {
      jobs.push(...this.completedJobs.filter(job => job.status === status));
    }

    return jobs;
  }

  /**
   * Clear completed jobs from memory.
   */
  clearCompletedJobs(): number {
    const count = this.completedJobs.length;
    this.completedJobs.length = 0;
    this.logger.info(`Cleared ${count} completed jobs from memory`);
    return count;
  }

  /**
   * Process jobs from the queue.
   */
  private async processJobs(): Promise<void> {
    if (!this.isRunning) return;

    const maxConcurrent = this.config.maxConcurrentJobs || 5;
    const availableSlots = maxConcurrent - this.processingJobs.size;

    if (availableSlots <= 0 || this.jobQueue.length === 0) {
      return;
    }

    // Process available jobs
    const jobsToProcess = this.jobQueue.splice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.processJob(job);
    }
  }

  /**
   * Process a single job.
   */
  private async processJob(job: JobTask): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();
    this.processingJobs.set(job.id, job);

    this.logger.debug(`Processing job: ${job.id} (${job.type})`);
    this.emit('jobStarted', job);

    try {
      const result = await this.executeJob(job);
      await this.handleJobSuccess(job, result);
    } catch (error) {
      await this.handleJobError(job, error as Error);
    }
  }

  /**
   * Execute the job function.
   */
  private async executeJob(job: JobTask): Promise<any> {
    const timeout = job.timeout || 300000; // 5 minutes default

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Job timeout after ${timeout}ms`));
      }, timeout);

      job.handler(job.data)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful job completion.
   */
  private async handleJobSuccess(job: JobTask, result: any): Promise<void> {
    const completedAt = new Date();
    const processingTime = completedAt.getTime() - (job.startedAt?.getTime() || 0);

    const jobResult = new JobResult(
      job.id,
      job.type,
      'completed',
      result,
      undefined,
      job.queuedAt,
      job.startedAt,
      completedAt,
      processingTime,
      job.attempts
    );

    this.processingJobs.delete(job.id);
    this.addCompletedJob(jobResult);

    this.logger.debug(`Job completed successfully: ${job.id} (${processingTime}ms)`);
    this.emit('jobCompleted', jobResult);
  }

  /**
   * Handle job error and retry logic.
   */
  private async handleJobError(job: JobTask, error: Error): Promise<void> {
    job.attempts = (job.attempts || 0) + 1;
    const maxRetries = this.config.retryAttempts || 3;

    this.logger.error(`Job failed: ${job.id} (attempt ${job.attempts}/${maxRetries})`, error);

    if (job.attempts < maxRetries) {
      // Retry the job
      this.processingJobs.delete(job.id);
      job.status = 'queued';
      job.startedAt = undefined;

      // Add delay before retry
      const retryDelay = this.config.retryDelay || 5000;
      setTimeout(() => {
        this.jobQueue.unshift(job); // Add to front of queue for priority
        this.logger.debug(`Retrying job: ${job.id} (attempt ${job.attempts + 1})`);
      }, retryDelay);

      this.emit('jobRetry', job, error);
    } else {
      // Job failed permanently
      const completedAt = new Date();
      const processingTime = completedAt.getTime() - (job.startedAt?.getTime() || 0);

      const jobResult = new JobResult(
        job.id,
        job.type,
        'failed',
        undefined,
        error.message,
        job.queuedAt,
        job.startedAt,
        completedAt,
        processingTime,
        job.attempts
      );

      this.processingJobs.delete(job.id);
      this.addCompletedJob(jobResult);

      this.logger.error(`Job failed permanently: ${job.id}`, error);
      this.emit('jobFailed', jobResult);
    }
  }

  /**
   * Add completed job to history.
   */
  private addCompletedJob(jobResult: JobResult): void {
    this.completedJobs.push(jobResult);

    // Keep only recent completed jobs
    if (this.completedJobs.length > this.maxCompletedJobs) {
      this.completedJobs.shift();
    }
  }

  /**
   * Wait for all processing jobs to complete.
   */
  private async waitForJobsToComplete(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.processingJobs.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.processingJobs.size > 0) {
      this.logger.warn(`Forced shutdown with ${this.processingJobs.size} jobs still processing`);
    }
  }

  /**
   * Calculate success rate from completed jobs.
   */
  private calculateSuccessRate(): number {
    if (this.completedJobs.length === 0) return 0;

    const successful = this.completedJobs.filter(job => job.status === 'completed').length;
    return (successful / this.completedJobs.length) * 100;
  }

  /**
   * Get average processing time.
   */
  private getAverageProcessingTime(): number {
    if (this.completedJobs.length === 0) return 0;

    const totalTime = this.completedJobs.reduce((sum, job) => sum + job.processingTime, 0);
    return totalTime / this.completedJobs.length;
  }
}

/**
 * Job task definition.
 */
export class JobTask {
  public status: JobStatus = 'queued';
  public queuedAt?: Date;
  public startedAt?: Date;
  public attempts = 0;

  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly handler: (data: any) => Promise<any>,
    public readonly data: any,
    public readonly timeout?: number,
    public readonly priority: number = 0
  ) {}
}

/**
 * Job result after completion.
 */
export class JobResult {
  constructor(
    public readonly jobId: string,
    public readonly type: string,
    public readonly status: 'completed' | 'failed',
    public readonly result?: any,
    public readonly error?: string,
    public readonly queuedAt?: Date,
    public readonly startedAt?: Date,
    public readonly completedAt?: Date,
    public readonly processingTime: number = 0,
    public readonly attempts: number = 0
  ) {}
}

/**
 * Worker statistics.
 */
export class WorkerStats {
  constructor(
    public readonly workerId: string,
    public readonly isRunning: boolean,
    public readonly queuedJobs: number,
    public readonly processingJobs: number,
    public readonly completedJobs: number,
    public readonly successRate: number,
    public readonly averageProcessingTime: number
  ) {}
}

/**
 * Job status types.
 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';