// Utility to export logs to a file or view them
import { logger } from './logger';
// Note: FileSystem and Sharing are optional - will work without them
let FileSystem = null;
let shareAsync = null;

try {
  FileSystem = require('expo-file-system').default;
} catch (e) {
  // FileSystem not available
}

try {
  shareAsync = require('expo-sharing').shareAsync;
} catch (e) {
  // Sharing not available
}

export async function exportLogsToFile() {
  try {
    const allLogs = logger.getLogs();
    const errors = logger.getErrors();
    const warnings = allLogs.filter(log => log.level === 'WARN');
    
    const logReport = {
      exportedAt: new Date().toISOString(),
      summary: {
        total: allLogs.length,
        errors: errors.length,
        warnings: warnings.length,
        info: allLogs.filter(log => log.level === 'INFO').length,
        debug: allLogs.filter(log => log.level === 'DEBUG').length,
      },
      errors: errors,
      warnings: warnings,
      allLogs: allLogs,
    };
    
    const logText = JSON.stringify(logReport, null, 2);
    
    // Always log to console
    console.log('=== EXPORTED LOGS ===');
    console.log(logText);
    console.log('=== END LOGS ===');
    
    // Try to save to file if FileSystem is available
    if (FileSystem) {
      try {
        const fileName = `logs-${Date.now()}.json`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, logText);
        
        console.log('Logs also saved to file:', fileUri);
        
        // Try to share the file if sharing is available
        if (shareAsync) {
          try {
            if (await shareAsync.isAvailableAsync()) {
              await shareAsync.shareAsync(fileUri);
            }
          } catch (shareError) {
            // Sharing failed, that's okay
          }
        }
        
        return { success: true, fileUri, fileName };
      } catch (fileError) {
        console.warn('File export failed, but logs are in console:', fileError);
      }
    }
    
    return { success: true, exportedToConsole: true };
  } catch (error) {
    console.error('Failed to export logs:', error);
    return { success: false, error: error.message };
  }
}

export function getLogsSummary() {
  const allLogs = logger.getLogs();
  const errors = logger.getErrors();
  const warnings = allLogs.filter(log => log.level === 'WARN');
  
  return {
    total: allLogs.length,
    errors: errors.length,
    warnings: warnings.length,
    latestError: errors.length > 0 ? errors[errors.length - 1] : null,
    latestWarning: warnings.length > 0 ? warnings[warnings.length - 1] : null,
    errorLogs: errors,
    warningLogs: warnings,
  };
}

