// Enhanced logging utility for debugging
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.logging = false; // Flag to prevent recursion
  }

  log(level, message, data = null) {
    // Prevent recursion
    if (this.logging) {
      return;
    }

    try {
      this.logging = true;

      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        data,
      };

      this.logs.push(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      // Also log to console (but use original console methods to avoid recursion)
      const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                           level === LOG_LEVELS.WARN ? 'warn' : 
                           level === LOG_LEVELS.INFO ? 'info' : 'log';
      
      // Use original console methods stored at module level
      const originalConsole = this.originalConsole || console;
      if (data) {
        originalConsole[consoleMethod](`[${level}] ${message}`, data);
      } else {
        originalConsole[consoleMethod](`[${level}] ${message}`);
      }

      // Log to a global object for easy access
      if (typeof global !== 'undefined') {
        global.__EXPO_LOGS__ = this.logs;
      }
    } catch (e) {
      // Silently fail to prevent crashes
    } finally {
      this.logging = false;
    }
  }

  error(message, data) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }

  getLogs() {
    return this.logs;
  }

  getErrors() {
    return this.logs.filter(log => log.level === LOG_LEVELS.ERROR);
  }

  clear() {
    this.logs = [];
  }
}

const logger = new Logger();

// Store original console methods before intercepting
logger.originalConsole = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
};

// Global error handler - only intercept if logger is ready
if (typeof global !== 'undefined' && logger) {
  try {
    const originalError = logger.originalConsole.error;
    console.error = (...args) => {
      try {
        if (logger && logger.error && !logger.logging) {
          logger.error('Console Error', args.length === 1 ? args[0] : args);
        }
      } catch (e) {
        // Prevent infinite loops
      }
      originalError(...args);
    };

    const originalWarn = logger.originalConsole.warn;
    console.warn = (...args) => {
      try {
        if (logger && logger.warn && !logger.logging) {
          logger.warn('Console Warning', args.length === 1 ? args[0] : args);
        }
      } catch (e) {
        // Prevent infinite loops
      }
      originalWarn(...args);
    };
  } catch (e) {
    // Silently fail if setup fails
  }
}

// React Native error handler
if (typeof ErrorUtils !== 'undefined' && logger) {
  try {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      try {
        if (logger && logger.error) {
          logger.error('Global Error', {
            error: error ? error.toString() : 'Unknown error',
            stack: error ? error.stack : undefined,
            isFatal,
          });
        }
      } catch (e) {
        // Prevent infinite loops
      }
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  } catch (e) {
    // Silently fail if setup fails
  }
}

export { logger };
export default logger;
