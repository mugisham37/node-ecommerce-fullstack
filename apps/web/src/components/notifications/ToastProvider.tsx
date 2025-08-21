'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string, action?: Toast['action']) => void;
  error: (title: string, description?: string, action?: Toast['action']) => void;
  warning: (title: string, description?: string, action?: Toast['action']) => void;
  info: (title: string, description?: string, action?: Toast['action']) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newToast = { ...toast, id };
      
      setToasts((prev) => {
        // Limit to 5 toasts maximum
        const updated = [newToast, ...prev].slice(0, 5);
        return updated;
      });

      // Auto dismiss after duration
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string, action?: Toast['action']) => {
      toast({ type: 'success', title, description, action });
    },
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string, action?: Toast['action']) => {
      toast({ type: 'error', title, description, action, duration: 7000 }); // Longer duration for errors
    },
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string, action?: Toast['action']) => {
      toast({ type: 'warning', title, description, action, duration: 6000 });
    },
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string, action?: Toast['action']) => {
      toast({ type: 'info', title, description, action });
    },
    [toast]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape to dismiss all toasts
      if (event.key === 'Escape') {
        dismissAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dismissAll]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        toast,
        success,
        error,
        warning,
        info,
        dismiss,
        dismissAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Enhanced toast container component with animations and better styling
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

// Individual toast item component with enhanced styling and animations
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 150); // Match animation duration
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: '✓',
          iconBg: 'bg-green-100 text-green-600',
          progressBar: 'bg-green-500',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: '✕',
          iconBg: 'bg-red-100 text-red-600',
          progressBar: 'bg-red-500',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: '⚠',
          iconBg: 'bg-yellow-100 text-yellow-600',
          progressBar: 'bg-yellow-500',
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'ℹ',
          iconBg: 'bg-blue-100 text-blue-600',
          progressBar: 'bg-blue-500',
        };
    }
  };

  const styles = getToastStyles(toast.type);

  return (
    <div
      className={`
        p-4 rounded-lg shadow-lg border transition-all duration-150 ease-in-out pointer-events-auto
        transform ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : isExiting 
            ? 'translate-x-full opacity-0 scale-95'
            : 'translate-x-full opacity-0 scale-95'
        }
        ${styles.container}
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
          ${styles.iconBg}
        `}>
          {styles.icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-5">{toast.title}</h4>
          {toast.description && (
            <p className="text-sm mt-1 opacity-90 leading-4">{toast.description}</p>
          )}
          
          {/* Action button */}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50 rounded"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-2 text-lg leading-none opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50 rounded"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && (
        <div className="mt-3 h-1 bg-black bg-opacity-10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${styles.progressBar} opacity-60 rounded-full`}
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}