// Simple utility to show captured errors
// Run this in the Expo console: require('./utils/showErrors').showErrors()

import { logger } from './logger';

export function showErrors() {
  const errors = logger.getErrors();
  const allLogs = logger.getLogs();
  const warnings = allLogs.filter(log => log.level === 'WARN');
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║           CAPTURED ERRORS REPORT                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Statistics:`);
  console.log(`   Total Logs: ${allLogs.length}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}\n`);
  
  if (errors.length === 0) {
    console.log('✅ No errors captured.\n');
    return { errors: [], warnings };
  }
  
  console.log(`📛 ${errors.length} ERROR(S) FOUND:\n`);
  console.log('═'.repeat(60));
  
  errors.forEach((error, index) => {
    console.log(`\n[${index + 1}] ${error.message}`);
    console.log(`    Time: ${error.timestamp}`);
    if (error.data) {
      console.log(`    Data:`);
      if (typeof error.data === 'object') {
        try {
          console.log(JSON.stringify(error.data, null, 6).split('\n').map(line => '    ' + line).join('\n'));
        } catch (e) {
          console.log(`    ${String(error.data)}`);
        }
      } else {
        console.log(`    ${error.data}`);
      }
    }
    console.log('─'.repeat(60));
  });
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} WARNING(S):\n`);
    warnings.slice(0, 5).forEach((warning, index) => {
      console.log(`[${index + 1}] ${warning.message}`);
      if (warning.data) console.log(`    Data: ${JSON.stringify(warning.data)}`);
    });
    if (warnings.length > 5) {
      console.log(`    ... and ${warnings.length - 5} more warnings`);
    }
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  View in UI: Navigate to Debug screen                    ║');
  console.log('║  Export: Run exportLogsToFile()                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  return { errors, warnings, allLogs };
}

// Make available globally
if (typeof global !== 'undefined') {
  global.showErrors = showErrors;
}

// Auto-run if in development and there are errors
if (typeof global !== 'undefined' && typeof __DEV__ !== 'undefined' && __DEV__) {
  setTimeout(() => {
    const errors = logger.getErrors();
    if (errors.length > 0) {
      console.log(`\n⚠️  Logger has captured ${errors.length} error(s). Run showErrors() to view them.\n`);
    }
  }, 3000);
}

export default showErrors;