export function formatErrorsForCopy() {
  const allLogs = logger.getLogs();
  const errors = logger.getErrors();
  const warnings = allLogs.filter(log => log.level === 'WARN');
  
  let text = '═══════════════════════════════════════════════════════════\n';
  text += 'ERROR REPORT - Dating App\n';
  text += '═══════════════════════════════════════════════════════════\n\n';
  text += `Generated: ${new Date().toISOString()}\n`;
  text += `Total Logs: ${allLogs.length}\n`;
  text += `Total Errors: ${errors.length}\n`;
  text += `Total Warnings: ${warnings.length}\n\n`;
  
  if (errors.length === 0) {
    text += '✅ No errors captured.\n\n';
  } else {
    text += '═══════════════════════════════════════════════════════════\n';
    text += 'ERRORS DETAILS\n';
    text += '═══════════════════════════════════════════════════════════\n\n';
    
    errors.forEach((error, index) => {
      text += `[ERROR ${index + 1}/${errors.length}]\n`;
      text += `${'─'.repeat(60)}\n`;
      text += `Message: ${error.message}\n`;
      text += `Timestamp: ${error.timestamp}\n`;
      text += `Level: ${error.level}\n`;
      
      if (error.data) {
        text += `\nError Data:\n`;
        if (typeof error.data === 'object') {
          // Format object data with full details
          try {
            const dataStr = JSON.stringify(error.data, null, 2);
            text += dataStr.split('\n').map(line => `  ${line}`).join('\n');
          } catch (e) {
            text += `  ${String(error.data)}\n`;
          }
        } else {
          text += `  ${String(error.data)}\n`;
        }
      }
      
      // Extract stack trace if available
      if (error.data && error.data.stack) {
        text += `\nStack Trace:\n`;
        text += error.data.stack.split('\n').map(line => `  ${line}`).join('\n');
        text += '\n';
      }
      
      // Extract error message from nested error objects
      if (error.data && error.data.error) {
        text += `\nNested Error:\n`;
        if (typeof error.data.error === 'string') {
          text += `  ${error.data.error}\n`;
        } else if (error.data.error.message) {
          text += `  Message: ${error.data.error.message}\n`;
          if (error.data.error.stack) {
            text += `  Stack: ${error.data.error.stack.split('\n').slice(0, 5).join('\n    ')}\n`;
          }
        }
      }
      
      // Extract originalError if available
      if (error.data && error.data.originalError) {
        text += `\nOriginal Error Object:\n`;
        if (typeof error.data.originalError === 'object') {
          if (error.data.originalError.name) text += `  Name: ${error.data.originalError.name}\n`;
          if (error.data.originalError.message) text += `  Message: ${error.data.originalError.message}\n`;
          if (error.data.originalError.stack) {
            text += `  Stack Trace:\n`;
            text += error.data.originalError.stack.split('\n').slice(0, 15).map(line => `    ${line}`).join('\n');
            text += '\n';
          }
          if (error.data.originalError.code) text += `  Code: ${error.data.originalError.code}\n`;
        } else {
          text += `  ${String(error.data.originalError)}\n`;
        }
      }
      
      // Extract context-specific fields
      if (error.data) {
        const contextFields = [];
        if (error.data.userId) contextFields.push(`User ID: ${error.data.userId}`);
        if (error.data.conversationId) contextFields.push(`Conversation ID: ${error.data.conversationId}`);
        if (error.data.matchId) contextFields.push(`Match ID: ${error.data.matchId}`);
        if (error.data.targetId) contextFields.push(`Target ID: ${error.data.targetId}`);
        if (error.data.direction) contextFields.push(`Direction: ${error.data.direction}`);
        if (error.data.bucket) contextFields.push(`Bucket: ${error.data.bucket}`);
        if (error.data.messageType) contextFields.push(`Message Type: ${error.data.messageType}`);
        if (error.data.limit) contextFields.push(`Limit: ${error.data.limit}`);
        if (error.data.interestCount) contextFields.push(`Interest Count: ${error.data.interestCount}`);
        
        if (contextFields.length > 0) {
          text += `\nContext Information:\n`;
          contextFields.forEach(field => text += `  ${field}\n`);
        }
      }
      
      // Extract Supabase error details (prioritize this for debugging)
      if (error.data && (error.data.code || error.data.hint || error.data.details)) {
        text += `\n⚠️ Supabase Error Details:\n`;
        if (error.data.code) text += `  Error Code: ${error.data.code}\n`;
        if (error.data.message) text += `  Error Message: ${error.data.message}\n`;
        if (error.data.hint) text += `  Hint: ${error.data.hint}\n`;
        if (error.data.details) text += `  Details: ${error.data.details}\n`;
        
        // Common error code meanings
        if (error.data.code === '42883') {
          text += `  ⚠️  This is a "function does not exist" error. The RPC function needs to be created in Supabase.\n`;
        } else if (error.data.code === 'PGRST116' || error.data.code?.startsWith('42')) {
          text += `  ⚠️  This is a database/table error. Check if tables exist and RLS policies are correct.\n`;
        }
      }
      
      // Extract context information
      if (error.data && error.data._context) {
        text += `\nError Context:\n`;
        text += `  Type: ${error.data._context}\n`;
        if (error.data._endpoint) text += `  Endpoint: ${error.data._endpoint}\n`;
      }
      
      // Extract full error object if available
      if (error.data && error.data._errorObject) {
        text += `\nFull Error Object:\n`;
        text += `  Name: ${error.data.name || 'Error'}\n`;
        text += `  Message: ${error.data.message || 'N/A'}\n`;
        if (error.data.code) text += `  Code: ${error.data.code}\n`;
      }
      
      // Extract all error properties for debugging
      if (error.data && typeof error.data === 'object') {
        const importantKeys = ['url', 'status', 'statusText', 'method', 'code', 'hint', 'details', 'table', 'function'];
        const hasImportantKeys = importantKeys.some(key => error.data[key] !== undefined);
        
        if (hasImportantKeys) {
          text += `\nAdditional Error Properties:\n`;
          importantKeys.forEach(key => {
            if (error.data[key] !== undefined) {
              text += `  ${key}: ${error.data[key]}\n`;
            }
          });
        }
      }
      
      text += `\n${'═'.repeat(60)}\n\n`;
    });
  }
  
  if (warnings.length > 0) {
    text += '═══════════════════════════════════════════════════════════\n';
    text += 'WARNINGS\n';
    text += '═══════════════════════════════════════════════════════════\n\n';
    
    warnings.forEach((warning, index) => {
      text += `[WARNING ${index + 1}] ${warning.message}\n`;
      text += `  Time: ${warning.timestamp}\n`;
      if (warning.data) {
        try {
          text += `  Data: ${JSON.stringify(warning.data, null, 2).split('\n').join('\n    ')}\n`;
        } catch (e) {
          text += `  Data: ${String(warning.data)}\n`;
        }
      }
      text += '\n';
    });
  }
  
  text += '═══════════════════════════════════════════════════════════\n';
  text += 'END OF ERROR REPORT\n';
  text += '═══════════════════════════════════════════════════════════\n';
  text += '\n';
  text += 'INSTRUCTIONS FOR DEBUGGING:\n';
  text += '1. Check Supabase dashboard for missing tables/functions\n';
  text += '2. Verify RLS policies are set correctly\n';
  text += '3. Ensure storage buckets are created\n';
  text += '4. Check if RPC functions exist in database\n';
  text += '5. Verify user authentication is working\n';
  text += '6. Check network connectivity\n';
  text += '\n';
  text += 'Common fixes:\n';
  text += '- Missing RPC function: Create function in Supabase SQL editor\n';
  text += '- RLS violation: Update row-level security policies\n';
  text += '- Missing table: Run migrations to create tables\n';
  text += '- Storage error: Create storage buckets in Supabase dashboard\n';
  text += '═══════════════════════════════════════════════════════════\n';
  
  return text;
}

