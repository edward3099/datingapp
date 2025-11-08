// Additional React-specific warning capture
// This runs early to catch React development warnings

import { logger } from './logger';

// Capture React warnings that might bypass console.warn
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  try {
    // React Native's YellowBox warnings (older versions)
    if (typeof console !== 'undefined' && console.warn) {
      // Already handled by logger.js, but ensure it's working
    }

    // Capture any warnings that use console.log with "Warning:" prefix
    const originalLog = console.log;
    console.log = function(...args) {
      try {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && (
          firstArg.includes('Warning:') ||
          firstArg.includes('Error:') ||
          firstArg.startsWith('⚠') ||
          firstArg.includes('React')
        )) {
          // This looks like a warning, log it
          if (logger && !logger.logging) {
            logger.warn('Development Warning (console.log)', {
              message: firstArg,
              args: args,
              _source: 'console.log',
              _isDevelopmentWarning: true,
            });
          }
        }
      } catch (e) {
        // Ignore
      }
      originalLog.apply(console, args);
    };
  } catch (e) {
    // Silently fail
  }
}

