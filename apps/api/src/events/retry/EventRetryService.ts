import { BaseEvent, DomainEventType } from '../types';
import { RetryPolicy, RetryPolicies, RetryPolicyUtils, RetryContext, RetryResult } from './RetryPolicy';
import { DeadLetterQueueService } from '../dlq/DeadLetterQueueService';

/**
 * Event retry record for tracking retry attempts.
 */
export interface EventRetryRecord {
  eventId: string;
  eventType: string;
  aggregateId: string;
  userId: string;
  attempts: number;
  maxAttempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  nextRetryAt?: Date;
  lastError?: string;
  status: 'PENDING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER';
  metadata: Record<string, any>;
}

/**
 * Retry statistics for monitoring.
 */
export interface RetryStatistics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  deadLetterEvents: number;
  averageRetryCount: number;
  retryRateByEventType: Record<string, {
    total: number;
    successful: number;
    failed: number;
    averageAttempts: number;
  }>;
}

/**
 * In-memory repository for retry records (in production, use a persistent store).
 */
export class EventRetryRepository {
  private records: Map<string, EventRetryRecord> = new Map();

  async save(record: EventRetryRecord): Promise<void> {
    this.records.set(record.eventId, { ...record });
  }

  async findByEventId(eventId: string): Promise<EventRetryRecord | null> {
    return this.records.get(eventId) || null;
  }

  async findPendingRetries(): Promise<EventRetryRecord[]> {
    const now = new Date();
    return Array.from(this.records.values())
      .filter(record => 
        record.status === 'RETRYING' && 
        record.nextRetryAt && 
        record.nextRetryAt <= now
      );
  }

  async updateStatus(eventId: string, status: EventRetryRecord['status']): Promise<void> {
    const record = this.records.get(eventId);
    if (record) {
      record.status = status;
      record.lastAttemptAt = new Date();
    }
  }

  async incrementAttempts(eventId: string, error?: string): Promise<void> {
    const record = this.records.get(eventId);
    if (record) {
      record.attempts++;
      record.lastAttemptAt = new Date();
      if (error) {
        record.lastError = error;
      }
    }
  }

  async delete(eventId: string): Promise<void> {
    this.records.delete(eventId);
  }

  async getStatistics(): Promise<RetryStatistics> {
    const records = Array.from(this.records.values());
    
    const stats: RetryStatistics = {
      totalRetries: records.length,
      successfulRetries: records.filter(r => r.status === 'SUCCEEDED').length,
      failedRetries: records.filter(r => r.status === 'FAILED').length,
      deadLetterEvents: records.filter(r => r.status === 'DEAD_LETTER').length,
      averageRetryCount: 0,
      retryRateByEventType: {}
    };

    if (records.length > 0) {
      stats.averageRetryCount = records.reduce((sum, r) => sum + r.attempts, 0) / records.length;
    }

    // Calculate per-event-type statistics
    const eventTypeGroups = records.reduce((groups, record) => {
      if (!groups[record.eventType]) {
        groups[record.eventType] = [];
      }
      groups[record.eventType].push(record);
      return groups;
    }, {} as Record<string, EventRetryRecord[]>);

    for (const [eventType, typeRecords] of Object.entries(eventTypeGroups)) {
      stats.retryRateByEventType[eventType] = {
        total: typeRecords.length,
        successful: typeRecords.filter(r => r.status === 'SUCCEEDED').length,
        failed: typeRecords.filter(r => r.status === 'FAILED').length,
        averageAttempts: typeRecords.reduce((sum, r) => sum + r.attempts, 0) / typeRecords.length
      };
    }

    return stats;
  }

