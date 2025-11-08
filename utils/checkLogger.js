// Utility to check logger errors
// Run this in the Expo console or React Native debugger

import { logger } from './logger';

export function checkLoggerErrors() {
  try {
    const allLogs = logger.getLogs();
    const errors = logger.getErrors();
    const warnings = allLogs.filter(log => log.level === 'WARN');
    
    console.log('=== LOGGER STATUS ===');
    console.log(`Total logs: ${allLogs.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach((error, index) => {
        console.log(`\n[${index + 1}] ${error.message}`);
        if (error.data) {
          console.log('Data:', error.data);
        }
        console.log('Time:', error.timestamp);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n=== WARNINGS ===');
      warnings.forEach((warning, index) => {
        console.log(`\n[${index + 1}] ${warning.message}`);
        if (warning.data) {
          console.log('Data:', warning.data);
        }
      });
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ No errors or warnings captured');
    }
    
    return {
      total: allLogs.length,
      errors: errors.length,
      warnings: warnings.length,
      errorLogs: errors,
      warningLogs: warnings,
    };
  } catch (e) {
    console.error('Error checking logger:', e);
    return { total: 0, errors: 0, warnings: 0, errorLogs: [], warningLogs: [] };
  }
}

// Also export a function to get errors as JSON
export function getErrorsAsJSON() {
  try {
    const errors = logger.getErrors();
    return JSON.stringify(errors, null, 2);
  } catch (e) {
    return '[]';
  }
}

// Make it available globally in development
if (typeof global !== 'undefined') {
  try {
    // Check if __DEV__ is available (React Native)
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
    if (isDev) {
      global.checkLoggerErrors = checkLoggerErrors;
      global.getErrorsAsJSON = getErrorsAsJSON;
      global.logger = logger; // Also expose logger directly
    }
  } catch (e) {
    // Silently fail if global assignment fails
  }
}

