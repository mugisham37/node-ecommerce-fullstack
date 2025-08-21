import { AppError, ErrorContext } from './index';

/**
 * Order-specific errors
 */
export class OrderError extends AppError {
  constructor(
    message: string,
    errorCode: string = 'ORDER_ERROR',
    context: ErrorContext = {}
  ) {
    super(message, errorCode, 'ORDER', 400, context);
  }
}

/**
 * Order processing error
 */
export class OrderProcessingError extends OrderError {
  constructor(
    orderId: string,
    stage: string,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Order processing failed for order ${orderId} at stage '${stage}': ${reason}`,
      'ORDER_PROCESSING_ERROR',
      {
        ...context,
        orderId,
        stage,
        reason,
      }
    );
  }
}

/**
 * Order fulfillment error
 */
export class OrderFulfillmentError extends OrderError {
  constructor(
    orderId: string,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Order fulfillment failed for order ${orderId}: ${reason}`,
      'ORDER_FULFILLMENT_ERROR',
      {
        ...context,
        orderId,
        reason,
      }
    );
  }
}

/**
 * Order cancellation error
 */
export class OrderCancellationError extends OrderError {
  constructor(
    orderId: string,
    currentStatus: string,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Cannot cancel order ${orderId} with status '${currentStatus}': ${reason}`,
      'ORDER_CANCELLATION_ERROR',
      {
        ...context,
        orderId,
        currentStatus,
        reason,
      }
    );
  }
}

/**
 * Order payment error
 */
export class OrderPaymentError extends OrderError {
  constructor(
    orderId: string,
    paymentMethod: string,
    reason: string,
    context: ErrorContext = {}
  ) {
    super(
      `Payment failed for order ${orderId} using ${paymentMethod}: ${reason}`,
      'ORDER_PAYMENT_ERROR',
      {
        ...context,
        orderId,
        paymentMethod,
        reason,
      }
    );
  }
}

/**
 * Order validation error
 */
export class OrderValidationError extends OrderError {
  constructor(
    orderId: string,
    validationIssues: string[],
    context: ErrorContext = {}
  ) {
    super(
      `Order validation failed for order ${orderId}: ${validationIssues.join(', ')}`,
      'ORDER_VALIDATION_ERROR',
      {
        ...context,
        orderId,
        validationIssues,
        issueCount: validationIssues.length,
      }
    );
  }
}