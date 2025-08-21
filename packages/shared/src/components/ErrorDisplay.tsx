/**
 * Error display components for showing different types of errors
 */

import React from 'react';
import { AppError, ValidationError } from '../errors';

interface ErrorDisplayProps {
  error: Error | AppError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Generic error display component
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!error) return null;

  const isAppError = error instanceof AppError;
  const isValidationError = error instanceof ValidationError;

  return (
    <div className={`error-display ${className}`} role="alert">
      <div className="error-display__content">
        <div className="error-display__icon">
          {isValidationError ? '⚠️' : '❌'}
        </div>
        
        <div className="error-display__message">
          <h4 className="error-display__title">
            {isAppError ? error.errorCode.replace(/_/g, ' ').toLowerCase() : 'Error'}
          </h4>
          <p className="error-display__text">{error.message}</p>
          
          {isValidationError && (
            <ValidationErrorList validationError={error} />
          )}
          
          {isAppError && Object.keys(error.context).length > 0 && (
            <details className="error-display__context">
              <summary>Additional Information</summary>
              <pre>{JSON.stringify(error.context, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>

      <div className="error-display__actions">
        {onRetry && (
          <button
            className="error-display__button error-display__button--primary"
            onClick={onRetry}
          >
            Try Again
          </button>
        )}
        {onDismiss && (
          <button
            className="error-display__button error-display__button--secondary"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Validation error list component
 */
interface ValidationErrorListProps {
  validationError: ValidationError;
}

export const ValidationErrorList: React.FC<ValidationErrorListProps> = ({
  validationError,
}) => {
  const errors = validationError.getValidationErrors();
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) return null;

  return (
    <div className="validation-error-list">
      <h5 className="validation-error-list__title">Validation Errors:</h5>
      <ul className="validation-error-list__list">
        {errorEntries.map(([field, message]) => (
          <li key={field} className="validation-error-list__item">
            <strong>{field}:</strong> {message}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Inline error message component (for form fields)
 */
interface InlineErrorProps {
  error?: string | null;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  className = '',
}) => {
  if (!error) return null;

  return (
    <div className={`inline-error ${className}`} role="alert">
      <span className="inline-error__icon">⚠️</span>
      <span className="inline-error__message">{error}</span>
    </div>
  );
};

/**
 * Toast error notification component
 */
interface ErrorToastProps {
  error: Error | AppError;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const isAppError = error instanceof AppError;

  return (
    <div className="error-toast" role="alert">
      <div className="error-toast__content">
        <div className="error-toast__icon">❌</div>
        <div className="error-toast__message">
          <div className="error-toast__title">
            {isAppError ? error.errorCode.replace(/_/g, ' ') : 'Error'}
          </div>
          <div className="error-toast__text">{error.message}</div>
        </div>
      </div>
      <button
        className="error-toast__close"
        onClick={onClose}
        aria-label="Close error notification"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Loading error component (for failed data fetching)
 */
interface LoadingErrorProps {
  error: Error | AppError;
  onRetry?: () => void;
  retryLabel?: string;
}

export const LoadingError: React.FC<LoadingErrorProps> = ({
  error,
  onRetry,
  retryLabel = 'Retry',
}) => {
  return (
    <div className="loading-error">
      <div className="loading-error__icon">⚠️</div>
      <h3 className="loading-error__title">Failed to load data</h3>
      <p className="loading-error__message">{error.message}</p>
      {onRetry && (
        <button
          className="loading-error__retry"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
};

/**
 * Empty state with error component
 */
interface EmptyStateErrorProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyStateError: React.FC<EmptyStateErrorProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content.',
  action,
}) => {
  return (
    <div className="empty-state-error">
      <div className="empty-state-error__icon">😕</div>
      <h3 className="empty-state-error__title">{title}</h3>
      <p className="empty-state-error__message">{message}</p>
      {action && (
        <button
          className="empty-state-error__action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};