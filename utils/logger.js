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
  }

  log(level, message, data = null) {
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

    // Also log to console
    const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                         level === LOG_LEVELS.WARN ? 'warn' : 
                         level === LOG_LEVELS.INFO ? 'info' : 'log';
    
    if (data) {
      console[consoleMethod](`[${level}] ${message}`, data);
    } else {
      console[consoleMethod](`[${level}] ${message}`);
    }

    // Log to a global object for easy access
    if (typeof global !== 'undefined') {
      global.__EXPO_LOGS__ = this.logs;
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
    if (__DEV__) {
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

export const logger = new Logger();

// Global error handler
if (typeof global !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    logger.error('Console Error', args);
    originalError(...args);
  };

  const originalWarn = console.warn;
  console.warn = (...args) => {
    logger.warn('Console Warning', args);
    originalWarn(...args);
  };
}

// React Native error handler
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logger.error('Global Error', {
      error: error.toString(),
      stack: error.stack,
      isFatal,
    });
    originalHandler(error, isFatal);
  });
}

export default logger;
