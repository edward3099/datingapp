// Restored minimal logger compatible with existing debug utilities.
const LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

// Check if we're in development mode
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

const globalObject = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : undefined);

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = isDevelopment ? 200 : 50; // Store fewer logs in production
    this.originalConsole = {};
    this.initialized = false;
    this.isDevelopment = isDevelopment;
  }

  initialize() {
    if (this.initialized) return;

    const methods = ['error', 'warn', 'info', 'log'];
    methods.forEach(method => {
      if (typeof console[method] === 'function') {
        this.originalConsole[method] = console[method].bind(console);
      }
    });

    const logger = this;

    // Always capture errors, even in production
    if (typeof console.error === 'function') {
      console.error = function(...args) {
        logger.recordConsole(LEVELS.ERROR, args);
        // Only output to console in development
        if (logger.isDevelopment && logger.originalConsole.error) {
          logger.originalConsole.error(...args);
        }
      };
    }

    // Only intercept and log warnings/info/debug in development
    if (this.isDevelopment) {
      if (typeof console.warn === 'function') {
        console.warn = function(...args) {
          logger.recordConsole(LEVELS.WARN, args);
          if (logger.originalConsole.warn) {
            logger.originalConsole.warn(...args);
          }
        };
      }

      if (typeof console.info === 'function') {
        console.info = function(...args) {
          logger.recordConsole(LEVELS.INFO, args);
          if (logger.originalConsole.info) {
            logger.originalConsole.info(...args);
          }
        };
      }

      if (typeof console.log === 'function') {
        console.log = function(...args) {
          logger.recordConsole(LEVELS.DEBUG, args);
          if (logger.originalConsole.log) {
            logger.originalConsole.log(...args);
          }
        };
      }
    } else {
      // In production, silence console.log, console.info, and console.warn
      if (typeof console.log === 'function') {
        console.log = function() {}; // No-op in production
      }
      if (typeof console.info === 'function') {
        console.info = function() {}; // No-op in production
      }
      if (typeof console.warn === 'function') {
        console.warn = function() {}; // No-op in production
      }
    }

    this.initialized = true;
  }

  recordConsole(level, args) {
    const timestamp = new Date().toISOString();
    const [first, ...rest] = args;
    const message = typeof first === 'string' ? first : this.stringify(first);
    const data = rest.length > 0 ? rest : first && typeof first === 'object' ? first : null;
    this.pushLog({ timestamp, level, message, data });
  }

  pushLog(entry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    if (globalObject) {
      globalObject.__EXPO_LOGS__ = this.logs;
    }
  }

  stringify(value) {
    if (value instanceof Error) {
      return `${value.name}: ${value.message}`;
    }
    if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[object]';
      }
    }
    return value !== undefined ? String(value) : '';
  }

  log(level, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : this.stringify(message),
      data: data ?? null,
    };
    
    // Only store logs in development, or if it's an error
    if (this.isDevelopment || level === LEVELS.ERROR) {
      this.pushLog(entry);
    }

    // Only output to console in development
    if (this.isDevelopment) {
      const method = level === LEVELS.ERROR ? 'error' : level === LEVELS.WARN ? 'warn' : 'log';
      const original = this.originalConsole[method];
      if (original) {
        original(`[${level}] ${entry.message}`, data || '');
      }
    }
  }

  error(message, data) {
    this.log(LEVELS.ERROR, message, data);
  }

  warn(message, data) {
    this.log(LEVELS.WARN, message, data);
  }

  info(message, data) {
    // Only log info messages in development
    if (this.isDevelopment) {
      this.log(LEVELS.INFO, message, data);
    }
  }

  debug(message, data) {
    // Only log debug messages in development
    if (this.isDevelopment) {
      this.log(LEVELS.DEBUG, message, data);
    }
  }

  getLogs() {
    return [...this.logs];
  }

  getErrors() {
    return this.logs.filter(entry => entry.level === LEVELS.ERROR);
  }

  clear() {
    this.logs = [];
    if (globalObject) {
      globalObject.__EXPO_LOGS__ = [];
    }
  }
}

const logger = new Logger();
logger.initialize();

export { logger };
export default logger;
