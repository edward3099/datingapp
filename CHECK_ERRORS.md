# How to Check Captured Errors

The logger has been enhanced to capture and display all errors. Here's how to check them:

## Method 1: Debug Screen (Easiest)

1. **Navigate to Debug Screen** in your app
2. You'll see:
   - Total logs count
   - Error count (highlighted)
   - Warning count
   - All captured logs
3. **Click "Errors Only"** button to filter only errors
4. **Click "📋 Print Errors to Console"** to see detailed error info in console
5. **Click "💾 Export All Logs"** to export logs to file/console

## Method 2: Console/Debugger

Open your Expo console or React Native debugger and run:

```javascript
// View all captured errors
viewCapturedErrors()

// Or check errors directly
logger.getErrors()

// Or get all logs
logger.getLogs()

// Or use the summary function
getLogsSummary()

// Print errors to console
printErrorsToConsole()
```

## Method 3: Global Access

The logger exposes these globally:

```javascript
// Direct logger access
global.logger

// View errors
global.viewCapturedErrors()

// Check errors
global.checkLoggerErrors()

// Export logs
global.exportLogsToFile()

// Print errors
global.printErrorsToConsole()

// Direct log access
global.__EXPO_LOGS__
```

## What Gets Captured

The logger automatically captures:

1. ✅ **All `logger.error()` calls** - Manual error logging
2. ✅ **All `console.error()` calls** - Console errors (via interceptor)
3. ✅ **Global React Native errors** - Uncaught exceptions (via ErrorUtils)
4. ✅ **All `logger.warn()` calls** - Warnings
5. ✅ **All `logger.info()` calls** - Info logs
6. ✅ **All `logger.debug()` calls** - Debug logs (dev only)

## Automatic Status Check

In development mode, the logger will automatically print a status report after 2 seconds showing:
- Total logs captured
- Number of errors
- Number of warnings
- List of all errors with details

## Quick Check

To quickly see if any errors were captured, check the Debug screen stats at the bottom:
- **Errors: X** - Shows number of errors
- If X > 0, click "Errors Only" to see them

## Exporting Errors

To export errors for analysis:

1. **Debug Screen**: Click "💾 Export All Logs"
2. **Console**: Run `exportLogsToFile()`
3. Logs will be:
   - Printed to console
   - Saved to file (if FileSystem available)
   - Shared via native share dialog (if available)

## Notes

- Logs are stored in memory (max 100 logs)
- Logs persist until app restart or `logger.clear()` is called
- Errors include: message, timestamp, and data (if provided)
- The logger prevents infinite loops and handles errors gracefully

