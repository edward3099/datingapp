// Global error handler to catch all errors that might slip through
import { logger } from './logger';

// Initialize comprehensive error catching
export function initializeGlobalErrorHandlers() {
  // Window error handler (for web/react-native-web)
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      try {
        logger.error('Window Error Event', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error ? {
            message: event.error.message,
            stack: event.error.stack,
            name: event.error.name,
          } : null,
        });
      } catch (e) {
        // Ignore logger errors
      }
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const reason = event.reason;
        logger.error('Unhandled Promise Rejection (Window)', {
          reason: reason?.toString() || String(reason),
          message: reason?.message,
          stack: reason?.stack,
          name: reason?.name,
          error: reason instanceof Error ? {
            message: reason.message,
            stack: reason.stack,
            name: reason.name,
          } : reason,
        });
      } catch (e) {
        // Ignore logger errors
      }
    });
  }

  // React Native specific handlers
  if (typeof global !== 'undefined') {
    // Note: console.error is already intercepted by logger.js
    // We're just adding additional error handlers here

    // Catch any thrown errors in async operations
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = function(callback, delay, ...args) {
      return originalSetTimeout(function() {
        try {
          callback.apply(this, args);
        } catch (error) {
          logger.error('Error in setTimeout callback', {
            error: error?.toString() || String(error),
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          });
          throw error;
        }
      }, delay);
    };
  }
}

// Auto-initialize
if (typeof global !== 'undefined' || typeof window !== 'undefined') {
  // Initialize after a small delay to ensure logger is ready
  setTimeout(() => {
    try {
      initializeGlobalErrorHandlers();
    } catch (e) {
      // Silently fail
    }
  }, 100);
}

