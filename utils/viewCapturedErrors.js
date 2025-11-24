// Script to view captured errors
// This can be run from the Expo console or React Native debugger

import { logger } from './logger';

const globalObject = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : undefined);

export function viewCapturedErrors() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 CAPTURED ERRORS REPORT');
  console.log('='.repeat(60));
  
  const allLogs = logger.getLogs();
  const errors = logger.getErrors();
  const warnings = allLogs.filter(log => log.level === 'WARN');
  
  console.log(`\nTotal Logs: ${allLogs.length}`);
  console.log(`Errors Captured: ${errors.length}`);
  console.log(`Warnings Captured: ${warnings.length}`);
  console.log('\n' + '-'.repeat(60));
  
  if (errors.length === 0) {
    console.log('\n✅ No errors have been captured yet.');
    console.log('\nThe logger is ready and will capture standard console errors, global errors, and uncaught exceptions.');
  } else {
    console.log(`\n📛 ${errors.length} ERROR(S) CAPTURED:\n`);
    errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.timestamp}] ${error.message}`);
      if (error.data) {
        if (typeof error.data === 'object') {
          console.log('   Data:', JSON.stringify(error.data, null, 2));
        } else {
          console.log('   Data:', error.data);
        }
      }
      console.log('');
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} WARNING(S) CAPTURED:\n`);
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. [${warning.timestamp}] ${warning.message}`);
      if (warning.data) {
        console.log('   Data:', warning.data);
      }
      console.log('');
    });
  }
  
  console.log('='.repeat(60));
  console.log('\nTo view in UI: Navigate to Debug screen');
  console.log('To export: Use exportLogsToFile() or Debug screen');
  console.log('To check again: Call viewCapturedErrors()\n');
  
  return {
    total: allLogs.length,
    errors: errors.length,
    warnings: warnings.length,
    errorLogs: errors,
    warningLogs: warnings,
    allLogs: allLogs,
  };
}

// Make available globally
if (globalObject) {
  globalObject.viewCapturedErrors = viewCapturedErrors;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    setTimeout(() => {
      console.log('\n🔍 Logger Status Check...');
      viewCapturedErrors();
    }, 2000);
  }
}

export default viewCapturedErrors;