  async cleanup(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let cleanedCount = 0;
    for (const [eventId, record] of this.records.entries()) {
      if (record.lastAttemptAt < cutoffDate && 
          (record.status === 'SUCCEEDED' || record.status === 'FAILED' || record.status === 'DEAD_LETTER')) {
        this.records.delete(eventId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}

/**
 * Service for handling event processing retries with exponential backoff.
 * Provides configurable retry mechanisms for different types of events.
 */
export class EventRetryService {
  private retryRepository: EventRetryRepository;
  private deadLetterQueueService: DeadLetterQueueService;
  private retryIntervalId?: NodeJS.Timeout;

  constructor(
    retryRepository?: EventRetryRepository,
    deadLetterQueueService?: DeadLetterQueueService
  ) {
    this.retryRepository = retryRepository || new EventRetryRepository();
    this.deadLetterQueueService = deadLetterQueueService || new DeadLetterQueueService();
    this.startRetryProcessor();
  }

  /**
   * Executes event processing with retry logic.
   */
  public async executeWithRetry<T>(
    event: DomainEventType,
    processor: (event: DomainEventType) => Promise<T>,
    retryPolicy: RetryPolicy = RetryPolicies.default()
  ): Promise<RetryResult<T>> {
    RetryPolicyUtils.validatePolicy(retryPolicy);

    const context: RetryContext = {
      attempt: 1,
      totalAttempts: retryPolicy.maxAttempts,
      startTime: new Date(),
      metadata: {}
    };

    // Create or update retry record
    await this.createOrUpdateRetryRecord(event, retryPolicy);

    return this.processWithRetry(event, processor, retryPolicy, context);
  }

  /**
   * Processes event with retry logic and exponential backoff.
   */
  private async processWithRetry<T>(
    event: DomainEventType,
    processor: (event: DomainEventType) => Promise<T>,
    retryPolicy: RetryPolicy,
    context: RetryContext
  ): Promise<RetryResult<T>> {
    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      context.attempt = attempt;

      try {
        console.debug(`Processing event ${event.eventId} (attempt ${attempt}/${retryPolicy.maxAttempts})`);

        // Update retry record
        await this.retryRepository.incrementAttempts(event.eventId);

        // Process the event
        const result = await processor(event);

        // Success - clean up retry record
        await this.retryRepository.updateStatus(event.eventId, 'SUCCEEDED');
        await this.retryRepository.delete(event.eventId);

        const totalTime = Date.now() - context.startTime.getTime();
        console.info(`Successfully processed event ${event.eventId} after ${attempt} attempt(s) in ${totalTime}ms`);

        return {
          success: true,
          result,
          attempts: attempt,
          totalTime,
          context
        };

      } catch (error) {
        const err = error as Error;
        context.lastError = err;

        console.warn(`Event processing failed for ${event.eventId} (attempt ${attempt}/${retryPolicy.maxAttempts}): ${err.message}`);

        // Update retry record with error
        await this.retryRepository.incrementAttempts(event.eventId, err.message);

        // Check if error is retryable
        if (!RetryPolicyUtils.isRetryableError(err, retryPolicy)) {
          console.error(`Non-retryable error for event ${event.eventId}: ${err.message}`);
          await this.handleMaxRetriesExceeded(event, err, attempt);
          
          const totalTime = Date.now() - context.startTime.getTime();
          return {
            success: false,
            error: err,
            attempts: attempt,
            totalTime,
            context
          };
        }

        if (attempt === retryPolicy.maxAttempts) {
          // Max attempts reached
          await this.handleMaxRetriesExceeded(event, err, attempt);
          
          const totalTime = Date.now() - context.startTime.getTime();
          return {
            success: false,
            error: err,
            attempts: attempt,
            totalTime,
            context
          };
        }

        // Calculate delay for next attempt
        const delayMs = RetryPolicyUtils.calculateDelay(attempt, retryPolicy);
        context.nextRetryTime = new Date(Date.now() + delayMs);

        // Update retry record with next retry time
        const record = await this.retryRepository.findByEventId(event.eventId);
        if (record) {
          record.nextRetryAt = context.nextRetryTime;
          record.status = 'RETRYING';
          await this.retryRepository.save(record);
        }

        console.debug(`Waiting ${delayMs}ms before retry attempt ${attempt + 1} for event ${event.eventId}`);
        await this.sleep(delayMs);
      }
    }

    // This should never be reached, but included for completeness
    const totalTime = Date.now() - context.startTime.getTime();
    return {
      success: false,
      error: new Error('Unexpected retry loop exit'),
      attempts: retryPolicy.maxAttempts,
      totalTime,
      context
    };
  }

  /**
   * Creates or updates a retry record for an event.
   */
  private async createOrUpdateRetryRecord(event: DomainEventType, retryPolicy: RetryPolicy): Promise<void> {
    let record = await this.retryRepository.findByEventId(event.eventId);
    
    if (!record) {
      record = {
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        userId: event.userId,
        attempts: 0,
        maxAttempts: retryPolicy.maxAttempts,
        firstAttemptAt: new Date(),
        lastAttemptAt: new Date(),
        status: 'PENDING',
        metadata: {}
      };
    }

    await this.retryRepository.save(record);
  }

  /**
   * Handles events that have exceeded maximum retry attempts.
   */
  private async handleMaxRetriesExceeded(event: DomainEventType, lastError: Error, attempts: number): Promise<void> {
    console.error(`Event ${event.eventId} failed after ${attempts} attempts. Sending to dead letter queue. Last error: ${lastError.message}`);

    try {
      // Send to dead letter queue
      await this.deadLetterQueueService.sendToDeadLetterQueue(event, lastError, attempts);

      // Update retry record status
      await this.retryRepository.updateStatus(event.eventId, 'DEAD_LETTER');

    } catch (dlqError) {
      console.error(`Failed to send event ${event.eventId} to dead letter queue`, dlqError);
      await this.retryRepository.updateStatus(event.eventId, 'FAILED');
    }
  }

  /**
   * Starts the background retry processor.
   */
  private startRetryProcessor(): void {
    this.retryIntervalId = setInterval(async () => {
      try {
        await this.processPendingRetries();
      } catch (error) {
        console.error('Error in retry processor:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Processes pending retries.
   */
  private async processPendingRetries(): Promise<void> {
    const pendingRetries = await this.retryRepository.findPendingRetries();
    
    for (const record of pendingRetries) {
      console.debug(`Processing pending retry for event ${record.eventId}`);
      // In a real implementation, you would reconstruct the event and processor
      // and call executeWithRetry again. For now, we'll just log it.
    }
  }

  /**
   * Gets retry statistics for monitoring.
   */
  public async getRetryStatistics(): Promise<RetryStatistics> {
    return this.retryRepository.getStatistics();
  }

  /**
   * Cleans up old retry records.
   */
  public async cleanupOldRetryRecords(daysOld: number = 30): Promise<number> {
    const cleaned = await this.retryRepository.cleanup(daysOld);
    console.info(`Cleaned up ${cleaned} old retry records older than ${daysOld} days`);
    return cleaned;
  }

  /**
   * Stops the retry processor.
   */
  public stop(): void {
    if (this.retryIntervalId) {
      clearInterval(this.retryIntervalId);
      this.retryIntervalId = undefined;
    }
  }

  /**
   * Sleep utility function.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const eventRetryService = new EventRetryService();