export function printErrorsToConsole() {
  const errors = logger.getErrors();
  const warnings = logger.getLogs().filter(log => log.level === 'WARN');
  
  console.log('\n' + '='.repeat(50));
  console.log('LOGGER ERROR REPORT');
  console.log('='.repeat(50));
  console.log(`Total Errors: ${errors.length}`);
  console.log(`Total Warnings: ${warnings.length}`);
  console.log('='.repeat(50));
  
  if (errors.length > 0) {
    console.log('\n📛 ERRORS:');
    errors.forEach((error, index) => {
      console.log(`\n[${index + 1}] ${error.message}`);
      console.log(`   Time: ${error.timestamp}`);
      if (error.data) {
        console.log('   Data:', error.data);
      }
    });
  } else {
    console.log('\n✅ No errors captured');
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach((warning, index) => {
      console.log(`\n[${index + 1}] ${warning.message}`);
      if (warning.data) {
        console.log('   Data:', warning.data);
      }
    });
  }
  
  console.log('\n' + '='.repeat(50));
  
  return { errors, warnings };
}

// Make available globally
if (typeof global !== 'undefined') {
  global.exportLogsToFile = exportLogsToFile;
  global.getLogsSummary = getLogsSummary;
  global.printErrorsToConsole = printErrorsToConsole;
  global.formatErrorsForCopy = formatErrorsForCopy;
}

