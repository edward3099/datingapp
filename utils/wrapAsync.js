// Utility to wrap async functions and automatically log errors
import { logger } from './logger';

/**
 * Wraps an async function to automatically catch and log errors
 * Usage: const safeAsyncFunction = wrapAsync(myAsyncFunction, 'Function name');
 */
export function wrapAsync(fn, functionName = 'Unknown Function') {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      logger.error(`Error in ${functionName}`, {
        error: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
        functionName,
        args: args.length > 0 ? args.map(arg => {
          // Don't log sensitive data
          if (typeof arg === 'object' && arg !== null) {
            if (arg.password) return { ...arg, password: '[REDACTED]' };
          }
          return typeof arg === 'function' ? '[Function]' : arg;
        }).slice(0, 3) : [],
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
      });
      throw error; // Re-throw so calling code can handle it
    }
  };
}

/**
 * Wraps a promise to automatically catch and log errors
 * Usage: safePromise(myPromise, 'Operation name');
 */
export function safePromise(promise, operationName = 'Unknown Operation') {
  return promise.catch((error) => {
    logger.error(`Error in promise: ${operationName}`, {
      error: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      operationName,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    throw error; // Re-throw so calling code can handle it
  });
}

/**
 * Executes an async function and logs errors without throwing
 * Useful for fire-and-forget operations
 */
export async function safeExecute(fn, functionName = 'Unknown Function', context = {}) {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Error in safeExecute: ${functionName}`, {
      error: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      functionName,
      context,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    // Don't re-throw - just log it
  }
}

// Make available globally
if (typeof global !== 'undefined') {
  global.wrapAsync = wrapAsync;
  global.safePromise = safePromise;
  global.safeExecute = safeExecute;
}

