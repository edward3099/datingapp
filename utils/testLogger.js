// Quick test to verify logger is capturing console errors
// Run this in the app console: require('./utils/testLogger').test()

import { logger } from './logger';

export function test() {
  console.log('=== Testing Logger ===');
  
  // Test 1: Simple console.error
  console.error('Test Error 1: Simple string error');
  
  // Test 2: Error object
  console.error('Test Error 2:', new Error('Test error object'));
  
  // Test 3: Multiple args
  console.error('Test Error 3:', 'Multiple', 'arguments', { test: 'data' });
  
  // Test 4: console.warn
  console.warn('Test Warning: Simple warning');
  
  // Check logs
  setTimeout(() => {
    const logs = logger.getLogs();
    const errors = logger.getErrors();
    const warnings = logs.filter(l => l.level === 'WARN');
    
    console.log('\n=== Logger Test Results ===');
    console.log(`Total logs: ${logs.length}`);
    console.log(`Errors captured: ${errors.length}`);
    console.log(`Warnings captured: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.message}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\nWarnings:');
      warnings.forEach((warn, i) => {
        console.log(`${i + 1}. ${warn.message}`);
      });
    }
    
    if (errors.length === 0) {
      console.log('\n❌ ERROR: No errors were captured!');
    } else {
      console.log('\n✅ SUCCESS: Errors are being captured!');
    }
  }, 100);
}

// Make available globally
if (typeof global !== 'undefined') {
  global.testLogger = test;
}

